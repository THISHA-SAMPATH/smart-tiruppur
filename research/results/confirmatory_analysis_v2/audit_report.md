# Phase 5.2 - Independent Confirmatory Metrics and Bootstrap Audit

> Post-hoc audit after examining the original confirmatory results. Saved predictions only; no simulation, retraining, threshold retuning, or bootstrap rerun.

## Run and count verification

- Run metadata status: **complete**; seeds complete: **10/10** (202, 303, 404, 505, 606, 707, 808, 909, 1010, 1111). Current config hash matches recorded hash: **True**.
- **1040** condition-level predictions over **520** paired physical episode clusters: 520 clean and 520 faulted; 52 episodes per condition per seed.
- `run.log` records the ten seed completions, bootstrap execution with 1,000 replicates, and successful overall run completion. No operating-system exit code is stored.

## Default operating points

| Condition | Method | Forced errors / accuracy | Accepted / abstained | Accepted errors | Pooled selective risk | Per-seed risk mean +/- SD |
|---|---|---:|---:|---:|---:|---:|
| Clean | M3-Selective | 45/520; 91.35% | 505 / 15 | 40 | 7.92% | 7.79% +/- 4.53% |
| Clean | M4 | 45/520; 91.35% | 513 / 7 | 41 | 7.99% | 7.94% +/- 4.54% |
| Faulted | M3-Selective | 130/520; 75.00% | 472 / 48 | 93 | 19.70% | 19.06% +/- 7.30% |
| Faulted | M4 | 130/520; 75.00% | 413 / 107 | 91 | 22.03% | 21.76% +/- 7.56% |

M4 forced-choice prediction uses its stored predicted source when present and falls back to the conventional prediction when diagnostic abstention leaves no source. Pooled estimates weight all episodes; the per-seed risk mean is the average of ten seed-level ratios and a different estimand.

## Target settings: achieved held-out results

| Condition | Target setting | M3 coverage / risk | M4 coverage / risk | M4 minus M3 risk difference |
|---|---:|---:|---:|---:|
| Clean | 30% | 25.58% / 0.00% | 81.54% / 2.59% | +2.59% |
| Clean | 50% | 48.08% / 0.40% | 81.54% / 2.59% | +2.19% |
| Clean | 70% | 68.27% / 1.13% | 81.54% / 2.59% | +1.47% |
| Faulted | 30% | 18.27% / 0.00% | 58.65% / 9.18% | +9.18% |
| Faulted | 50% | 33.27% / 0.00% | 58.65% / 9.18% | +9.18% |
| Faulted | 70% | 51.15% / 2.63% | 58.65% / 9.18% | +6.55% |

M4 achieved coverage is 81.54% at all three clean target settings and 58.65% at all faulted settings. M3 coverage is 25.58%, 48.08%, 68.27% clean and 18.27%, 33.27%, 51.15% faulted. Thus target-grid results do **not** support matched achieved test coverage.

## Bootstrap audit and interpretation

- Saved metadata and all 68 metric records report **1,000** replicates; the run log records bootstrap execution and successful overall completion. Resampling groups `(seed,event_id)` clusters and retains all conditions and methods together. Undefined metrics remain explicitly undefined.
- Default pooled bootstrap risk differences (M4 minus M3): clean **+0.07 percentage points** (95% CI -0.28 to +0.65); faulted **+2.33 pp** (95% CI -0.72 to +5.59). Both include zero. These are paired hierarchical bootstrap intervals, with only ten seed clusters.
- Each model risk uses its own accepted subset. Pairing the resampling units does not make accepted subsets identical; the risk difference is not a matched-case comparison. Its saved `denominator` metadata equals M4 accepted count but is not a ratio denominator; it does not determine the CI.
- Inspected source currently computes M4 fault co-occurrence from M4 decisions, consistent with saved values. The existing review doc says the source uses M3 decisions; that is stale versus inspected source. No code hash pins the exact runtime version.
- The bootstrap code hard-codes faulted target 70% as infeasible with an approximate 61.5% ceiling. Saved outputs show 101/520 M4 diagnostic vetoes (19.42%), and no validation coverage table is saved. The ceiling and validation feasibility are unverified. Held-out M4 coverage 58.65% means the target was not reached on test; it does not prove a structural maximum.
- Clean M4 fault-diagnostic precision is unavailable because all 1,000 bootstrap replicates are undefined. Target interval estimates are descriptive for the locked thresholds but do not establish matched-coverage effects.

## Scientific interpretation

- **Default comparison:** no evidence M4 lowers risk: pooled risk is 7.99% vs 7.92% clean, and 22.03% vs 19.70% faulted. M4 coverage under faults is also lower (79.42% vs 90.77%).
- **Matched coverage:** unsupported by achieved test coverage. Do not claim M4 superiority at matched achieved coverage from these results.
- **Justified scope:** descriptive findings for this ten-seed 1D ADE synthetic benchmark and its configured fault suite only. They do not establish Noyyal field performance, regulatory attribution, or robustness to other faults.

## Output paths

- `research/results/confirmatory_analysis_v2/independent_metrics.json`
- `research/results/confirmatory_analysis_v2/audit_report.md`

Original confirmatory outputs and bootstrap implementation were left unchanged.
