"""Baseline Methodologies for River Contamination Detection and Attribution.

Implements three comparison baselines with explicit, documented assumptions:
- Threshold Event Detector: Decoupled binary anomaly detector.
- M1: Threshold Alarm Detector + Declared Localization Heuristic.
- M2: Deterministic Spatial/Transit Advection Heuristic.
- M3: Conventional Multi-Class Random Forest Classifier (Forced Choice).

Strict Constraints:
- Detection outcomes are recorded separately from attribution outcomes.
- No access to true source labels, injection schedules, or simulated fault flags.
- Filtering ensures observations beyond decision time or un-arrived packets are never visible.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.ensemble import RandomForestClassifier

from .feature_extractor import ObservableFeatureExtractor


@dataclass
class DetectionResult:
    """Explicit decoupled outcome of the binary anomaly detection stage."""
    event_id: str
    detected: bool
    peak_concentration_gpm3: float
    threshold_gpm3: float
    detection_time_sec: Optional[float]
    triggering_station: Optional[str]


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

    Assumptions:
    - Monitors observed concentration against a declared screening threshold (default 2.0 g/m³).
    - Can monitor a single urban exit station (e.g., Kasipalayam sensor_002) or any station.
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
        )


class ThresholdHeuristicAttributor:
    """M1 Baseline: Threshold Detection + Highest-Volume Upstream Emitter Heuristic.

    Two-stage architecture:
    - Stage 1: Threshold detection on telemetry observations. If no anomaly is detected,
      assigns 's0_background' (no false accusation).
    - Stage 2 (Localization Rule): If an anomaly is detected, blames the candidate source
      with the highest nominal discharge capacity located upstream of the earliest alarmed station.
    - Forced choice: Does not have an abstention option once an anomaly is confirmed.
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
                method_name="M1_Threshold_Heuristic",
                decision="ATTRIBUTE",
                predicted_source="s0_background",
                confidence=1.0,
                margin=1.0,
                detection=det,
                metadata={"rule": "below_detection_threshold"},
            )

        # Localization rule: highest nominal emitter upstream of triggering station
        trigger_chainage = self.stations.get(det.triggering_station or "sensor_002", 14800.0)
        upstream_sources = [
            s for s in self.sources if float(s["chainage_m"]) <= trigger_chainage
        ]

        if not upstream_sources:
            upstream_sources = self.sources

        # Sort descending by nominal mass rate
        sorted_sources = sorted(
            upstream_sources,
            key=lambda s: float(s.get("nominal_mass_rate_gps", 0.0)),
            reverse=True,
        )

        chosen = sorted_sources[0]["source_id"]

        return BaselineAttributionResult(
            event_id=event_id,
            method_name="M1_Threshold_Heuristic",
            decision="ATTRIBUTE",
            predicted_source=chosen,
            confidence=0.50,  # Uncalibrated heuristic score
            margin=0.10,
            detection=det,
            metadata={
                "rule": "highest_nominal_volume_upstream",
                "trigger_station": det.triggering_station,
                "candidate_upstream_count": len(upstream_sources),
            },
        )


class SpatialTransitHeuristicAttributor:
    """M2 Baseline: Deterministic Spatial/Transit Advection Heuristic.

    Assumptions:
    - Transport physics: nominal longitudinal flow velocity u = 0.25 m/s.
    - If observations do not exceed threshold across all stations, assigns 's0_background'.
    - If an anomaly is observed, computes the first downstream station observing a peak
      and ranks upstream candidate sources based on advective distance and transit time compatibility.
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
        # Check peaks at each station
        station_peaks: Dict[str, Tuple[float, float]] = {}  # station_id -> (peak_val, peak_time)
        max_overall = 0.0

        for s in self.stations:
            s_id = s["station_id"]
            vals = station_values.get(s_id, np.array([]))
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

        # Find earliest station observing peak > threshold
        alarmed_stations = [
            (s_id, p_val, p_time)
            for s_id, (p_val, p_time) in station_peaks.items()
            if p_val >= self.threshold
        ]
        alarmed_stations.sort(key=lambda x: x[2])  # Sort by earliest peak time

        earliest_station_id = alarmed_stations[0][0]
        det.triggering_station = earliest_station_id
        det.detection_time_sec = alarmed_stations[0][2]

        station_chainage = float(self.stations_by_id[earliest_station_id]["chainage_m"])

        # Candidate sources strictly upstream of earliest station
        candidates = [
            s for s in self.sources if float(s["chainage_m"]) <= station_chainage
        ]
        if not candidates:
            candidates = self.sources

        # Rank candidates by proximity to the detection station
        # In 1D advection, sources closer upstream reach the station with less attenuation
        scored = []
        for src in candidates:
            dx = station_chainage - float(src["chainage_m"])
            score = 1.0 / (1.0 + (dx / 1000.0))  # Distance attenuation weighting
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
