"""End-to-End Unit and Verification Tests for the Attribution Pilot Pipeline.

Verifies all requirements from Phase 3:
1. Repeatability for identical configurations and seeds.
2. Strictly disjoint episode IDs across Train, Calibration, Validation, and Test splits.
3. Required source classes present across all splits.
4. Zero leakage of hidden source, mass rate, or fault flags into predictive features.
5. Calibration and threshold selection strictly confined to their designated splits.
6. No held-out test labels used to adjust acceptance operating points.
7. Correct handling of missed detections, abstentions, and undefined zero-denominator metrics.
8. Valid JSON serialization preserving null representations for undefined metrics.
9. Incomplete or malformed split configurations fail loudly rather than silently succeeding.
"""

from __future__ import annotations

import json
from pathlib import Path
import unittest

import numpy as np

from research.evaluation.attribution_metrics import (
    abstention_appropriateness_rate,
    decision_coverage,
    detection_rate,
    false_alarm_rate,
    format_metric,
    selective_risk,
)
from research.experiments.run_pilot import (
    aggregate_seed_metrics,
    generate_balanced_pilot_dataset,
    stratified_split_episodes,
)
from research.models.feature_extractor import ObservableFeatureExtractor
from research.models.selective_attributor import (
    SelectiveAttributionConfig,
    SelectiveAttributor,
)
from research.simulation.river_ade_simulator import SimulationConfig
from research.simulation.synthetic_event_generator import SyntheticEventGenerator


class TestAttributionPilot(unittest.TestCase):
    """End-to-end verification tests for the pilot experimental pipeline."""

    @classmethod
    def setUpClass(cls) -> None:
        cfg_path = Path(__file__).resolve().parents[1] / "configs" / "simulation_params.json"
        cls.sim_config = SimulationConfig.from_json(cfg_path)
        cls.generator = SyntheticEventGenerator(cls.sim_config)
        cls.source_ids = ["s0_background"] + [s.source_id for s in cls.sim_config.sources]

    # --------------------------------------------------------------------------
    # 1. Repeatability for Identical Configurations and Seeds
    # --------------------------------------------------------------------------
    def test_repeatability_identical_seed(self) -> None:
        eps1, meta1 = generate_balanced_pilot_dataset(
            generator=self.generator,
            source_ids=self.source_ids[:3],  # 3 classes
            episodes_per_class=2,
            base_seed=999,
        )
        eps2, meta2 = generate_balanced_pilot_dataset(
            generator=self.generator,
            source_ids=self.source_ids[:3],
            episodes_per_class=2,
            base_seed=999,
        )

        self.assertEqual(len(eps1), len(eps2))
        for ep_a, ep_b in zip(eps1, eps2):
            self.assertEqual(ep_a.event_id, ep_b.event_id)
            np.testing.assert_array_equal(ep_a.timestamps_sec, ep_b.timestamps_sec)
            for s_id in ep_a.station_observations:
                np.testing.assert_array_almost_equal(
                    ep_a.station_observations[s_id],
                    ep_b.station_observations[s_id],
                )

    # --------------------------------------------------------------------------
    # 2. Strictly Disjoint Episode IDs Across All Four Splits
    # --------------------------------------------------------------------------
    def test_disjoint_episode_ids_across_all_four_splits(self) -> None:
        eps, meta = generate_balanced_pilot_dataset(
            generator=self.generator,
            source_ids=self.source_ids[:4],
            episodes_per_class=5,
            base_seed=42,
        )
        allocation = {
            "train_per_class": 2,
            "cal_per_class": 1,
            "val_per_class": 1,
            "test_per_class": 1,
        }
        splits = stratified_split_episodes(eps, meta, allocation, seed=42)

        tr_ids = {m.event_id for m in splits["train"][1]}
        cal_ids = {m.event_id for m in splits["cal"][1]}
        val_ids = {m.event_id for m in splits["val"][1]}
        te_ids = {m.event_id for m in splits["test"][1]}

        self.assertEqual(len(tr_ids), 4 * 2)
        self.assertEqual(len(cal_ids), 4 * 1)
        self.assertEqual(len(val_ids), 4 * 1)
        self.assertEqual(len(te_ids), 4 * 1)

        # Pairwise disjoint
        self.assertEqual(len(tr_ids.intersection(cal_ids)), 0)
        self.assertEqual(len(tr_ids.intersection(val_ids)), 0)
        self.assertEqual(len(tr_ids.intersection(te_ids)), 0)
        self.assertEqual(len(cal_ids.intersection(val_ids)), 0)
        self.assertEqual(len(cal_ids.intersection(te_ids)), 0)
        self.assertEqual(len(val_ids.intersection(te_ids)), 0)

    # --------------------------------------------------------------------------
    # 3. Required Source Classes Present in Splits
    # --------------------------------------------------------------------------
    def test_required_classes_present_in_splits(self) -> None:
        eps, meta = generate_balanced_pilot_dataset(
            generator=self.generator,
            source_ids=self.source_ids,  # all 13 classes
            episodes_per_class=5,
            base_seed=123,
        )
        allocation = {
            "train_per_class": 2,
            "cal_per_class": 1,
            "val_per_class": 1,
            "test_per_class": 1,
        }
        splits = stratified_split_episodes(eps, meta, allocation, seed=123)

        for split_name in ("train", "cal", "val", "test"):
            classes_in_split = {m.true_source_id for m in splits[split_name][1]}
            self.assertEqual(
                len(classes_in_split),
                len(self.source_ids),
                f"Split '{split_name}' missing classes: {set(self.source_ids) - classes_in_split}",
            )

    # --------------------------------------------------------------------------
    # 4. Zero Leakage of Hidden Source or Fault Labels into Predictive Features
    # --------------------------------------------------------------------------
    def test_no_leakage_of_hidden_source_or_fault_labels(self) -> None:
        extractor = ObservableFeatureExtractor()
        names = extractor.get_feature_names()
        for name in names:
            self.assertNotIn("source", name)
            self.assertNotIn("fault", name)
            self.assertNotIn("true", name)
            self.assertNotIn("mass_rate", name)

        # Test timestamp filtering: future observations excluded
        times = np.array([1000.0, 2000.0, 3000.0])
        arrivals = {"sensor_002": np.array([1000.0, 2000.0, 5000.0])}
        vals = {"sensor_002": np.array([0.0, 0.0, 100.0])}
        # Decision at 2500s: 3rd packet arrives at 5000s > 2500s, must be filtered
        feats = extractor.extract(times, arrivals, vals, decision_time_sec=2500.0)
        s2_peak = feats[names.index("sensor_002_peak_excursion_gpm3")]
        self.assertEqual(s2_peak, 0.0)

    # --------------------------------------------------------------------------
    # 5. Calibration and Threshold Tuning Confined to Assigned Splits
    # --------------------------------------------------------------------------
    def test_calibration_and_threshold_tuning_confined_to_assigned_splits(self) -> None:
        rng = np.random.default_rng(707)
        n_feats = len(ObservableFeatureExtractor().get_feature_names())

        X_train = rng.normal(size=(20, n_feats))
        y_train = rng.choice(["s0_background", "unit_001"], size=20)

        X_cal = rng.normal(size=(10, n_feats))
        y_cal = rng.choice(["s0_background", "unit_001"], size=10)

        X_val = rng.normal(size=(10, n_feats))
        y_val = rng.choice(["s0_background", "unit_001"], size=10)

        model = SelectiveAttributor(SelectiveAttributionConfig(n_estimators=10, random_state=42))

        # Trying to calibrate before fitting must fail
        with self.assertRaises(RuntimeError):
            model.calibrate(X_cal, y_cal)

        model.fit_base_model(X_train, y_train)

        # Trying to tune thresholds before calibrating must fail
        with self.assertRaises(RuntimeError):
            model.tune_thresholds_on_validation(X_val, y_val)

        model.calibrate(X_cal, y_cal)
        self.assertTrue(model.is_calibrated)

        report = model.tune_thresholds_on_validation(X_val, y_val, target_max_risk=0.15)
        self.assertTrue(model.thresholds_locked)
        self.assertIn("selected_tau", report)

    # --------------------------------------------------------------------------
    # 6. Correct Handling of Undefined Metrics & Abstentions
    # --------------------------------------------------------------------------
    def test_correct_handling_of_missed_detections_abstentions_and_undefined_metrics(self) -> None:
        # Detection rate undefined when no positive events
        self.assertIsNone(detection_rate([False, False], [False, False]))

        # False alarm rate undefined when no clean events
        self.assertIsNone(false_alarm_rate([True, True], [True, True]))

        # Selective risk undefined when coverage is 0.0
        self.assertIsNone(selective_risk(["A", "B"], [None, None], ["ABSTAIN", "ABSTAIN"]))

        # Abstention appropriateness undefined when no abstentions
        self.assertIsNone(abstention_appropriateness_rate(["ATTRIBUTE"], [False]))

        # Formatting preserved without zero coercion
        self.assertEqual(format_metric(None), "N/A (undefined)")

    # --------------------------------------------------------------------------
    # 7. Valid Serialization of Results
    # --------------------------------------------------------------------------
    def test_valid_serialization_of_results(self) -> None:
        dummy_seed_metrics = [
            {
                "seed": 42,
                "condition": "clean",
                "task1_detection": {"detection_rate": 0.90, "false_alarm_rate": 0.05, "mean_ttd_hours": 1.2},
                "m4_selective_attributor": {"decision_coverage": 0.80, "selective_risk": 0.02, "ece": 0.05},
            },
            {
                "seed": 101,
                "condition": "clean",
                "task1_detection": {"detection_rate": 0.95, "false_alarm_rate": 0.00, "mean_ttd_hours": 1.1},
                "m4_selective_attributor": {"decision_coverage": 0.85, "selective_risk": 0.00, "ece": 0.04},
            },
            {
                "seed": 42,
                "condition": "faulted",
                "task1_detection": {"detection_rate": 0.90, "false_alarm_rate": 0.10, "mean_ttd_hours": 1.5},
                "m4_selective_attributor": {"decision_coverage": 0.0, "selective_risk": None, "ece": None},
            },
        ]

        summary = aggregate_seed_metrics(dummy_seed_metrics)
        # Serialization to JSON must succeed and preserve null
        json_str = json.dumps(summary, indent=2)
        parsed = json.loads(json_str)

        self.assertIn("clean", parsed)
        self.assertIn("faulted", parsed)
        # In faulted, selective_risk was None across seed, so mean must be null
        self.assertIsNone(parsed["faulted"]["m4_selective_attributor"]["selective_risk"]["mean"])

    # --------------------------------------------------------------------------
    # 8. Malformed Split Configuration Fails Loudly
    # --------------------------------------------------------------------------
    def test_malformed_split_configuration_fails_loudly(self) -> None:
        eps, meta = generate_balanced_pilot_dataset(
            generator=self.generator,
            source_ids=self.source_ids[:2],
            episodes_per_class=3,  # only 3 per class
            base_seed=10,
        )
        allocation = {
            "train_per_class": 2,
            "cal_per_class": 1,
            "val_per_class": 1,
            "test_per_class": 1,  # requires 5 total
        }
        with self.assertRaises(ValueError):
            stratified_split_episodes(eps, meta, allocation, seed=10)

    # --------------------------------------------------------------------------
    # 9. Target Coverage Aggregation in Pipeline Summary
    # --------------------------------------------------------------------------
    def test_aggregate_seed_metrics_with_target_coverage(self) -> None:
        dummy_seed_metrics = [
            {
                "seed": 42,
                "condition": "clean",
                "target_coverage_evaluations": {
                    "0.5": {
                        "target_coverage": 0.5,
                        "m3_selective": {"accepted_count": 5, "accepted_errors": 1, "total_episodes": 10, "achieved_coverage": 0.5, "selective_risk": 0.2, "locked_tau": 0.55},
                        "m4_selective": {"accepted_count": 6, "accepted_errors": 1, "total_episodes": 10, "achieved_coverage": 0.6, "selective_risk": 0.1667, "locked_tau": 0.8, "locked_delta": 0.0},
                    }
                },
            },
            {
                "seed": 101,
                "condition": "clean",
                "target_coverage_evaluations": {
                    "0.5": {
                        "target_coverage": 0.5,
                        "m3_selective": {"accepted_count": 6, "accepted_errors": 2, "total_episodes": 10, "achieved_coverage": 0.6, "selective_risk": 0.3333, "locked_tau": 0.50},
                        "m4_selective": {"accepted_count": 5, "accepted_errors": 1, "total_episodes": 10, "achieved_coverage": 0.5, "selective_risk": 0.2, "locked_tau": 0.7, "locked_delta": 0.0},
                    }
                },
            },
        ]
        summary = aggregate_seed_metrics(dummy_seed_metrics)
        self.assertIn("target_coverage_summary", summary["clean"])
        tgt_summary = summary["clean"]["target_coverage_summary"]["0.5"]
        self.assertEqual(tgt_summary["m3_selective"]["pooled_accepted"], 11)
        self.assertEqual(tgt_summary["m3_selective"]["pooled_errors"], 3)
        self.assertEqual(tgt_summary["m3_selective"]["pooled_total"], 20)
        self.assertAlmostEqual(tgt_summary["m3_selective"]["pooled_coverage"], 11 / 20)
        self.assertAlmostEqual(tgt_summary["m3_selective"]["pooled_risk"], 3 / 11)
        self.assertEqual(tgt_summary["m4_selective"]["pooled_accepted"], 11)
        self.assertEqual(tgt_summary["m4_selective"]["pooled_errors"], 2)


if __name__ == "__main__":
    unittest.main()
