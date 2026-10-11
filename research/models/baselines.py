"""Baseline Methodologies for River Contamination Detection and Attribution.

Architectural Design & Fair Comparison Invariants (Phase 2.1 Audit):
1. Separation of Detection from Attribution:
   - ThresholdEventDetector is strictly a detection baseline (Task 1). It identifies
     abnormal concentration excursions above a synthetic experimental threshold (2.0 g/m³).
     A threshold breach alone does not identify the responsible source.
   - The 2.0 g/m³ threshold is explicitly documented as a synthetic screening parameter,
     NOT a regulatory standard or empirically calibrated Noyyal River limit.
2. Fair Information Availability in Primary Attribution Comparison:
   - Primary baselines (M2 Spatial Transit, M3 Conventional Classifier, M4 Selective Attributor)
     rely strictly on observable telemetry measurements and topological network coordinates.
   - M1's use of nominal discharge capacity (nominal_mass_rate_gps) relies on privileged
     simulator metadata that would be unobservable in field operations during illicit spills.
   - The capacity-based rule is therefore segregated as a secondary benchmark
     (SecondaryPrivilegedCapacityHeuristicAttributor), while NearestUpstreamHeuristicAttributor
     and SpatialTransitHeuristicAttributor serve as unprivileged primary spatial baselines.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
from sklearn.ensemble import RandomForestClassifier

from .feature_extractor import ObservableFeatureExtractor


@dataclass
class DetectionResult:
    """Explicit decoupled outcome of the binary anomaly detection stage."""
    event_id: str
    detected: bool
    peak_concentration_gpm3: float
    threshold_gpm3: float  # Synthetic experimental threshold
    detection_time_sec: Optional[float]
    triggering_station: Optional[str]
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BaselineAttributionResult:
    """Outcome of a baseline source-attribution method."""
    event_id: str
    method_name: str
    decision: str  # Always "ATTRIBUTE" for forced-choice baselines
    predicted_source: str
    confidence: float
    margin: float
    detection: Optional[DetectionResult]
    metadata: Dict[str, Any] = field(default_factory=dict)


class ThresholdEventDetector:
    """Decoupled threshold-based anomaly detector.

    Assumptions & Provenance:
    - Identifies anomalous concentration excursions exceeding threshold_gpm3.
    - Scientific Calibration Caveat: The default threshold (2.0 g/m³) is a synthetic
      screening experimental threshold chosen for controlled benchmark SNR.
      It is NOT a statutory effluent standard (CPCB/TNPCB) or a calibrated real-river threshold.
    - A detection alarm indicates an anomaly exists, but does NOT identify the source.
    """

    def __init__(
        self,
        threshold_gpm3: float = 2.0,
        monitored_stations: Optional[List[str]] = None,
    ) -> None:
        self.threshold_gpm3 = threshold_gpm3
        self.monitored_stations = monitored_stations or ["sensor_002", "sensor_003"]

    def detect(
        self,
        event_id: str,
        sample_times_sec: np.ndarray,
        station_arrival_times: Dict[str, np.ndarray],
        station_values: Dict[str, np.ndarray],
        decision_time_sec: float,
    ) -> DetectionResult:
        max_val = 0.0
        earliest_time: Optional[float] = None
        trigger_station: Optional[str] = None

        for s_id in self.monitored_stations:
            vals = station_values.get(s_id, np.array([]))
            if len(vals) == 0:
                continue
            arrivals = station_arrival_times.get(s_id, sample_times_sec)

            valid_mask = (arrivals <= decision_time_sec) & (sample_times_sec <= decision_time_sec)
            s_times = sample_times_sec[valid_mask]
            avail_vals = vals[valid_mask]

            if len(avail_vals) == 0:
                continue

            non_nan_mask = ~np.isnan(avail_vals)
            if not np.any(non_nan_mask):
                continue

            clean_vals = avail_vals[non_nan_mask]
            clean_times = s_times[non_nan_mask]

            station_max = float(np.max(clean_vals))
            if station_max > max_val:
                max_val = station_max

            breach_indices = np.where(clean_vals >= self.threshold_gpm3)[0]
            if len(breach_indices) > 0:
                first_breach_time = float(clean_times[breach_indices[0]])
                if earliest_time is None or first_breach_time < earliest_time:
                    earliest_time = first_breach_time
                    trigger_station = s_id

        detected = max_val >= self.threshold_gpm3

        return DetectionResult(
            event_id=event_id,
            detected=detected,
            peak_concentration_gpm3=max_val,
            threshold_gpm3=self.threshold_gpm3,
            detection_time_sec=earliest_time,
            triggering_station=trigger_station,
            metadata={"threshold_type": "synthetic_screening_benchmark_only"},
        )


class NearestUpstreamHeuristicAttributor:
    """M1 (Unprivileged Primary): Threshold Detection + Nearest Upstream Facility Heuristic.

    Fair Information Availability:
    - Uses only topological channel distance (chainage_m) and sensor telemetry available at decision time.
    - Does NOT use synthetic generator emission rate metadata (nominal_mass_rate_gps).
    - If no anomaly is detected, attributes to 's0_background'.
    - If an anomaly is detected, blames the candidate source located nearest upstream
      of the earliest alarmed monitoring station.
    """

    def __init__(
        self,
        candidate_sources: List[Dict[str, Any]],
        monitoring_stations: List[Dict[str, Any]],
        threshold_gpm3: float = 2.0,
    ) -> None:
        self.detector = ThresholdEventDetector(threshold_gpm3=threshold_gpm3)
        self.sources = candidate_sources
        self.stations = {s["station_id"]: float(s["chainage_m"]) for s in monitoring_stations}

    def attribute(
        self,
        event_id: str,
        sample_times_sec: np.ndarray,
        station_arrival_times: Dict[str, np.ndarray],
        station_values: Dict[str, np.ndarray],
        decision_time_sec: float,
    ) -> BaselineAttributionResult:
        det = self.detector.detect(
            event_id=event_id,
            sample_times_sec=sample_times_sec,
            station_arrival_times=station_arrival_times,
            station_values=station_values,
            decision_time_sec=decision_time_sec,
        )

        if not det.detected:
            return BaselineAttributionResult(
                event_id=event_id,
                method_name="M1_Nearest_Upstream_Heuristic",
                decision="ATTRIBUTE",
                predicted_source="s0_background",
                confidence=1.0,
                margin=1.0,
                detection=det,
                metadata={"rule": "below_detection_threshold"},
            )

        trigger_chainage = self.stations.get(det.triggering_station or "sensor_002", 14800.0)
        upstream_sources = [
            s for s in self.sources if float(s["chainage_m"]) <= trigger_chainage
        ]

        if not upstream_sources:
            upstream_sources = self.sources

        # Sort descending by chainage (nearest upstream to the station)
        sorted_sources = sorted(
            upstream_sources,
            key=lambda s: float(s["chainage_m"]),
            reverse=True,
        )

        chosen = sorted_sources[0]["source_id"]

        return BaselineAttributionResult(
            event_id=event_id,
            method_name="M1_Nearest_Upstream_Heuristic",
            decision="ATTRIBUTE",
            predicted_source=chosen,
            confidence=0.50,
            margin=0.10,
            detection=det,
            metadata={
                "rule": "nearest_upstream_facility",
                "trigger_station": det.triggering_station,
                "candidate_upstream_count": len(upstream_sources),
            },
        )


class SecondaryPrivilegedCapacityHeuristicAttributor:
    """M1 Secondary Benchmark: Capacity-Weighted Heuristic (Privileged Information).

    Audit & Fairness Notice:
    - This baseline utilizes simulator metadata (`nominal_mass_rate_gps`) to rank emitters.
    - Because illicit discharge capacity is unobservable in live field telemetry,
      this heuristic represents a privileged upper bound rather than an operational model.
    - Excluded from the primary fair comparison suite; retained solely as a secondary benchmark.
    """

    def __init__(
        self,
        candidate_sources: List[Dict[str, Any]],
        monitoring_stations: List[Dict[str, Any]],
        threshold_gpm3: float = 2.0,
    ) -> None:
        self.detector = ThresholdEventDetector(threshold_gpm3=threshold_gpm3)
        self.sources = candidate_sources
        self.stations = {s["station_id"]: float(s["chainage_m"]) for s in monitoring_stations}

    def attribute(
        self,
        event_id: str,
        sample_times_sec: np.ndarray,
        station_arrival_times: Dict[str, np.ndarray],
        station_values: Dict[str, np.ndarray],
        decision_time_sec: float,
    ) -> BaselineAttributionResult:
        det = self.detector.detect(
            event_id=event_id,
            sample_times_sec=sample_times_sec,
            station_arrival_times=station_arrival_times,
            station_values=station_values,
            decision_time_sec=decision_time_sec,
        )

        if not det.detected:
            return BaselineAttributionResult(
                event_id=event_id,
                method_name="M1_Secondary_Privileged_Capacity_Heuristic",
                decision="ATTRIBUTE",
                predicted_source="s0_background",
                confidence=1.0,
                margin=1.0,
                detection=det,
                metadata={"rule": "below_detection_threshold"},
            )

        trigger_chainage = self.stations.get(det.triggering_station or "sensor_002", 14800.0)
        upstream_sources = [
            s for s in self.sources if float(s["chainage_m"]) <= trigger_chainage
        ]

        if not upstream_sources:
            upstream_sources = self.sources

        sorted_sources = sorted(
            upstream_sources,
            key=lambda s: float(s.get("nominal_mass_rate_gps", 0.0)),
            reverse=True,
        )

        chosen = sorted_sources[0]["source_id"]

        return BaselineAttributionResult(
            event_id=event_id,
            method_name="M1_Secondary_Privileged_Capacity_Heuristic",
            decision="ATTRIBUTE",
            predicted_source=chosen,
            confidence=0.50,
            margin=0.10,
            detection=det,
            metadata={
                "rule": "highest_nominal_capacity_upstream",
                "trigger_station": det.triggering_station,
                "is_privileged_prior": True,
            },
        )


# Backward-compatibility alias
ThresholdHeuristicAttributor = SecondaryPrivilegedCapacityHeuristicAttributor


class SpatialTransitHeuristicAttributor:
    """M2 Benchmark: Deterministic Spatial/Transit Advection Heuristic.

    Audit & Redundancy Notice (Phase 3.3 Audit):
    - Mathematical Equivalence: Because the candidate scoring function score = 1 / (1 + dx/1000)
      is strictly monotonically decreasing in upstream distance dx, argmax(score) is identical
      to argmin(dx), making this heuristic produce 100% identical predictions to M1 Nearest
      Upstream Heuristic across all episodes.
    - Status: Preserved for backwards compatibility and ablation records, but excluded from
      the primary distinct baseline suite to prevent presenting duplicate comparisons.
    - Forced choice: Returns highest-scoring candidate facility without reject option.
    """

    def __init__(
        self,
        candidate_sources: List[Dict[str, Any]],
        monitoring_stations: List[Dict[str, Any]],
        flow_velocity_mps: float = 0.25,
        threshold_gpm3: float = 2.0,
    ) -> None:
        self.sources = candidate_sources
        self.stations = monitoring_stations
        self.stations_by_id = {s["station_id"]: s for s in monitoring_stations}
        self.u = flow_velocity_mps
        self.threshold = threshold_gpm3

    def attribute(
        self,
        event_id: str,
        sample_times_sec: np.ndarray,
        station_arrival_times: Dict[str, np.ndarray],
        station_values: Dict[str, np.ndarray],
        decision_time_sec: float,
    ) -> BaselineAttributionResult:
        station_peaks: Dict[str, Tuple[float, float]] = {}
        max_overall = 0.0

        for s in self.stations:
            s_id = s["station_id"]
            vals = station_values.get(s_id, np.array([]))
            if len(vals) == 0:
                continue
            arrivals = station_arrival_times.get(s_id, sample_times_sec)

            valid_mask = (arrivals <= decision_time_sec) & (sample_times_sec <= decision_time_sec)
            s_times = sample_times_sec[valid_mask]
            avail_vals = vals[valid_mask]

            if len(avail_vals) == 0:
                continue

            non_nan_mask = ~np.isnan(avail_vals)
            if not np.any(non_nan_mask):
                continue

            clean_vals = avail_vals[non_nan_mask]
            clean_times = s_times[non_nan_mask]

            p_val = float(np.max(clean_vals))
            p_time = float(clean_times[np.argmax(clean_vals)])
            station_peaks[s_id] = (p_val, p_time)
            if p_val > max_overall:
                max_overall = p_val

        det = DetectionResult(
            event_id=event_id,
            detected=(max_overall >= self.threshold),
            peak_concentration_gpm3=max_overall,
            threshold_gpm3=self.threshold,
            detection_time_sec=None,
            triggering_station=None,
            metadata={"threshold_type": "synthetic_screening_benchmark_only"},
        )

        if not det.detected:
            return BaselineAttributionResult(
                event_id=event_id,
                method_name="M2_Spatial_Transit_Heuristic",
                decision="ATTRIBUTE",
                predicted_source="s0_background",
                confidence=1.0,
                margin=1.0,
                detection=det,
                metadata={"rule": "below_detection_threshold"},
            )

        alarmed_stations = [
            (s_id, p_val, p_time)
            for s_id, (p_val, p_time) in station_peaks.items()
            if p_val >= self.threshold
        ]
        alarmed_stations.sort(key=lambda x: x[2])

        earliest_station_id = alarmed_stations[0][0]
        det.triggering_station = earliest_station_id
        det.detection_time_sec = alarmed_stations[0][2]

        station_chainage = float(self.stations_by_id[earliest_station_id]["chainage_m"])

        candidates = [
            s for s in self.sources if float(s["chainage_m"]) <= station_chainage
        ]
        if not candidates:
            candidates = self.sources

        scored = []
        for src in candidates:
            dx = station_chainage - float(src["chainage_m"])
            score = 1.0 / (1.0 + (dx / 1000.0))
            scored.append((src["source_id"], score))

        scored.sort(key=lambda x: x[1], reverse=True)
        best_source, top_score = scored[0]
        runner_up_score = scored[1][1] if len(scored) > 1 else 0.0

        return BaselineAttributionResult(
            event_id=event_id,
            method_name="M2_Spatial_Transit_Heuristic",
            decision="ATTRIBUTE",
            predicted_source=best_source,
            confidence=float(top_score),
            margin=float(top_score - runner_up_score),
            detection=det,
            metadata={
                "earliest_station": earliest_station_id,
                "candidate_count": len(candidates),
                "is_unprivileged": True,
            },
        )


class ConventionalClassifier:
    """M3 Baseline: Conventional Random Forest Multi-Class Classifier.

    Assumptions:
    - Supervised tabular Random Forest trained on multi-station summary features.
    - Output is forced choice: predicts argmax_k P(s_k | Z) for all events.
    - No reject / abstention mechanism (Coverage Phi = 1.0).
    """

    def __init__(
        self,
        n_estimators: int = 100,
        random_state: int = 42,
    ) -> None:
        self.rf = RandomForestClassifier(
            n_estimators=n_estimators,
            random_state=random_state,
            class_weight="balanced",
        )
        self.feature_extractor = ObservableFeatureExtractor()
        self.classes_: np.ndarray = np.array([])
        self.is_fitted: bool = False

    def fit(self, X: np.ndarray, y: np.ndarray) -> "ConventionalClassifier":
        """Fits the Random Forest model on training feature matrix and source labels."""
        self.rf.fit(X, y)
        self.classes_ = self.rf.classes_
        self.is_fitted = True
        return self

    def predict_single(
        self,
        event_id: str,
        sample_times_sec: np.ndarray,
        station_arrival_times: Dict[str, np.ndarray],
        station_values: Dict[str, np.ndarray],
        decision_time_sec: float,
    ) -> BaselineAttributionResult:
        if not self.is_fitted:
            raise RuntimeError("ConventionalClassifier must be fitted before predict_single")

        feats = self.feature_extractor.extract(
            sample_times_sec=sample_times_sec,
            station_arrival_times=station_arrival_times,
            station_values=station_values,
            decision_time_sec=decision_time_sec,
        ).reshape(1, -1)

        probs = self.rf.predict_proba(feats)[0]
        sorted_indices = np.argsort(probs)[::-1]
        best_idx = sorted_indices[0]
        runner_up_idx = sorted_indices[1] if len(sorted_indices) > 1 else best_idx

        best_source = str(self.classes_[best_idx])
        top_prob = float(probs[best_idx])
        margin = float(probs[best_idx] - probs[runner_up_idx])

        return BaselineAttributionResult(
            event_id=event_id,
            method_name="M3_Conventional_RandomForest",
            decision="ATTRIBUTE",
            predicted_source=best_source,
            confidence=top_prob,
            margin=margin,
            detection=None,
            metadata={"raw_probabilities": {str(c): float(p) for c, p in zip(self.classes_, probs)}},
        )


class ConfidenceSelectiveClassifier:
    """M3-Selective Baseline: Conventional Classifier with Confidence-Only Abstention.

    Ablation & Benchmark Context:
    - Implements standard confidence thresholding (Chow, 1970; Geifman & El-Yaniv, 2017).
    - Threshold condition: Accepts if max_k P(s_k | Z) >= tau_conf, otherwise emits ABSTAIN.
    - Excludes probability margin filtering (delta_margin = 0).
    - Excludes sensor hardware diagnostic vetting (no sensor health gate).
    - Uses identical features and probability outputs as M3 and M4.
    - Serves as the primary selective baseline to isolate whether M4's margin rule and
      sensor health diagnostics deliver incremental value at matched coverage levels.
    """

    def __init__(
        self,
        base_classifier: Optional[ConventionalClassifier] = None,
        tau_conf: float = 0.50,
    ) -> None:
        self.base_classifier = base_classifier
        self.tau_conf = tau_conf

    def tune_threshold_on_validation(
        self,
        X_val: np.ndarray,
        y_val: np.ndarray,
        tau_candidates: Sequence[float] = (0.30, 0.40, 0.50, 0.60, 0.70, 0.80),
        target_max_risk: float = 0.10,
    ) -> float:
        """Selects tau_conf strictly on validation data to maximize coverage while bounding risk."""
        if self.base_classifier is None or not self.base_classifier.is_fitted:
            raise RuntimeError("Base classifier must be fitted before validation tuning")

        probs = self.base_classifier.rf.predict_proba(X_val)
        classes = self.base_classifier.classes_

        best_tau = float(tau_candidates[0])
        best_cov = -1.0

        for tau in sorted(tau_candidates):
            accepted_mask = np.max(probs, axis=1) >= tau
            cov = float(np.mean(accepted_mask))
            if np.sum(accepted_mask) == 0:
                risk = None
            else:
                pred_indices = np.argmax(probs[accepted_mask], axis=1)
                preds = classes[pred_indices]
                trues = y_val[accepted_mask]
                risk = float(np.mean(preds != trues))

            if risk is not None and risk <= target_max_risk:
                if cov > best_cov:
                    best_cov = cov
                    best_tau = float(tau)

        # Fallback to strictest threshold if target risk is unsatisfied
        if best_cov < 0:
            best_tau = float(max(tau_candidates))

        self.tau_conf = best_tau
        return best_tau

    def tune_threshold_for_target_coverage(
        self,
        X_val: np.ndarray,
        target_coverage: float,
        tau_candidates: Optional[Sequence[float]] = None,
    ) -> float:
        """Selects tau_conf strictly on validation data to achieve empirical coverage closest to target_coverage.
        
        Evaluates candidate thresholds on validation data and selects the tau minimizing |Phi_val(tau) - target_coverage|.
        Locks the threshold for downstream held-out testing.
        """
        if self.base_classifier is None or not self.base_classifier.is_fitted:
            raise RuntimeError("Base classifier must be fitted before validation tuning")

        if tau_candidates is None:
            tau_candidates = (0.10, 0.20, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90)

        probs = self.base_classifier.rf.predict_proba(X_val)
        top_confs = np.max(probs, axis=1)

        best_tau = float(tau_candidates[0])
        min_cov_diff = float("inf")

        for tau in sorted(tau_candidates):
            cov = float(np.mean(top_confs >= tau))
            diff = abs(cov - target_coverage)
            if diff < min_cov_diff:
                min_cov_diff = diff
                best_tau = float(tau)

        self.tau_conf = best_tau
        return best_tau

    def predict_single(
        self,
        event_id: str,
        sample_times_sec: np.ndarray,
        station_arrival_times: Dict[str, np.ndarray],
        station_values: Dict[str, np.ndarray],
        decision_time_sec: float,
    ) -> BaselineAttributionResult:
        if self.base_classifier is None or not self.base_classifier.is_fitted:
            raise RuntimeError("Base classifier must be fitted before predict_single")

        m3_res = self.base_classifier.predict_single(
            event_id=event_id,
            sample_times_sec=sample_times_sec,
            station_arrival_times=station_arrival_times,
            station_values=station_values,
            decision_time_sec=decision_time_sec,
        )

        conf = m3_res.confidence
        if conf >= self.tau_conf:
            decision = "ATTRIBUTE"
            pred_source = m3_res.predicted_source
            abstain_cause = None
        else:
            decision = "ABSTAIN"
            pred_source = None
            abstain_cause = "LOW_CONFIDENCE"

        return BaselineAttributionResult(
            event_id=event_id,
            method_name="M3_Selective_Confidence_Only",
            decision=decision,
            predicted_source=pred_source,
            confidence=conf,
            margin=m3_res.margin,
            detection=m3_res.detection,
            metadata={
                "tau_conf": self.tau_conf,
                "raw_confidence": conf,
                "abstain_cause": abstain_cause,
                "raw_probabilities": m3_res.metadata.get("raw_probabilities", {}),
            },
        )
