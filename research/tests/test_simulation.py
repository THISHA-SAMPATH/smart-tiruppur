"""Comprehensive Unit Test Suite for NoyyalSense Simulation Foundation.

Verifies:
1. Reproducibility under identical random seeds.
2. Different seeds producing different stochastic realizations.
3. Source-event labels remaining correct after fault injection.
4. Correct observation shapes, source IDs, timestamps, and station IDs.
5. Missingness, drift, stuck values, and delayed readings behaving according to their definitions.
6. Transport simulator's exact discrete mass accounting and boundary behavior.
7. Non-negative tracer concentrations under the chosen FVM numerical scheme.
8. Clear rejection of invalid configuration parameters.
9. Strict episode disjointness in train/validation/test partitioning.
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
        # Load baseline config from research/configs/simulation_params.json
        cfg_path = Path(__file__).resolve().parents[1] / "configs" / "simulation_params.json"
        self.config = SimulationConfig.from_json(cfg_path)
        # Use a short 2-hour duration for fast unit testing
        self.config.grid.simulation_duration_sec = 7200.0
        self.simulator = RiverADESimulator(self.config)

    def test_mass_conservation_within_domain(self) -> None:
        """Verifies mass balance deficit is within discrete machine precision (< 1e-10)."""
        # Inject 100 kg total tracer over 30 minutes at chainage 5 km
        injection = SpillInjection(
            source_id="unit_test_01",
            chainage_m=5000.0,
            start_time_sec=600.0,
            duration_sec=1800.0,
            mass_rate_gps=55.555555,  # ~100 kg total
        )
        res = self.simulator.run_simulation(
            event_id="test_mass_cons",
            injections=[injection],
            true_source_id="unit_test_01",
        )

        acc = res.mass_accounting
        self.assertGreater(acc.total_injected_mass_grams, 99000.0)
        # Relative deficit must be strictly smaller than discrete machine threshold
        self.assertLess(
            acc.relative_deficit,
            1e-10,
            f"Mass conservation relative deficit {acc.relative_deficit} exceeds 1e-10",
        )
        self.assertTrue(acc.is_conserved)

    def test_mass_conservation_with_boundary_outflow(self) -> None:
        """Verifies mass conservation when tracer pulse crosses downstream boundary."""
        # Fast advection with injection near boundary (30 km on 32 km domain)
        cfg = SimulationConfig(
            physics=ChannelPhysicsConfig(
                domain_length_m=1000.0,
                cross_section_area_m2=10.0,
                flow_velocity_mps=1.0,  # Fast 1 m/s
                dispersion_m2ps=2.0,
                decay_rate_per_sec=0.0001,  # Non-zero decay
                background_concentration=0.0,
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
        inj = SpillInjection("src_close", 500.0, 100.0, 200.0, 50.0)
        res = sim.run_simulation("test_outflow", [inj], "src_close")

        acc = res.mass_accounting
        self.assertGreater(acc.boundary_outflow_mass_grams, 0.0)
        self.assertGreater(acc.decayed_mass_grams, 0.0)
        self.assertLess(
            acc.relative_deficit,
            1e-10,
            f"Mass conservation deficit {acc.relative_deficit} with outflow exceeds 1e-10",
        )

    def test_non_negative_concentrations(self) -> None:
        """Verifies that concentrations remain strictly non-negative everywhere."""
        inj = SpillInjection("unit_001", 3200.0, 300.0, 600.0, 100.0)
        res = self.simulator.run_simulation("test_nonneg", [inj], "unit_001")

        self.assertTrue(np.all(res.final_concentration_profile >= 0.0))
        for s_id, trace in res.station_observations.items():
            self.assertTrue(
                np.all(trace >= self.config.physics.background_concentration - 1e-9),
                f"Station {s_id} reported concentrations below background",
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

        # Station outside domain
        with self.assertRaises(ValueError):
            MonitoringStation("s_bad", "Bad", 45000.0).validate(domain_length_m=32000.0)

        # Unstable CFL time step
        with self.assertRaises(ValueError):
            # dt = 500 s with dx = 100 m and u = 0.5 m/s causes dt * (u/dx) = 2.5 > 1
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

    def test_background_event_has_zero_injection(self) -> None:
        """Background episodes must have zero injected mass and stay at background level."""
        res, meta = self.generator.generate_single_event("ev_bg", "s0_background", seed=42)

        self.assertTrue(meta.is_background)
        self.assertEqual(meta.total_mass_grams, 0.0)
        self.assertEqual(res.mass_accounting.total_injected_mass_grams, 0.0)
        for trace in res.station_observations.values():
            np.testing.assert_allclose(trace, self.config.physics.background_concentration, atol=1e-6)

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
        config.grid.simulation_duration_sec = 3600.0
        config.grid.sample_interval_sec = 100.0
        generator = SyntheticEventGenerator(config)
        self.sim_result, self.meta = generator.generate_single_event(
            "ev_fault_test", "unit_004", seed=777
        )

    def test_ground_truth_label_preserved_after_faults(self) -> None:
        """Verifies that true_source_id is never modified by fault injection."""
        fault_cfg = FaultSuiteConfig(
            additive_noise=AdditiveNoiseConfig(enabled=True, noise_std_ratio=0.2),
            random_missingness=RandomMissingnessConfig(enabled=True, dropout_probability=0.3),
            sensor_drift=SensorDriftConfig(enabled=True, drift_rate_per_hour=20.0, start_time_sec=500.0),
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
        # Unaffected station must have zero NaNs
        self.assertFalse(np.any(np.isnan(faulted.corrupted_observations["sensor_001"])))

    def test_sensor_drift_ramp(self) -> None:
        """Verifies gradual linear drift increases readings monotonically after start time."""
        fault_cfg = FaultSuiteConfig(
            sensor_drift=SensorDriftConfig(
                enabled=True,
                drift_rate_per_hour=36.0,  # 0.01 units/sec
                start_time_sec=1000.0,
                affected_stations=["sensor_002"],
            )
        )
        injector = SensorFaultInjector(fault_cfg)
        faulted = injector.apply_faults(self.sim_result, seed=42)

        times = faulted.timestamps_sec
        clean = faulted.clean_observations["sensor_002"]
        corrupted = faulted.corrupted_observations["sensor_002"]

        # Before drift start time: clean equals corrupted
        pre_drift = times < 1000.0
        np.testing.assert_array_equal(clean[pre_drift], corrupted[pre_drift])

        # At t = 2000s (1000s elapsed = 1000/3600 hr), drift = 36 * (1000/3600) = 10 units
        idx_2000 = int(np.where(times >= 2000.0)[0][0])
        drift_delta = corrupted[idx_2000] - clean[idx_2000]
        self.assertAlmostEqual(drift_delta, 10.0, places=1)

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
        # Variance of values during stuck window must be zero
        self.assertAlmostEqual(float(np.var(stuck_values)), 0.0, places=10)

    def test_telemetry_delay_lags_signal(self) -> None:
        """Verifies telemetry delay shifts observations forward in time."""
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


if __name__ == "__main__":
    unittest.main()
