#!/usr/bin/env python3
"""Regenerate publication assets from saved confirmatory JSON only.

This script does not run simulations, tune thresholds, or execute bootstrap analysis.
"""
from __future__ import annotations

import csv
import json
import math
import os
import re
import tempfile
import textwrap
from pathlib import Path

# Keep Matplotlib's cache out of user-profile directories that may be read-only.
os.environ.setdefault("MPLCONFIGDIR", str(Path(tempfile.gettempdir()) / "smart_tiruppur_mplconfig"))
Path(os.environ["MPLCONFIGDIR"]).mkdir(parents=True, exist_ok=True)

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
INDEPENDENT = ROOT / "research/results/confirmatory_analysis_v2/independent_metrics.json"
SUMMARY = ROOT / "research/results/confirmatory/summary_metrics.json"
SEEDS = ROOT / "research/results/confirmatory/seed_metrics.json"
BOOTSTRAP = ROOT / "research/results/confirmatory/bootstrap_summary.json"
CONFIG = ROOT / "research/configs/confirmatory.json"
REPORT = ROOT / "research/results/confirmatory/confirmatory_report.md"
METHODS = [("M3-Selective", "m3_selective_confidence_only"), ("M4", "m4_selective_attributor")]
COLORS = {"M3-Selective": "#2563a6", "M4": "#d17a00"}
CONDITIONS = ["clean", "faulted"]
TARGETS = ["0.30", "0.50", "0.70"]


def read(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def close(a, b, tol=1e-12):
    return math.isclose(float(a), float(b), rel_tol=tol, abs_tol=tol)


def validate(ind, summary, seeds, boot, config):
    configured = config["seeds"]
    assert ind["run"]["completed_seeds"] == configured
    assert len(seeds) == len(configured) * 2 == 20
    assert ind["run"]["distinct_physical_episode_clusters"] == 520
    assert ind["run"]["prediction_rows"] == 1040
    assert boot["metadata"]["n_replicates"] == 1000
    for cond in CONDITIONS:
        assert ind["conditions"][cond]["episode_count"] == 520
        for method, key in METHODS:
            m = ind["conditions"][cond]["methods"][method]
            s = summary[cond][key]
            assert m["accepted_count"] + m["abstained_count"] == 520
            assert m["accepted_errors"] == s["selective_risk"]["pooled_numerator"]
            assert m["accepted_count"] == s["selective_risk"]["pooled_denominator"]
            assert close(m["pooled_selective_risk"], s["selective_risk"]["pooled_value"])
        for target in TARGETS:
            for method, summary_method in (("M3-Selective", "m3_selective"), ("M4", "m4_selective")):
                achieved = ind["conditions"][cond]["target_coverage_points"][target][method]["achieved_heldout_coverage"]
                pooled = summary[cond]["target_coverage_summary"][target][summary_method]["pooled_coverage"]
                assert close(achieved, pooled)
        rd = boot["summary"][cond]["metrics"]["risk_difference_m4_minus_m3"]
        assert rd["replicates_total"] == 1000 and rd["replicates_valid"] == 1000
    assert sorted({r["seed"] for r in seeds}) == configured
    assert {r["condition"] for r in seeds} == set(CONDITIONS)


def save_table(stem, headers, rows):
    with (OUT / f"{stem}.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)
    def cell(v):
        return str(v).replace("|", "\\|").replace("\n", " ")
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    lines += ["| " + " | ".join(cell(row[h]) for h in headers) + " |" for row in rows]
    (OUT / f"{stem}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def make_table1(ind):
    labels = {"clean": "Clean", "faulted": "Faulted"}
    rows = []
    for cond in CONDITIONS:
        for method, _ in METHODS:
            x = ind["conditions"][cond]["methods"][method]
            rows.append({
                "Condition": labels[cond], "Method": method,
                "Forced-choice accuracy (%)": f"{100*x['forced_choice_accuracy']:.2f}",
                "Accepted (n)": x["accepted_count"], "Abstained (n)": x["abstained_count"],
                "Accepted errors (n)": x["accepted_errors"],
                "Pooled selective risk (%)": f"{100*x['pooled_selective_risk']:.2f}",
            })
    save_table("table_1_default_selective_performance",
               list(rows[0]), rows)


def make_table2(config, ind, report_text):
    split = config["split_allocation"]
    fault = config["conditions"]["faulted"]["fault_suite"]
    test_each = split["test_per_class"]
    match = re.search(r"Candidate Classes:\*\*\s*`(\d+)`", report_text)
    if not match:
        raise ValueError("Candidate class count is absent from confirmatory_report.md")
    classes = int(match.group(1))
    if test_each * classes != ind["run"]["episodes_per_seed_per_condition"]:
        raise ValueError("Configured split and reported per-seed test count disagree")
    rows = [
        {"Protocol item": "Configured seeds", "Value": ", ".join(map(str, config["seeds"])), "Source": "confirmatory.json: seeds"},
        {"Protocol item": "Candidate source classes", "Value": "13 (12 industrial dyeing clusters + background)", "Source": "confirmatory_report.md: Confirmatory Run Metadata"},
        {"Protocol item": "Episodes per class per seed", "Value": config["episodes_per_class"], "Source": "confirmatory.json: episodes_per_class"},
        {"Protocol item": "Per-class split (train/calibration/validation/test)", "Value": f"{split['train_per_class']}/{split['cal_per_class']}/{split['val_per_class']}/{test_each}", "Source": "confirmatory.json: split_allocation"},
        {"Protocol item": "Held-out episodes per seed per condition", "Value": test_each * classes, "Source": "confirmatory_report.md; corroborated by independent_metrics.json: run.episodes_per_seed_per_condition"},
        {"Protocol item": "Physical held-out episodes per condition", "Value": ind["run"]["condition_level_evaluations"]["clean"], "Source": "independent_metrics.json: run.condition_level_evaluations"},
        {"Protocol item": "Paired physical episodes / condition evaluations", "Value": f"{ind['run']['distinct_physical_episode_clusters']} / {ind['run']['prediction_rows']}", "Source": "independent_metrics.json: run.distinct_physical_episode_clusters, run.prediction_rows"},
        {"Protocol item": "Conditions", "Value": "Clean baseline; configured faulted condition", "Source": "confirmatory.json: conditions"},
        {"Protocol item": "Stuck-value fault", "Value": f"{fault['stuck_value']['affected_stations'][0]}, {fault['stuck_value']['start_time_sec']/3600:g}–{(fault['stuck_value']['start_time_sec']+fault['stuck_value']['duration_sec'])/3600:g} h", "Source": "confirmatory.json: conditions.faulted.fault_suite.stuck_value"},
        {"Protocol item": "Random missingness", "Value": f"{100*fault['random_missingness']['dropout_probability']:.0f}%", "Source": "confirmatory.json: conditions.faulted.fault_suite.random_missingness.dropout_probability"},
        {"Protocol item": "Telemetry delay", "Value": "Disabled", "Source": "confirmatory.json: conditions.faulted.fault_suite.telemetry_delay.enabled"},
        {"Protocol item": "Nominal target settings", "Value": ", ".join(f"{x:.2f}" for x in config["target_coverages"]), "Source": "confirmatory.json: target_coverages"},
        {"Protocol item": "Data basis", "Value": "Synthetic 1D ADE simulator; not real Noyyal sensor measurements", "Source": "confirmatory.json: confirmatory_metadata.is_synthetic and disclaimer"},
    ]
    save_table("table_2_confirmatory_protocol", list(rows[0]), rows)


def style():
    plt.rcParams.update({"font.size": 10, "axes.titlesize": 12, "axes.labelsize": 10,
                         "figure.dpi": 150, "savefig.dpi": 300,
                         "font.family": "DejaVu Sans", "axes.spines.top": False,
                         "axes.spines.right": False})


def save_figure(fig, stem):
    fig.savefig(OUT / f"{stem}.png", bbox_inches="tight", dpi=300)
    fig.savefig(OUT / f"{stem}.pdf", bbox_inches="tight")
    plt.close(fig)


def make_figure1(boot):
    fig, ax = plt.subplots(figsize=(7.2, 3.6))
    rows = []
    for i, cond in enumerate(CONDITIONS):
        x = boot["summary"][cond]["metrics"]["risk_difference_m4_minus_m3"]
        point, lo, hi = [100 * x[k] for k in ("point_estimate", "ci_lower", "ci_upper")]
        ax.errorbar(point, i, xerr=[[point-lo], [hi-point]], fmt="o", color=COLORS["M4"],
                    capsize=4, markersize=6, linewidth=1.6)
        ax.annotate(f"{point:+.2f} [{lo:+.2f}, {hi:+.2f}]", (hi, i),
                    xytext=(5, 0), textcoords="offset points", va="center", fontsize=8)
        rows.append(f"{cond.title()}: {point:+.2f} pp [{lo:+.2f}, {hi:+.2f}]")
    ax.axvline(0, color="#555555", linewidth=1, linestyle="--")
    ax.set_yticks([0, 1], ["Clean", "Faulted"])
    ax.invert_yaxis()
    ax.set_xlabel("M4 − M3-Selective pooled selective-risk difference (percentage points)")
    ax.set_title("Default operating points: pooled risk difference and 95% bootstrap interval")
    ax.grid(axis="x", color="#dddddd", linewidth=.6)
    fig.text(.01, -.02, "B = 1,000 valid replicates; ten seed clusters. Each method's risk uses its own accepted subset.", fontsize=8)
    fig.tight_layout()
    save_figure(fig, "figure_1_default_risk_difference")


def make_figure2(ind):
    fig, axes = plt.subplots(1, 2, figsize=(9, 4.3), sharex=True, sharey=True)
    xx = np.array([30, 50, 70])
    for ax, cond in zip(axes, CONDITIONS):
        for method, _ in METHODS:
            vals = [100*ind["conditions"][cond]["target_coverage_points"][t][method]["achieved_heldout_coverage"] for t in TARGETS]
            ax.plot(xx, vals, marker="o", markersize=5, linewidth=1.8,
                    color=COLORS[method], label=method)
        ax.plot([0, 100], [0, 100], color="#777777", linestyle="--", linewidth=1,
                label="Nominal = achieved reference")
        ax.set_title(cond.title())
        ax.set_xlabel("Nominal target coverage setting (%)")
        ax.set_xlim(0, 100); ax.set_ylim(0, 100)
        ax.set_xticks([30, 50, 70]); ax.set_yticks([0, 20, 40, 60, 80, 100])
        ax.grid(color="#e2e2e2", linewidth=.6)
    axes[0].set_ylabel("Achieved held-out test coverage (%)")
    axes[1].legend(frameon=False, fontsize=8, loc="lower right")
    fig.suptitle("Nominal target settings and achieved test coverage", y=1.02)
    fig.text(.01, -.025, "Methods do not have matched achieved coverage. The diagonal is a reference, not a fitted result.", fontsize=8)
    fig.tight_layout()
    save_figure(fig, "figure_2_target_vs_achieved_coverage")


def make_figure_s1(seeds, configured):
    fig, axes = plt.subplots(1, 2, figsize=(12, 6.2), sharey=True)
    x = np.arange(len(configured))
    for ax, cond in zip(axes, CONDITIONS):
        byseed = {r["seed"]: r for r in seeds if r["condition"] == cond}
        assert set(byseed) == set(configured)
        m3, m4 = [], []
        count_pairs = []
        for seed in configured:
            row = byseed[seed]
            a = row["m3_selective_confidence_only"]
            b = row["m4_selective_attributor"]
            m3.append(100*a["selective_risk"]); m4.append(100*b["selective_risk"])
            count_pairs.append(f"{a['accepted_count']}/{b['accepted_count']}")
        for i, (a, b) in enumerate(zip(m3, m4)):
            ax.plot([i-.08, i+.08], [a, b], color="#b5b5b5", linewidth=.8, zorder=1)
        ax.scatter(x-.08, m3, color=COLORS["M3-Selective"], label="M3-Selective", s=27, zorder=2)
        ax.scatter(x+.08, m4, color=COLORS["M4"], label="M4", s=27, zorder=2)
        ax.set_title(cond.title())
        ax.set_xticks(x, [str(s) for s in configured], rotation=45, ha="right")
        ax.set_xlabel("Seed")
        ax.grid(axis="y", color="#e2e2e2", linewidth=.6)
        count_note = "Accepted n (M3/M4, seed order): " + ", ".join(count_pairs)
        ax.text(.01, -.32, textwrap.fill(count_note, width=53), transform=ax.transAxes,
                fontsize=7, va="top", linespacing=1.3)
    axes[0].set_ylabel("Per-seed selective risk (%)")
    axes[1].legend(frameon=False)
    fig.suptitle("Per-seed selective-risk variability at default operating points", y=1.02)
    fig.text(.01, -.01, "Points are seed-level ratios (not pooled estimates); ten seed clusters. Counts follow the seed order shown on each x-axis.", fontsize=8)
    fig.tight_layout(rect=(0, .20, 1, .98))
    save_figure(fig, "figure_s1_seed_risk_variability")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ind, summary, seeds, boot, config = map(read, (INDEPENDENT, SUMMARY, SEEDS, BOOTSTRAP, CONFIG))
    validate(ind, summary, seeds, boot, config)
    style()
    make_table1(ind)
    make_table2(config, ind, REPORT.read_text(encoding="utf-8"))
    make_figure1(boot)
    make_figure2(ind)
    make_figure_s1(seeds, config["seeds"])
    print(f"Generated assets in {OUT}")


if __name__ == "__main__":
    main()
