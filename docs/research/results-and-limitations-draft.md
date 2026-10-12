# Results and Limitations

*Working draft based on the saved confirmatory artifacts and the independent audit.*

## Observed results

The confirmatory benchmark used ten configured seeds (202, 303, 404, 505, 606, 707, 808, 909, 1010, and 1111) and 13 synthetic source classes. Each seed contributed 52 held-out physical episodes per condition. The same 520 physical test episodes were evaluated under both the clean condition and the configured faulted condition, giving 1,040 condition-level evaluations. The faulted condition applied a stuck-value fault to `sensor_002` and 10% random missingness; configured telemetry delay was disabled. These were simulator-generated observations, not measurements from Noyyal River sensors.

The saved run metadata marks the run complete and lists all ten seeds as completed. The runner log records their completion, bootstrap execution, and successful overall completion. An operating-system process exit code was not recorded, and the run metadata does not record a source revision or source-file hash; the runtime code provenance is therefore unverified.

The table reports pooled results across the 520 held-out episodes in each condition. Forced-choice accuracy, acceptance counts, errors, and pooled selective risk are shown as saved in the independent audit. Per-seed means are not combined with these pooled estimates.

| Condition | Method | Forced-choice accuracy | Accepted / abstained | Accepted errors | Pooled selective risk |
|---|---|---:|---:|---:|---:|
| Clean | M3-Selective | 91.35% | 505 / 15 | 40 | 7.92% |
| Clean | M4 | 91.35% | 513 / 7 | 41 | 7.99% |
| Faulted | M3-Selective | 75.00% | 472 / 48 | 93 | 19.70% |
| Faulted | M4 | 75.00% | 413 / 107 | 91 | 22.03% |

The pooled risk difference is defined as M4 selective risk minus M3-Selective selective risk. The saved bootstrap summary records a clean difference of +0.07 percentage points (95% CI -0.28 to +0.65) and a faulted difference of +2.33 percentage points (95% CI -0.72 to +5.59). These intervals are attributed to `research/results/confirmatory/bootstrap_summary.json`, as the independent audit documents. Each interval used 1,000 valid bootstrap replicates.

At the configured target settings of 0.30, 0.50, and 0.70, achieved held-out test coverage did not match between M3-Selective and M4. M4 coverage was 81.54% at all three settings in the clean condition and 58.65% at all three settings in the faulted condition. M3-Selective coverage was 25.58%, 48.08%, and 68.27% in the clean condition and 18.27%, 33.27%, and 51.15% in the faulted condition. These rows are target-setting evaluations, not comparisons at matched achieved test coverage.

The saved per-seed records show that M4 used the same locked threshold pair for each seed at all three target settings. Applying those repeated per-seed thresholds to the fixed test records yields the repeated M4 coverage values. The inspected code calls a validation-coverage tuner for each target, but the saved artifacts do not include target-specific validation coverage or tuning-grid results. Why the tuner selected the same pair for all three targets therefore remains unresolved.

## Interpretation

At the default operating points, the pooled selective-risk point estimates are slightly higher for M4 in the clean condition and higher for M4 in the faulted condition. The risk-difference intervals include zero in both conditions. The saved results do not establish that M4 reduces selective risk or is superior to M3-Selective.

The target-setting results do not establish a matched-coverage advantage. M4 and M3-Selective attained different held-out coverage at each target setting, with especially large differences in the clean condition. Risk differences at those settings must be interpreted alongside their different achieved coverages and must not be described as matched-coverage effects.

The bootstrap resampled physical episode clusters hierarchically, with ten seed clusters and 520 `(seed, event_id)` clusters. It preserves paired condition and method records. The resulting intervals are descriptive uncertainty estimates for this benchmark. With only ten seed clusters, they should be interpreted cautiously and are not, by themselves, formal hypothesis-test results.

## Limitations

The benchmark is synthetic and uses the specified 1D ADE simulator, ten seeds, and configured fault suite. It does not validate attribution performance on real Noyyal measurements, nor does it establish performance under real-world sensor faults or fault modes not represented here. No claim of real-world Noyyal validation, regulatory suitability, or field robustness follows from these results.

The original confirmatory report and bootstrap report label the faulted 70% target infeasible and state an approximately 61.5% maximum-coverage ceiling. The inspected source hard-codes that label; it is not derived from saved validation feasibility results. The available artifacts do not substantiate the stated ceiling. Held-out M4 coverage of 58.65% shows that the 70% target was not reached on the faulted test set, but does not establish a structural coverage limit or validation infeasibility. The label and ceiling are therefore not treated here as established findings.

The saved run is marked complete, but the operating-system exit code and runtime source provenance were not recorded. The configuration hash is available and matches the current `research/configs/confirmatory.json`; it does not establish which source revision produced the run. Validation predictions and per-target threshold-selection diagnostics are also absent, leaving the repeated M4 target thresholds unexplained.
