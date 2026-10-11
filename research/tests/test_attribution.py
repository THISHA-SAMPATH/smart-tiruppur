"""Comprehensive Unit and Verification Tests for Source Attribution Framework.

Tests all verification requirements for Phase 2.1 Audit:
1. Threshold detection on hand-constructed normal and abnormal examples.
2. Correct behavior for the background/no-source class.
3. No use of true-source labels as predictive features (leakage prevention).
4. Probability outputs and calibration behavior.
5. High-uncertainty or ambiguous cases producing ABSTAIN.
6. Sensor faults causing abstention only when the configured diagnostic rule is triggered.
7. Correct accepted-prediction and coverage denominators.
8. Zero-denominator handling across all evaluation metrics (strictly returning None when undefined).
9. No use of future observations or un-arrived telemetry at decision time.
10. No episode overlap across train, calibration, validation and test splits.
11. Deterministic outputs under fixed seeds.
12. Multiclass Brier score, log loss, and Expected Calibration Error (ECE) on hand-calculated examples.
13. Acceptance threshold tuning strictly using validation split without test set access.
14. Separation of primary unprivileged baselines from secondary privileged heuristic.
15. Small synthetic smoke-run pilot confirming end-to-end pipeline execution.
"""

from __future__ import annotations

import json
from pathlib import Path
import unittest

import numpy as np

from research.configs import *
from research.evaluation.attribution_metrics import (
    abstention_appropriateness_rate,
    abstention_fault_cooccurrence_rate,
    abstention_rate,
    attribution_macro_f1,
    compute_risk_coverage_curve,
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
    ThresholdHeuristicAttributor,
)
from research.models.feature_extractor import ObservableFeatureExtractor
from research.models.selective_attributor import (
    AbstainCauseCode,
    SelectiveAttributionConfig,
    SelectiveAttributor,
    create_ablation_model,
)
from research.models.sensor_diagnostics import DiagnosticConfig, SensorDiagnostics
from research.simulation.river_ade_simulator import SimulationConfig
from research.simulation.synthetic_event_generator import (
    SyntheticEventGenerator,
    partition_dataset_four_way,
)


class TestAttributionFramework(unittest.TestCase):
    """Test suite covering attribution baselines, selective decision rules, and metrics."""

    @classmethod
    def setUpClass(cls) -> None:
        cfg_path = Path(__file__).resolve().parents[1] / "configs" / "simulation_params.json"
        cls.sim_config = SimulationConfig.from_json(cfg_path)
        cls.candidate_sources = [
            {"source_id": s.source_id, "name": s.name, "chainage_m": s.chainage_m, "nominal_mass_rate_gps": s.nominal_mass_rate_gps}
            for s in cls.sim_config.sources
        ]
        cls.monitoring_stations = [
            {"station_id": s.station_id, "name": s.name, "chainage_m": s.chainage_m}
            for s in cls.sim_config.stations
        ]

    # --------------------------------------------------------------------------
    # 1. Threshold Detection on Hand-Constructed Examples
    # --------------------------------------------------------------------------
    def test_threshold_detection_hand_constructed(self) -> None:
        detector = ThresholdEventDetector(threshold_gpm3=2.0)
        times = np.arange(0, 3600, 300, dtype=np.float64)
        arrivals = {"sensor_002": times.copy(), "sensor_003": times.copy()}

        clean_vals = {
            "sensor_002": np.zeros_like(times),
            "sensor_003": np.zeros_like(times),
        }
        res_clean = detector.detect(
            event_id="test_clean",
            sample_times_sec=times,
            station_arrival_times=arrivals,
            station_values=clean_vals,
            decision_time_sec=3600.0,
        )
        self.assertFalse(res_clean.detected)
        self.assertEqual(res_clean.peak_concentration_gpm3, 0.0)
        self.assertIsNone(res_clean.triggering_station)

        abnormal_vals = {
            "sensor_002": np.zeros_like(times),
            "sensor_003": np.zeros_like(times),
        }
        abnormal_vals["sensor_002"][4] = 8.5
        res_abnormal = detector.detect(
            event_id="test_abnormal",
            sample_times_sec=times,
            station_arrival_times=arrivals,
            station_values=abnormal_vals,
            decision_time_sec=3600.0,
        )
        self.assertTrue(res_abnormal.detected)
        self.assertEqual(res_abnormal.peak_concentration_gpm3, 8.5)
        self.assertEqual(res_abnormal.triggering_station, "sensor_002")
        self.assertEqual(res_abnormal.detection_time_sec, 1200.0)

    # --------------------------------------------------------------------------
    # 2. Correct Behavior for Background / No-Source Class
    # --------------------------------------------------------------------------
    def test_background_no_source_class(self) -> None:
        times = np.arange(0, 7200, 300, dtype=np.float64)
        arrivals = {s["station_id"]: times.copy() for s in self.monitoring_stations}
        zero_vals = {s["station_id"]: np.zeros_like(times) for s in self.monitoring_stations}

        m1 = NearestUpstreamHeuristicAttributor(
            candidate_sources=self.candidate_sources,
            monitoring_stations=self.monitoring_stations,
            threshold_gpm3=2.0,
        )
        res_m1 = m1.attribute(
            event_id="bg_001",
            sample_times_sec=times,
            station_arrival_times=arrivals,
            station_values=zero_vals,
            decision_time_sec=7200.0,
        )
        self.assertEqual(res_m1.predicted_source, "s0_background")

        m2 = SpatialTransitHeuristicAttributor(
            candidate_sources=self.candidate_sources,
            monitoring_stations=self.monitoring_stations,
            threshold_gpm3=2.0,
        )
        res_m2 = m2.attribute(
            event_id="bg_002",
            sample_times_sec=times,
            station_arrival_times=arrivals,
            station_values=zero_vals,
            decision_time_sec=7200.0,
        )
        self.assertEqual(res_m2.predicted_source, "s0_background")

    # --------------------------------------------------------------------------
    # 3. No True-Source Labels as Predictive Features (Leakage Prevention)
    # --------------------------------------------------------------------------
    def test_no_true_source_label_leakage(self) -> None:
        extractor = ObservableFeatureExtractor()
        names = extractor.get_feature_names()

        forbidden_substrings = [
            "true_source", "ground_truth", "injection", "mass_rate",
            "spill_duration", "label", "target", "source_id", "sim_seed"
        ]
        for name in names:
            for forbidden in forbidden_substrings:
                self.assertNotIn(forbidden, name.lower(), f"Potential leakage in feature name: {name}")

        import inspect
        sig = inspect.signature(extractor.extract)
        params = list(sig.parameters.keys())
        self.assertNotIn("true_source_id", params)
        self.assertNotIn("ground_truth", params)
        self.assertNotIn("spill_injection", params)

    # --------------------------------------------------------------------------
    # 4. Probability Outputs and Calibration Behavior
    # --------------------------------------------------------------------------
    def test_probability_outputs_and_calibration(self) -> None:
        rng = np.random.default_rng(101)
        n_samples = 40
        n_features = len(ObservableFeatureExtractor().get_feature_names())

        X_train = rng.normal(size=(n_samples, n_features))
        y_train = rng.choice(["s0_background", "unit_001", "unit_002"], size=n_samples)

        X_cal = rng.normal(size=(20, n_features))
        y_cal = rng.choice(["s0_background", "unit_001", "unit_002"], size=20)

        model = SelectiveAttributor(SelectiveAttributionConfig(n_estimators=30, random_state=42))
        model.fit_base_model(X_train, y_train)
        self.assertTrue(model.is_fitted)
        self.assertEqual(model.temperature_, 1.0)

        model.calibrate(X_cal, y_cal)
        self.assertTrue(model.is_calibrated)
        self.assertGreater(model.temperature_, 0.0)

        times = np.arange(0, 3600, 300, dtype=np.float64)
        arrivals = {s["station_id"]: times.copy() for s in self.monitoring_stations}
        vals = {s["station_id"]: rng.uniform(0.0, 5.0, size=len(times)) for s in self.monitoring_stations}

        res = model.predict_single(
            event_id="test_prob",
            sample_times_sec=times,
            station_arrival_times=arrivals,
            station_values=vals,
            decision_time_sec=3600.0,
        )
        if res.calibrated_probabilities:
            prob_sum = sum(res.calibrated_probabilities.values())
            self.assertAlmostEqual(prob_sum, 1.0, places=5)
            for p in res.calibrated_probabilities.values():
                self.assertGreaterEqual(p, 0.0)
                self.assertLessEqual(p, 1.0)

    # --------------------------------------------------------------------------
    # 5. High-Uncertainty or Ambiguous Cases Producing ABSTAIN
    # --------------------------------------------------------------------------
    def test_high_uncertainty_or_ambiguous_causes_abstain(self) -> None:
        rng = np.random.default_rng(202)
        n_features = len(ObservableFeatureExtractor().get_feature_names())
        X_train = rng.normal(size=(30, n_features))
        y_train = rng.choice(["unit_001", "unit_002"], size=30)

        cfg = SelectiveAttributionConfig(tau_conf=0.95, delta_margin=0.30, n_estimators=20)
        model = SelectiveAttributor(cfg)
        model.fit_base_model(X_train, y_train)
        model.calibrate(X_train[:10], y_train[:10])

        times = np.arange(0, 3600, 300, dtype=np.float64)
        arrivals = {s["station_id"]: times.copy() for s in self.monitoring_stations}
        vals = {s["station_id"]: rng.uniform(0.0, 3.0, size=len(times)) for s in self.monitoring_stations}

        res = model.predict_single(
            event_id="test_uncertain",
            sample_times_sec=times,
            station_arrival_times=arrivals,
            station_values=vals,
            decision_time_sec=3600.0,
        )
        self.assertEqual(res.decision, "ABSTAIN")
        self.assertIsNone(res.predicted_source)
        self.assertIn(res.abstain_cause, [AbstainCauseCode.LOW_CONFIDENCE.value, AbstainCauseCode.AMBIGUOUS_MARGIN.value])

    # --------------------------------------------------------------------------
    # 6. Sensor Faults Causing Abstention via Diagnostic Gate
    # --------------------------------------------------------------------------
    def test_sensor_faults_cause_abstention_via_diagnostic(self) -> None:
        diagnostics = SensorDiagnostics()
        times = np.arange(0, 3600, 300, dtype=np.float64)

        missing_vals = np.zeros(len(times))
        missing_vals[:5] = np.nan
        is_missing, ratio = diagnostics.check_missingness(missing_vals)
        self.assertTrue(is_missing)
        self.assertGreater(ratio, 0.20)

        stuck_vals = np.array([15.0] * 8 + [12.0, 10.0, 5.0, 0.0])
        is_stuck, steps, val = diagnostics.check_stuck_value(stuck_vals)
        self.assertTrue(is_stuck)
        self.assertEqual(val, 15.0)

        clean_vals = np.zeros(len(times))
        is_clean_stuck, _, _ = diagnostics.check_stuck_value(clean_vals)
        self.assertFalse(is_clean_stuck, "Clean baseline at 0.0 g/m³ must not be misidentified as stuck register")

        delayed_arrivals = times + 7200.0
        is_delayed, delay_sec, _ = diagnostics.check_telemetry_latency(
            sample_times_sec=times,
            arrival_times_sec=delayed_arrivals,
            decision_time_sec=10000.0,
        )
        self.assertTrue(is_delayed)
        self.assertEqual(delay_sec, 7200.0)

        rng = np.random.default_rng(303)
        n_features = len(ObservableFeatureExtractor().get_feature_names())
        X_train = rng.normal(size=(20, n_features))
        y_train = np.array(["unit_001"] * 10 + ["unit_002"] * 10)

        model = SelectiveAttributor(SelectiveAttributionConfig(tau_conf=0.10, delta_margin=0.01))
        model.fit_base_model(X_train, y_train)
        model.calibrate(X_train, y_train)

        stuck_station_vals = {
            "sensor_001": np.zeros(len(times)),
            "sensor_002": np.full(len(times), 14.5),
            "sensor_003": np.zeros(len(times)),
        }
        res = model.predict_single(
            event_id="test_stuck_gate",
            sample_times_sec=times,
            station_arrival_times={"sensor_001": times, "sensor_002": times, "sensor_003": times},
            station_values=stuck_station_vals,
            decision_time_sec=3600.0,
        )
        self.assertEqual(res.decision, "ABSTAIN")
        self.assertEqual(res.abstain_cause, AbstainCauseCode.SENSOR_FAULT_STUCK.value)

    def test_stuck_value_diagnostic_explicit_evidence_rules(self) -> None:
        """Verifies diagnostic rules separating physical state, numerical floor, and hardware freezes."""
        diag = SensorDiagnostics(DiagnosticConfig(
            min_stuck_steps=6,
            stuck_tolerance=1e-4,
            baseline_value=0.0,
            numerical_floor=1e-3,
        ))

        # 1. Constant near-zero clean readings (e.g. numerical diffusion tail ~ 1e-5 g/m³)
        near_zero_vals = np.full(50, 2.36e-5)
        is_stuck, _, _ = diag.check_stuck_value(near_zero_vals)
        self.assertFalse(is_stuck, "Constant near-zero sequence below numerical floor must not be flagged as stuck")

        # 2. A clean background episode (exactly 0.0 g/m³)
        clean_bg_vals = np.zeros(50)
        is_stuck, _, _ = diag.check_stuck_value(clean_bg_vals)
        self.assertFalse(is_stuck, "Clean background at 0.0 g/m³ must not be flagged as stuck")

        # 3. Stuck sensor frozen at a meaningful non-background value
        frozen_vals = np.concatenate([np.zeros(10), np.full(8, 2.5), np.zeros(10)])
        is_stuck, steps, val = diag.check_stuck_value(frozen_vals)
        self.assertTrue(is_stuck, "Frozen non-background signal must be detected as stuck")
        self.assertGreaterEqual(steps, 6)
        self.assertAlmostEqual(val, 2.5, places=4)

        # 4. Missing observations overlapping a stuck window
        stuck_with_nans = np.array([2.5, 2.5, np.nan, 2.5, 2.5, np.nan, 2.5, 2.5, 0.0])
        is_stuck, steps, val = diag.check_stuck_value(stuck_with_nans)
        self.assertTrue(is_stuck, "Missing observations inside stuck window must not prevent stuck detection")
        self.assertGreaterEqual(steps, 6)
        self.assertAlmostEqual(val, 2.5, places=4)

        # 5. Real plume signal that varies during the observation window
        dynamic_plume = np.array([0.0, 0.1, 0.5, 1.2, 2.8, 3.5, 2.4, 1.1, 0.4, 0.05, 0.0])
        is_stuck, _, _ = diag.check_stuck_value(dynamic_plume)
        self.assertFalse(is_stuck, "Dynamically varying plume signal must not be flagged as stuck")

        # 6. Reproducibility under fixed seeds
        rng = np.random.default_rng(42)
        random_series = rng.normal(loc=1.0, scale=0.5, size=30)
        res1 = diag.check_stuck_value(random_series)
        res2 = diag.check_stuck_value(random_series)
        self.assertEqual(res1, res2, "Diagnostic evaluation must be bitwise reproducible under identical inputs")

    # --------------------------------------------------------------------------
    # 7. Correct Accepted-Prediction and Coverage Denominators
    # --------------------------------------------------------------------------
    def test_correct_accepted_prediction_and_coverage_denominators(self) -> None:
        y_true = ["unit_001", "unit_002", "unit_003", "unit_004", "unit_005"]
        decisions = ["ATTRIBUTE", "ATTRIBUTE", "ATTRIBUTE", "ABSTAIN", "ABSTAIN"]
        y_pred = ["unit_001", "unit_009", "unit_003", None, None]

        cov = decision_coverage(decisions)
        self.assertAlmostEqual(cov, 3 / 5)

        abst_rate = abstention_rate(decisions)
        self.assertAlmostEqual(abst_rate, 2 / 5)

        risk = selective_risk(y_true, y_pred, decisions)
        self.assertAlmostEqual(risk, 1 / 3)

        acc = selective_accuracy(y_true, y_pred, decisions)
        self.assertAlmostEqual(acc, 2 / 3)

        self.assertAlmostEqual(risk + acc, 1.0)

    # --------------------------------------------------------------------------
    # 8. Zero-Denominator Handling across All Metrics (Phase 2.1 Audit)
    # --------------------------------------------------------------------------
    def test_zero_denominator_handling_in_metrics(self) -> None:
        # A. 100% Abstentions (0 accepted decisions): selective risk & accuracy MUST be None
        decisions_all_abstain = ["ABSTAIN", "ABSTAIN", "ABSTAIN"]
        y_true = ["unit_001", "unit_002", "unit_003"]
        y_pred = [None, None, None]

        self.assertIsNone(selective_risk(y_true, y_pred, decisions_all_abstain))
        self.assertIsNone(selective_accuracy(y_true, y_pred, decisions_all_abstain))
        self.assertEqual(decision_coverage(decisions_all_abstain), 0.0)
        self.assertEqual(abstention_rate(decisions_all_abstain), 1.0)

        # B. 0% Abstentions: abstention appropriateness rate MUST be None
        decisions_no_abstain = ["ATTRIBUTE", "ATTRIBUTE"]
        self.assertIsNone(abstention_appropriateness_rate(decisions_no_abstain, [False, False]))

        # C. Empty lists: all undefined metrics MUST return None
        self.assertIsNone(decision_coverage([]))
        self.assertIsNone(abstention_rate([]))
        self.assertIsNone(selective_risk([], [], []))
        self.assertIsNone(selective_accuracy([], [], []))
        self.assertIsNone(detection_rate([], []))
        self.assertIsNone(false_alarm_rate([], []))
        self.assertIsNone(overall_accuracy([], []))
        self.assertIsNone(attribution_macro_f1([], []))
        self.assertIsNone(abstention_appropriateness_rate([], []))
        self.assertIsNone(mean_time_to_detect_hours([], [], []))

        # D. No positive events: detection_rate MUST be None
        self.assertIsNone(detection_rate([False, False], [False, True]))

        # E. No clean background events: false_alarm_rate MUST be None
        self.assertIsNone(false_alarm_rate([True, True], [True, False]))

        # F. Formatting utility correctly preserves None without converting to 0.0
        self.assertEqual(format_metric(None), "N/A (undefined)")
        self.assertEqual(format_metric(float("nan")), "N/A (undefined)")
        self.assertEqual(format_metric(0.0), "0.0000")

    # --------------------------------------------------------------------------
    # 9. No Future Observations or Un-Arrived Packets at Decision Time
    # --------------------------------------------------------------------------
    def test_no_future_observations_at_decision_time(self) -> None:
        times = np.array([1000.0, 2000.0, 3000.0, 4000.0, 5000.0])
        arrivals = {"sensor_002": np.array([1000.0, 2000.0, 3000.0, 6000.0, 5000.0])}
        vals = {"sensor_002": np.array([0.0, 0.0, 0.0, 99.0, 0.0])}

        extractor = ObservableFeatureExtractor()
        feats = extractor.extract(
            sample_times_sec=times,
            station_arrival_times=arrivals,
            station_values=vals,
            decision_time_sec=4500.0,
        )
        names = extractor.get_feature_names()
        s2_peak_idx = names.index("sensor_002_peak_excursion_gpm3")
        self.assertEqual(feats[s2_peak_idx], 0.0, "Telemetry that arrived after decision time was improperly observed!")

    # --------------------------------------------------------------------------
    # 10. No Episode Overlap across Train, Cal, Val, and Test Splits
    # --------------------------------------------------------------------------
    def test_no_episode_overlap_across_splits(self) -> None:
        gen = SyntheticEventGenerator(self.sim_config)
        dataset = gen.generate_suite(n_events=16, base_seed=42, background_ratio=0.125)

        train_set, cal_set, val_set, test_set = partition_dataset_four_way(
            dataset, train_ratio=0.50, cal_ratio=0.20, val_ratio=0.15, test_ratio=0.15, seed=99
        )

        tr_ids = set(train_set.get_event_ids())
        cal_ids = set(cal_set.get_event_ids())
        val_ids = set(val_set.get_event_ids())
        te_ids = set(test_set.get_event_ids())

        self.assertEqual(len(tr_ids) + len(cal_ids) + len(val_ids) + len(te_ids), 16)
        self.assertEqual(len(tr_ids.intersection(cal_ids)), 0)
        self.assertEqual(len(tr_ids.intersection(val_ids)), 0)
        self.assertEqual(len(tr_ids.intersection(te_ids)), 0)
        self.assertEqual(len(cal_ids.intersection(val_ids)), 0)
        self.assertEqual(len(cal_ids.intersection(te_ids)), 0)
        self.assertEqual(len(val_ids.intersection(te_ids)), 0)

    # --------------------------------------------------------------------------
    # 11. Deterministic Outputs under Fixed Seeds
    # --------------------------------------------------------------------------
    def test_deterministic_outputs_under_fixed_seeds(self) -> None:
        gen = SyntheticEventGenerator(self.sim_config)
        res1, meta1 = gen.generate_single_event("ev_det_1", "unit_001", seed=777)
        res2, meta2 = gen.generate_single_event("ev_det_2", "unit_001", seed=777)

        np.testing.assert_array_equal(res1.timestamps_sec, res2.timestamps_sec)
        for s_id in res1.station_observations:
            np.testing.assert_array_almost_equal(
                res1.station_observations[s_id],
                res2.station_observations[s_id],
            )
        self.assertEqual(meta1.total_mass_grams, meta2.total_mass_grams)

    # --------------------------------------------------------------------------
    # 12. Multiclass Calibration Metrics Hand-Constructed Examples (Phase 2.1)
    # --------------------------------------------------------------------------
    def test_multiclass_brier_score_hand_constructed(self) -> None:
        classes = ["A", "B"]
        # Sample 1: true A, pred [0.8, 0.2] -> squared diff: (0.8-1)^2 + (0.2-0)^2 = 0.04 + 0.04 = 0.08
        # Sample 2: true B, pred [0.3, 0.7] -> squared diff: (0.3-0)^2 + (0.7-1)^2 = 0.09 + 0.09 = 0.18
        # Mean Brier score: (0.08 + 0.18) / 2 = 0.13
        y_true = ["A", "B"]
        probs = np.array([[0.8, 0.2], [0.3, 0.7]])
        bs = multiclass_brier_score(y_true, probs, classes)
        self.assertIsNotNone(bs)
        self.assertAlmostEqual(bs, 0.13, places=5)

        # Empty returns None
        self.assertIsNone(multiclass_brier_score([], np.empty((0, 2)), classes))

    def test_multiclass_log_loss_hand_constructed(self) -> None:
        classes = ["A", "B"]
        # Sample 1: true A, pred [0.8, 0.2] -> -ln(0.8) = 0.22314355
        # Sample 2: true B, pred [0.2, 0.8] -> -ln(0.8) = 0.22314355
        # Mean NLL: 0.22314355
        y_true = ["A", "B"]
        probs = np.array([[0.8, 0.2], [0.2, 0.8]])
        nll = multiclass_log_loss(y_true, probs, classes)
        self.assertIsNotNone(nll)
        expected_nll = float(-np.log(0.8))
        self.assertAlmostEqual(nll, expected_nll, places=5)

        # Empty returns None
        self.assertIsNone(multiclass_log_loss([], np.empty((0, 2)), classes))

    def test_expected_calibration_error_hand_constructed(self) -> None:
        # 4 samples with confidence 0.85 (in bin (0.8, 0.9])
        # 3 correct, 1 wrong -> bin accuracy = 3/4 = 0.75, bin confidence = 0.85
        # Calibration gap = |0.75 - 0.85| = 0.10. Weight = 4/4 = 1.0. ECE = 0.10
        # All other 9 bins are empty (|B_m| = 0) and contribute 0.0
        confs = [0.85, 0.85, 0.85, 0.85]
        accs = [True, True, True, False]
        ece = expected_calibration_error(confs, accs, n_bins=10)
        self.assertIsNotNone(ece)
        self.assertAlmostEqual(ece, 0.10, places=5)

        # Empty returns None
        self.assertIsNone(expected_calibration_error([], []))

    # --------------------------------------------------------------------------
    # 13. Acceptance Threshold Tuning Strictly on Validation Split (Phase 2.1)
    # --------------------------------------------------------------------------
    def test_acceptance_threshold_tuning_on_validation(self) -> None:
        rng = np.random.default_rng(404)
        n_features = len(ObservableFeatureExtractor().get_feature_names())

        # Create distinct Train, Calibration, and Validation sets
        X_train = rng.normal(size=(30, n_features))
        y_train = rng.choice(["unit_001", "unit_002", "unit_003"], size=30)

        X_cal = rng.normal(size=(15, n_features))
        y_cal = rng.choice(["unit_001", "unit_002", "unit_003"], size=15)

        X_val = rng.normal(size=(20, n_features))
        y_val = rng.choice(["unit_001", "unit_002", "unit_003"], size=20)

        model = SelectiveAttributor(SelectiveAttributionConfig(n_estimators=20, random_state=42))
        model.fit_base_model(X_train, y_train)
        model.calibrate(X_cal, y_cal)

        # Tune thresholds strictly on validation split
        tuning_report = model.tune_thresholds_on_validation(
            X_val=X_val,
            y_val=y_val,
            target_max_risk=0.10,
            tau_candidates=[0.30, 0.50, 0.70],
            delta_candidates=[0.00, 0.10, 0.20],
        )

        self.assertTrue(model.thresholds_locked)
        self.assertIn("selected_tau", tuning_report)
        self.assertIn("selected_delta", tuning_report)
        self.assertEqual(model.config.tau_conf, tuning_report["selected_tau"])
        self.assertEqual(model.config.delta_margin, tuning_report["selected_delta"])

    # --------------------------------------------------------------------------
    # 14. Primary vs Secondary Baseline Separation & Metadata (Phase 2.1)
    # --------------------------------------------------------------------------
    def test_primary_vs_secondary_baseline_separation(self) -> None:
        # NearestUpstreamHeuristicAttributor is unprivileged (no nominal capacity used)
        m1_unprivileged = NearestUpstreamHeuristicAttributor(
            candidate_sources=self.candidate_sources,
            monitoring_stations=self.monitoring_stations,
            threshold_gpm3=2.0,
        )
        self.assertEqual(m1_unprivileged.detector.threshold_gpm3, 2.0)

        # Secondary privileged heuristic explicitly marks metadata
        m1_privileged = SecondaryPrivilegedCapacityHeuristicAttributor(
            candidate_sources=self.candidate_sources,
            monitoring_stations=self.monitoring_stations,
            threshold_gpm3=2.0,
        )
        times = np.arange(0, 3600, 300, dtype=np.float64)
        spike_vals = {"sensor_002": np.full(len(times), 10.0), "sensor_003": np.zeros(len(times))}
        arrivals = {"sensor_002": times, "sensor_003": times}

        res_priv = m1_privileged.attribute("priv_01", times, arrivals, spike_vals, 3600.0)
        self.assertTrue(res_priv.metadata.get("is_privileged_prior", False))

        # Check threshold documentation tag
        self.assertEqual(res_priv.detection.metadata.get("threshold_type"), "synthetic_screening_benchmark_only")

    # --------------------------------------------------------------------------
    # 15. Small Synthetic Smoke Run Pilot
    # --------------------------------------------------------------------------
    def test_smoke_run_pilot(self) -> None:
        gen = SyntheticEventGenerator(self.sim_config)
        pilot_dataset = gen.generate_suite(n_events=8, base_seed=123, background_ratio=0.25)
        self.assertEqual(len(pilot_dataset.metadata), 8)

        train_s, cal_s, val_s, test_s = partition_dataset_four_way(
            pilot_dataset, train_ratio=0.50, cal_ratio=0.25, val_ratio=0.125, test_ratio=0.125, seed=42
        )
        extractor = ObservableFeatureExtractor()

        def _extract_matrix(ds):
            X, y = [], []
            for ep, meta in zip(ds.episodes, ds.metadata):
                times = ep.timestamps_sec
                arrivals = {k: times.copy() for k in ep.station_observations.keys()}
                f = extractor.extract(times, arrivals, ep.station_observations, decision_time_sec=86400.0)
                X.append(f)
                y.append(meta.true_source_id)
            return np.array(X), np.array(y)

        X_tr, y_tr = _extract_matrix(train_s)
        X_cal, y_cal = _extract_matrix(cal_s)
        X_val, y_val = _extract_matrix(val_s)
        X_te, y_te = _extract_matrix(test_s)

        # 1. Fit M3 conventional classifier
        m3 = ConventionalClassifier(n_estimators=10, random_state=42)
        m3.fit(X_tr, y_tr)

        # 2. Fit M4 selective attributor, calibrate on cal split, tune thresholds on val split
        m4 = SelectiveAttributor(SelectiveAttributionConfig(n_estimators=10))
        m4.fit_base_model(X_tr, y_tr)
        m4.calibrate(X_cal, y_cal)
        self.assertTrue(m4.is_calibrated)

        m4.tune_thresholds_on_validation(X_val, y_val, target_max_risk=0.20)
        self.assertTrue(m4.thresholds_locked)

        # 3. Predict on test split
        decisions = []
        preds = []
        for ep, meta in zip(test_s.episodes, test_s.metadata):
            times = ep.timestamps_sec
            arrivals = {k: times.copy() for k in ep.station_observations.keys()}
            res = m4.predict_single(
                event_id=ep.event_id,
                sample_times_sec=times,
                station_arrival_times=arrivals,
                station_values=ep.station_observations,
                decision_time_sec=86400.0,
            )
            decisions.append(res.decision)
            preds.append(res.predicted_source)

        cov = decision_coverage(decisions)
        risk = selective_risk(y_te, preds, decisions)
        self.assertIsNotNone(cov)
        self.assertTrue(0.0 <= cov <= 1.0)
        if risk is not None:
            self.assertTrue(0.0 <= risk <= 1.0)

    # --------------------------------------------------------------------------
    # 16. Hand-Constructed Abstention Evaluation Metrics (Phase 3.3 Audit)
    # --------------------------------------------------------------------------
    def test_abstention_evaluation_metrics_hand_constructed(self) -> None:
        """Verifies decoupled abstention metrics on hand-calculated scenarios."""
        # 1. Fault co-occurrence rate:
        # 4 episodes: 2 ABSTAIN (1 with fault, 1 without), 2 ATTRIBUTE
        decisions_1 = ["ABSTAIN", "ABSTAIN", "ATTRIBUTE", "ATTRIBUTE"]
        has_fault_1 = [True, False, True, False]
        cooccur = abstention_fault_cooccurrence_rate(decisions_1, has_fault_1)
        self.assertEqual(cooccur, 0.5)

        # Undefined when zero abstentions:
        no_abstains = ["ATTRIBUTE", "ATTRIBUTE"]
        self.assertIsNone(abstention_fault_cooccurrence_rate(no_abstains, [True, False]))

        # 2. Selective Error Avoidance Rate (EAR):
        # 4 episodes:
        # Episode 0: true="s1", forced="s2" (error) -> ABSTAIN -> avoids error!
        # Episode 1: true="s2", forced="s2" (correct) -> ABSTAIN -> sacrificed coverage without avoiding error
        # Episode 2: true="s3", forced="s3" -> ATTRIBUTE
        # Episode 3: true="s4", forced="s1" -> ATTRIBUTE
        y_true = ["s1", "s2", "s3", "s4"]
        y_forced = ["s2", "s2", "s3", "s1"]
        ear = selective_error_avoidance_rate(y_true, y_forced, decisions_1)
        self.assertEqual(ear, 0.5)  # 1 avoided error out of 2 abstentions

        # Undefined when zero abstentions:
        self.assertIsNone(selective_error_avoidance_rate(y_true[:2], y_forced[:2], no_abstains))

        # 3. Fault Diagnostic Precision:
        # Decisions with specific diagnostic causes vs non-diagnostic causes
        decisions_diag = ["ABSTAIN", "ABSTAIN", "ABSTAIN", "ATTRIBUTE"]
        causes = ["SENSOR_FAULT_STUCK", "SENSOR_FAULT_DROPOUT", "LOW_CONFIDENCE", None]
        has_fault_diag = [True, False, True, False]
        # Diagnostic abstentions: 2 (indices 0 and 1)
        # TP: index 0 (stuck + True)
        # FP: index 1 (dropout + False)
        # Index 2 has fault, but was abstained due to LOW_CONFIDENCE, so not counted in diagnostic vetoes
        diag_prec = fault_diagnostic_precision(decisions_diag, causes, has_fault_diag)
        self.assertEqual(diag_prec, 0.5)

        # Undefined when zero diagnostic alarms triggered:
        causes_none = ["LOW_CONFIDENCE", "AMBIGUOUS_MARGIN", None, None]
        self.assertIsNone(fault_diagnostic_precision(decisions_diag, causes_none, has_fault_diag))

    # --------------------------------------------------------------------------
    # 17. Direct Equivalence of M1 and M2 Scoring Formulas (Phase 3.3 Audit)
    # --------------------------------------------------------------------------
    def test_spatial_transit_monotonic_equivalence_with_nearest(self) -> None:
        """Directly verifies that M1 and M2 produce identical source rankings."""
        m1 = NearestUpstreamHeuristicAttributor(
            candidate_sources=self.candidate_sources,
            monitoring_stations=self.monitoring_stations,
            threshold_gpm3=2.0,
        )
        m2 = SpatialTransitHeuristicAttributor(
            candidate_sources=self.candidate_sources,
            monitoring_stations=self.monitoring_stations,
            flow_velocity_mps=0.25,
            threshold_gpm3=2.0,
        )

        times = np.arange(0, 3600, 300, dtype=np.float64)
        arrivals = {"sensor_002": times, "sensor_003": times}

        # Spike at sensor_002 (chainage 14800 m)
        spike_vals = {
            "sensor_002": np.full(len(times), 8.0),
            "sensor_003": np.zeros(len(times)),
        }

        res_m1 = m1.attribute("ev_mono_1", times, arrivals, spike_vals, 3600.0)
        res_m2 = m2.attribute("ev_mono_1", times, arrivals, spike_vals, 3600.0)

        # Confirm exact identical source selection
        self.assertEqual(res_m1.predicted_source, res_m2.predicted_source)

        # Spike at sensor_003 (chainage 28500 m)
        spike_vals_2 = {
            "sensor_002": np.zeros(len(times)),
            "sensor_003": np.full(len(times), 12.0),
        }
        res_m1_s2 = m1.attribute("ev_mono_2", times, arrivals, spike_vals_2, 3600.0)
        res_m2_s2 = m2.attribute("ev_mono_2", times, arrivals, spike_vals_2, 3600.0)

        self.assertEqual(res_m1_s2.predicted_source, res_m2_s2.predicted_source)

    # --------------------------------------------------------------------------
    # 18. Matched-Coverage Confidence Selective Classifier (Phase 3.3 Audit)
    # --------------------------------------------------------------------------
    def test_confidence_selective_baseline(self) -> None:
        """Verifies M3-Selective (conventional RF + confidence-only rejection)."""
        rng = np.random.default_rng(42)
        n_samples = 60
        n_features = len(ObservableFeatureExtractor().get_feature_names())
        X_train = rng.normal(size=(n_samples, n_features))
        y_train = np.array(["s1", "s2", "s3"] * (n_samples // 3))

        base_clf = ConventionalClassifier(n_estimators=10, random_state=42)
        base_clf.fit(X_train, y_train)

        m3_sel = ConfidenceSelectiveClassifier(base_classifier=base_clf)

        # Validation set for threshold tuning
        X_val = rng.normal(size=(30, n_features))
        y_val = np.array(["s1", "s2", "s3"] * 10)

        tuned_tau = m3_sel.tune_threshold_on_validation(
            X_val,
            y_val,
            tau_candidates=[0.30, 0.40, 0.50, 0.60, 0.70],
            target_max_risk=0.15,
        )
        self.assertIn(tuned_tau, [0.30, 0.40, 0.50, 0.60, 0.70])
        self.assertEqual(m3_sel.tau_conf, tuned_tau)

        # Single prediction test
        times = np.arange(0, 3600, 300, dtype=np.float64)
        arrivals = {"sensor_002": times}
        obs = {"sensor_002": np.zeros(len(times))}

        res = m3_sel.predict_single(
            event_id="test_sel_01",
            sample_times_sec=times,
            station_arrival_times=arrivals,
            station_values=obs,
            decision_time_sec=3600.0,
        )
        self.assertIn(res.decision, ["ATTRIBUTE", "ABSTAIN"])
        if res.decision == "ABSTAIN":
            self.assertIsNone(res.predicted_source)
            self.assertEqual(res.metadata.get("abstain_cause"), "LOW_CONFIDENCE")
        else:
            self.assertIsNotNone(res.predicted_source)
            self.assertGreaterEqual(res.confidence, m3_sel.tau_conf)

    # --------------------------------------------------------------------------
    # 19. Target-Coverage Threshold Tuning for M3-Selective and M4 (Phase 3.4 Audit)
    # --------------------------------------------------------------------------
    def test_tune_threshold_for_target_coverage_m3_selective(self) -> None:
        """Verifies validation-calibrated target coverage tuning for M3-Selective."""
        rng = np.random.default_rng(101)
        n_samples = 60
        n_features = len(ObservableFeatureExtractor().get_feature_names())
        X_train = rng.normal(size=(n_samples, n_features))
        y_train = np.array(["s1", "s2", "s3"] * (n_samples // 3))

        base_clf = ConventionalClassifier(n_estimators=10, random_state=101)
        base_clf.fit(X_train, y_train)

        m3_sel = ConfidenceSelectiveClassifier(base_classifier=base_clf)
        X_val = rng.normal(size=(30, n_features))

        tau_selected = m3_sel.tune_threshold_for_target_coverage(
            X_val=X_val,
            target_coverage=0.50,
            tau_candidates=[0.20, 0.40, 0.60, 0.80],
        )
        self.assertIn(tau_selected, [0.20, 0.40, 0.60, 0.80])
        self.assertEqual(m3_sel.tau_conf, tau_selected)

    def test_tune_thresholds_for_target_coverage_m4(self) -> None:
        """Verifies validation-calibrated target coverage tuning for M4 Selective Attributor."""
        rng = np.random.default_rng(202)
        n_features = len(ObservableFeatureExtractor().get_feature_names())
        X_train = rng.normal(size=(30, n_features))
        y_train = np.array(["s1", "s2", "s3"] * 10)
        X_cal = rng.normal(size=(15, n_features))
        y_cal = np.array(["s1", "s2", "s3"] * 5)
        X_val = rng.normal(size=(15, n_features))
        y_val = np.array(["s1", "s2", "s3"] * 5)

        m4 = SelectiveAttributor(SelectiveAttributionConfig(n_estimators=10, random_state=202))
        m4.fit_base_model(X_train, y_train)
        m4.calibrate(X_cal, y_cal)

        report = m4.tune_thresholds_for_target_coverage(
            X_val=X_val,
            y_val=y_val,
            target_coverage=0.50,
            tau_candidates=[0.30, 0.50, 0.70],
            delta_candidates=[0.00, 0.10],
        )
        self.assertTrue(m4.thresholds_locked)
        self.assertIn("selected_tau", report)
        self.assertIn("selected_delta", report)
        self.assertIn("validation_coverage", report)
        self.assertEqual(report["target_coverage"], 0.50)


if __name__ == "__main__":
    unittest.main()

