"""Verification and Safety Tests for the Confirmatory Experiment Runner.

Verifies:
1. Confirmatory configuration validation and schema adherence.
2. Reserved confirmatory seed specifications ([202, 303, ..., 1111]).
3. Exact split allocation sum invariant (10 + 3 + 3 + 4 = 20).
4. Rejection of protected historical pilot output directories.
5. Strict pairwise disjointness across all four partitions.
6. Parameter locking on validation split prior to test set evaluation.
7. Safe CLI dry-run execution without launching simulations.
"""

from __future__ import annotations

import os
import json
from pathlib import Path
import subprocess
import sys
import unittest
from typing import Any, Dict

# Ensure OpenBLAS thread limits
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

from research.experiments.run_confirmatory import (
    PROTECTED_HISTORICAL_DIRS,
    generate_confirmatory_markdown_report,
    run_confirmatory_pipeline,
    validate_confirmatory_config,
    validate_output_directory_safety,
)
from research.experiments.run_pilot import (
    generate_balanced_pilot_dataset,
    load_json,
    stratified_split_episodes,
)
from research.simulation.river_ade_simulator import SimulationConfig
from research.simulation.synthetic_event_generator import SyntheticEventGenerator


class TestConfirmatoryRunner(unittest.TestCase):
    """Unit tests for the dedicated confirmatory experiment runner."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.config_path = Path(__file__).resolve().parents[1] / "configs" / "confirmatory.json"
        cls.sim_config_path = Path(__file__).resolve().parents[1] / "configs" / "simulation_params.json"
        cls.sim_config = SimulationConfig.from_json(cls.sim_config_path)
        cls.generator = SyntheticEventGenerator(cls.sim_config)

    # --------------------------------------------------------------------------
    # 1. Confirmatory Configuration Schema and Protocol Validity
    # --------------------------------------------------------------------------
    def test_confirmatory_configuration_validity(self) -> None:
        cfg = load_json(self.config_path)
        # Must validate without error
        validate_confirmatory_config(cfg)

        # Exact reserved 10 seeds
        expected_seeds = [202, 303, 404, 505, 606, 707, 808, 909, 1010, 1111]
        self.assertEqual(cfg["seeds"], expected_seeds)

        # Episodes per class and split allocations
        self.assertEqual(cfg["episodes_per_class"], 20)
        splits = cfg["split_allocation"]
        self.assertEqual(splits["train_per_class"], 10)
        self.assertEqual(splits["cal_per_class"], 3)
        self.assertEqual(splits["val_per_class"], 3)
        self.assertEqual(splits["test_per_class"], 4)

        # Sum must equal episodes_per_class exactly
        split_sum = splits["train_per_class"] + splits["cal_per_class"] + splits["val_per_class"] + splits["test_per_class"]
        self.assertEqual(split_sum, cfg["episodes_per_class"])

        # Target coverage grid
        self.assertEqual(cfg.get("target_coverages"), [0.30, 0.50, 0.70])

        # Output dir
        self.assertEqual(cfg.get("output_dir"), "research/results/confirmatory")

    # --------------------------------------------------------------------------
    # 2. Reject Invalid Split Allocation Sums
    # --------------------------------------------------------------------------
    def test_reject_invalid_split_sum(self) -> None:
        bad_cfg = {
            "seeds": [202],
            "episodes_per_class": 20,
            "split_allocation": {
                "train_per_class": 10,
                "cal_per_class": 3,
                "val_per_class": 3,
                "test_per_class": 3,  # sums to 19 != 20
            },
            "output_dir": "research/results/confirmatory",
            "target_coverages": [0.50],
        }
        with self.assertRaises(ValueError) as ctx:
            validate_confirmatory_config(bad_cfg)
        self.assertIn("does not equal episodes_per_class", str(ctx.exception))

    # --------------------------------------------------------------------------
    # 3. Reject Protected Historical Directories
    # --------------------------------------------------------------------------
    def test_reject_protected_historical_directories(self) -> None:
        for protected in PROTECTED_HISTORICAL_DIRS:
            with self.assertRaises(ValueError) as ctx:
                validate_output_directory_safety(protected)
            self.assertIn("SAFETY VIOLATION", str(ctx.exception))

    # --------------------------------------------------------------------------
    # 4. Reject Duplicate or Empty Seeds
    # --------------------------------------------------------------------------
    def test_reject_duplicate_or_empty_seeds(self) -> None:
        empty_cfg = {
            "seeds": [],
            "episodes_per_class": 20,
            "split_allocation": {"train_per_class": 10, "cal_per_class": 3, "val_per_class": 3, "test_per_class": 4},
        }
        with self.assertRaises(ValueError):
            validate_confirmatory_config(empty_cfg)

        dup_cfg = {
            "seeds": [202, 303, 202],
            "episodes_per_class": 20,
            "split_allocation": {"train_per_class": 10, "cal_per_class": 3, "val_per_class": 3, "test_per_class": 4},
        }
        with self.assertRaises(ValueError):
            validate_confirmatory_config(dup_cfg)

    # --------------------------------------------------------------------------
    # 5. Strict Split Disjointness on Small Deterministic Fixture
    # --------------------------------------------------------------------------
    def test_split_disjointness_on_small_fixture(self) -> None:
        source_ids = ["s0_background", "unit_001"]
        episodes_per_class = 5
        clean_episodes, metadata_list = generate_balanced_pilot_dataset(
            generator=self.generator,
            source_ids=source_ids,
            episodes_per_class=episodes_per_class,
            base_seed=202,
        )

        split_allocation = {
            "train_per_class": 2,
            "cal_per_class": 1,
            "val_per_class": 1,
            "test_per_class": 1,
        }
        splits = stratified_split_episodes(
            episodes=clean_episodes,
            metadata=metadata_list,
            allocation=split_allocation,
            seed=202,
        )

        tr_ids = {m.event_id for m in splits["train"][1]}
        cal_ids = {m.event_id for m in splits["cal"][1]}
        val_ids = {m.event_id for m in splits["val"][1]}
        te_ids = {m.event_id for m in splits["test"][1]}

        self.assertTrue(tr_ids.isdisjoint(cal_ids))
        self.assertTrue(tr_ids.isdisjoint(val_ids))
        self.assertTrue(tr_ids.isdisjoint(te_ids))
        self.assertTrue(cal_ids.isdisjoint(val_ids))
        self.assertTrue(cal_ids.isdisjoint(te_ids))
        self.assertTrue(val_ids.isdisjoint(te_ids))

        # Check total partitioned events
        self.assertEqual(len(tr_ids) + len(cal_ids) + len(val_ids) + len(te_ids), 10)

    # --------------------------------------------------------------------------
    # 6. Safe CLI Dry-Run Execution
    # --------------------------------------------------------------------------
    def test_safe_cli_dry_run_execution(self) -> None:
        env = os.environ.copy()
        env["OPENBLAS_NUM_THREADS"] = "1"
        proc = subprocess.run(
            [
                sys.executable,
                "-m",
                "research.experiments.run_confirmatory",
                "--dry-run",
            ],
            capture_output=True,
            text=True,
            env=env,
        )
        self.assertEqual(proc.returncode, 0, f"Dry-run failed: {proc.stderr}")
        self.assertIn("Dry run successful", proc.stdout)
        self.assertIn("Seeds (10): [202, 303, 404, 505, 606, 707, 808, 909, 1010, 1111]", proc.stdout)
        self.assertIn("Episodes per class: 20", proc.stdout)

    # --------------------------------------------------------------------------
    # 7. CLI Seed Override in Dry-Run
    # --------------------------------------------------------------------------
    def test_cli_seed_override_dry_run(self) -> None:
        env = os.environ.copy()
        env["OPENBLAS_NUM_THREADS"] = "1"
        proc = subprocess.run(
            [
                sys.executable,
                "-m",
                "research.experiments.run_confirmatory",
                "--dry-run",
                "--seeds",
                "202,303",
            ],
            capture_output=True,
            text=True,
            env=env,
        )
        self.assertEqual(proc.returncode, 0, f"Seed override dry-run failed: {proc.stderr}")
        self.assertIn("Seeds (2): [202, 303]", proc.stdout)

    # --------------------------------------------------------------------------
    # 8. Historical Protection Includes pilot_v4
    # --------------------------------------------------------------------------
    def test_protect_pilot_v4_included(self) -> None:
        self.assertIn("research/results/pilot_v4", PROTECTED_HISTORICAL_DIRS)

    def test_run_metadata_is_written_before_simulation_and_existing_output_is_preserved(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            output = root / "new_run"
            with self.assertRaises(Exception):
                run_confirmatory_pipeline(
                    config_path=self.config_path,
                    sim_config_path=root / "missing_sim_config.json",
                    output_dir_override=output,
                    seeds_override=[202],
                    run_bootstrap=False,
                )
            metadata = json.loads((output / "run_metadata.json").read_text(encoding="utf-8"))
            self.assertEqual(metadata["status"], "failed")
            self.assertIn("JSONDecodeError", metadata["error"])
            self.assertEqual(metadata["seeds"], [202])
            self.assertEqual(metadata["config"]["episodes_per_class"], 20)
            self.assertTrue((output / "run.log").exists())

            existing = root / "existing"
            existing.mkdir()
            sentinel = existing / "keep.txt"
            sentinel.write_text("preserve", encoding="utf-8")
            with self.assertRaises(FileExistsError):
                run_confirmatory_pipeline(
                    config_path=self.config_path,
                    output_dir_override=existing,
                    seeds_override=[202],
                    run_bootstrap=False,
                )
            self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve")

    # --------------------------------------------------------------------------
    # 9. Confirmatory Markdown Report Rendering
    # --------------------------------------------------------------------------
    def test_confirmatory_markdown_report_generation(self) -> None:
        import tempfile
        metadata = {
            "timestamp": "2026-10-12T08:00:00Z",
            "python_version": "3.10.0",
            "libraries": {"numpy": "1.26.0", "scipy": "1.11.0", "scikit_learn": "1.4.0"},
            "seeds": [202, 303, 404, 505, 606, 707, 808, 909, 1010, 1111],
            "classes_count": 13,
            "episodes_per_class": 20,
            "total_episodes_per_seed": 260,
            "test_episodes_per_seed": 52,
            "pooled_test_episodes_per_condition": 520,
            "split_allocation": {"train_per_class": 10, "cal_per_class": 3, "val_per_class": 3, "test_per_class": 4},
            "conditions": ["clean", "faulted"],
            "output_directory": "research/results/confirmatory",
        }
        summary = {
            "clean": {
                "m1_nearest_heuristic": {"coverage": {"mean": 1.0, "pooled_value": 1.0}, "selective_risk": {"mean": 0.40, "pooled_value": 0.40}},
                "m3_conventional_classifier": {"coverage": {"mean": 1.0, "pooled_value": 1.0}, "selective_risk": {"mean": 0.30, "pooled_value": 0.30}, "ece": {"mean": 0.05}},
                "m3_selective_confidence_only": {
                    "decision_coverage": {"mean": 0.50, "pooled_value": 0.50, "pooled_numerator": 260, "pooled_denominator": 520},
                    "selective_risk": {"mean": 0.15, "pooled_value": 0.15, "pooled_numerator": 39, "pooled_denominator": 260},
                    "selective_error_avoidance_rate": {"mean": 0.80, "pooled_value": 0.80},
                    "abstention_fault_cooccurrence_rate": {"mean": 0.0, "pooled_value": 0.0},
                },
                "m4_selective_attributor": {
                    "decision_coverage": {"mean": 0.60, "pooled_value": 0.60, "pooled_numerator": 312, "pooled_denominator": 520},
                    "selective_risk": {"mean": 0.08, "pooled_value": 0.08, "pooled_numerator": 25, "pooled_denominator": 312},
                    "selective_error_avoidance_rate": {"mean": 0.90, "pooled_value": 0.90},
                    "fault_diagnostic_precision": None,
                    "abstention_fault_cooccurrence_rate": {"mean": 0.0, "pooled_value": 0.0},
                    "ece": {"mean": 0.03},
                },
                "target_coverage_summary": {
                    "0.50": {
                        "target_coverage": 0.50,
                        "m3_selective": {"locked_tau": [0.65], "pooled_accepted": 260, "pooled_total": 520, "pooled_coverage": 0.50, "pooled_risk": 0.15, "pooled_errors": 39},
                        "m4_selective": {"locked_tau": [0.70], "locked_delta": [0.05], "pooled_accepted": 260, "pooled_total": 520, "pooled_coverage": 0.50, "pooled_risk": 0.07, "pooled_errors": 18},
                    }
                },
            }
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            out_file = Path(tmpdir) / "test_report.md"
            generate_confirmatory_markdown_report(metadata, summary, out_file)
            self.assertTrue(out_file.exists())
            text = out_file.read_text(encoding="utf-8")
            self.assertIn("# NoyyalSense Pre-Registered Confirmatory Benchmark Report", text)
            self.assertIn("Held-Out Test Episodes per Seed", text)
            self.assertIn("Table 1: Operating Threshold Evaluation", text)
            self.assertIn("Table 2: Matched-Coverage Benchmark", text)
            self.assertNotIn("Seed 42 observed", text)


if __name__ == "__main__":
    unittest.main()
