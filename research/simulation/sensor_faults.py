"""Independently Configurable Sensor Fault Transformations.

Implements realistic hardware and communication fault transformations:
1. Additive measurement noise (Gaussian, Laplace).
2. Random missing observations (Bernoulli dropouts).
3. Burst / station-wide communication dropouts.
4. Gradual sensor calibration drift (ramp bias).
5. Stuck-value / register freeze (constant output).
6. Telemetry transmission delay (latency lag).

All transformations preserve explicit ground-truth event labels, uncorrupted
observation baselines, and comprehensive diagnostic provenance metadata.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np

from .river_ade_simulator import SimulationResult


@dataclass
class AdditiveNoiseConfig:
    enabled: bool = False
    noise_std_ratio: float = 0.10
    distribution: str = "gaussian"  # "gaussian" or "laplace"
    zero_floor: bool = True

    def validate(self) -> None:
        if self.noise_std_ratio < 0:
            raise ValueError(f"noise_std_ratio must be non-negative, got {self.noise_std_ratio}")
        if self.distribution not in ("gaussian", "laplace"):
            raise ValueError(f"Unknown noise distribution '{self.distribution}'. Must be 'gaussian' or 'laplace'")


@dataclass
class RandomMissingnessConfig:
    enabled: bool = False
    dropout_probability: float = 0.15

    def validate(self) -> None:
        if not (0.0 <= self.dropout_probability <= 1.0):
            raise ValueError(
                f"dropout_probability must be in [0, 1], got {self.dropout_probability}"
            )


@dataclass
class BurstDropoutConfig:
    enabled: bool = False
    duration_hours: float = 3.0
    start_time_sec: float = 21600.0
    affected_stations: List[str] = field(default_factory=lambda: ["sensor_002"])

    def validate(self) -> None:
        if self.duration_hours < 0:
            raise ValueError(f"duration_hours must be non-negative, got {self.duration_hours}")
        if self.start_time_sec < 0:
            raise ValueError(f"start_time_sec must be non-negative, got {self.start_time_sec}")


@dataclass
class SensorDriftConfig:
    enabled: bool = False
    drift_rate_per_hour: float = 15.0  # units added per hour
    start_time_sec: float = 28800.0
    affected_stations: List[str] = field(default_factory=lambda: ["sensor_002"])

    def validate(self) -> None:
        if self.start_time_sec < 0:
            raise ValueError(f"start_time_sec must be non-negative, got {self.start_time_sec}")


@dataclass
class StuckValueConfig:
    enabled: bool = False
    start_time_sec: float = 36000.0
    duration_sec: float = 14400.0
    affected_stations: List[str] = field(default_factory=lambda: ["sensor_002"])

    def validate(self) -> None:
        if self.start_time_sec < 0:
            raise ValueError(f"start_time_sec must be non-negative, got {self.start_time_sec}")
        if self.duration_sec <= 0:
            raise ValueError(f"duration_sec must be positive, got {self.duration_sec}")


@dataclass
class TelemetryDelayConfig:
    enabled: bool = False
    delay_sec: float = 7200.0  # 2 hours
    affected_stations: List[str] = field(default_factory=lambda: ["sensor_002", "sensor_003"])

    def validate(self) -> None:
        if self.delay_sec < 0:
            raise ValueError(f"delay_sec must be non-negative, got {self.delay_sec}")


@dataclass
class FaultSuiteConfig:
    additive_noise: AdditiveNoiseConfig = field(default_factory=AdditiveNoiseConfig)
    random_missingness: RandomMissingnessConfig = field(default_factory=RandomMissingnessConfig)
    burst_dropout: BurstDropoutConfig = field(default_factory=BurstDropoutConfig)
    sensor_drift: SensorDriftConfig = field(default_factory=SensorDriftConfig)
    stuck_value: StuckValueConfig = field(default_factory=StuckValueConfig)
    telemetry_delay: TelemetryDelayConfig = field(default_factory=TelemetryDelayConfig)

    def validate(self) -> None:
        self.additive_noise.validate()
        self.random_missingness.validate()
        self.burst_dropout.validate()
        self.sensor_drift.validate()
        self.stuck_value.validate()
        self.telemetry_delay.validate()

    @classmethod
    def from_json(cls, path_or_str: str | Path) -> "FaultSuiteConfig":
        path = Path(path_or_str)
        if path.is_file():
            data = json.loads(path.read_text(encoding="utf-8"))
        else:
            data = json.loads(str(path_or_str))

        noise_d = data.get("additive_noise", {})
        miss_d = data.get("random_missingness", {})
        burst_d = data.get("burst_dropout", {})
        drift_d = data.get("sensor_drift", {})
        stuck_d = data.get("stuck_value", {})
        delay_d = data.get("telemetry_delay", {})

        cfg = cls(
            additive_noise=AdditiveNoiseConfig(
                enabled=bool(noise_d.get("enabled", False)),
                noise_std_ratio=float(noise_d.get("noise_std_ratio", 0.10)),
                distribution=str(noise_d.get("distribution", "gaussian")),
                zero_floor=bool(noise_d.get("zero_floor", True)),
            ),
            random_missingness=RandomMissingnessConfig(
                enabled=bool(miss_d.get("enabled", False)),
                dropout_probability=float(miss_d.get("dropout_probability", 0.15)),
            ),
            burst_dropout=BurstDropoutConfig(
                enabled=bool(burst_d.get("enabled", False)),
                duration_hours=float(burst_d.get("duration_hours", 3.0)),
                start_time_sec=float(burst_d.get("start_time_sec", 21600.0)),
                affected_stations=list(burst_d.get("affected_stations", ["sensor_002"])),
            ),
            sensor_drift=SensorDriftConfig(
                enabled=bool(drift_d.get("enabled", False)),
                drift_rate_per_hour=float(drift_d.get("drift_rate_per_hour", 15.0)),
                start_time_sec=float(drift_d.get("start_time_sec", 28800.0)),
                affected_stations=list(drift_d.get("affected_stations", ["sensor_002"])),
            ),
            stuck_value=StuckValueConfig(
                enabled=bool(stuck_d.get("enabled", False)),
                start_time_sec=float(stuck_d.get("start_time_sec", 36000.0)),
                duration_sec=float(stuck_d.get("duration_sec", 14400.0)),
                affected_stations=list(stuck_d.get("affected_stations", ["sensor_002"])),
            ),
            telemetry_delay=TelemetryDelayConfig(
                enabled=bool(delay_d.get("enabled", False)),
                delay_sec=float(delay_d.get("delay_sec", 7200.0)),
                affected_stations=list(delay_d.get("affected_stations", ["sensor_002", "sensor_003"])),
            ),
        )
        cfg.validate()
        return cfg


@dataclass
class FaultedObservationResult:
    event_id: str
    true_source_id: str
    timestamps_sec: np.ndarray
    clean_observations: Dict[str, np.ndarray]
    corrupted_observations: Dict[str, np.ndarray]
    applied_faults: Dict[str, List[str]]
    seed: int


class SensorFaultInjector:
    """Applies configured fault transformations while preserving provenance and labels."""

    def __init__(self, config: FaultSuiteConfig) -> None:
        config.validate()
        self.config = config

    def apply_faults(
        self,
        sim_result: SimulationResult,
        seed: int = 42,
    ) -> FaultedObservationResult:
        """Applies configured sensor corruptions to a SimulationResult."""
        rng = np.random.default_rng(seed)

        times = sim_result.timestamps_sec
        clean_obs = {k: v.copy() for k, v in sim_result.station_observations.items()}
        corrupted_obs: Dict[str, np.ndarray] = {k: v.copy() for k, v in clean_obs.items()}
        applied_faults: Dict[str, List[str]] = {k: [] for k in clean_obs.keys()}

        # 1. Additive Measurement Noise
        if self.config.additive_noise.enabled:
            for s_id, vals in corrupted_obs.items():
                scale = np.nanstd(vals) * self.config.additive_noise.noise_std_ratio
                if scale <= 0:
                    scale = self.config.additive_noise.noise_std_ratio * 10.0  # nominal scale

                if self.config.additive_noise.distribution == "gaussian":
                    noise = rng.normal(0.0, scale, size=vals.shape)
                elif self.config.additive_noise.distribution == "laplace":
                    noise = rng.laplace(0.0, scale / np.sqrt(2), size=vals.shape)
                else:
                    raise ValueError(f"Unsupported distribution {self.config.additive_noise.distribution}")

                corrupted_obs[s_id] = vals + noise
                if self.config.additive_noise.zero_floor:
                    corrupted_obs[s_id] = np.maximum(corrupted_obs[s_id], 0.0)
                applied_faults[s_id].append("ADDITIVE_NOISE")

        # 2. Telemetry Delay (Lag shift)
        if self.config.telemetry_delay.enabled:
            dt_sample = float(times[1] - times[0]) if len(times) > 1 else 300.0
            shift_steps = int(np.round(self.config.telemetry_delay.delay_sec / dt_sample))
            if shift_steps > 0:
                for s_id in self.config.telemetry_delay.affected_stations:
                    if s_id in corrupted_obs:
                        vals = corrupted_obs[s_id]
                        # Delayed telemetry: shift forward in time, backfilling earliest values
                        delayed = np.empty_like(vals)
                        delayed[:shift_steps] = vals[0]
                        delayed[shift_steps:] = vals[:-shift_steps]
                        corrupted_obs[s_id] = delayed
                        applied_faults[s_id].append("TELEMETRY_DELAY")

        # 3. Gradual Sensor Drift (Ramp)
        if self.config.sensor_drift.enabled:
            t_start = self.config.sensor_drift.start_time_sec
            drift_rate = self.config.sensor_drift.drift_rate_per_hour
            for s_id in self.config.sensor_drift.affected_stations:
                if s_id in corrupted_obs:
                    vals = corrupted_obs[s_id]
                    drift_added = False
                    for i, t in enumerate(times):
                        if t >= t_start:
                            hours_elapsed = (t - t_start) / 3600.0
                            vals[i] += drift_rate * hours_elapsed
                            drift_added = True
                    if drift_added:
                        applied_faults[s_id].append("SENSOR_DRIFT")

        # 4. Stuck / Frozen Value
        if self.config.stuck_value.enabled:
            t_start = self.config.stuck_value.start_time_sec
            t_end = t_start + self.config.stuck_value.duration_sec
            for s_id in self.config.stuck_value.affected_stations:
                if s_id in corrupted_obs:
                    vals = corrupted_obs[s_id]
                    # Find freeze value at start time
                    freeze_val = None
                    stuck_added = False
                    for i, t in enumerate(times):
                        if t >= t_start and freeze_val is None:
                            freeze_val = vals[i]
                        if t_start <= t < t_end and freeze_val is not None:
                            vals[i] = freeze_val
                            stuck_added = True
                    if stuck_added:
                        applied_faults[s_id].append("STUCK_VALUE")

        # 5. Burst Dropout (Station outage window)
        if self.config.burst_dropout.enabled:
            t_start = self.config.burst_dropout.start_time_sec
            t_end = t_start + (self.config.burst_dropout.duration_hours * 3600.0)
            for s_id in self.config.burst_dropout.affected_stations:
                if s_id in corrupted_obs:
                    vals = corrupted_obs[s_id]
                    burst_mask = (times >= t_start) & (times < t_end)
                    if np.any(burst_mask):
                        vals[burst_mask] = np.nan
                        applied_faults[s_id].append("BURST_DROPOUT")

        # 6. Random Missing Observations (Dropout)
        if self.config.random_missingness.enabled:
            p_drop = self.config.random_missingness.dropout_probability
            for s_id, vals in corrupted_obs.items():
                mask = rng.random(size=vals.shape) < p_drop
                if np.any(mask):
                    vals[mask] = np.nan
                    applied_faults[s_id].append("RANDOM_MISSINGNESS")

        return FaultedObservationResult(
            event_id=sim_result.event_id,
            true_source_id=sim_result.true_source_id,  # Ground truth strictly preserved!
            timestamps_sec=times,
            clean_observations=clean_obs,
            corrupted_observations=corrupted_obs,
            applied_faults=applied_faults,
            seed=seed,
        )
