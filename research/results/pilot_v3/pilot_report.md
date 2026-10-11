# NoyyalSense Research Attribution Pilot Report

> [!IMPORTANT]
> **Synthetic Pilot Disclaimer:** This evaluation is a controlled synthetic screening benchmark.
> All simulation traces and events are generated from the 1D ADE numerical engine.
> Metrics do not constitute historical measurements or regulatory compliance records from the Noyyal River.

## 1. Pilot Run Metadata

- **Execution Timestamp:** `2026-10-11T16:22:01.472182+00:00`
- **Python Version:** `3.14.2 (tags/v3.14.2:df79316, Dec  5 2025, 17:18:21) [MSC v.1944 64 bit (AMD64)]`
- **Key Libraries:** NumPy `2.4.6`, SciPy `1.17.0`, Scikit-Learn `1.8.0`
- **Evaluated Seeds:** `[42, 101]`
- **Total Candidate Classes:** `13` (12 industrial dyeing clusters + 1 clean background class)
- **Episodes per Class per Seed:** `5` (65 total episodes per seed)
- **Partition Allocation per Class:** Train=2, Cal=1, Val=1, Test=1
- **Total Test Episodes per Seed:** `13`

## 2. Comparative Methodology Summary

| Evaluation Condition | Method Name | Decision Coverage ($\Phi$) | Selective Risk ($\mathcal{R}(\Phi)$) | Error Avoidance Rate | Fault Co-occur / Prec | Expected Cal. Error (ECE) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Sensor Faults (Stuck & Missing)** | M1 Nearest Spatial Heuristic (Unprivileged) | 1.0000 | 0.8077 | N/A (No Abstain) | N/A | N/A |
| **Sensor Faults (Stuck & Missing)** | M3 Conventional Random Forest (Forced Choice) | 1.0000 | 0.5385 | N/A (Forced) | N/A | 0.1700 |
| **Sensor Faults (Stuck & Missing)** | M3-Selective RF (Confidence-Only Abstention) | 0.3077 | 0.3750 | 0.6692 | 1.0000 (Co-occur) | N/A |
| **Sensor Faults (Stuck & Missing)** | **M4 Proposed Selective Attributor** | **0.5769** | **0.4018** | **0.7333** | **1.0000 (Diag Prec)** | 0.3004 |
| *Sensor Faults (Stuck & Missing) (Secondary)* | *M1 Capacity-Weighted Heuristic (Privileged Prior)* | *1.0000* | *0.8462* | *N/A* | *N/A* | *N/A* |
| **Clean Baseline** | M1 Nearest Spatial Heuristic (Unprivileged) | 1.0000 | 0.7692 | N/A (No Abstain) | N/A | N/A |
| **Clean Baseline** | M3 Conventional Random Forest (Forced Choice) | 1.0000 | 0.3846 | N/A (Forced) | N/A | 0.1177 |
| **Clean Baseline** | M3-Selective RF (Confidence-Only Abstention) | 0.4231 | 0.3636 | 0.4423 | 0.0000 (Co-occur) | N/A |
| **Clean Baseline** | **M4 Proposed Selective Attributor** | **0.6538** | **0.3485** | **0.2143** | **N/A (Diag Prec)** | 0.1888 |
| *Clean Baseline (Secondary)* | *M1 Capacity-Weighted Heuristic (Privileged Prior)* | *1.0000* | *0.8462* | *N/A* | *N/A* | *N/A* |

> [!NOTE]
> **Baseline Deduplication Notice (Phase 3.3 Audit):**
> Prior candidate M2 Spatial Transit Heuristic produced mathematically identical rankings to M1 Nearest Spatial Heuristic because its scoring formula was a strictly monotonic transformation of upstream distance ($1 / (1 + dx/1000)$).
> M2 has been removed from primary comparisons and replaced with M3-Selective (confidence-only abstention) to provide a matched-coverage selective baseline.

## 3. Key Diagnostic Findings

1. **Fair Comparison Integrity:** All primary source-attribution methods evaluated the identical set of held-out test episodes using exclusively telemetry observations available at decision time.
2. **Matched-Coverage Selective Comparison:** Comparing M3-Selective (confidence thresholding only) with M4 (confidence + margin + diagnostic health gating) reveals whether multi-signal gating and sensor diagnostics provide value beyond confidence alone.
3. **Threshold Selection Independence:** Operating thresholds $(\tau_{\text{conf}}, \delta_{\text{margin}})$ were optimized strictly on the validation partition without inspection of test labels.
4. **Decoupled Abstention Evaluation:** Abstentions are evaluated via Error Avoidance Rate (fraction avoiding incorrect forced accusations) and Fault Diagnostic Precision rather than assuming every injected fault justifies an abstention.
5. **Zero-Denominator Invariants:** When coverage was zero, selective risk was preserved as `None` without silent coercion to 0.0.

## 4. Unresolved Limitations & Experimental Roadmap

- The pilot evaluated 2 random seeds with 65 episodes per seed (130 total episodes). This exploratory pilot verifies software correctness and pipeline reproducibility; confirmatory conclusions require the full 10-seed experiment.
- Temperature scaling optimizes calibration on uncorrupted calibration splits; its generalization under sudden non-stationary sensor faults remains an active research topic.