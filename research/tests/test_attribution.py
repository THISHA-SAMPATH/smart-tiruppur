"""Comprehensive Unit and Verification Tests for Source Attribution Framework.

Tests all minimum automated verification requirements for Phase 2:
1. Threshold detection on hand-constructed normal and abnormal examples.
2. Correct behavior for the background/no-source class.
3. No use of true-source labels as predictive features (leakage prevention).
4. Probability outputs and calibration behavior.
5. High-uncertainty or ambiguous cases producing ABSTAIN.
6. Sensor faults causing abstention only when the configured diagnostic rule is triggered.
7. Correct accepted-prediction and coverage denominators.
8. Zero-denominator handling across all evaluation metrics.
9. No use of future observations or un-arrived telemetry at decision time.
10. No episode overlap across train, calibration, validation and test splits.
11. Deterministic outputs under fixed seeds.
12. Small synthetic smoke-run pilot confirming end-to-end pipeline execution.
"""

from __future__ import annotations

import json
from pathlib import Path
import unittest

import numpy as np

from research.configs import *
from research.evaluation.attribution_metrics import (
    abstention_appropriateness_rate,
    abstention_rate,
    attribution_macro_f1,
    compute_risk_coverage_curve,
    decision_coverage,
    detection_rate,
    false_alarm_rate,
    mean_time_to_detect_hours,
    overall_accuracy,
    selective_accuracy,
    selective_risk,
)
from research.models.baselines import (
    ConventionalClassifier,
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

        # Normal clean baseline: concentration 0.0 everywhere
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

        # Abnormal spike breaching threshold at step 4 (t = 1200 s)
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

        # M1 on background flow
        m1 = ThresholdHeuristicAttributor(
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

        # M2 on background flow
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

        # Verify feature set contains strictly physical observable variables
        forbidden_substrings = [
            "true_source", "ground_truth", "injection", "mass_rate",
            "spill_duration", "label", "target", "source_id", "sim_seed"
        ]
        for name in names:
            for forbidden in forbidden_substrings:
                self.assertNotIn(forbidden, name.lower(), f"Potential leakage in feature name: {name}")

        # Signature check: extract() must not accept truth metadata
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

        # Before calibration, temperature is default 1.0
        self.assertEqual(model.temperature_, 1.0)

        # Calibrate on dedicated calibration split
        model.calibrate(X_cal, y_cal)
        self.assertTrue(model.is_calibrated)
        self.assertGreater(model.temperature_, 0.0)

        # Check probability vector properties on a sample
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

        # Configure high thresholds requiring 95% confidence and 30% margin
        cfg = SelectiveAttributionConfig(tau_conf=0.95, delta_margin=0.30, n_estimators=20)
        model = SelectiveAttributor(cfg)
        model.fit_base_model(X_train, y_train)
        model.calibrate(X_train[:10], y_train[:10])

        times = np.arange(0, 3600, 300, dtype=np.float64)
        arrivals = {s["station_id"]: times.copy() for s in self.monitoring_stations}
        # Random noise features produce intermediate probabilities (~0.5)
        vals = {s["station_id"]: rng.uniform(0.0, 3.0, size=len(times)) for s in self.monitoring_stations}

        res = model.predict_single(
            event_id="test_uncertain",
            sample_times_sec=times,
            station_arrival_times=arrivals,
            station_values=vals,
            decision_time_sec=3600.0,
        )
        # Must abstain due to low confidence or ambiguous margin
        self.assertEqual(res.decision, "ABSTAIN")
        self.assertIsNone(res.predicted_source)
        self.assertIn(res.abstain_cause, [AbstainCauseCode.LOW_CONFIDENCE.value, AbstainCauseCode.AMBIGUOUS_MARGIN.value])

    # --------------------------------------------------------------------------
    # 6. Sensor Faults Causing Abstention via Diagnostic Gate
    # --------------------------------------------------------------------------
    def test_sensor_faults_cause_abstention_via_diagnostic(self) -> None:
        diagnostics = SensorDiagnostics()
        times = np.arange(0, 3600, 300, dtype=np.float64)  # 12 steps

        # A. Missing observations fault (40% NaNs > 20% limit)
        missing_vals = np.zeros(len(times))
        missing_vals[:5] = np.nan
        is_missing, ratio = diagnostics.check_missingness(missing_vals)
        self.assertTrue(is_missing)
        self.assertGreater(ratio, 0.20)

        # B. Stuck value fault (constant 15.0 g/m³ for 8 steps)
        stuck_vals = np.array([15.0] * 8 + [12.0, 10.0, 5.0, 0.0])
        is_stuck, steps, val = diagnostics.check_stuck_value(stuck_vals)
        self.assertTrue(is_stuck)
        self.assertEqual(val, 15.0)

        # C. Quiescent clean baseline (constant 0.0 g/m³) must NOT be flagged as stuck
        clean_vals = np.zeros(len(times))
        is_clean_stuck, _, _ = diagnostics.check_stuck_value(clean_vals)
        self.assertFalse(is_clean_stuck, "Quiescent clean flow at 0.0 g/m³ must not be misidentified as stuck hardware")

        # D. Excessive telemetry latency
        delayed_arrivals = times + 7200.0  # 2 hour transmission delay > 1 hour limit
        is_delayed, delay_sec, _ = diagnostics.check_telemetry_latency(
            sample_times_sec=times,
            arrival_times_sec=delayed_arrivals,
            decision_time_sec=10000.0,
        )
        self.assertTrue(is_delayed)
        self.assertEqual(delay_sec, 7200.0)

        # E. Verify that M4 abstains when hardware fault is present
        rng = np.random.default_rng(303)
        n_features = len(ObservableFeatureExtractor().get_feature_names())
        X_train = rng.normal(size=(20, n_features))
        y_train = np.array(["unit_001"] * 10 + ["unit_002"] * 10)

        model = SelectiveAttributor(SelectiveAttributionConfig(tau_conf=0.10, delta_margin=0.01))
        model.fit_base_model(X_train, y_train)
        model.calibrate(X_train, y_train)

        # Present stuck sensor data at sensor_002
        stuck_station_vals = {
            "sensor_001": np.zeros(len(times)),
            "sensor_002": np.full(len(times), 14.5),  # Frozen register at 14.5 g/m³
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

    # --------------------------------------------------------------------------
    # 7. Correct Accepted-Prediction and Coverage Denominators
    # --------------------------------------------------------------------------
    def test_correct_accepted_prediction_and_coverage_denominators(self) -> None:
        y_true = ["unit_001", "unit_002", "unit_003", "unit_004", "unit_005"]
        # Model accepts 3, abstains on 2
        # Accepted:
        # idx 0: 'unit_001' (correct)
        # idx 1: 'unit_009' (incorrect)
        # idx 2: 'unit_003' (correct)
        # idx 3: None (abstain)
        # idx 4: None (abstain)
        decisions = ["ATTRIBUTE", "ATTRIBUTE", "ATTRIBUTE", "ABSTAIN", "ABSTAIN"]
        y_pred = ["unit_001", "unit_009", "unit_003", None, None]

        cov = decision_coverage(decisions)
        self.assertAlmostEqual(cov, 3 / 5)  # 0.60

        abst_rate = abstention_rate(decisions)
        self.assertAlmostEqual(abst_rate, 2 / 5)  # 0.40

        # Selective risk: 1 error among 3 accepted = 1/3
        risk = selective_risk(y_true, y_pred, decisions)
        self.assertAlmostEqual(risk, 1 / 3)

        # Selective accuracy: 2 correct among 3 accepted = 2/3
        acc = selective_accuracy(y_true, y_pred, decisions)
        self.assertAlmostEqual(acc, 2 / 3)

        self.assertAlmostEqual(risk + acc, 1.0)

    # --------------------------------------------------------------------------
    # 8. Zero-Denominator Handling across All Metrics
    # --------------------------------------------------------------------------
    def test_zero_denominator_handling_in_metrics(self) -> None:
        # 100% Abstentions (0 accepted decisions)
        decisions_all_abstain = ["ABSTAIN", "ABSTAIN", "ABSTAIN"]
        y_true = ["unit_001", "unit_002", "unit_003"]
        y_pred = [None, None, None]

        # Must not crash with ZeroDivisionError
        self.assertEqual(selective_risk(y_true, y_pred, decisions_all_abstain), 0.0)
        self.assertEqual(selective_accuracy(y_true, y_pred, decisions_all_abstain), 0.0)
        self.assertEqual(decision_coverage(decisions_all_abstain), 0.0)
        self.assertEqual(abstention_rate(decisions_all_abstain), 1.0)

        # Empty lists
        self.assertEqual(decision_coverage([]), 0.0)
        self.assertEqual(abstention_rate([]), 0.0)
        self.assertEqual(selective_risk([], [], []), 0.0)
        self.assertEqual(selective_accuracy([], [], []), 0.0)
        self.assertEqual(detection_rate([], []), 0.0)
        self.assertEqual(false_alarm_rate([], []), 0.0)
        self.assertEqual(overall_accuracy([], []), 0.0)
        self.assertEqual(attribution_macro_f1([], []), 0.0)
        self.assertEqual(abstention_appropriateness_rate([], []), 1.0)
        self.assertIsNone(mean_time_to_detect_hours([], [], []))

        # No positive events for detection_rate
        self.assertEqual(detection_rate([False, False], [False, True]), 0.0)
        # No clean background for false_alarm_rate
        self.assertEqual(false_alarm_rate([True, True], [True, False]), 0.0)

    # --------------------------------------------------------------------------
    # 9. No Future Observations or Un-Arrived Packets at Decision Time
    # --------------------------------------------------------------------------
    def test_no_future_observations_at_decision_time(self) -> None:
        times = np.array([1000.0, 2000.0, 3000.0, 4000.0, 5000.0])
        # Late arrival on sample 3: sampled at 4000s, but arrives at 6000s
        arrivals = {"sensor_002": np.array([1000.0, 2000.0, 3000.0, 6000.0, 5000.0])}
        vals = {"sensor_002": np.array([0.0, 0.0, 0.0, 99.0, 0.0])}

        extractor = ObservableFeatureExtractor()
        # Decision time at 4500s:
        # Sample at 4000s has spike (99.0 g/m³), but arrived at 6000s > 4500s!
        feats = extractor.extract(
            sample_times_sec=times,
            station_arrival_times=arrivals,
            station_values=vals,
            decision_time_sec=4500.0,
        )
        # Peak excursion for sensor_002 is feature index 9
        # At decision_time = 4500s, the spike packet has NOT arrived yet, so peak must be 0.0
        names = extractor.get_feature_names()
        s2_peak_idx = names.index("sensor_002_peak_excursion_gpm3")
        self.assertEqual(feats[s2_peak_idx], 0.0, "Telemetry that arrived after decision time was improperly observed!")

    # --------------------------------------------------------------------------
    # 10. No Episode Overlap across Train, Cal, Val, and Test Splits
    # --------------------------------------------------------------------------
    def test_no_episode_overlap_across_splits(self) -> None:
        gen = SyntheticEventGenerator(self.sim_config)
        # Generate 16 episodes deterministically
        dataset = gen.generate_suite(n_events=16, base_seed=42, background_ratio=0.125)

        train_set, cal_set, val_set, test_set = partition_dataset_four_way(
            dataset, train_ratio=0.50, cal_ratio=0.20, val_ratio=0.15, test_ratio=0.15, seed=99
        )

        tr_ids = set(train_set.get_event_ids())
        cal_ids = set(cal_set.get_event_ids())
        val_ids = set(val_set.get_event_ids())
        te_ids = set(test_set.get_event_ids())

        # Total partition size
        self.assertEqual(len(tr_ids) + len(cal_ids) + len(val_ids) + len(te_ids), 16)

        # Pairwise disjointness
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
    # 12. Small Synthetic Smoke Run Pilot
    # --------------------------------------------------------------------------
    def test_smoke_run_pilot(self) -> None:
        """Confirms end-to-end compatibility of generator, baselines, M4, and metrics."""
        gen = SyntheticEventGenerator(self.sim_config)
        # Small deterministic pilot of 8 episodes
        pilot_dataset = gen.generate_suite(n_events=8, base_seed=123, background_ratio=0.25)
        self.assertEqual(len(pilot_dataset.metadata), 8)

        # 4-way split: 4 train, 2 cal, 1 val, 1 test
        train_s, cal_s, val_s, test_s = partition_dataset_four_way(
            pilot_dataset, train_ratio=0.50, cal_ratio=0.25, val_ratio=0.125, test_ratio=0.125, seed=42
        )
        extractor = ObservableFeatureExtractor()

        # Build feature matrices
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
        X_te, y_te = _extract_matrix(test_s)

        # A. Fit M3 conventional classifier
        m3 = ConventionalClassifier(n_estimators=10, random_state=42)
        m3.fit(X_tr, y_tr)

        # B. Fit M4 selective attributor and calibrate on dedicated calibration set
        m4 = SelectiveAttributor(SelectiveAttributionConfig(tau_conf=0.40, delta_margin=0.05, n_estimators=10))
        m4.fit_base_model(X_tr, y_tr)
        m4.calibrate(X_cal, y_cal)
        self.assertTrue(m4.is_calibrated)

        # C. Predict on test split
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
        self.assertTrue(0.0 <= cov <= 1.0)
        self.assertTrue(0.0 <= risk <= 1.0)


if __name__ == "__main__":
    unittest.main()
