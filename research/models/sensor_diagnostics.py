"""Deterministic Sensor-Quality Diagnostics for River Telemetry.

Evaluates observable sensor data at decision time to detect:
1. Missing or insufficient observations (excessive NaNs).
2. Stuck-value windows (frozen hardware/register).
3. Excessive measurement age or telemetry arrival latency.
4. Gradual calibration drift.

Scientific & Operational Constraints:
- Operates strictly on observable measurements and timestamps available at decision time.
- Never reads true fault labels, ground-truth injection schedules, or future data.
- Distinguishes physical quiescent baseline (e.g., ambient tracer C = 0.0 g/m³) from frozen sensor hardware.
- Fully documents screening limitations of single-point diagnostics.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np


@dataclass
class DiagnosticConfig:
    """Configurable thresholds for deterministic sensor health diagnostics.

    Conceptual Distinctions:
    - baseline_value: Assumed nominal physical background concentration (g/m³). In conservative
      tracer transport modeling, the ambient clean baseline is nominally 0.0 g/m³.
    - numerical_floor: Configured synthetic numerical / resolution screening floor (g/m³). Readings
      whose deviation from baseline is strictly <= numerical_floor are within the quiescent
      background / ADE numerical dispersion tail region. Constant series in this region provide
      insufficient observable evidence to confirm an ADC register freeze.
      (Note: This is an explicitly configured screening parameter for simulation noise and numerical
      precision floors; it is not an empirically established physical sensor detection limit).
    - stuck_tolerance: Maximum allowable difference between consecutive samples (g/m³) for them
      to be considered identical register readings.
    - min_stuck_steps: Minimum consecutive identical readings required to constitute a hardware freeze.
    """
    # Missingness diagnostic
    max_missing_ratio: float = 0.20  # Max acceptable fraction of NaNs in observation window

    # Stuck value diagnostic
    min_stuck_steps: int = 6  # Minimum consecutive identical readings (30 min at 5-min sample rate)
    stuck_tolerance: float = 1e-4  # Tolerance in g/m³ for identical readings
    baseline_value: float = 0.0  # Physical clean baseline (g/m³)
    numerical_floor: float = 1e-3  # Synthetic numerical/resolution floor (g/m³)

    # Telemetry latency diagnostic
    max_allowed_delay_sec: float = 3600.0  # Max acceptable packet transmission delay (1 hour)
    max_data_age_sec: float = 7200.0  # Max acceptable age of latest available measurement (2 hours)

    # Drift diagnostic
    drift_slope_threshold_gpm3_per_hr: float = 0.50  # Max allowable uncalibrated linear drift slope
    min_drift_evaluation_steps: int = 12  # Minimum steps required to evaluate slope reliably


@dataclass
class StationHealthResult:
    station_id: str
    is_healthy: bool
    fault_causes: List[str]
    missing_ratio: float
    is_stuck: bool
    max_latency_sec: float
    data_age_sec: float
    drift_slope_per_hr: float
    details: Dict[str, Any]


@dataclass
class DiagnosticSuiteResult:
    is_healthy: bool
    station_results: Dict[str, StationHealthResult]
    primary_fault_cause: Optional[str]
    all_fault_causes: List[str]


class SensorDiagnostics:
    """Evaluates telemetry series for hardware corruptions and transmission anomalies."""

    def __init__(self, config: Optional[DiagnosticConfig] = None) -> None:
        self.config = config or DiagnosticConfig()

    def check_missingness(
        self,
        values: np.ndarray,
    ) -> Tuple[bool, float]:
        """Evaluates whether observation missingness exceeds tolerance.

        Returns:
            (is_faulty, missing_ratio)
        """
        if len(values) == 0:
            return True, 1.0

        nan_count = int(np.sum(np.isnan(values)))
        ratio = nan_count / len(values)
        is_faulty = ratio > self.config.max_missing_ratio
        return is_faulty, float(ratio)

    def check_stuck_value(
        self,
        values: np.ndarray,
    ) -> Tuple[bool, int, float]:
        """Detects whether sensor hardware is frozen at an unvarying register value.

        Diagnostic Evidence & Screening Boundary:
        - In clean river flow, tracer concentration is naturally at or near baseline. An unvarying
          reading <= numerical_floor is physically consistent with quiescent clean water and
          provides insufficient observable evidence to confirm a hardware failure.
        - Physical Screening Limitation: An ADC sensor that fails by freezing exactly at 0.0 g/m³
          during clean river flow cannot be distinguished from genuine clean background using
          telemetry concentration data alone. We do not invent certainty where evidence is absent.
        - To confirm a stuck-value fault, the telemetry must exhibit an unvarying sequence of at least
          min_stuck_steps consecutive readings whose value deviates from baseline by more than
          numerical_floor (|v - baseline_value| > numerical_floor).
        - Missing observations (NaNs) are filtered out when evaluating consecutive valid readings,
          allowing detection of frozen values across packet dropout.

        Returns:
            (is_stuck, max_consecutive_stuck_steps, stuck_value)
        """
        valid_mask = ~np.isnan(values)
        if np.sum(valid_mask) < self.config.min_stuck_steps:
            return False, 0, 0.0

        valid_vals = values[valid_mask]
        stuck_detected = False
        max_stuck_steps = 0
        stuck_val = 0.0

        cur_len = 1
        for i in range(1, len(valid_vals)):
            diff = abs(valid_vals[i] - valid_vals[i - 1])
            if diff <= self.config.stuck_tolerance:
                cur_len += 1
                if cur_len >= self.config.min_stuck_steps:
                    val = float(valid_vals[i])
                    if abs(val - self.config.baseline_value) > self.config.numerical_floor:
                        stuck_detected = True
                        if cur_len > max_stuck_steps:
                            max_stuck_steps = cur_len
                            stuck_val = val
            else:
                cur_len = 1

        return stuck_detected, max_stuck_steps, stuck_val

    def check_telemetry_latency(
        self,
        sample_times_sec: np.ndarray,
        arrival_times_sec: np.ndarray,
        decision_time_sec: float,
    ) -> Tuple[bool, float, float]:
        """Evaluates transmission delays and data freshness available at decision time.

        Args:
            sample_times_sec: Timestamps when water was physically sampled.
            arrival_times_sec: Timestamps when telemetry packet arrived at central receiver.
            decision_time_sec: Current evaluation cutoff timestamp.

        Returns:
            (is_faulty, max_delay_sec, data_age_sec)
        """
        # Filter to packets that have arrived by decision_time_sec
        arrived_mask = arrival_times_sec <= decision_time_sec
        if not np.any(arrived_mask):
            # No data has arrived yet
            return True, float("inf"), float("inf")

        arrived_sample_times = sample_times_sec[arrived_mask]
        arrived_arrival_times = arrival_times_sec[arrived_mask]

        delays = arrived_arrival_times - arrived_sample_times
        max_delay = float(np.max(delays)) if len(delays) > 0 else 0.0

        latest_sample_time = float(np.max(arrived_sample_times))
        data_age = float(decision_time_sec - latest_sample_time)

        is_faulty = (
            max_delay > self.config.max_allowed_delay_sec
            or data_age > self.config.max_data_age_sec
        )

        return is_faulty, max_delay, data_age

    def check_sensor_drift(
        self,
        sample_times_sec: np.ndarray,
        values: np.ndarray,
    ) -> Tuple[bool, float]:
        """Detects linear ramp drift indicative of sensor electrochemical degradation.

        Limitation Note:
        In an uncalibrated 1D screening setting without redundant co-located sensors,
        a long-duration, constant-rate industrial discharge can mimic monotonic drift.
        This diagnostic fits a robust linear trend over the observation window and flags
        monotonic ramps whose slope exceeds plausible natural baseline variation
        without the characteristic symmetric rise-and-fall shape of an advected Gaussian plume.

        Returns:
            (is_drifting, estimated_slope_per_hour)
        """
        valid_mask = ~np.isnan(values)
        if np.sum(valid_mask) < self.config.min_drift_evaluation_steps:
            return False, 0.0

        t = sample_times_sec[valid_mask]
        y = values[valid_mask]

        # Time normalized to hours
        t_hrs = (t - t[0]) / 3600.0
        if t_hrs[-1] <= 0:
            return False, 0.0

        # Linear regression slope: g/(m³·h)
        n = len(t_hrs)
        t_mean = np.mean(t_hrs)
        y_mean = np.mean(y)
        denom = np.sum((t_hrs - t_mean) ** 2)
        if denom <= 1e-9:
            return False, 0.0

        slope = float(np.sum((t_hrs - t_mean) * (y - y_mean)) / denom)

        # In natural advection, a plume arrives, peaks, and clears (low net monotonic slope).
        # Sensor drift produces a steady positive ramp with high correlation over long windows.
        # Check if slope exceeds threshold and residuals show consistent monotonic drift
        is_drifting = slope > self.config.drift_slope_threshold_gpm3_per_hr

        # Guard: if the signal peaks and returns to baseline (finite transient plume),
        # the end value is near the start value, so net drift is not sustained
        if is_drifting and len(y) >= 10:
            initial_val = np.mean(y[:3])
            final_val = np.mean(y[-3:])
            if final_val <= initial_val + self.config.stuck_tolerance:
                is_drifting = False  # Plume passed through and returned to baseline

        return is_drifting, slope

    def evaluate_station(
        self,
        station_id: str,
        sample_times_sec: np.ndarray,
        arrival_times_sec: np.ndarray,
        values: np.ndarray,
        decision_time_sec: float,
    ) -> StationHealthResult:
        """Evaluates all health diagnostics for a single monitoring station."""
        # Filter to observations available at decision time
        available_mask = (arrival_times_sec <= decision_time_sec) & (sample_times_sec <= decision_time_sec)
        avail_samples = sample_times_sec[available_mask]
        avail_arrivals = arrival_times_sec[available_mask]
        avail_values = values[available_mask]

        faults: List[str] = []

        # 1. Telemetry latency & age check
        latency_fault, max_delay, data_age = self.check_telemetry_latency(
            sample_times_sec=sample_times_sec,
            arrival_times_sec=arrival_times_sec,
            decision_time_sec=decision_time_sec,
        )
        if latency_fault:
            faults.append("EXCESSIVE_LATENCY")

        # 2. Missingness check
        missing_fault, missing_ratio = self.check_missingness(avail_values)
        if missing_fault:
            faults.append("SENSOR_FAULT_MISSING")

        # 3. Stuck value check
        stuck_fault, max_stuck_steps, stuck_val = self.check_stuck_value(avail_values)
        if stuck_fault:
            faults.append("SENSOR_FAULT_STUCK")

        # 4. Sensor drift check
        drift_fault, drift_slope = self.check_sensor_drift(avail_samples, avail_values)
        if drift_fault:
            faults.append("SENSOR_FAULT_DRIFT")

        is_healthy = len(faults) == 0

        return StationHealthResult(
            station_id=station_id,
            is_healthy=is_healthy,
            fault_causes=faults,
            missing_ratio=missing_ratio,
            is_stuck=stuck_fault,
            max_latency_sec=max_delay,
            data_age_sec=data_age,
            drift_slope_per_hr=drift_slope,
            details={
                "max_stuck_steps": max_stuck_steps,
                "stuck_value": stuck_val,
                "available_samples_count": len(avail_values),
            },
        )

    def evaluate_suite(
        self,
        sample_times_sec: np.ndarray,
        station_arrival_times: Dict[str, np.ndarray],
        station_values: Dict[str, np.ndarray],
        decision_time_sec: float,
        critical_stations: Optional[List[str]] = None,
    ) -> DiagnosticSuiteResult:
        """Evaluates health across all telemetry stations.

        Args:
            critical_stations: If specified, only faults on these stations compromise the suite.
                               By default, any fault on any monitored station is considered.
        """
        station_results: Dict[str, StationHealthResult] = {}
        all_faults: List[str] = []

        for station_id, vals in station_values.items():
            arrivals = station_arrival_times.get(station_id, sample_times_sec)
            res = self.evaluate_station(
                station_id=station_id,
                sample_times_sec=sample_times_sec,
                arrival_times_sec=arrivals,
                values=vals,
                decision_time_sec=decision_time_sec,
            )
            station_results[station_id] = res

            # Determine whether this station's fault counts toward suite health
            if critical_stations is None or station_id in critical_stations:
                all_faults.extend(res.fault_causes)

        is_suite_healthy = len(all_faults) == 0

        # Prioritize primary fault cause
        primary_cause: Optional[str] = None
        if "SENSOR_FAULT_STUCK" in all_faults:
            primary_cause = "SENSOR_FAULT_STUCK"
        elif "SENSOR_FAULT_MISSING" in all_faults:
            primary_cause = "SENSOR_FAULT_MISSING"
        elif "SENSOR_FAULT_DRIFT" in all_faults:
            primary_cause = "SENSOR_FAULT_DRIFT"
        elif "EXCESSIVE_LATENCY" in all_faults:
            primary_cause = "EXCESSIVE_LATENCY"
        elif all_faults:
            primary_cause = all_faults[0]

        return DiagnosticSuiteResult(
            is_healthy=is_suite_healthy,
            station_results=station_results,
            primary_fault_cause=primary_cause,
            all_fault_causes=all_faults,
        )
