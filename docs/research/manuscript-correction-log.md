# Manuscript Correction Log

*Targeted correction pass following `docs/research/manuscript-audit.md`. The audit itself and all saved experiment artifacts remain unchanged.*

| Location | Correction | Supporting source | Remaining issue |
|---|---|---|---|
| Section 4.3, fault configuration and partition use | Replaced “independent random missingness” with the configuration-grounded “random missingness is configured at 0.10.” Qualified the partition/fault description as coming from the inspected runner and stated that runtime source provenance was not recorded. | `research/configs/confirmatory.json` fault-suite fields; `research/simulation/sensor_faults.py`; `research/experiments/run_pilot.py`; `run_metadata.json` and `independent_metrics.json` provenance fields. | The configuration hash matches, but there is no runtime source hash/revision; the inspected source is not proven to be the exact runtime source. |
| Reference 11, Section 10 | Completed the page range as 2103–2120. Preserved the verified title, authors, year, venue, and DOI. | IOP publisher record for DOI `10.1088/0266-5611/23/5/017`; also recorded in `manuscript-audit.md`. | No bibliographic field remains unresolved for this reference. |
| Reference 1, Section 10 | Added an author-verification note instead of presenting the record as fully verified, consistent with the audit's partial verification status. | `manuscript-audit.md`; DOI `10.1109/TIT.1970.1054406` resolves to IEEE, but the IEEE metadata page was bot-gated during direct audit. | Verify the complete reference details against an accessible publisher or DOI record before submission. |
| Section 2.4 and references 2–10, 12–15 | No factual edit made: the audit found the cited summaries and bibliographic details supported by proceedings, publisher, DOI, or author-hosted records. | `manuscript-audit.md`; publisher/proceedings records cited in the manuscript and related-work review. | Normal journal-style formatting remains for the eventual selected venue. |
| Abstract; Sections 5–9; Table 1; Figures 1, 2 and S1; Table 2 | Rechecked consistency against the audit. No numeric or interpretive changes made: pooled results, saved risk-difference intervals and bootstrap source, target-versus-achieved coverage, and synthetic-only scope remain as audited. | `independent_metrics.json`, raw `episode_predictions.json`, `bootstrap_summary.json`, figures/tables README and assets, `confirmatory-results-review.md`, and `results-and-limitations-draft.md`. | Ten seed clusters limit uncertainty; M4 does not show lower pooled selective risk; no matched achieved coverage is established. |

## Explicitly retained unresolved items

- The run is marked complete and all ten seeds are listed complete, but its operating-system process exit code was not recorded.
- Runtime source provenance is unavailable. Simulator defaults and inspected source behavior therefore cannot be asserted as exact runtime settings solely from current source files.
- Saved M4 threshold pairs repeat across all three target settings per seed. This explains repeated test coverage when applied to fixed test records, but the reason the validation tuner selected those pairs remains unresolved because target-specific validation diagnostics are unavailable.
- The faulted 70% infeasibility label and approximately 61.5% ceiling remain unsupported and are not presented as findings.
- The reference 1 metadata check remains partial pending author verification.
- Author identities/affiliations, corresponding author, funding and acknowledgements, and journal-specific formatting remain author decisions.

The audit found no supported basis to revise the abstract, pooled result counts, selective risks, risk-difference confidence intervals, interpretation, or conclusion. No experiment code, configuration, threshold, test data, result, audit output, figure, or table was changed.
