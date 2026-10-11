"""Observable Feature Extractor for River Contamination Attribution.

Extracts tabular features strictly from observable sensor time-series and timestamps
available at decision time.

Leakage Safeguards:
- NEVER accesses true source IDs, true injection rates, spill durations, or simulation metadata.
- Filters observations using arrival timestamps: any telemetry packet whose arrival time
  is later than decision_time_sec is strictly excluded from feature computation.
- Does not inspect measurements from the future (t > decision_time_sec).
- Distinct physical measurement units: tracer concentrations in g/m³ (equivalent to mg/L).
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np


class ObservableFeatureExtractor:
    """Extracts non-leaking, physically grounded summary features from telemetry series."""

    def __init__(
        self,
        station_ids: Optional[List[str]] = None,
        baseline_tracer_gpm3: float = 0.0,
        detection_threshold_gpm3: float = 1.0,
    ) -> None:
        self.station_ids = station_ids or ["sensor_001", "sensor_002", "sensor_003"]
        self.baseline_tracer_gpm3 = baseline_tracer_gpm3
        self.detection_threshold_gpm3 = detection_threshold_gpm3

    def get_feature_names(self) -> List[str]:
        """Returns the ordered list of feature names produced by extract()."""
        names: List[str] = []
        for s in self.station_ids:
            names.extend([
                f"{s}_peak_excursion_gpm3",
                f"{s}_mean_excursion_gpm3",
                f"{s}_integrated_excursion_g_s_per_m3",
                f"{s}_time_to_peak_hours",
                f"{s}_onset_time_hours",
                f"{s}_excursion_duration_hours",
                f"{s}_missing_ratio",
                f"{s}_max_latency_hours",
                f"{s}_data_age_hours",
            ])

        # Cross-station spatial relationship features
        names.extend([
            "peak_ratio_s2_over_s1",
            "peak_ratio_s3_over_s2",
            "time_lag_hours_s2_minus_s1",
            "time_lag_hours_s3_minus_s2",
            "alarm_station_1",
            "alarm_station_2",
            "alarm_station_3",
            "overall_max_excursion_gpm3",
        ])
        return names

    def extract(
        self,
        sample_times_sec: np.ndarray,
        station_arrival_times: Dict[str, np.ndarray],
        station_values: Dict[str, np.ndarray],
        decision_time_sec: float,
    ) -> np.ndarray:
        """Extracts a 1D feature vector strictly from available observations at decision time.

        Args:
            sample_times_sec: 1D array of physical sampling timestamps.
            station_arrival_times: Dict mapping station ID to 1D arrival timestamps.
            station_values: Dict mapping station ID to 1D array of observed concentrations (g/m³).
            decision_time_sec: Cutoff timestamp. Only packets that arrived on or before
                               this timestamp are visible to the feature extractor.

        Returns:
            1D numpy array of shape (N_features,) with finite float values.
        """
        features: List[float] = []

        # Per-station feature storage for relational calculations
        peaks: Dict[str, float] = {}
        peak_times: Dict[str, float] = {}
        alarms: Dict[str, float] = {}

        t_start = sample_times_sec[0] if len(sample_times_sec) > 0 else 0.0

        for s_id in self.station_ids:
            raw_vals = station_values.get(s_id, np.array([]))
            arrivals = station_arrival_times.get(s_id, sample_times_sec)

            # Strictly filter to packets arrived and measured on or before decision_time_sec
            valid_mask = (arrivals <= decision_time_sec) & (sample_times_sec <= decision_time_sec)
            s_times = sample_times_sec[valid_mask]
            vals = raw_vals[valid_mask] if len(raw_vals) == len(sample_times_sec) else np.array([])

            if len(vals) == 0:
                # No data available for this station at decision time
                features.extend([0.0, 0.0, 0.0, 0.0, -1.0, 0.0, 1.0, 24.0, 24.0])
                peaks[s_id] = 0.0
                peak_times[s_id] = -1.0
                alarms[s_id] = 0.0
                continue

            # 1. Missingness ratio
            n_nan = int(np.sum(np.isnan(vals)))
            missing_ratio = float(n_nan / len(vals))

            # 2. Excursion above baseline
            non_nan_vals = vals[~np.isnan(vals)]
            non_nan_times = s_times[~np.isnan(vals)]

            if len(non_nan_vals) == 0:
                features.extend([0.0, 0.0, 0.0, 0.0, -1.0, 0.0, missing_ratio, 24.0, 24.0])
                peaks[s_id] = 0.0
                peak_times[s_id] = -1.0
                alarms[s_id] = 0.0
                continue

            excursion = np.maximum(non_nan_vals - self.baseline_tracer_gpm3, 0.0)
            peak_val = float(np.max(excursion))
            mean_val = float(np.mean(excursion))

            # 3. Time to peak
            peak_idx = int(np.argmax(excursion))
            peak_time_sec = float(non_nan_times[peak_idx])
            time_to_peak_hrs = float((peak_time_sec - t_start) / 3600.0)

            # 4. Onset time & excursion duration
            above_thresh_indices = np.where(excursion >= self.detection_threshold_gpm3)[0]
            if len(above_thresh_indices) > 0:
                onset_time_hrs = float((non_nan_times[above_thresh_indices[0]] - t_start) / 3600.0)
                dt_step = float(non_nan_times[1] - non_nan_times[0]) if len(non_nan_times) > 1 else 300.0
                excursion_duration_hrs = float(len(above_thresh_indices) * dt_step / 3600.0)
                is_alarm = 1.0
            else:
                onset_time_hrs = -1.0
                excursion_duration_hrs = 0.0
                is_alarm = 0.0

            # 5. Integrated excursion (Riemann sum in g·s/m³)
            if len(non_nan_times) > 1:
                integrated = float(np.trapezoid(excursion, non_nan_times))
            else:
                integrated = float(excursion[0] * 300.0)

            # 6. Latency & freshness
            delays = arrivals[valid_mask] - s_times
            max_delay_hrs = float(np.max(delays) / 3600.0) if len(delays) > 0 else 0.0
            data_age_hrs = float((decision_time_sec - np.max(s_times)) / 3600.0)

            features.extend([
                peak_val,
                mean_val,
                integrated,
                time_to_peak_hrs,
                onset_time_hrs,
                excursion_duration_hrs,
                missing_ratio,
                max_delay_hrs,
                data_age_hrs,
            ])

            peaks[s_id] = peak_val
            peak_times[s_id] = time_to_peak_hrs
            alarms[s_id] = is_alarm

        # Spatial relational features
        eps = 1e-4
        p1 = peaks.get("sensor_001", 0.0)
        p2 = peaks.get("sensor_002", 0.0)
        p3 = peaks.get("sensor_003", 0.0)

        ratio_2_1 = float((p2 + eps) / (p1 + eps))
        ratio_3_2 = float((p3 + eps) / (p2 + eps))

        t1 = peak_times.get("sensor_001", -1.0)
        t2 = peak_times.get("sensor_002", -1.0)
        t3 = peak_times.get("sensor_003", -1.0)

        lag_2_1 = float(t2 - t1) if (t1 >= 0 and t2 >= 0) else 0.0
        lag_3_2 = float(t3 - t2) if (t2 >= 0 and t3 >= 0) else 0.0

        overall_max = float(max(p1, p2, p3))

        features.extend([
            ratio_2_1,
            ratio_3_2,
            lag_2_1,
            lag_3_2,
            alarms.get("sensor_001", 0.0),
            alarms.get("sensor_002", 0.0),
            alarms.get("sensor_003", 0.0),
            overall_max,
        ])

        arr = np.array(features, dtype=np.float64)
        # Ensure finite array
        arr = np.nan_to_num(arr, nan=0.0, posinf=1e6, neginf=-1e6)
        return arr
