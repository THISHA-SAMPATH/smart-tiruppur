"""Simplified 1D Advection-Dispersion Screening Simulator (ADE).

This module implements a conservative, one-dimensional finite-volume transport
simulator for synthetic tracer pulses in an idealized open channel. It serves as
the physical transport screening foundation for testing source attribution and
sensor fault abstention under controlled, reproducible conditions.

Physical & Modeling Notes:
1. Idealized Domain: The longitudinal coordinate and cross-sectional scales are
   synthetic screening assumptions inspired by the Tiruppur urban corridor, not
   a calibrated hydrodynamic model of the natural Noyyal River.
2. Taylor-Elder Assumptions: Longitudinal dispersion D_L is parameterized as an
   effective screening constant. True natural channels exhibit cross-sectional
   velocity shear and transient storage zones that typically yield higher
   dispersion than Elder's (1959) idealized logarithmic-profile formula.
3. Numerical Scheme: First-order upwind advection with central dispersion on a
   cell-centered finite volume mesh. Discrete mass conservation is preserved
   to machine precision by flux-form formulation.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np


@dataclass
class ChannelPhysicsConfig:
    domain_length_m: float = 32000.0
    cross_section_area_m2: float = 25.0
    flow_velocity_mps: float = 0.25
    dispersion_m2ps: float = 4.5
    decay_rate_per_sec: float = 0.0
    background_concentration: float = 50.0

    def validate(self) -> None:
        if self.domain_length_m <= 0:
            raise ValueError(f"domain_length_m must be positive, got {self.domain_length_m}")
        if self.cross_section_area_m2 <= 0:
            raise ValueError(f"cross_section_area_m2 must be positive, got {self.cross_section_area_m2}")
        if self.flow_velocity_mps < 0:
            raise ValueError(f"flow_velocity_mps must be non-negative, got {self.flow_velocity_mps}")
        if self.dispersion_m2ps < 0:
            raise ValueError(f"dispersion_m2ps must be non-negative, got {self.dispersion_m2ps}")
        if self.decay_rate_per_sec < 0:
            raise ValueError(f"decay_rate_per_sec must be non-negative, got {self.decay_rate_per_sec}")
        if self.background_concentration < 0:
            raise ValueError(f"background_concentration must be non-negative, got {self.background_concentration}")


@dataclass
class NumericalGridConfig:
    dx_m: float = 100.0
    dt_sec: float = 10.0
    simulation_duration_sec: float = 86400.0
    sample_interval_sec: float = 300.0

    def validate(self, physics: ChannelPhysicsConfig) -> None:
        if self.dx_m <= 0:
            raise ValueError(f"dx_m must be positive, got {self.dx_m}")
        if self.dt_sec <= 0:
            raise ValueError(f"dt_sec must be positive, got {self.dt_sec}")
        if self.simulation_duration_sec <= 0:
            raise ValueError(f"simulation_duration_sec must be positive, got {self.simulation_duration_sec}")
        if self.sample_interval_sec <= 0:
            raise ValueError(f"sample_interval_sec must be positive, got {self.sample_interval_sec}")

        # Check explicit CFL and diffusion stability condition:
        # dt * (u/dx + 2*D/dx^2 + k) <= 1
        denom = (physics.flow_velocity_mps / self.dx_m) + (2.0 * physics.dispersion_m2ps / (self.dx_m ** 2)) + physics.decay_rate_per_sec
        if denom > 0:
            max_stable_dt = 1.0 / denom
            if self.dt_sec > max_stable_dt:
                raise ValueError(
                    f"Time step dt_sec ({self.dt_sec} s) exceeds explicit FVM stability limit "
                    f"({max_stable_dt:.3f} s). Decrease dt_sec or increase dx_m."
                )


@dataclass
class MonitoringStation:
    station_id: str
    name: str
    chainage_m: float

    def validate(self, domain_length_m: float) -> None:
        if not self.station_id:
            raise ValueError("station_id must be non-empty")
        if self.chainage_m < 0 or self.chainage_m > domain_length_m:
            raise ValueError(
                f"Station '{self.station_id}' chainage ({self.chainage_m} m) is outside domain [0, {domain_length_m} m]"
            )


@dataclass
class CandidateSource:
    source_id: str
    name: str
    chainage_m: float
    nominal_mass_rate_gps: float = 25.0

    def validate(self, domain_length_m: float) -> None:
        if not self.source_id:
            raise ValueError("source_id must be non-empty")
        if self.chainage_m < 0 or self.chainage_m > domain_length_m:
            raise ValueError(
                f"Source '{self.source_id}' chainage ({self.chainage_m} m) is outside domain [0, {domain_length_m} m]"
            )
        if self.nominal_mass_rate_gps < 0:
            raise ValueError(f"nominal_mass_rate_gps must be non-negative, got {self.nominal_mass_rate_gps}")


@dataclass
class SpillInjection:
    source_id: str
    chainage_m: float
    start_time_sec: float
    duration_sec: float
    mass_rate_gps: float  # grams per second

    @property
    def total_mass_grams(self) -> float:
        return self.mass_rate_gps * self.duration_sec

    def rate_at_time(self, t_sec: float) -> float:
        if self.start_time_sec <= t_sec < (self.start_time_sec + self.duration_sec):
            return self.mass_rate_gps
        return 0.0


@dataclass
class SimulationConfig:
    physics: ChannelPhysicsConfig = field(default_factory=ChannelPhysicsConfig)
    grid: NumericalGridConfig = field(default_factory=NumericalGridConfig)
    stations: List[MonitoringStation] = field(default_factory=list)
    sources: List[CandidateSource] = field(default_factory=list)

    @classmethod
    def from_json(cls, path_or_str: str | Path) -> "SimulationConfig":
        path = Path(path_or_str)
        if path.is_file():
            data = json.loads(path.read_text(encoding="utf-8"))
        else:
            data = json.loads(str(path_or_str))

        phys_dict = data.get("channel_physics", {})
        grid_dict = data.get("numerical_scheme", {})
        stations_list = [
            MonitoringStation(
                station_id=s["station_id"],
                name=s.get("name", s["station_id"]),
                chainage_m=float(s["chainage_m"]),
            )
            for s in data.get("monitoring_stations", [])
        ]
        sources_list = [
            CandidateSource(
                source_id=src["source_id"],
                name=src.get("name", src["source_id"]),
                chainage_m=float(src["chainage_m"]),
                nominal_mass_rate_gps=float(src.get("nominal_mass_rate_gps", 25.0)),
            )
            for src in data.get("candidate_sources", [])
        ]

        physics = ChannelPhysicsConfig(
            domain_length_m=float(phys_dict.get("domain_length_m", 32000.0)),
            cross_section_area_m2=float(phys_dict.get("cross_section_area_m2", 25.0)),
            flow_velocity_mps=float(phys_dict.get("flow_velocity_mps", 0.25)),
            dispersion_m2ps=float(phys_dict.get("dispersion_m2ps", 4.5)),
            decay_rate_per_sec=float(phys_dict.get("decay_rate_per_sec", 0.0)),
            background_concentration=float(phys_dict.get("background_concentration", 50.0)),
        )

        grid = NumericalGridConfig(
            dx_m=float(grid_dict.get("dx_m", 100.0)),
            dt_sec=float(grid_dict.get("dt_sec", 10.0)),
            simulation_duration_sec=float(grid_dict.get("simulation_duration_sec", 86400.0)),
            sample_interval_sec=float(grid_dict.get("sample_interval_sec", 300.0)),
        )

        config = cls(physics=physics, grid=grid, stations=stations_list, sources=sources_list)
        config.validate()
        return config

    def validate(self) -> None:
        self.physics.validate()
        self.grid.validate(self.physics)
        for s in self.stations:
            s.validate(self.physics.domain_length_m)
        for src in self.sources:
            src.validate(self.physics.domain_length_m)


@dataclass
class MassAccountingResult:
    total_injected_mass_grams: float
    domain_retained_mass_grams: float
    boundary_outflow_mass_grams: float
    decayed_mass_grams: float
    mass_conservation_deficit_grams: float
    relative_deficit: float

    @property
    def is_conserved(self) -> bool:
        # In a discrete flux FVM scheme, deficit is bounded strictly by machine roundoff
        return self.relative_deficit < 1e-10


@dataclass
class SimulationResult:
    event_id: str
    true_source_id: str
    timestamps_sec: np.ndarray
    station_observations: Dict[str, np.ndarray]  # station_id -> concentration array
    mass_accounting: MassAccountingResult
    raw_spatial_grid_x: np.ndarray
    final_concentration_profile: np.ndarray


class RiverADESimulator:
    """Conservative 1D Finite-Volume Advection-Dispersion Simulator."""

    def __init__(self, config: SimulationConfig) -> None:
        config.validate()
        self.config = config

        self.L = config.physics.domain_length_m
        self.A = config.physics.cross_section_area_m2
        self.u = config.physics.flow_velocity_mps
        self.D = config.physics.dispersion_m2ps
        self.k = config.physics.decay_rate_per_sec
        self.C_base = config.physics.background_concentration

        self.dx = config.grid.dx_m
        self.dt = config.grid.dt_sec
        self.duration = config.grid.simulation_duration_sec
        self.sample_interval = config.grid.sample_interval_sec

        self.Nx = int(np.round(self.L / self.dx))
        self.cell_volume = self.A * self.dx  # m^3
        self.cell_centers = (np.arange(self.Nx) + 0.5) * self.dx

        # Map stations to fractional cell indices for linear interpolation
        self.station_indices = {
            s.station_id: min(self.Nx - 1, max(0.0, s.chainage_m / self.dx - 0.5))
            for s in config.stations
        }

    def _sample_stations(self, C: np.ndarray) -> Dict[str, float]:
        """Interpolate concentration at configured monitoring stations."""
        readings: Dict[str, float] = {}
        for s in self.config.stations:
            pos = s.chainage_m
            # Linear interpolation on cell centers
            idx_float = (pos / self.dx) - 0.5
            i0 = int(np.floor(idx_float))
            i1 = i0 + 1
            if i0 < 0:
                c_val = C[0]
            elif i1 >= self.Nx:
                c_val = C[-1]
            else:
                frac = idx_float - i0
                c_val = (1.0 - frac) * C[i0] + frac * C[i1]
            readings[s.station_id] = float(c_val)
        return readings

    def run_simulation(
        self,
        event_id: str,
        injections: Optional[List[SpillInjection]] = None,
        true_source_id: str = "s0_background",
    ) -> SimulationResult:
        """Executes a 1D ADE simulation run with mass accounting."""
        if injections is None:
            injections = []

        # Validate injections
        for inj in injections:
            if inj.chainage_m < 0 or inj.chainage_m > self.L:
                raise ValueError(f"Injection chainage {inj.chainage_m} m is outside domain [0, {self.L} m]")

        # Initial concentration profile: strictly tracer addition (0.0), background added at output
        C_tracer = np.zeros(self.Nx, dtype=np.float64)

        # Pre-locate source cells
        injection_cells = []
        for inj in injections:
            cell_idx = int(np.clip(np.floor(inj.chainage_m / self.dx), 0, self.Nx - 1))
            injection_cells.append((inj, cell_idx))

        n_steps = int(np.ceil(self.duration / self.dt))
        sample_stride = max(1, int(np.round(self.sample_interval / self.dt)))

        sample_times: List[float] = []
        station_traces: Dict[str, List[float]] = {s.station_id: [] for s in self.config.stations}

        total_injected_mass = 0.0
        cumulative_outflow_mass = 0.0
        cumulative_decayed_mass = 0.0

        current_time = 0.0

        for step in range(n_steps):
            # Record sampled output at regular intervals
            if step % sample_stride == 0:
                sample_times.append(current_time)
                # Station output includes background concentration
                sample_C = C_tracer + self.C_base
                station_vals = self._sample_stations(sample_C)
                for s_id, val in station_vals.items():
                    station_traces[s_id].append(val)

            # Compute internal cell face fluxes (F_{i+1/2})
            # Flux unit: grams/second
            # Advection: first-order upwind F_adv = A * u * C_i
            # Dispersion: central F_disp = -A * D * (C_{i+1} - C_i) / dx
            f_adv = self.A * self.u * C_tracer[:-1]
            f_disp = -self.A * self.D * (C_tracer[1:] - C_tracer[:-1]) / self.dx
            internal_fluxes = f_adv + f_disp

            # Boundary face fluxes:
            # Upstream (x=0): zero added tracer inflow F_{-1/2} = 0
            f_in = 0.0
            # Downstream (x=L): zero diffusive gradient, advective outflow F_{Nx-1/2} = A * u * C[-1]
            f_out = self.A * self.u * C_tracer[-1]

            # Injections for current time step
            inj_rates = np.zeros(self.Nx, dtype=np.float64)
            for inj, c_idx in injection_cells:
                rate = inj.rate_at_time(current_time)
                if rate > 0.0:
                    inj_rates[c_idx] += rate
                    total_injected_mass += rate * self.dt

            # Divergence of fluxes: dM/dt = F_{in} - F_{out}
            net_flux = np.empty(self.Nx, dtype=np.float64)
            net_flux[0] = f_in - internal_fluxes[0]
            net_flux[1:-1] = internal_fluxes[:-1] - internal_fluxes[1:]
            net_flux[-1] = internal_fluxes[-1] - f_out

            # First-order decay
            decay_rate = self.k * self.cell_volume * C_tracer
            cumulative_decayed_mass += float(np.sum(decay_rate)) * self.dt
            cumulative_outflow_mass += f_out * self.dt

            # Update concentration: C_new = C + dt/V * (net_flux + inj - decay)
            C_tracer = C_tracer + (self.dt / self.cell_volume) * (net_flux + inj_rates - decay_rate)

            # Numerical non-negativity guard (CFL guarantees >= 0 up to machine precision)
            C_tracer = np.maximum(C_tracer, 0.0)

            current_time += self.dt

        # Final sample point if needed
        if len(sample_times) == 0 or sample_times[-1] < current_time - (self.sample_interval / 2):
            sample_times.append(current_time)
            sample_C = C_tracer + self.C_base
            station_vals = self._sample_stations(sample_C)
            for s_id, val in station_vals.items():
                station_traces[s_id].append(val)

        # Mass accounting
        domain_retained_mass = float(np.sum(C_tracer) * self.cell_volume)
        accounted_mass = domain_retained_mass + cumulative_outflow_mass + cumulative_decayed_mass
        mass_deficit = abs(accounted_mass - total_injected_mass)
        rel_deficit = mass_deficit / max(total_injected_mass, 1e-9)

        mass_result = MassAccountingResult(
            total_injected_mass_grams=float(total_injected_mass),
            domain_retained_mass_grams=float(domain_retained_mass),
            boundary_outflow_mass_grams=float(cumulative_outflow_mass),
            decayed_mass_grams=float(cumulative_decayed_mass),
            mass_conservation_deficit_grams=float(mass_deficit),
            relative_deficit=float(rel_deficit),
        )

        return SimulationResult(
            event_id=event_id,
            true_source_id=true_source_id,
            timestamps_sec=np.array(sample_times, dtype=np.float64),
            station_observations={k: np.array(v, dtype=np.float64) for k, v in station_traces.items()},
            mass_accounting=mass_result,
            raw_spatial_grid_x=self.cell_centers.copy(),
            final_concentration_profile=C_tracer.copy(),
        )
