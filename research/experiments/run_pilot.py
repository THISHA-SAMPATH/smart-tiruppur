"""Reproducible End-to-End Source Attribution Pilot Runner.

Executes a controlled, reproducible pilot verifying that the full attribution
benchmark pipeline functions correctly across clean and faulted sensor conditions.

Pipeline Stages:
1. Generates controlled synthetic events with known ground-truth labels across all candidate sources.
2. Applies configured sensor fault transformations (stuck register, dropouts, latency).
3. Executes class-aware four-way partitioning (Train 50%, Calibration 20%, Validation 15%, Test 15%).
4. Fits base conventional classifier (M3) on training episodes only.
5. Optimizes temperature scaling calibration (M4) on calibration episodes only.
6. Tunes operating thresholds (tau_conf, delta_margin) on validation episodes only and locks them.
7. Evaluates primary comparison methods strictly on held-out test episodes.
8. Computes decoupled detection, attribution, and calibration metrics preserving undefined states.
9. Persists machine-readable metadata, predictions, and Markdown reports.

Fairness Invariant:
The pilot is designed to verify reproducibility and pipeline integrity. Pilot results
are diagnostic only and do NOT constitute proof of operational performance on the real Noyyal River.
"""

from __future__ import annotations

import datetime
import json
from pathlib import Path
import platform
import sys
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import scipy
import sklearn

from research.evaluation.attribution_metrics import (
    abstention_appropriateness_rate,
    abstention_fault_cooccurrence_rate,
    abstention_rate,
    attribution_macro_f1,
    decision_coverage,
    detection_rate,
    expected_calibration_error,
    false_alarm_rate,
    fault_diagnostic_precision,
    format_metric,
    mean_time_to_detect_hours,
    multiclass_brier_score,
    multiclass_log_loss,
    overall_accuracy,
    selective_accuracy,
    selective_error_avoidance_rate,
    selective_risk,
)
from research.models.baselines import (
    ConfidenceSelectiveClassifier,
    ConventionalClassifier,
    NearestUpstreamHeuristicAttributor,
    SecondaryPrivilegedCapacityHeuristicAttributor,
    SpatialTransitHeuristicAttributor,
    ThresholdEventDetector,
)
from research.models.feature_extractor import ObservableFeatureExtractor
from research.models.selective_attributor import (
    SelectiveAttributionConfig,
    SelectiveAttributor,
)
from research.simulation.river_ade_simulator import (
    RiverADESimulator,
    SimulationConfig,
    SimulationResult,
)
from research.simulation.sensor_faults import (
    FaultSuiteConfig,
    SensorFaultInjector,
)
from research.simulation.synthetic_event_generator import (
    GroundTruthEventMeta,
    SyntheticEventGenerator,
)


def load_json(path: str | Path) -> Dict[str, Any]:
    p = Path(path)
    if not p.is_file():
        raise FileNotFoundError(f"Config file not found: {p}")
    return json.loads(p.read_text(encoding="utf-8"))


def generate_balanced_pilot_dataset(
    generator: SyntheticEventGenerator,
    source_ids: List[str],
    episodes_per_class: int,
    base_seed: int,
) -> Tuple[List[SimulationResult], List[GroundTruthEventMeta]]:
    """Generates a balanced dataset having exactly episodes_per_class per source."""
    episodes: List[SimulationResult] = []
    metadata: List[GroundTruthEventMeta] = []

    rng = np.random.default_rng(base_seed)

    for s_idx, src_id in enumerate(source_ids):
        for rep in range(episodes_per_class):
            event_seed = int(rng.integers(1, 10_000_000))
            event_id = f"ev_pilot_{src_id}_rep{rep+1}_{base_seed}"
            res, meta = generator.generate_single_event(
                event_id=event_id,
                source_id=src_id,
                seed=event_seed,
            )
            episodes.append(res)
            metadata.append(meta)

    return episodes, metadata


def stratified_split_episodes(
    episodes: List[SimulationResult],
    metadata: List[GroundTruthEventMeta],
    allocation: Dict[str, int],
    seed: int,
) -> Dict[str, Tuple[List[SimulationResult], List[GroundTruthEventMeta]]]:
    """Splits complete episodes four ways ensuring required class representation."""
    n_train = allocation["train_per_class"]
    n_cal = allocation["cal_per_class"]
    n_val = allocation["val_per_class"]
    n_test = allocation["test_per_class"]
    expected_total_per_class = n_train + n_cal + n_val + n_test

    # Group by true source ID
    by_source: Dict[str, List[Tuple[SimulationResult, GroundTruthEventMeta]]] = {}
    for ep, meta in zip(episodes, metadata):
        by_source.setdefault(meta.true_source_id, []).append((ep, meta))

    rng = np.random.default_rng(seed)

    splits: Dict[str, Tuple[List[SimulationResult], List[GroundTruthEventMeta]]] = {
        "train": ([], []),
        "cal": ([], []),
        "val": ([], []),
        "test": ([], []),
    }

    for src_id, items in by_source.items():
        if len(items) < expected_total_per_class:
            raise ValueError(
                f"Class '{src_id}' has {len(items)} episodes, but required {expected_total_per_class}."
            )

        # Shuffle indices for this class deterministically
        indices = np.arange(len(items))
        rng.shuffle(indices)

        idx_train = indices[:n_train]
        idx_cal = indices[n_train : n_train + n_cal]
        idx_val = indices[n_train + n_cal : n_train + n_cal + n_val]
        idx_test = indices[n_train + n_cal + n_val : n_train + n_cal + n_val + n_test]

        for idx in idx_train:
            splits["train"][0].append(items[idx][0])
            splits["train"][1].append(items[idx][1])
        for idx in idx_cal:
            splits["cal"][0].append(items[idx][0])
            splits["cal"][1].append(items[idx][1])
        for idx in idx_val:
            splits["val"][0].append(items[idx][0])
            splits["val"][1].append(items[idx][1])
        for idx in idx_test:
            splits["test"][0].append(items[idx][0])
            splits["test"][1].append(items[idx][1])

    # Disjointness validation
    train_ids = {m.event_id for m in splits["train"][1]}
    cal_ids = {m.event_id for m in splits["cal"][1]}
    val_ids = {m.event_id for m in splits["val"][1]}
    test_ids = {m.event_id for m in splits["test"][1]}

    assert len(train_ids.intersection(cal_ids)) == 0, "Train and Cal splits share episode IDs!"
    assert len(train_ids.intersection(val_ids)) == 0, "Train and Val splits share episode IDs!"
    assert len(train_ids.intersection(test_ids)) == 0, "Train and Test splits share episode IDs!"
    assert len(cal_ids.intersection(val_ids)) == 0, "Cal and Val splits share episode IDs!"
    assert len(cal_ids.intersection(test_ids)) == 0, "Cal and Test splits share episode IDs!"
    assert len(val_ids.intersection(test_ids)) == 0, "Val and Test splits share episode IDs!"

    return splits


def run_single_seed_pipeline(
    seed: int,
    config: Dict[str, Any],
    sim_config: SimulationConfig,
    generator: SyntheticEventGenerator,
    extractor: ObservableFeatureExtractor,
    condition_name: str,
    fault_suite_config: Optional[FaultSuiteConfig],
) -> Dict[str, Any]:
    """Executes the complete attribution benchmark for a single seed under one condition."""
    episodes_per_class = int(config["episodes_per_class"])
    source_ids = [config["background_class_id"]] + [s.source_id for s in sim_config.sources]

    # 1. Generate balanced episodes
    episodes, metadata = generate_balanced_pilot_dataset(
        generator=generator,
        source_ids=source_ids,
        episodes_per_class=episodes_per_class,
        base_seed=seed,
    )

    # 2. Stratified four-way partition
    allocation = config["split_allocation"]
    splits = stratified_split_episodes(episodes, metadata, allocation, seed=seed)

    train_eps, train_meta = splits["train"]
    cal_eps, cal_meta = splits["cal"]
    val_eps, val_meta = splits["val"]
    test_eps, test_meta = splits["test"]

    decision_time = float(config.get("decision_time_sec", 86400.0))

    # Optional fault injector for condition
    injector = SensorFaultInjector(fault_suite_config) if fault_suite_config is not None else None

    # Helper: extract observations and tabular feature matrix
    def _prepare_split(
        ep_list: List[SimulationResult],
        meta_list: List[GroundTruthEventMeta],
        apply_faults: bool,
    ) -> Tuple[np.ndarray, np.ndarray, List[Dict[str, Any]]]:
        X_list, y_list = [], []
        records = []

        for i, (ep, m) in enumerate(zip(ep_list, meta_list)):
            times = ep.timestamps_sec
            obs = ep.station_observations
            applied_faults_dict: Dict[str, List[str]] = {}
            arrivals = {k: times.copy() for k in obs.keys()}

            if apply_faults and injector is not None:
                faulted_res = injector.apply_faults(ep, seed=seed + i)
                obs = faulted_res.corrupted_observations
                arrivals = faulted_res.arrival_timestamps_sec
                applied_faults_dict = faulted_res.applied_faults

            feat = extractor.extract(
                sample_times_sec=times,
                station_arrival_times=arrivals,
                station_values=obs,
                decision_time_sec=decision_time,
            )
            X_list.append(feat)
            y_list.append(m.true_source_id)

            records.append({
                "episode": ep,
                "meta": m,
                "obs": obs,
                "arrivals": arrivals,
                "times": times,
                "features": feat,
                "applied_faults": applied_faults_dict,
            })

        return np.array(X_list), np.array(y_list), records

    # Prepare features:
    # Training always uses baseline clean observations
    X_train, y_train, _ = _prepare_split(train_eps, train_meta, apply_faults=False)
    # Calibration uses clean observations to calibrate probability scale
    X_cal, y_cal, _ = _prepare_split(cal_eps, cal_meta, apply_faults=False)
    # Validation uses clean observations to select baseline acceptance operating point
    X_val, y_val, _ = _prepare_split(val_eps, val_meta, apply_faults=False)
    # Test set evaluated under condition (clean or faulted)
    is_faulted_condition = (condition_name != "clean")
    X_test, y_test, test_records = _prepare_split(test_eps, test_meta, apply_faults=is_faulted_condition)

    # M3: Conventional Classifier
    rf_cfg = config["models"]["conventional_rf"]
    m3 = ConventionalClassifier(
        n_estimators=int(rf_cfg.get("n_estimators", 50)),
        random_state=int(rf_cfg.get("random_state", seed)),
    )
    m3.fit(X_train, y_train)

    # M3-Selective: Conventional Classifier with Confidence-Only Abstention
    m3_selective = ConfidenceSelectiveClassifier(base_classifier=m3)
    m4_cfg = config["models"]["selective_m4"]
    target_max_risk = float(m4_cfg.get("target_max_risk", 0.10))
    m3_selective.tune_threshold_on_validation(
        X_val=X_val,
        y_val=y_val,
        tau_candidates=m4_cfg.get("tau_candidates", [0.30, 0.40, 0.50, 0.60, 0.70, 0.80]),
        target_max_risk=target_max_risk,
    )

    # M4: Selective Attributor
    m4 = SelectiveAttributor(
        SelectiveAttributionConfig(
            n_estimators=int(m4_cfg.get("n_estimators", 50)),
            random_state=int(m4_cfg.get("random_state", seed)),
        )
    )
    m4.fit_base_model(X_train, y_train)
    m4.calibrate(X_cal, y_cal)

    # Select acceptance thresholds strictly on validation data
    val_report = m4.tune_thresholds_on_validation(
        X_val=X_val,
        y_val=y_val,
        target_max_risk=target_max_risk,
        tau_candidates=m4_cfg.get("tau_candidates"),
        delta_candidates=m4_cfg.get("delta_candidates"),
    )

    # Baselines
    cand_sources = [
        {"source_id": s.source_id, "name": s.name, "chainage_m": s.chainage_m, "nominal_mass_rate_gps": s.nominal_mass_rate_gps}
        for s in sim_config.sources
    ]
    stations = [
        {"station_id": s.station_id, "name": s.name, "chainage_m": s.chainage_m}
        for s in sim_config.stations
    ]
    det_thresh = float(config.get("detection_threshold_gpm3", 2.0))
    detector = ThresholdEventDetector(threshold_gpm3=det_thresh)
    m1_unprivileged = NearestUpstreamHeuristicAttributor(cand_sources, stations, threshold_gpm3=det_thresh)
    m1_privileged = SecondaryPrivilegedCapacityHeuristicAttributor(cand_sources, stations, threshold_gpm3=det_thresh)
    m2_spatial = SpatialTransitHeuristicAttributor(cand_sources, stations, threshold_gpm3=det_thresh)

    # 4. Evaluation on Held-Out Test Episodes
    test_episode_logs = []
    det_trues, det_preds, det_times, start_times = [], [], [], []

    m1_preds = []
    m1_priv_preds = []
    m2_preds = []
    m3_preds, m3_probs = [], []
    m3_sel_decisions, m3_sel_preds, m3_sel_confs = [], [], []
    m4_decisions, m4_preds, m4_confs, m4_margins, m4_causes = [], [], [], [], []
    m4_justified_faults = []

    for rec in test_records:
        eid = rec["meta"].event_id
        times = rec["times"]
        obs = rec["obs"]
        arrivals = rec["arrivals"]
        is_bg = rec["meta"].is_background
        true_src = rec["meta"].true_source_id
        applied_faults = rec["applied_faults"]
        has_hardware_fault = any(len(flist) > 0 for flist in applied_faults.values())

        # Task 1: Detection
        det = detector.detect(eid, times, arrivals, obs, decision_time)
        det_trues.append(not is_bg)
        det_preds.append(det.detected)
        det_times.append(det.detection_time_sec)
        start_times.append(rec["meta"].start_time_sec)

        # Baseline M1 unprivileged (nearest upstream)
        res_m1 = m1_unprivileged.attribute(eid, times, arrivals, obs, decision_time)
        m1_preds.append(res_m1.predicted_source)

        # Baseline M1 secondary privileged (capacity heuristic)
        res_m1_priv = m1_privileged.attribute(eid, times, arrivals, obs, decision_time)
        m1_priv_preds.append(res_m1_priv.predicted_source)

        # Baseline M2 (spatial transit)
        res_m2 = m2_spatial.attribute(eid, times, arrivals, obs, decision_time)
        m2_preds.append(res_m2.predicted_source)

        # Baseline M3 (conventional classifier)
        res_m3 = m3.predict_single(eid, times, arrivals, obs, decision_time)
        m3_preds.append(res_m3.predicted_source)

        # Baseline M3-Selective (confidence-only abstention)
        res_m3_sel = m3_selective.predict_single(eid, times, arrivals, obs, decision_time)
        m3_sel_decisions.append(res_m3_sel.decision)
        m3_sel_preds.append(res_m3_sel.predicted_source)
        m3_sel_confs.append(res_m3_sel.confidence)

        # Proposed M4 (selective attributor)
        res_m4 = m4.predict_single(eid, times, arrivals, obs, decision_time)
        m4_decisions.append(res_m4.decision)
        m4_preds.append(res_m4.predicted_source)
        m4_confs.append(res_m4.calibrated_confidence)
        m4_margins.append(res_m4.probability_margin)
        m4_causes.append(res_m4.abstain_cause)
        m4_justified_faults.append(has_hardware_fault)

        test_episode_logs.append({
            "event_id": eid,
            "seed": seed,
            "condition": condition_name,
            "true_source_id": true_src,
            "is_background": is_bg,
            "has_hardware_fault": has_hardware_fault,
            "applied_faults": applied_faults,
            "detection": {
                "detected": det.detected,
                "peak_concentration_gpm3": det.peak_concentration_gpm3,
                "detection_time_sec": det.detection_time_sec,
            },
            "m1_nearest_predicted": res_m1.predicted_source,
            "m1_privileged_capacity_predicted": res_m1_priv.predicted_source,
            "m2_spatial_predicted": res_m2.predicted_source,
            "m3_conventional_predicted": res_m3.predicted_source,
            "m3_confidence": res_m3.confidence,
            "m3_selective": {
                "decision": res_m3_sel.decision,
                "predicted_source": res_m3_sel.predicted_source,
                "confidence": res_m3_sel.confidence,
                "abstain_cause": res_m3_sel.metadata.get("abstain_cause"),
            },
            "m4_selective": {
                "decision": res_m4.decision,
                "predicted_source": res_m4.predicted_source,
                "calibrated_confidence": res_m4.calibrated_confidence,
                "probability_margin": res_m4.probability_margin,
                "abstain_cause": res_m4.abstain_cause,
            },
        })

    # Probabilities for calibration evaluation
    m3_probs_matrix = m3.rf.predict_proba(X_test)
    m4_cal_probs_matrix = m4.predict_proba(X_test)
    class_list = [str(c) for c in m4.classes_]

    # Accuracy vectors for ECE
    m3_correct_vec = [p == yt for p, yt in zip(m3_preds, y_test)]
    m3_top_confs = np.max(m3_probs_matrix, axis=1)

    m4_accepted_correct = [
        (yp == yt) if d == "ATTRIBUTE" else False
        for yp, yt, d in zip(m4_preds, y_test, m4_decisions)
    ]

    # Calculate metrics
    metrics_record = {
        "seed": seed,
        "condition": condition_name,
        "test_episodes_count": len(y_test),
        "task1_detection": {
            "detection_rate": detection_rate(det_trues, det_preds),
            "false_alarm_rate": false_alarm_rate(det_trues, det_preds),
            "mean_ttd_hours": mean_time_to_detect_hours(det_times, start_times, det_preds),
        },
        "m1_nearest_heuristic": {
            "overall_accuracy": overall_accuracy(y_test, m1_preds),
            "macro_f1": attribution_macro_f1(y_test, m1_preds),
            "coverage": 1.0,
            "selective_risk": selective_risk(y_test, m1_preds, ["ATTRIBUTE"] * len(y_test)),
        },
        "m1_secondary_privileged_capacity": {
            "overall_accuracy": overall_accuracy(y_test, m1_priv_preds),
            "macro_f1": attribution_macro_f1(y_test, m1_priv_preds),
            "coverage": 1.0,
            "selective_risk": selective_risk(y_test, m1_priv_preds, ["ATTRIBUTE"] * len(y_test)),
            "is_privileged_prior": True,
        },
        "m2_spatial_transit_heuristic": {
            "overall_accuracy": overall_accuracy(y_test, m2_preds),
            "macro_f1": attribution_macro_f1(y_test, m2_preds),
            "coverage": 1.0,
            "selective_risk": selective_risk(y_test, m2_preds, ["ATTRIBUTE"] * len(y_test)),
        },
        "m3_conventional_classifier": {
            "overall_accuracy": overall_accuracy(y_test, m3_preds),
            "macro_f1": attribution_macro_f1(y_test, m3_preds),
            "coverage": 1.0,
            "selective_risk": selective_risk(y_test, m3_preds, ["ATTRIBUTE"] * len(y_test)),
            "brier_score": multiclass_brier_score(y_test, m3_probs_matrix, class_list),
            "log_loss": multiclass_log_loss(y_test, m3_probs_matrix, class_list),
            "ece": expected_calibration_error(m3_top_confs, m3_correct_vec, n_bins=5),
        },
        "m3_selective_confidence_only": {
            "decision_coverage": decision_coverage(m3_sel_decisions),
            "abstention_rate": abstention_rate(m3_sel_decisions),
            "selective_risk": selective_risk(y_test, m3_sel_preds, m3_sel_decisions),
            "selective_accuracy": selective_accuracy(y_test, m3_sel_preds, m3_sel_decisions),
            "overall_accuracy_forced": overall_accuracy(y_test, m3_preds),
            "abstention_fault_cooccurrence_rate": abstention_fault_cooccurrence_rate(m3_sel_decisions, m4_justified_faults),
            "selective_error_avoidance_rate": selective_error_avoidance_rate(y_test, m3_preds, m3_sel_decisions),
            "locked_tau": m3_selective.tau_conf,
        },
        "m4_selective_attributor": {
            "decision_coverage": decision_coverage(m4_decisions),
            "abstention_rate": abstention_rate(m4_decisions),
            "selective_risk": selective_risk(y_test, m4_preds, m4_decisions),
            "selective_accuracy": selective_accuracy(y_test, m4_preds, m4_decisions),
            "overall_accuracy_forced": overall_accuracy(
                y_test,
                [m4.classes_[idx] for idx in np.argmax(m4_cal_probs_matrix, axis=1)],
            ),
            "abstention_fault_cooccurrence_rate": abstention_fault_cooccurrence_rate(m4_decisions, m4_justified_faults),
            "selective_error_avoidance_rate": selective_error_avoidance_rate(
                y_test,
                [m4.classes_[idx] for idx in np.argmax(m4_cal_probs_matrix, axis=1)],
                m4_decisions,
            ),
            "fault_diagnostic_precision": fault_diagnostic_precision(m4_decisions, m4_causes, m4_justified_faults),
            "abstention_appropriateness_rate": abstention_appropriateness_rate(m4_decisions, m4_justified_faults),
            "temperature": m4.temperature_,
            "locked_tau": m4.config.tau_conf,
            "locked_delta": m4.config.delta_margin,
            "brier_score": multiclass_brier_score(y_test, m4_cal_probs_matrix, class_list),
            "log_loss": multiclass_log_loss(y_test, m4_cal_probs_matrix, class_list),
            "ece": expected_calibration_error(
                np.max(m4_cal_probs_matrix, axis=1),
                [m4.classes_[idx] == yt for idx, yt in zip(np.argmax(m4_cal_probs_matrix, axis=1), y_test)],
                n_bins=5,
            ),
            "validation_tuning_report": val_report,
        },
    }

    return {
        "metrics": metrics_record,
        "episode_logs": test_episode_logs,
    }


def aggregate_seed_metrics(seed_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Computes mean and sample standard deviation across evaluated seeds, preserving None."""
    if not seed_records:
        return {}

    conditions = list({r["condition"] for r in seed_records})
    summary: Dict[str, Any] = {}

    for cond in conditions:
        cond_records = [r for r in seed_records if r["condition"] == cond]
        summary[cond] = {}

        # Keys to aggregate
        target_sections = [
            "task1_detection",
            "m1_nearest_heuristic",
            "m1_secondary_privileged_capacity",
            "m2_spatial_transit_heuristic",
            "m3_conventional_classifier",
            "m3_selective_confidence_only",
            "m4_selective_attributor",
        ]

        for sec in target_sections:
            summary[cond][sec] = {}
            sample_sec = cond_records[0].get(sec, {})

            for k in sample_sec.keys():
                if k in ("validation_tuning_report", "is_privileged_prior"):
                    continue

                vals = [r.get(sec, {}).get(k) for r in cond_records]
                valid_floats = [v for v in vals if v is not None and not np.isnan(v)]

                if not valid_floats:
                    summary[cond][sec][k] = {
                        "mean": None,
                        "std": None,
                        "estimable_seeds": 0,
                    }
                else:
                    mean_val = float(np.mean(valid_floats))
                    std_val = float(np.std(valid_floats, ddof=1)) if len(valid_floats) > 1 else 0.0
                    summary[cond][sec][k] = {
                        "mean": mean_val,
                        "std": std_val,
                        "estimable_seeds": len(valid_floats),
                    }

    return summary


def generate_pilot_markdown_report(
    metadata: Dict[str, Any],
    summary: Dict[str, Any],
    output_path: Path,
) -> None:
    """Renders a comprehensive, transparent Markdown summary report."""
    md_lines = [
        "# NoyyalSense Research Attribution Pilot Report",
        "",
        "> [!IMPORTANT]",
        "> **Synthetic Pilot Disclaimer:** This evaluation is a controlled synthetic screening benchmark.",
        "> All simulation traces and events are generated from the 1D ADE numerical engine.",
        "> Metrics do not constitute historical measurements or regulatory compliance records from the Noyyal River.",
        "",
        "## 1. Pilot Run Metadata",
        "",
        f"- **Execution Timestamp:** `{metadata['timestamp']}`",
        f"- **Python Version:** `{metadata['python_version']}`",
        f"- **Key Libraries:** NumPy `{metadata['libraries']['numpy']}`, SciPy `{metadata['libraries']['scipy']}`, Scikit-Learn `{metadata['libraries']['scikit_learn']}`",
        f"- **Evaluated Seeds:** `{metadata['seeds']}`",
        f"- **Total Candidate Classes:** `{metadata['classes_count']}` (12 industrial dyeing clusters + 1 clean background class)",
        f"- **Episodes per Class per Seed:** `{metadata['episodes_per_class']}` ({metadata['total_episodes_per_seed']} total episodes per seed)",
        f"- **Partition Allocation per Class:** Train={metadata['split_allocation']['train_per_class']}, Cal={metadata['split_allocation']['cal_per_class']}, Val={metadata['split_allocation']['val_per_class']}, Test={metadata['split_allocation']['test_per_class']}",
        f"- **Total Test Episodes per Seed:** `{metadata['test_episodes_per_seed']}`",
        "",
        "## 2. Comparative Methodology Summary",
        "",
        "| Evaluation Condition | Method Name | Decision Coverage ($\\Phi$) | Selective Risk ($\\mathcal{R}(\\Phi)$) | Error Avoidance Rate | Fault Co-occur / Prec | Expected Cal. Error (ECE) |",
        "| :--- | :--- | :---: | :---: | :---: | :---: | :---: |",
    ]

    for cond, cond_data in summary.items():
        cond_title = "Clean Baseline" if cond == "clean" else "Sensor Faults (Stuck & Missing)"

        # M1 Nearest
        m1 = cond_data.get("m1_nearest_heuristic", {})
        md_lines.append(
            f"| **{cond_title}** | M1 Nearest Spatial Heuristic (Unprivileged) | "
            f"{format_metric(m1.get('coverage', {}).get('mean'))} | "
            f"{format_metric(m1.get('selective_risk', {}).get('mean'))} | "
            f"N/A (No Abstain) | "
            f"N/A | N/A |"
        )

        # M3 Conventional RF (Forced)
        m3 = cond_data.get("m3_conventional_classifier", {})
        md_lines.append(
            f"| **{cond_title}** | M3 Conventional Random Forest (Forced Choice) | "
            f"{format_metric(m3.get('coverage', {}).get('mean'))} | "
            f"{format_metric(m3.get('selective_risk', {}).get('mean'))} | "
            f"N/A (Forced) | "
            f"N/A | {format_metric(m3.get('ece', {}).get('mean'))} |"
        )

        # M3-Selective (Confidence-Only Abstention)
        m3_sel = cond_data.get("m3_selective_confidence_only", {})
        md_lines.append(
            f"| **{cond_title}** | M3-Selective RF (Confidence-Only Abstention) | "
            f"{format_metric(m3_sel.get('decision_coverage', {}).get('mean'))} | "
            f"{format_metric(m3_sel.get('selective_risk', {}).get('mean'))} | "
            f"{format_metric(m3_sel.get('selective_error_avoidance_rate', {}).get('mean'))} | "
            f"{format_metric(m3_sel.get('abstention_fault_cooccurrence_rate', {}).get('mean'))} (Co-occur) | "
            f"N/A |"
        )

        # M4 Proposed Selective Attributor
        m4 = cond_data.get("m4_selective_attributor", {})
        diag_prec = m4.get("fault_diagnostic_precision", {}).get("mean")
        diag_prec_str = format_metric(diag_prec) if diag_prec is not None else "N/A"
        md_lines.append(
            f"| **{cond_title}** | **M4 Proposed Selective Attributor** | "
            f"**{format_metric(m4.get('decision_coverage', {}).get('mean'))}** | "
            f"**{format_metric(m4.get('selective_risk', {}).get('mean'))}** | "
            f"**{format_metric(m4.get('selective_error_avoidance_rate', {}).get('mean'))}** | "
            f"**{diag_prec_str} (Diag Prec)** | "
            f"{format_metric(m4.get('ece', {}).get('mean'))} |"
        )

        # M1 Secondary Privileged
        m1_priv = cond_data.get("m1_secondary_privileged_capacity", {})
        md_lines.append(
            f"| *{cond_title} (Secondary)* | *M1 Capacity-Weighted Heuristic (Privileged Prior)* | "
            f"*{format_metric(m1_priv.get('coverage', {}).get('mean'))}* | "
            f"*{format_metric(m1_priv.get('selective_risk', {}).get('mean'))}* | "
            f"*N/A* | "
            f"*N/A* | *N/A* |"
        )

    md_lines.extend([
        "",
        "> [!NOTE]",
        "> **Baseline Deduplication Notice (Phase 3.3 Audit):**",
        "> Prior candidate M2 Spatial Transit Heuristic produced mathematically identical rankings to M1 Nearest Spatial Heuristic because its scoring formula was a strictly monotonic transformation of upstream distance ($1 / (1 + dx/1000)$).",
        "> M2 has been removed from primary comparisons and replaced with M3-Selective (confidence-only abstention) to provide a matched-coverage selective baseline.",
        "",
        "## 3. Key Diagnostic Findings",
        "",
        "1. **Fair Comparison Integrity:** All primary source-attribution methods evaluated the identical set of held-out test episodes using exclusively telemetry observations available at decision time.",
        "2. **Matched-Coverage Selective Comparison:** Comparing M3-Selective (confidence thresholding only) with M4 (confidence + margin + diagnostic health gating) reveals whether multi-signal gating and sensor diagnostics provide value beyond confidence alone.",
        "3. **Threshold Selection Independence:** Operating thresholds $(\\tau_{\\text{conf}}, \\delta_{\\text{margin}})$ were optimized strictly on the validation partition without inspection of test labels.",
        "4. **Decoupled Abstention Evaluation:** Abstentions are evaluated via Error Avoidance Rate (fraction avoiding incorrect forced accusations) and Fault Diagnostic Precision rather than assuming every injected fault justifies an abstention.",
        "5. **Zero-Denominator Invariants:** When coverage was zero, selective risk was preserved as `None` without silent coercion to 0.0.",
        "",
        "## 4. Unresolved Limitations & Experimental Roadmap",
        "",
        "- The pilot evaluated 2 random seeds with 65 episodes per seed (130 total episodes). This exploratory pilot verifies software correctness and pipeline reproducibility; confirmatory conclusions require the full 10-seed experiment.",
        "- Temperature scaling optimizes calibration on uncorrupted calibration splits; its generalization under sudden non-stationary sensor faults remains an active research topic.",
    ])

    output_path.write_text("\n".join(md_lines), encoding="utf-8")

    output_path.write_text("\n".join(md_lines), encoding="utf-8")


def run_pilot_pipeline(
    config_path: str | Path = "research/configs/pilot.json",
    sim_config_path: str | Path = "research/configs/simulation_params.json",
    output_dir_override: Optional[str | Path] = None,
) -> Dict[str, Any]:
    """Main entrypoint executing the end-to-end pilot pipeline."""
    config = load_json(config_path)
    sim_config = SimulationConfig.from_json(sim_config_path)
    generator = SyntheticEventGenerator(sim_config)
    extractor = ObservableFeatureExtractor()

    if output_dir_override is not None:
        output_dir = Path(output_dir_override)
    else:
        output_dir = Path(config.get("output_dir", "research/results/pilot"))
    output_dir.mkdir(parents=True, exist_ok=True)

    seeds = config.get("seeds", [42, 101])
    conditions = config.get("conditions", {})

    all_seed_metrics: List[Dict[str, Any]] = []
    all_episode_logs: List[Dict[str, Any]] = []

    for seed in seeds:
        for cond_key, cond_info in conditions.items():
            fault_cfg_dict = cond_info.get("fault_suite")
            fault_cfg = FaultSuiteConfig.from_dict(fault_cfg_dict) if fault_cfg_dict else None

            result = run_single_seed_pipeline(
                seed=seed,
                config=config,
                sim_config=sim_config,
                generator=generator,
                extractor=extractor,
                condition_name=cond_key,
                fault_suite_config=fault_cfg,
            )
            all_seed_metrics.append(result["metrics"])
            all_episode_logs.extend(result["episode_logs"])

    summary = aggregate_seed_metrics(all_seed_metrics)

    # Prepare run metadata
    metadata = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "python_version": sys.version,
        "platform": platform.platform(),
        "libraries": {
            "numpy": np.__version__,
            "scipy": scipy.__version__,
            "scikit_learn": sklearn.__version__,
        },
        "seeds": seeds,
        "classes_count": 13,
        "episodes_per_class": config["episodes_per_class"],
        "total_episodes_per_seed": config["episodes_per_class"] * 13,
        "test_episodes_per_seed": config["split_allocation"]["test_per_class"] * 13,
        "split_allocation": config["split_allocation"],
        "conditions": list(conditions.keys()),
        "output_directory": str(output_dir),
    }

    # Persist artifacts
    (output_dir / "run_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (output_dir / "episode_predictions.json").write_text(json.dumps(all_episode_logs, indent=2), encoding="utf-8")
    (output_dir / "seed_metrics.json").write_text(json.dumps(all_seed_metrics, indent=2), encoding="utf-8")
    (output_dir / "summary_metrics.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    report_path = output_dir / "pilot_report.md"
    generate_pilot_markdown_report(metadata, summary, report_path)

    return {
        "metadata": metadata,
        "summary": summary,
        "seed_metrics": all_seed_metrics,
        "episode_count": len(all_episode_logs),
        "report_path": str(report_path),
    }


if __name__ == "__main__":
    out_dir_arg = None
    if "--output-dir" in sys.argv:
        idx = sys.argv.index("--output-dir")
        if idx + 1 < len(sys.argv):
            out_dir_arg = sys.argv[idx + 1]

    print("Launching NoyyalSense Attribution Pilot...")
    out = run_pilot_pipeline(output_dir_override=out_dir_arg)
    print("Pilot completed successfully.")
    print(f"Summary persisted to {out['report_path']}")
