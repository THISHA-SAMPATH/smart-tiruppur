"""Unit and Verification Tests for the Bootstrap Uncertainty Analysis Module.

Verifies:
1. Correct paired resampling of methods and conditions.
2. Preservation of episode clusters and source-class strata.
3. Deterministic results under a fixed bootstrap seed.
4. Correct handling of zero accepted predictions.
5. Correct risk-difference calculation and direction.
6. Undefined confidence intervals when a metric is not estimable.
7. A known small example where the bootstrap interval can be checked against independently calculated quantities.
8. Reporting of undefined replicate counts.
9. No change to frozen model or threshold configuration during analysis.

Note: Passing these tests verifies software correctness, mathematical invariants, and protocol execution;
it does not prove or claim that the empirical assumptions of the underlying statistical model are correct.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List
import unittest

import numpy as np

from research.experiments.bootstrap_analysis import (
    EpisodeCluster,
    build_episode_clusters,
    compute_confidence_interval,
    evaluate_condition_metrics,
    resample_clusters_hierarchical,
    run_bootstrap_analysis,
)


class TestBootstrapAnalysis(unittest.TestCase):
    """Independent verification suite for bootstrap resampling and uncertainty estimation."""

    def setUp(self) -> None:
        self.rng = np.random.default_rng(42)

    # --------------------------------------------------------------------------
    # 1. Correct paired resampling of methods and conditions
    # --------------------------------------------------------------------------
    def test_paired_resampling_of_methods_and_conditions(self) -> None:
        records: List[Dict[str, Any]] = [
            # Event 1 clean
            {
                "seed": 42,
                "event_id": "ev_001",
                "condition": "clean",
                "true_source_id": "s1",
                "m1_nearest_predicted": "s1_m1_c",
                "m3_conventional_predicted": "s1_m3_c",
                "m4_selective": {"decision": "ATTRIBUTE", "predicted_source": "s1_m4_c"},
            },
            # Event 1 faulted
            {
                "seed": 42,
                "event_id": "ev_001",
                "condition": "faulted",
                "true_source_id": "s1",
                "m1_nearest_predicted": "s1_m1_f",
                "m3_conventional_predicted": "s1_m3_f",
                "m4_selective": {"decision": "ABSTAIN", "predicted_source": None},
            },
            # Event 2 clean
            {
                "seed": 42,
                "event_id": "ev_002",
                "condition": "clean",
                "true_source_id": "s2",
                "m1_nearest_predicted": "s2_m1_c",
                "m3_conventional_predicted": "s2_m3_c",
                "m4_selective": {"decision": "ATTRIBUTE", "predicted_source": "s2_m4_c"},
            },
            # Event 2 faulted
            {
                "seed": 42,
                "event_id": "ev_002",
                "condition": "faulted",
                "true_source_id": "s2",
                "m1_nearest_predicted": "s2_m1_f",
                "m3_conventional_predicted": "s2_m3_f",
                "m4_selective": {"decision": "ABSTAIN", "predicted_source": None},
            },
        ]

        clusters = build_episode_clusters(records)
        self.assertEqual(len(clusters), 2)

        resampled = resample_clusters_hierarchical(clusters, rng=self.rng, resample_seeds=False)
        self.assertEqual(len(resampled), 2)

        for c in resampled:
            # Each resampled cluster must preserve both clean and faulted condition records
            clean_rec = c.get_condition_record("clean")
            faulted_rec = c.get_condition_record("faulted")
            self.assertIsNotNone(clean_rec)
            self.assertIsNotNone(faulted_rec)

            # Paired methods within condition must match original
            if c.event_id == "ev_001":
                self.assertEqual(clean_rec["m1_nearest_predicted"], "s1_m1_c")
                self.assertEqual(clean_rec["m3_conventional_predicted"], "s1_m3_c")
                self.assertEqual(faulted_rec["m1_nearest_predicted"], "s1_m1_f")
            elif c.event_id == "ev_002":
                self.assertEqual(clean_rec["m1_nearest_predicted"], "s2_m1_c")
                self.assertEqual(clean_rec["m3_conventional_predicted"], "s2_m3_c")
                self.assertEqual(faulted_rec["m1_nearest_predicted"], "s2_m1_f")

    # --------------------------------------------------------------------------
    # 2. Preservation of episode clusters and source-class strata
    # --------------------------------------------------------------------------
    def test_preservation_of_episode_clusters_and_source_class_strata(self) -> None:
        records: List[Dict[str, Any]] = []
        for i in range(10):
            records.append({
                "seed": 101,
                "event_id": f"ev_bg_{i}",
                "condition": "clean",
                "true_source_id": "s0_background",
                "is_background": True,
            })
        for i in range(10):
            records.append({
                "seed": 101,
                "event_id": f"ev_u1_{i}",
                "condition": "clean",
                "true_source_id": "unit_001",
                "is_background": False,
            })
        for i in range(10):
            records.append({
                "seed": 101,
                "event_id": f"ev_u2_{i}",
                "condition": "clean",
                "true_source_id": "unit_002",
                "is_background": False,
            })

        clusters = build_episode_clusters(records)
        self.assertEqual(len(clusters), 30)

        for _ in range(5):
            resampled = resample_clusters_hierarchical(clusters, rng=self.rng, resample_seeds=False)
            self.assertEqual(len(resampled), 30)

            # Within stratum counts must remain exactly preserved
            bg_count = sum(1 for c in resampled if c.true_source_id == "s0_background")
            u1_count = sum(1 for c in resampled if c.true_source_id == "unit_001")
            u2_count = sum(1 for c in resampled if c.true_source_id == "unit_002")

            self.assertEqual(bg_count, 10)
            self.assertEqual(u1_count, 10)
            self.assertEqual(u2_count, 10)

    # --------------------------------------------------------------------------
    # 3. Deterministic results under a fixed bootstrap seed
    # --------------------------------------------------------------------------
    def test_deterministic_results_under_fixed_bootstrap_seed(self) -> None:
        records: List[Dict[str, Any]] = [
            {
                "seed": 42,
                "event_id": f"ev_{i}",
                "condition": "clean",
                "true_source_id": "unit_001" if i % 2 == 0 else "unit_002",
                "is_background": False,
                "detection": {"detected": True},
                "m3_conventional_predicted": "unit_001",
                "m3_selective": {"decision": "ATTRIBUTE", "predicted_source": "unit_001"},
                "m4_selective": {"decision": "ATTRIBUTE", "predicted_source": "unit_001", "calibrated_confidence": 0.8},
            }
            for i in range(12)
        ]

        res1 = run_bootstrap_analysis(records, n_replicates=100, bootstrap_seed=42, resample_seeds=False)
        res2 = run_bootstrap_analysis(records, n_replicates=100, bootstrap_seed=42, resample_seeds=False)
        res3 = run_bootstrap_analysis(records, n_replicates=100, bootstrap_seed=999, resample_seeds=False)

        # res1 and res2 must match bit-for-bit
        summary1 = res1["summary"]["clean"]["metrics"]
        summary2 = res2["summary"]["clean"]["metrics"]
        self.assertEqual(summary1["m3_selective_risk"]["ci_lower"], summary2["m3_selective_risk"]["ci_lower"])
        self.assertEqual(summary1["m3_selective_risk"]["ci_upper"], summary2["m3_selective_risk"]["ci_upper"])
        self.assertEqual(summary1["m4_selective_risk"]["ci_lower"], summary2["m4_selective_risk"]["ci_lower"])

        # res3 with different seed should produce independent replicate draws
        summary3 = res3["summary"]["clean"]["metrics"]
        self.assertIsNotNone(summary3)

    # --------------------------------------------------------------------------
    # 4. Correct handling of zero accepted predictions
    # --------------------------------------------------------------------------
    def test_correct_handling_of_zero_accepted_predictions(self) -> None:
        records: List[Dict[str, Any]] = [
            {
                "seed": 42,
                "event_id": f"ev_abst_{i}",
                "condition": "clean",
                "true_source_id": "unit_001",
                "is_background": False,
                "detection": {"detected": True},
                "m3_conventional_predicted": "unit_001",
                "m3_selective": {"decision": "ABSTAIN", "predicted_source": None},
                "m4_selective": {"decision": "ABSTAIN", "predicted_source": None},
            }
            for i in range(8)
        ]

        clusters = build_episode_clusters(records)
        eval_res = evaluate_condition_metrics(clusters, "clean")

        # Selective risk must be None, NOT coerced to 0.0
        self.assertEqual(eval_res["m3_n_accepted"], 0)
        self.assertIsNone(eval_res["m3_risk"])
        self.assertEqual(eval_res["m4_n_accepted"], 0)
        self.assertIsNone(eval_res["m4_risk"])
        self.assertIsNone(eval_res["risk_difference_m4_minus_m3"])

        # Running bootstrap must report is_defined=False and None CI bounds
        ci_res = compute_confidence_interval([None] * 50, point_estimate=None, denominator=0)
        self.assertFalse(ci_res.is_defined)
        self.assertIsNone(ci_res.ci_lower)
        self.assertIsNone(ci_res.ci_upper)

    # --------------------------------------------------------------------------
    # 5. Correct risk-difference calculation and direction
    # --------------------------------------------------------------------------
    def test_correct_risk_difference_calculation_and_direction(self) -> None:
        # Case A: M4 has lower error than M3 -> ΔR = R(M4) - R(M3) < 0
        records_a: List[Dict[str, Any]] = [
            # 10 episodes: M3 has 4 errors out of 10 accepted (risk=0.40)
            # M4 has 1 error out of 10 accepted (risk=0.10)
            {
                "seed": 42,
                "event_id": f"ev_diff_{i}",
                "condition": "clean",
                "true_source_id": "unit_001",
                "is_background": False,
                "detection": {"detected": True},
                "m3_conventional_predicted": "unit_001" if i >= 4 else "unit_002",
                "m3_selective": {
                    "decision": "ATTRIBUTE",
                    "predicted_source": "unit_001" if i >= 4 else "unit_002",
                },
                "m4_selective": {
                    "decision": "ATTRIBUTE",
                    "predicted_source": "unit_001" if i >= 1 else "unit_002",
                },
            }
            for i in range(10)
        ]

        clusters_a = build_episode_clusters(records_a)
        eval_a = evaluate_condition_metrics(clusters_a, "clean")

        self.assertAlmostEqual(eval_a["m3_risk"], 0.40)
        self.assertAlmostEqual(eval_a["m4_risk"], 0.10)
        self.assertAlmostEqual(eval_a["risk_difference_m4_minus_m3"], -0.30)
        self.assertLess(eval_a["risk_difference_m4_minus_m3"], 0.0)

        # Case B: M4 has higher error than M3 -> ΔR > 0
        records_b = [
            {
                "seed": 42,
                "event_id": f"ev_diff_b_{i}",
                "condition": "clean",
                "true_source_id": "unit_001",
                "is_background": False,
                "detection": {"detected": True},
                "m3_conventional_predicted": "unit_001" if i >= 1 else "unit_002",
                "m3_selective": {
                    "decision": "ATTRIBUTE",
                    "predicted_source": "unit_001" if i >= 1 else "unit_002",
                },
                "m4_selective": {
                    "decision": "ATTRIBUTE",
                    "predicted_source": "unit_001" if i >= 4 else "unit_002",
                },
            }
            for i in range(10)
        ]
        clusters_b = build_episode_clusters(records_b)
        eval_b = evaluate_condition_metrics(clusters_b, "clean")
        self.assertAlmostEqual(eval_b["m3_risk"], 0.10)
        self.assertAlmostEqual(eval_b["m4_risk"], 0.40)
        self.assertAlmostEqual(eval_b["risk_difference_m4_minus_m3"], 0.30)
        self.assertGreater(eval_b["risk_difference_m4_minus_m3"], 0.0)

    # --------------------------------------------------------------------------
    # 6. Undefined confidence intervals when a metric is not estimable
    # --------------------------------------------------------------------------
    def test_undefined_confidence_intervals_when_metric_not_estimable(self) -> None:
        # No background events: clean events = 0 -> false alarm rate denominator is 0
        records: List[Dict[str, Any]] = [
            {
                "seed": 42,
                "event_id": f"ev_no_bg_{i}",
                "condition": "clean",
                "true_source_id": "unit_001",
                "is_background": False,
                "detection": {"detected": True},
                "m3_conventional_predicted": "unit_001",
                "m3_selective": {"decision": "ATTRIBUTE", "predicted_source": "unit_001"},
                "m4_selective": {"decision": "ATTRIBUTE", "predicted_source": "unit_001"},
            }
            for i in range(6)
        ]

        res = run_bootstrap_analysis(records, n_replicates=50, bootstrap_seed=42, resample_seeds=False)
        fa_res = res["summary"]["clean"]["metrics"]["false_alarm_rate"]

        self.assertIsNone(fa_res["point_estimate"])
        self.assertIsNone(fa_res["ci_lower"])
        self.assertIsNone(fa_res["ci_upper"])
        self.assertFalse(fa_res["is_defined"])
        self.assertEqual(fa_res["replicates_undefined"], 50)
        self.assertEqual(fa_res["fraction_undefined"], 1.0)

    # --------------------------------------------------------------------------
    # 7. Known small example checked against independently calculated quantities
    # --------------------------------------------------------------------------
    def test_known_small_example_checked_against_independent_calculation(self) -> None:
        """Checks a 4-sample binomial error setup against exact analytical quantiles.

        Dataset of 4 samples with 2 errors (error rate p = 0.50).
        For resample of size 4 with replacement from {0, 0, 1, 1}:
        k ~ Binomial(4, 0.5):
        P(k=0) = 1/16 = 0.0625  (rate = 0.0)
        P(k=1) = 4/16 = 0.2500  (rate = 0.25)
        P(k=2) = 6/16 = 0.3750  (rate = 0.50)
        P(k=3) = 4/16 = 0.2500  (rate = 0.75)
        P(k=4) = 1/16 = 0.0625  (rate = 1.00)

        Analytical percentiles:
        2.5% percentile: F(0.0) = 0.0625 > 0.025 => 0.00
        97.5% percentile: F(0.75) = 0.9375 < 0.975 => 1.00
        """
        records: List[Dict[str, Any]] = [
            {"seed": 42, "event_id": "e1", "condition": "clean", "true_source_id": "s1", "m1_nearest_predicted": "s1"},  # 0
            {"seed": 42, "event_id": "e2", "condition": "clean", "true_source_id": "s1", "m1_nearest_predicted": "s1"},  # 0
            {"seed": 42, "event_id": "e3", "condition": "clean", "true_source_id": "s1", "m1_nearest_predicted": "s2"},  # 1
            {"seed": 42, "event_id": "e4", "condition": "clean", "true_source_id": "s1", "m1_nearest_predicted": "s2"},  # 1
        ]

        res = run_bootstrap_analysis(records, n_replicates=2000, bootstrap_seed=42, resample_seeds=False)
        m1_metric = res["summary"]["clean"]["metrics"]["m1_error_rate"]

        self.assertAlmostEqual(m1_metric["point_estimate"], 0.50)
        self.assertEqual(m1_metric["ci_lower"], 0.0)
        self.assertEqual(m1_metric["ci_upper"], 1.0)
        self.assertTrue(m1_metric["is_defined"])

    # --------------------------------------------------------------------------
    # 8. Reporting of undefined replicate counts
    # --------------------------------------------------------------------------
    def test_reporting_of_undefined_replicate_counts(self) -> None:
        # Create a condition where only 1 of 4 episodes is accepted
        records: List[Dict[str, Any]] = [
            {
                "seed": 42,
                "event_id": "e1",
                "condition": "clean",
                "true_source_id": "s1",
                "m3_selective": {"decision": "ATTRIBUTE", "predicted_source": "s1"},
            },
            {
                "seed": 42,
                "event_id": "e2",
                "condition": "clean",
                "true_source_id": "s1",
                "m3_selective": {"decision": "ABSTAIN", "predicted_source": None},
            },
            {
                "seed": 42,
                "event_id": "e3",
                "condition": "clean",
                "true_source_id": "s1",
                "m3_selective": {"decision": "ABSTAIN", "predicted_source": None},
            },
            {
                "seed": 42,
                "event_id": "e4",
                "condition": "clean",
                "true_source_id": "s1",
                "m3_selective": {"decision": "ABSTAIN", "predicted_source": None},
            },
        ]

        # Resampling 4 items with replacement from {1 accepted, 3 abstained}:
        # Probability of 0 accepted = (3/4)^4 = 81/256 ≈ 31.6% undefined replicates!
        res = run_bootstrap_analysis(records, n_replicates=500, bootstrap_seed=42, resample_seeds=False)
        m3_risk_meta = res["summary"]["clean"]["metrics"]["m3_selective_risk"]

        self.assertGreater(m3_risk_meta["replicates_undefined"], 50)
        self.assertLess(m3_risk_meta["replicates_valid"], 500)
        self.assertEqual(
            m3_risk_meta["replicates_undefined"] + m3_risk_meta["replicates_valid"],
            500,
        )
        self.assertAlmostEqual(
            m3_risk_meta["fraction_undefined"],
            m3_risk_meta["replicates_undefined"] / 500,
        )

    # --------------------------------------------------------------------------
    # 9. No change to frozen model or threshold configuration
    # --------------------------------------------------------------------------
    def test_no_change_to_frozen_model_or_threshold_configuration(self) -> None:
        frozen_seed_metrics = [
            {
                "seed": 42,
                "condition": "clean",
                "target_coverage_evaluations": {
                    "0.50": {
                        "m3_selective": {"locked_tau": 0.55},
                        "m4_selective": {"locked_tau": 0.80, "locked_delta": 0.10},
                    }
                },
            }
        ]

        # Deep snapshot of dictionary
        import copy
        snapshot = copy.deepcopy(frozen_seed_metrics)

        records: List[Dict[str, Any]] = [
            {
                "seed": 42,
                "event_id": "ev_freeze_1",
                "condition": "clean",
                "true_source_id": "s1",
                "m3_confidence": 0.60,
                "m3_conventional_predicted": "s1",
                "m4_selective": {
                    "decision": "ATTRIBUTE",
                    "calibrated_confidence": 0.85,
                    "probability_margin": 0.15,
                    "predicted_source": "s1",
                },
            }
        ]

        run_bootstrap_analysis(records, seed_records=frozen_seed_metrics, n_replicates=20, bootstrap_seed=42)

        # Verify configuration remains strictly unmodified
        self.assertEqual(frozen_seed_metrics, snapshot)

    # --------------------------------------------------------------------------
    # 10. CLI Execution and Report Generation
    # --------------------------------------------------------------------------
    def test_cli_execution_and_report_generation(self) -> None:
        import json
        import subprocess
        import sys
        import tempfile

        with tempfile.TemporaryDirectory() as tmp_in, tempfile.TemporaryDirectory() as tmp_out:
            in_path = Path(tmp_in)
            out_path = Path(tmp_out)

            dummy_episodes = [
                {
                    "seed": 42,
                    "event_id": f"ev_cli_{i}",
                    "condition": "clean",
                    "true_source_id": "unit_001",
                    "is_background": False,
                    "detection": {"detected": True},
                    "m3_conventional_predicted": "unit_001",
                    "m3_selective": {"decision": "ATTRIBUTE", "predicted_source": "unit_001"},
                    "m4_selective": {"decision": "ATTRIBUTE", "predicted_source": "unit_001"},
                }
                for i in range(8)
            ]
            (in_path / "episode_predictions.json").write_text(json.dumps(dummy_episodes), encoding="utf-8")

            # Run CLI via subprocess
            proc = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "research.experiments.bootstrap_analysis",
                    "--input-dir",
                    str(in_path),
                    "--output-dir",
                    str(out_path),
                    "--replicates",
                    "50",
                    "--seed",
                    "42",
                    "--no-resample-seeds",
                ],
                capture_output=True,
                text=True,
            )
            self.assertEqual(proc.returncode, 0, f"CLI failed: {proc.stderr}")
            self.assertTrue((out_path / "bootstrap_summary.json").exists())
            self.assertTrue((out_path / "bootstrap_report.md").exists())

            summary_data = json.loads((out_path / "bootstrap_summary.json").read_text(encoding="utf-8"))
            self.assertIn("summary", summary_data)
            self.assertIn("clean", summary_data["summary"])


if __name__ == "__main__":
    unittest.main()
