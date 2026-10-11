"""Comprehensive Unit Test Suite for NoyyalSense Simulation Foundation.

Phase 1.1 Scientific Consistency & Independent Mass Audit.

Verifies:
1. Dimensional consistency: tracer concentration in g/m³, background tracer at 0.0 g/m³,
   and decoupled baseline electrical conductivity (µS/cm).
2. Independent mass conservation reconstruction (integrating scheduled injections,
   boundary outflow flux, and decay loss from raw time-series rather than internal accumulators).
3. Mass balance behavior across multiple spatial and temporal grid resolutions.
4. Reconciled decay parameters: nominal sensitivity range (0 - 0.05 h⁻¹) and documented stress test.
5. Reconciled sensor drift parameters: absolute g/(m³·h) and relative std/h modes.
6. Telemetry delay semantics: physical measurement timestamps vs arrival timestamps.
7. Non-negative physical tracer state under valid CFL/diffusion stability.
8. Clear rejection of invalid physics, grid, and fault configurations.
9. Reproducibility under fixed random seeds and strict train/val/test episode separation.
"""

from __future__ import annotations

import unittest
from pathlib import Path

import numpy as np

from research.simulation.river_ade_simulator import (
    CandidateSource,
    ChannelPhysicsConfig,
    MonitoringStation,
    NumericalGridConfig,
    RiverADESimulator,
    SimulationConfig,
    SpillInjection,
)
from research.simulation.synthetic_event_generator import (
    EpisodeDataset,
    SyntheticEventGenerator,
    partition_dataset,
)
from research.simulation.sensor_faults import (
    AdditiveNoiseConfig,
    BurstDropoutConfig,
    FaultSuiteConfig,
    RandomMissingnessConfig,
    SensorDriftConfig,
    SensorFaultInjector,
    StuckValueConfig,
    TelemetryDelayConfig,
)


class TestRiverADESimulator(unittest.TestCase):
    """Tests for the 1D Finite-Volume ADE Transport Simulator."""

    def setUp(self) -> None:
        cfg_path = Path(__file__).resolve().parents[1] / "configs" / "simulation_params.json"
        self.config = SimulationConfig.from_json(cfg_path)
        # Use a short 2-hour duration for fast unit testing
        self.config.grid.simulation_duration_sec = 7200.0
        self.simulator = RiverADESimulator(self.config)

    def test_concentration_units_and_background_consistency(self) -> None:
        """Verifies tracer concentration is modeled in g/m³ and background tracer is 0.0 g/m³."""
        # Baseline background tracer must be 0.0 g/m³
        self.assertEqual(self.config.physics.background_tracer_concentration_gpm3, 0.0)
        # Decoupled electrical conductivity must be present as a separate indicator
        self.assertIsNotNone(self.config.physics.illustrative_baseline_ec_uS_cm)
        self.assertEqual(self.config.physics.illustrative_baseline_ec_uS_cm, 50.0)

        # In a zero-source run, all station observations must be exactly 0.0 g/m³
        res = self.simulator.run_simulation("test_zero_tracer", [], "s0_background")
        for s_id, trace in res.station_observations.items():
            np.testing.assert_allclose(
                trace,
                0.0,
                atol=1e-12,
                err_msg=f"Station {s_id} showed non-zero tracer in zero-source run",
            )
        # Illustrative EC baseline is exported as decoupled metadata
        self.assertEqual(res.illustrative_baseline_ec_uS_cm, 50.0)

    def test_independent_mass_conservation_within_domain(self) -> None:
        """Independently reconstructs mass balance from raw injection schedule and spatial concentration grid."""
        # Inject known schedule: 50.0 g/s for 1800 s = 90,000 g
        inj = SpillInjection(
            source_id="unit_test_01",
            chainage_m=5000.0,
            start_time_sec=600.0,
            duration_sec=1800.0,
            mass_rate_gps=50.0,
        )
        res = self.simulator.run_simulation(
            event_id="test_indep_mass",
            injections=[inj],
            true_source_id="unit_test_01",
        )

        # 1. Independent scheduled mass calculation (directly from injection object)
        scheduled_mass_grams = inj.mass_rate_gps * inj.duration_sec
        self.assertEqual(scheduled_mass_grams, 90000.0)

        # 2. Independent in-domain mass integration (directly from final concentration profile)
        cell_volume = self.config.physics.cross_section_area_m2 * self.config.grid.dx_m
        domain_mass_indep = float(np.sum(res.final_concentration_profile) * cell_volume)

        # 3. Independent boundary flux integration (integrating exported step flux series)
        dt = res.dt_sec
        outflow_mass_indep = float(np.sum(res.boundary_outflow_flux_series) * dt)

        # 4. Independent decay loss integration
        decay_mass_indep = float(np.sum(res.decay_loss_rate_series) * dt)

        # 5. Independent mass-balance closure check
        accounted_total = domain_mass_indep + outflow_mass_indep + decay_mass_indep
        residual = abs(accounted_total - scheduled_mass_grams)
        rel_residual = residual / scheduled_mass_grams

        self.assertLess(
            rel_residual,
            1e-10,
            f"Independent mass conservation residual {rel_residual} exceeds 1e-10 tolerance",
        )

    def test_independent_mass_conservation_with_nominal_decay_and_outflow(self) -> None:
        """Verifies independent mass reconstruction with boundary outflow and nominal decay (0.03 h⁻¹)."""
        # Nominal decay within declared sensitivity range [0, 0.05 h⁻¹]: k = 0.03 h⁻¹ = 8.333e-6 s⁻¹
        decay_rate_per_sec = 0.03 / 3600.0
        cfg = SimulationConfig(
            physics=ChannelPhysicsConfig(
                domain_length_m=1000.0,
                cross_section_area_m2=10.0,
                flow_velocity_mps=1.0,
                dispersion_m2ps=2.0,
                decay_rate_per_sec=decay_rate_per_sec,
                background_tracer_concentration_gpm3=0.0,
            ),
            grid=NumericalGridConfig(
                dx_m=20.0,
                dt_sec=2.0,
                simulation_duration_sec=2000.0,
                sample_interval_sec=50.0,
            ),
            stations=[MonitoringStation("s_exit", "Exit", 950.0)],
            sources=[CandidateSource("src_close", "Close", 500.0)],
        )
        sim = RiverADESimulator(cfg)
        inj = SpillInjection("src_close", 500.0, 100.0, 200.0, 50.0)  # 10,000 g
        res = sim.run_simulation("test_nominal_decay", [inj], "src_close")

        # Independent reconstruction
        scheduled_mass = inj.mass_rate_gps * inj.duration_sec
        cell_vol = cfg.physics.cross_section_area_m2 * cfg.grid.dx_m
        domain_mass = float(np.sum(res.final_concentration_profile) * cell_vol)
        outflow_mass = float(np.sum(res.boundary_outflow_flux_series) * res.dt_sec)
        decay_mass = float(np.sum(res.decay_loss_rate_series) * res.dt_sec)

        self.assertGreater(outflow_mass, 0.0, "Tracer should have crossed downstream boundary")
        self.assertGreater(decay_mass, 0.0, "Decay loss should be positive for non-zero k_decay")

        rel_residual = abs((domain_mass + outflow_mass + decay_mass) - scheduled_mass) / scheduled_mass
        self.assertLess(
            rel_residual,
            1e-10,
            f"Nominal decay mass balance residual {rel_residual} exceeds 1e-10",
        )

    def test_mass_conservation_numerical_stress_high_decay(self) -> None:
        """Separate numerical stress test: verifies mass balance under high decay rate (0.36 h⁻¹ = 1e-4 s⁻¹)."""
        stress_decay_per_sec = 1e-4  # 0.36 h⁻¹, exceeding nominal range for stress testing
        cfg = SimulationConfig(
            physics=ChannelPhysicsConfig(
                domain_length_m=2000.0,
                cross_section_area_m2=15.0,
                flow_velocity_mps=0.5,
                dispersion_m2ps=3.0,
                decay_rate_per_sec=stress_decay_per_sec,
                background_tracer_concentration_gpm3=0.0,
            ),
            grid=NumericalGridConfig(
                dx_m=25.0,
                dt_sec=2.0,
                simulation_duration_sec=3000.0,
                sample_interval_sec=100.0,
            ),
            stations=[MonitoringStation("s_mid", "Mid", 1000.0)],
            sources=[CandidateSource("src_1", "Source 1", 300.0)],
        )
        sim = RiverADESimulator(cfg)
        inj = SpillInjection("src_1", 300.0, 200.0, 400.0, 25.0)  # 10,000 g
        res = sim.run_simulation("test_stress_decay", [inj], "src_1")

        scheduled_mass = inj.mass_rate_gps * inj.duration_sec
        cell_vol = cfg.physics.cross_section_area_m2 * cfg.grid.dx_m
        domain_mass = float(np.sum(res.final_concentration_profile) * cell_vol)
        outflow_mass = float(np.sum(res.boundary_outflow_flux_series) * res.dt_sec)
        decay_mass = float(np.sum(res.decay_loss_rate_series) * res.dt_sec)

        rel_residual = abs((domain_mass + outflow_mass + decay_mass) - scheduled_mass) / scheduled_mass
        self.assertLess(
            rel_residual,
            1e-10,
            f"Stress decay mass balance residual {rel_residual} exceeds 1e-10",
        )

    def test_mass_balance_across_multiple_grid_resolutions(self) -> None:
        """Verifies mass conservation across fine, baseline, and coarse spatial/temporal grids."""
        test_resolutions = [
            (50.0, 5.0),   # Fine grid: dx=50m, dt=5s
            (100.0, 10.0), # Baseline grid: dx=100m, dt=10s
            (200.0, 20.0), # Coarse grid: dx=200m, dt=20s
        ]
        for dx, dt in test_resolutions:
            cfg = SimulationConfig(
                physics=ChannelPhysicsConfig(
                    domain_length_m=10000.0,
                    cross_section_area_m2=20.0,
                    flow_velocity_mps=0.25,
                    dispersion_m2ps=4.5,
                    decay_rate_per_sec=0.0,
                    background_tracer_concentration_gpm3=0.0,
                ),
                grid=NumericalGridConfig(
                    dx_m=dx,
                    dt_sec=dt,
                    simulation_duration_sec=3600.0,
                    sample_interval_sec=300.0,
                ),
                stations=[MonitoringStation("s1", "S1", 5000.0)],
                sources=[CandidateSource("src1", "Src1", 2000.0)],
            )
            sim = RiverADESimulator(cfg)
            inj = SpillInjection("src1", 2000.0, 300.0, 600.0, 30.0)
            res = sim.run_simulation("test_res", [inj], "src1")

            scheduled_mass = inj.mass_rate_gps * inj.duration_sec
            cell_vol = cfg.physics.cross_section_area_m2 * dx
            domain_mass = float(np.sum(res.final_concentration_profile) * cell_vol)
            outflow_mass = float(np.sum(res.boundary_outflow_flux_series) * dt)
            decay_mass = float(np.sum(res.decay_loss_rate_series) * dt)

            rel_residual = abs((domain_mass + outflow_mass + decay_mass) - scheduled_mass) / scheduled_mass
            self.assertLess(
                rel_residual,
                1e-10,
                f"Resolution dx={dx}, dt={dt} had mass balance residual {rel_residual} > 1e-10",
            )

    def test_non_negative_concentrations(self) -> None:
        """Verifies that physical tracer concentrations remain strictly non-negative everywhere."""
        inj = SpillInjection("unit_001", 3200.0, 300.0, 600.0, 100.0)
        res = self.simulator.run_simulation("test_nonneg", [inj], "unit_001")

        self.assertTrue(np.all(res.final_concentration_profile >= 0.0))
        for s_id, trace in res.station_observations.items():
            self.assertTrue(
                np.all(trace >= 0.0),
                f"Station {s_id} reported negative tracer concentration",
            )

    def test_observation_shapes_and_timestamps(self) -> None:
        """Verifies observation output dimensions and timestamp regularity."""
        res = self.simulator.run_simulation("test_shapes", [], "s0_background")

        expected_samples = int(
            self.config.grid.simulation_duration_sec / self.config.grid.sample_interval_sec
        ) + 1
        self.assertEqual(len(res.timestamps_sec), expected_samples)

        for s in self.config.stations:
            self.assertIn(s.station_id, res.station_observations)
            trace = res.station_observations[s.station_id]
            self.assertEqual(len(trace), expected_samples)

    def test_invalid_configurations_rejected(self) -> None:
        """Verifies that invalid physics and grid parameters raise ValueError."""
        # Negative area
        with self.assertRaises(ValueError):
            ChannelPhysicsConfig(cross_section_area_m2=-5.0).validate()

        # Negative velocity
        with self.assertRaises(ValueError):
            ChannelPhysicsConfig(flow_velocity_mps=-1.0).validate()

        # Negative background tracer
        with self.assertRaises(ValueError):
            ChannelPhysicsConfig(background_tracer_concentration_gpm3=-1.0).validate()

        # Station outside domain
        with self.assertRaises(ValueError):
            MonitoringStation("s_bad", "Bad", 45000.0).validate(domain_length_m=32000.0)

        # Unstable CFL time step
        with self.assertRaises(ValueError):
            phys = ChannelPhysicsConfig(flow_velocity_mps=0.5, dispersion_m2ps=10.0)
            grid = NumericalGridConfig(dx_m=100.0, dt_sec=500.0)
            grid.validate(phys)


class TestSyntheticEventGenerator(unittest.TestCase):
    """Tests for the ground-truth synthetic event generator."""

    def setUp(self) -> None:
        cfg_path = Path(__file__).resolve().parents[1] / "configs" / "simulation_params.json"
        self.config = SimulationConfig.from_json(cfg_path)
        self.config.grid.simulation_duration_sec = 3600.0
        self.config.grid.sample_interval_sec = 300.0
        self.generator = SyntheticEventGenerator(self.config)

    def test_reproducibility_under_identical_seeds(self) -> None:
        """Identical seeds must produce identical simulation traces and metadata."""
        res1, meta1 = self.generator.generate_single_event("ev_001", "unit_004", seed=12345)
        res2, meta2 = self.generator.generate_single_event("ev_001", "unit_004", seed=12345)

        self.assertEqual(meta1.start_time_sec, meta2.start_time_sec)
        self.assertEqual(meta1.mass_rate_gps, meta2.mass_rate_gps)
        for s_id in self.config.stations:
            np.testing.assert_array_equal(
                res1.station_observations[s_id.station_id],
                res2.station_observations[s_id.station_id],
            )

    def test_different_seeds_produce_different_realizations(self) -> None:
        """Different seeds must produce different injection parameters."""
        _, meta1 = self.generator.generate_single_event("ev_001", "unit_004", seed=111)
        _, meta2 = self.generator.generate_single_event("ev_002", "unit_004", seed=999)

        self.assertNotEqual(meta1.start_time_sec, meta2.start_time_sec)

    def test_background_event_has_zero_tracer(self) -> None:
        """Background episodes must have zero injected mass and 0.0 g/m³ tracer concentration."""
        res, meta = self.generator.generate_single_event("ev_bg", "s0_background", seed=42)

        self.assertTrue(meta.is_background)
        self.assertEqual(meta.total_mass_grams, 0.0)
        self.assertEqual(res.mass_accounting.total_injected_mass_grams, 0.0)
        for trace in res.station_observations.values():
            np.testing.assert_allclose(trace, 0.0, atol=1e-12)

    def test_partition_dataset_disjointness(self) -> None:
        """Verifies strict episode ID separation across train, validation, and test splits."""
        dataset = self.generator.generate_suite(n_events=15, base_seed=42)
        train_set, val_set, test_set = partition_dataset(
            dataset, train_ratio=0.60, val_ratio=0.20, test_ratio=0.20, seed=101
        )

        train_ids = set(train_set.get_event_ids())
        val_ids = set(val_set.get_event_ids())
        test_ids = set(test_set.get_event_ids())

        self.assertEqual(len(train_ids) + len(val_ids) + len(test_ids), 15)
        self.assertEqual(len(train_ids.intersection(val_ids)), 0)
        self.assertEqual(len(train_ids.intersection(test_ids)), 0)
        self.assertEqual(len(val_ids.intersection(test_ids)), 0)


class TestSensorFaultInjector(unittest.TestCase):
    """Tests for independently configurable sensor fault transformations."""

    def setUp(self) -> None:
        cfg_path = Path(__file__).resolve().parents[1] / "configs" / "simulation_params.json"
        config = SimulationConfig.from_json(cfg_path)
        # 6-hour simulation allowing tracer pulse to reach sensor_002 (3.6 km downstream of unit_004 at 0.25 m/s takes 4h)
        config.grid.simulation_duration_sec = 21600.0
        config.grid.sample_interval_sec = 100.0
        generator = SyntheticEventGenerator(config)
        self.sim_result, self.meta = generator.generate_single_event(
            "ev_fault_test",
            "unit_004",
            seed=777,
            start_time_sec=1800.0,
            duration_sec=3600.0,
            mass_rate_gps=50.0,
        )

    def test_ground_truth_label_preserved_after_faults(self) -> None:
        """Verifies that true_source_id is never modified by fault injection."""
        fault_cfg = FaultSuiteConfig(
            additive_noise=AdditiveNoiseConfig(enabled=True, noise_std_ratio=0.2),
            random_missingness=RandomMissingnessConfig(enabled=True, dropout_probability=0.3),
            sensor_drift=SensorDriftConfig(
                enabled=True,
                drift_mode="absolute",
                drift_rate_per_hour=2.0,
                start_time_sec=500.0,
            ),
        )
        injector = SensorFaultInjector(fault_cfg)
        faulted = injector.apply_faults(self.sim_result, seed=42)

        self.assertEqual(faulted.true_source_id, self.sim_result.true_source_id)
        self.assertEqual(faulted.event_id, self.sim_result.event_id)

    def test_random_missingness_produces_nans(self) -> None:
        """Verifies random dropout inserts NaNs at the configured probability."""
        fault_cfg = FaultSuiteConfig(
            random_missingness=RandomMissingnessConfig(enabled=True, dropout_probability=0.25)
        )
        injector = SensorFaultInjector(fault_cfg)
        faulted = injector.apply_faults(self.sim_result, seed=42)

        total_points = sum(len(v) for v in faulted.corrupted_observations.values())
        total_nans = sum(int(np.sum(np.isnan(v))) for v in faulted.corrupted_observations.values())

        observed_ratio = total_nans / total_points
        self.assertAlmostEqual(observed_ratio, 0.25, delta=0.08)

    def test_burst_dropout_window(self) -> None:
        """Verifies burst dropout masks observations inside the specified time window."""
        fault_cfg = FaultSuiteConfig(
            burst_dropout=BurstDropoutConfig(
                enabled=True,
                duration_hours=0.5,  # 1800 s
                start_time_sec=1000.0,
                affected_stations=["sensor_002"],
            )
        )
        injector = SensorFaultInjector(fault_cfg)
        faulted = injector.apply_faults(self.sim_result, seed=42)

        times = faulted.timestamps_sec
        trace = faulted.corrupted_observations["sensor_002"]

        window_mask = (times >= 1000.0) & (times < 2800.0)
        outside_mask = ~window_mask

        self.assertTrue(np.all(np.isnan(trace[window_mask])))
        self.assertFalse(np.any(np.isnan(trace[outside_mask])))
        self.assertFalse(np.any(np.isnan(faulted.corrupted_observations["sensor_001"])))

    def test_sensor_drift_absolute_mode(self) -> None:
        """Verifies absolute drift in g/(m³·h) adds a linear ramp after start time."""
        # Drift rate = 3.6 g/(m³·h) = 0.001 g/(m³·s)
        fault_cfg = FaultSuiteConfig(
            sensor_drift=SensorDriftConfig(
                enabled=True,
                drift_mode="absolute",
                drift_rate_per_hour=3.6,
                start_time_sec=1000.0,
                affected_stations=["sensor_002"],
            )
        )
        injector = SensorFaultInjector(fault_cfg)
        faulted = injector.apply_faults(self.sim_result, seed=42)

        times = faulted.timestamps_sec
        clean = faulted.clean_observations["sensor_002"]
        corrupted = faulted.corrupted_observations["sensor_002"]

        # Before drift onset: identical
        pre_drift = times < 1000.0
        np.testing.assert_array_equal(clean[pre_drift], corrupted[pre_drift])

        # At t = 2000s (1000s elapsed = 1000/3600 hr), drift = 3.6 * (1000/3600) = 1.0 g/m³
        idx_2000 = int(np.where(times >= 2000.0)[0][0])
        drift_delta = corrupted[idx_2000] - clean[idx_2000]
        self.assertAlmostEqual(drift_delta, 1.0, places=2)

    def test_sensor_drift_relative_std_mode(self) -> None:
        """Verifies relative_std drift adds drift proportional to signal standard deviation."""
        fault_cfg = FaultSuiteConfig(
            sensor_drift=SensorDriftConfig(
                enabled=True,
                drift_mode="relative_std",
                drift_std_ratio_per_hour=0.10,  # 10% of std per hour
                start_time_sec=1000.0,
                affected_stations=["sensor_002"],
            )
        )
        injector = SensorFaultInjector(fault_cfg)
        faulted = injector.apply_faults(self.sim_result, seed=42)

        times = faulted.timestamps_sec
        clean = faulted.clean_observations["sensor_002"]
        corrupted = faulted.corrupted_observations["sensor_002"]

        signal_std = float(np.nanstd(clean))
        self.assertGreater(signal_std, 0.1, "Signal std at sensor_002 should be non-zero for plume")

        idx_2000 = int(np.where(times >= 2000.0)[0][0])
        expected_offset = 0.10 * signal_std * (1000.0 / 3600.0)
        actual_offset = corrupted[idx_2000] - clean[idx_2000]
        self.assertAlmostEqual(actual_offset, expected_offset, places=2)

    def test_stuck_value_freezes_reading(self) -> None:
        """Verifies that stuck sensor outputs a constant identical value during window."""
        fault_cfg = FaultSuiteConfig(
            stuck_value=StuckValueConfig(
                enabled=True,
                start_time_sec=1200.0,
                duration_sec=1500.0,
                affected_stations=["sensor_002"],
            )
        )
        injector = SensorFaultInjector(fault_cfg)
        faulted = injector.apply_faults(self.sim_result, seed=42)

        times = faulted.timestamps_sec
        corrupted = faulted.corrupted_observations["sensor_002"]

        stuck_mask = (times >= 1200.0) & (times < 2700.0)
        stuck_values = corrupted[stuck_mask]

        self.assertGreater(len(stuck_values), 2)
        self.assertAlmostEqual(float(np.var(stuck_values)), 0.0, places=10)

    def test_telemetry_delay_lags_signal_and_sets_arrival_timestamps(self) -> None:
        """Verifies telemetry delay shifts observations forward in time and tracks arrival timestamps."""
        fault_cfg = FaultSuiteConfig(
            telemetry_delay=TelemetryDelayConfig(
                enabled=True,
                delay_sec=300.0,  # 3 sample intervals of 100s
                affected_stations=["sensor_002"],
            )
        )
        injector = SensorFaultInjector(fault_cfg)
        faulted = injector.apply_faults(self.sim_result, seed=42)

        clean = faulted.clean_observations["sensor_002"]
        corrupted = faulted.corrupted_observations["sensor_002"]

        # 300 s delay with dt_sample = 100 s is a 3-step shift
        np.testing.assert_array_equal(corrupted[3:], clean[:-3])

        # Arrival timestamps at receiver must be offset by delay_sec
        np.testing.assert_array_equal(
            faulted.arrival_timestamps_sec["sensor_002"],
            faulted.timestamps_sec + 300.0,
        )
        # Unaffected station arrival timestamps equal measurement timestamps
        np.testing.assert_array_equal(
            faulted.arrival_timestamps_sec["sensor_001"],
            faulted.timestamps_sec,
        )


if __name__ == "__main__":
    unittest.main()
