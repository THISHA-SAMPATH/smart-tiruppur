# Publication Figure and Table Plan

All nine requested source files were present and inspected. The audited metrics and protocol data needed for the proposed items are available in the saved artifacts. No plots or tables have been generated.

## Main-text items

### Table 1. Default selective-attribution performance by condition

- **Purpose:** Present the primary pooled comparison of M3-Selective and M4 under clean and faulted test conditions.
- **Metrics:** Condition, method, forced-choice accuracy, accepted and abstained counts, accepted errors, pooled selective risk. Use the audited rows exactly: clean M3-Selective 91.35%, 505/15, 40 errors, 7.92%; clean M4 91.35%, 513/7, 41 errors, 7.99%; faulted M3-Selective 75.00%, 472/48, 93 errors, 19.70%; faulted M4 75.00%, 413/107, 91 errors, 22.03%.
- **Source fields:** `research/results/confirmatory_analysis_v2/independent_metrics.json`: `conditions.{clean|faulted}.methods.{M3-Selective|M4}.{forced_choice_accuracy,accepted_count,abstained_count,accepted_errors,pooled_selective_risk}`. `summary_metrics.json` provides a cross-check in `clean|faulted.m3_selective_confidence_only` and `m4_selective_attributor`, including `selective_risk.pooled_numerator`, `pooled_denominator`, and `pooled_value`.
- **Availability:** Present and verified in the independent audit; its default counts and risks agree with the saved summary.
- **Conclusion supported:** Descriptive pooled performance at each method's saved default operating point. The point risks do not show lower risk for M4.
- **Caveat:** Label all quantities pooled across 520 episodes per condition. Do not mix these values with unweighted per-seed means. Forced-choice accuracy is separate from selective risk; selective risk uses accepted predictions only.

### Figure 1. Pooled M4-minus-M3 selective-risk differences

- **Purpose:** Show the default risk-difference estimates and uncertainty in a compact form.
- **Metrics:** One estimate and 95% interval per condition: clean +0.07 percentage points (95% CI -0.28 to +0.65); faulted +2.33 percentage points (95% CI -0.72 to +5.59). Plot in percentage points with a vertical zero reference line.
- **Source fields:** `research/results/confirmatory/bootstrap_summary.json`: `summary.{clean|faulted}.metrics.risk_difference_m4_minus_m3.{point_estimate,ci_lower,ci_upper,replicates_total,replicates_valid}`. `independent_metrics.json` records the pooled component risks but does not contain a default pooled risk-difference CI field; the intervals must be attributed to `bootstrap_summary.json`.
- **Availability:** Present and verified; both intervals have 1,000 valid of 1,000 declared replicates.
- **Conclusion supported:** The saved bootstrap intervals include zero for both default comparisons; they do not establish lower selective risk for M4.
- **Caveat:** The difference subtracts two method-specific conditional risks, each calculated over that method's accepted subset. Pairing the bootstrap samples does not make those accepted subsets identical. There are only ten seed clusters, so present the intervals as descriptive uncertainty, not a formal superiority test.

### Figure 2. Nominal target settings and achieved held-out coverage

- **Purpose:** Show whether validation target labels translated into comparable test coverage.
- **Metrics:** X-axis: nominal target settings 0.30, 0.50, 0.70. Y-axis: achieved held-out test coverage. Plot separate M3-Selective and M4 series in clean and faulted panels. Saved values: clean M3 25.58%, 48.08%, 68.27%; clean M4 81.54%, 81.54%, 81.54%; faulted M3 18.27%, 33.27%, 51.15%; faulted M4 58.65%, 58.65%, 58.65%.
- **Source fields:** `independent_metrics.json`: `conditions.{clean|faulted}.target_coverage_points.{0.30|0.50|0.70}.{M3-Selective|M4}.achieved_heldout_coverage`. Cross-check in `summary_metrics.json`: `clean|faulted.target_coverage_summary.{0.30|0.50|0.70}.{m3_selective|m4_selective}.pooled_coverage`.
- **Availability:** Present and verified. The original `confirmatory_report.md` and saved target records also provide locked thresholds and accepted counts.
- **Conclusion supported:** The actual held-out coverages differ between methods at each target setting; M4 coverage repeats across the three settings within each condition.
- **Caveat:** Clearly distinguish the nominal target from achieved test coverage. Do not label these as matched-coverage results or infer a matched-coverage advantage. The same M4 locked threshold pair is saved per seed for all three targets, but why the validation tuner selected the same pairs remains unresolved because target-specific validation results are absent. Do not present the faulted 70% infeasibility label or approximately 61.5% ceiling as established; the audit found them unsupported by the saved artifacts.

### Table 2. Confirmatory experimental protocol

- **Purpose:** Make the synthetic evaluation design and paired test structure reproducible at a glance.
- **Fields:** Ten configured seeds; 13 candidate source classes; 20 episodes per class per seed; split per class of 10 train, 3 calibration, 3 validation, and 4 test; 52 held-out test episodes per seed; 520 physical test episodes evaluated in each of two conditions; clean baseline; and faulted condition with stuck value at `sensor_002` from 6 to 14 hours and 10% random missingness, with telemetry delay disabled. Include the three nominal target settings if the table has room.
- **Source fields:** `research/configs/confirmatory.json`: `seeds`, `episodes_per_class`, `split_allocation`, `target_coverages`, `conditions.clean`, and `conditions.faulted.fault_suite`. The count of 13 candidate classes and 52 held-out episodes per seed are reported in `research/results/confirmatory/confirmatory_report.md` under Confirmatory Run Metadata; 520 clusters and paired condition records are verified in `independent_metrics.json` under `run`.
- **Availability:** Present and verified across the config, original report, and independent audit. The confirmatory config does not enumerate the 13 class names; do not imply that it does.
- **Conclusion supported:** This is a ten-seed synthetic benchmark with paired clean/faulted evaluations of the same held-out physical episodes under the specified fault suite.
- **Caveat:** Identify the records as simulator-generated, not real Noyyal sensor observations. The run is marked complete, but OS exit code and runtime source provenance are unverified. Only ten seed clusters contribute to bootstrap uncertainty.

## Supplementary item

### Supplementary Figure S1. Per-seed selective-risk variability

- **Purpose:** Show the spread across the ten seed clusters that a pooled table and pooled interval can conceal.
- **Metrics:** For each seed and condition, plot M3-Selective and M4 selective risk as paired points (optionally connect the two method points within seed); use seed-level accepted counts as point labels or a companion annotation. Do not plot a pooled point as though it were a seed.
- **Source fields:** `research/results/confirmatory/seed_metrics.json`, one record per `seed` and `condition`; fields `m3_selective_confidence_only.selective_risk`, `m4_selective_attributor.selective_risk`, and each method's `accepted_count`. The same per-seed values are summarized in `summary_metrics.json` arrays under the corresponding `selective_risk.seed_values` and `accepted_count.seed_values`.
- **Availability:** Present for all ten seeds in both conditions.
- **Conclusion supported:** Descriptive consistency or variability of seed-level selective-risk outcomes in this benchmark.
- **Caveat:** Ten points per condition are a small number of seed clusters. Treat this as descriptive, not evidence of population-level significance or method superiority. Keep these per-seed ratios distinct from the pooled risks in Table 1.

## Implementation notes for the next step

Use the saved values without rerunning any analysis. Preserve method and condition labels, show confidence intervals only where stored, and caption every result as synthetic benchmark evidence. Do not add a matched-coverage claim, the unsupported faulted 70% ceiling, or an interpretation of the target tuner that is not in the saved validation artifacts.
