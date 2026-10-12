# Confirmatory figures and tables (v1)

These publication-oriented assets are generated only from the saved JSON files listed below. The script does not run simulations, retraining, bootstrap resampling, or threshold selection. Recreate the assets from the repository root with:

```powershell
python research/results/confirmatory_analysis_v2/figures_tables_v1/make_figures_tables.py
```

The generator validates relevant saved counts, pooled denominators, coverage values, and bootstrap replicate counts before writing. It does not overwrite original experiment artifacts. PNGs are rendered at 300 dpi; each figure is also saved as vector PDF.

## Assets

| Asset | Contents and source fields |
|---|---|
| `figure_1_default_risk_difference.png/.pdf` | Pooled default M4-minus-M3 selective-risk differences and saved 95% intervals. Uses `bootstrap_summary.json`: `summary.{clean,faulted}.metrics.risk_difference_m4_minus_m3.{point_estimate,ci_lower,ci_upper,replicates_total,replicates_valid}`. Values are displayed in percentage points. Each method's risk is conditional on its own accepted subset; intervals are descriptive with ten seed clusters. |
| `figure_2_target_vs_achieved_coverage.png/.pdf` | Nominal settings versus achieved held-out coverage, with clean and faulted panels and separate method series. Uses `independent_metrics.json`: `conditions.{condition}.target_coverage_points.{target}.{method}.achieved_heldout_coverage`; cross-checked against `summary_metrics.json`: top-level `{condition}.target_coverage_summary.{target}.{m3_selective,m4_selective}.pooled_coverage`. The settings are not matched-coverage comparisons. |
| `figure_s1_seed_risk_variability.png/.pdf` | Paired per-seed default selective-risk ratios, split by condition. Uses `seed_metrics.json` rows keyed by `seed` and `condition`, with `m3_selective_confidence_only.selective_risk`, `m4_selective_attributor.selective_risk`, and each method's `accepted_count`. Labels below panels give accepted n as M3/M4 per seed. These ten observations per condition are seed-level ratios, not pooled estimates. |
| `table_1_default_selective_performance.csv/.md` | Audited pooled default performance by condition/method. Uses `independent_metrics.json`: `conditions.{condition}.methods.{M3-Selective,M4}.{forced_choice_accuracy,accepted_count,abstained_count,accepted_errors,pooled_selective_risk}`. Selective risk is accepted errors divided by accepted predictions; forced-choice accuracy is reported separately over all test episodes. Each condition has 520 episodes. |
| `table_2_confirmatory_protocol.csv/.md` | Configured seeds, source classes, per-class split, conditions, fault suite, target settings, and verified held-out counts. Uses `confirmatory.json` keys `seeds`, `episodes_per_class`, `split_allocation`, `target_coverages`, `conditions`, and `confirmatory_metadata`; class count and 52 held-out episodes per seed are from `confirmatory_report.md`; paired episode/evaluation totals are from `independent_metrics.json: run`. |

## Evidence limitations

The benchmark is synthetic (1D ADE) and uses the configured fault suite; it does not represent measured Noyyal sensor observations or validate real-world fault performance. The run is marked complete in saved metadata, but the operating-system process exit code and runtime source provenance were not recorded. There are only ten seed clusters. Neither the risk-difference figure nor target-coverage figure supports M4 superiority or a matched-achieved-coverage claim. The repeated M4 coverage at all three nominal settings is visible in the saved outputs; why the validation tuner selected identical threshold pairs remains unresolved. Do not interpret the unsupported faulted 70% infeasibility label or approximate 61.5% ceiling from the original report as established findings.

The script cross-checks the stored default risk numerators/denominators and target coverage values. It uses the saved bootstrap interval endpoints directly and does not recompute confidence intervals. Table 2 reports the 13 candidate source classes as recorded in the original report; the config does not enumerate those class names.
