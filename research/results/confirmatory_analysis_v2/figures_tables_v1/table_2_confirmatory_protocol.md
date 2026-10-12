| Protocol item | Value | Source |
| --- | --- | --- |
| Configured seeds | 202, 303, 404, 505, 606, 707, 808, 909, 1010, 1111 | confirmatory.json: seeds |
| Candidate source classes | 13 (12 industrial dyeing clusters + background) | confirmatory_report.md: Confirmatory Run Metadata |
| Episodes per class per seed | 20 | confirmatory.json: episodes_per_class |
| Per-class split (train/calibration/validation/test) | 10/3/3/4 | confirmatory.json: split_allocation |
| Held-out episodes per seed per condition | 52 | confirmatory_report.md; corroborated by independent_metrics.json: run.episodes_per_seed_per_condition |
| Physical held-out episodes per condition | 520 | independent_metrics.json: run.condition_level_evaluations |
| Paired physical episodes / condition evaluations | 520 / 1040 | independent_metrics.json: run.distinct_physical_episode_clusters, run.prediction_rows |
| Conditions | Clean baseline; configured faulted condition | confirmatory.json: conditions |
| Stuck-value fault | sensor_002, 6–14 h | confirmatory.json: conditions.faulted.fault_suite.stuck_value |
| Random missingness | 10% | confirmatory.json: conditions.faulted.fault_suite.random_missingness.dropout_probability |
| Telemetry delay | Disabled | confirmatory.json: conditions.faulted.fault_suite.telemetry_delay.enabled |
| Nominal target settings | 0.30, 0.50, 0.70 | confirmatory.json: target_coverages |
| Data basis | Synthetic 1D ADE simulator; not real Noyyal sensor measurements | confirmatory.json: confirmatory_metadata.is_synthetic and disclaimer |
