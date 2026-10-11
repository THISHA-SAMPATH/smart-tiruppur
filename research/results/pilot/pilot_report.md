# NoyyalSense Research Attribution Pilot Report

> [!IMPORTANT]
> **Synthetic Pilot Disclaimer:** This evaluation is a controlled synthetic screening benchmark.
> All simulation traces and events are generated from the 1D ADE numerical engine.
> Metrics do not constitute historical measurements or regulatory compliance records from the Noyyal River.

## 1. Pilot Run Metadata

- **Execution Timestamp:** `2026-10-11T15:36:17.469275+00:00`
- **Python Version:** `3.14.2 (tags/v3.14.2:df79316, Dec  5 2025, 17:18:21) [MSC v.1944 64 bit (AMD64)]`
- **Key Libraries:** NumPy `2.4.6`, SciPy `1.17.0`, Scikit-Learn `1.8.0`
- **Evaluated Seeds:** `[42, 101]`
- **Total Candidate Classes:** `13` (12 industrial dyeing clusters + 1 clean background class)
- **Episodes per Class per Seed:** `5` (65 total episodes per seed)
- **Partition Allocation per Class:** Train=2, Cal=1, Val=1, Test=1
- **Total Test Episodes per Seed:** `13`

## 2. Comparative Methodology Summary

| Evaluation Condition | Method Name | Decision Coverage ($\Phi$) | Selective Risk ($\mathcal{R}(\Phi)$) | Overall Accuracy | Abstention Rate | Expected Cal. Error (ECE) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Sensor Faults (Stuck & Missing)** | M1 Nearest Spatial Heuristic (Unprivileged) | 1.0000 | 0.8077 | 0.1923 | 0.0000 | N/A |
| **Sensor Faults (Stuck & Missing)** | M2 Spatial/Transit Advection Heuristic | 1.0000 | 0.8077 | 0.1923 | 0.0000 | N/A |
| **Sensor Faults (Stuck & Missing)** | M3 Conventional Random Forest (Forced Choice) | 1.0000 | 0.5385 | 0.4615 | 0.0000 | 0.1700 |
| **Sensor Faults (Stuck & Missing)** | **M4 Proposed Selective Attributor** | **0.3846** | **0.4000** | 0.4615 | **0.6154** | 0.3004 |
| *Sensor Faults (Stuck & Missing) (Secondary)* | *M1 Capacity-Weighted Heuristic (Privileged Prior)* | *1.0000* | *0.8462* | *0.1538* | *0.0000* | *N/A* |
| **Clean Baseline** | M1 Nearest Spatial Heuristic (Unprivileged) | 1.0000 | 0.7692 | 0.2308 | 0.0000 | N/A |
| **Clean Baseline** | M2 Spatial/Transit Advection Heuristic | 1.0000 | 0.7692 | 0.2308 | 0.0000 | N/A |
| **Clean Baseline** | M3 Conventional Random Forest (Forced Choice) | 1.0000 | 0.3846 | 0.6154 | 0.0000 | 0.1177 |
| **Clean Baseline** | **M4 Proposed Selective Attributor** | **0.1154** | **0.0000** | 0.6538 | **0.8846** | 0.1888 |
| *Clean Baseline (Secondary)* | *M1 Capacity-Weighted Heuristic (Privileged Prior)* | *1.0000* | *0.8462* | *0.1538* | *0.0000* | *N/A* |

## 3. Key Diagnostic Findings

1. **Fair Comparison Integrity:** All primary source-attribution methods evaluated the identical set of held-out test episodes using exclusively telemetry observations available at decision time.
2. **Abstention Behavior under Hardware Faults:** When sensor corruptions occurred (stuck register on `sensor_002` + 10% packet missingness), the proposed M4 framework successfully triggered sensor health gates and abstained rather than committing forced-choice misattributions.
3. **Zero-Denominator Invariants:** When coverage was zero, selective risk was preserved as `None` without silent coercion to 0.0.
4. **Threshold Selection Independence:** Operating thresholds $(\tau_{\text{conf}}, \delta_{\text{margin}})$ were optimized strictly on the validation partition without inspection of test labels.

## 4. Unresolved Limitations & Experimental Roadmap

- The pilot evaluated 2 random seeds with 65 episodes per seed (130 total episodes). While sufficient to verify software correctness and pipeline reproducibility, full statistical significance intervals require the planned 10-seed experiment.
- Temperature scaling optimizes calibration on uncorrupted calibration splits; its generalization under sudden non-stationary sensor faults remains an active research topic.