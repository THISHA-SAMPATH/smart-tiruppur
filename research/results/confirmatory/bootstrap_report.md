# NoyyalSense Confirmatory Statistical Bootstrap Report

> [!IMPORTANT]
> **Methodological Grounding:** This report computes non-parametric confidence intervals using
> atomic, cluster-preserving hierarchical bootstrap resampling ($B = 1000$ replicates).
> Paired physical episodes and conditions are preserved together; time points are never resampled independently.

## 1. Bootstrap Resampling Configuration

- **Replicates ($B$):** `1000`
- **Confidence Level:** `95%` (Percentile Method)
- **Bootstrap Seed:** `42`
- **Hierarchical Seed Resampling:** `True`
- **Total Episode Clusters:** `520`
- **Evaluated Conditions:** `clean, faulted`

## 2. Table 1: Primary Operating Thresholds & Bootstrap 95% CIs

| Condition | Method | Decision Coverage ($\Phi$) | Selective Risk ($\mathcal{R}(\Phi)$) | Risk Difference ($\Delta\mathcal{R}_{M4 - M3}$) | Error Avoidance Rate | Fault Diag. Precision |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Clean Baseline** | M1 Nearest Heuristic | 100.00% [100.0, 100.0] | 77.31% [76.92, 78.08] | N/A | N/A | N/A |
| **Clean Baseline** | M3 Conventional RF (Forced) | 100.00% [100.0, 100.0] | 8.65% [5.96, 11.73] | N/A | N/A | N/A |
| **Clean Baseline** | M3-Selective (Conf-Only) | 97.12% [92.12, 100.00] | 7.92% [4.93, 11.18] | Reference | 11.11% [0.00, 30.02] | N/A (No Diagnostic) |
| **Clean Baseline** | **M4 Proposed Selective** | **98.65% [96.15, 100.00]** | **7.99% [5.02, 11.27]** | **0.07% [-0.28, 0.65]** | **8.89% [0.00, 27.79]** | **N/A (100.0% undef)** |
| **Sensor Faults (Stuck & Missing)** | M1 Nearest Heuristic | 100.00% [100.0, 100.0] | 78.46% [77.50, 79.62] | N/A | N/A | N/A |
| **Sensor Faults (Stuck & Missing)** | M3 Conventional RF (Forced) | 100.00% [100.0, 100.0] | 25.00% [20.58, 29.43] | N/A | N/A | N/A |
| **Sensor Faults (Stuck & Missing)** | M3-Selective (Conf-Only) | 90.77% [82.69, 95.96] | 19.70% [14.84, 24.21] | Reference | 28.46% [13.07, 48.93] | N/A (No Diagnostic) |
| **Sensor Faults (Stuck & Missing)** | **M4 Proposed Selective** | **79.42% [76.15, 82.50]** | **22.03% [16.71, 27.66]** | **2.33% [-0.72, 5.59]** | **30.00% [17.16, 45.84]** | **100.00% [100.00, 100.00]** |

> [!NOTE]
> **Risk Difference Interpretation:** $\Delta\mathcal{R} = \mathcal{R}_{M4} - \mathcal{R}_{M3-Selective}$.
> A negative difference indicates that the proposed M4 selective attributor achieves lower selective risk among accepted decisions.
> When a model accepts 0 predictions in a replicate, selective risk is undefined and excluded from confidence interval bounds.

## 3. Table 2: Pre-Registered Matched-Coverage Grid ($\Phi^* \in \{0.30, 0.50, 0.70\}$)

| Condition | Target $\Phi^*$ | Method | Achieved Coverage 95% CI | Test Selective Risk 95% CI | Risk Difference ($\Delta\mathcal{R}_{M4 - M3}$) | Feasibility Status |
| :--- | :---: | :--- | :---: | :---: | :---: | :--- |
| **Clean Baseline** | 30% | M3-Selective | 25.58% [20.76, 31.54] | 0.00% [0.00, 0.00] | Reference | Validated operating point |
| **Clean Baseline** | 30% | **M4 Selective** | **81.54% [73.07, 89.23]** | **2.59% [0.96, 4.63]** | **2.59% [0.96, 4.63]** | **Feasible**<br/>*Validation-tuned operating point locked prior to held-out test.* |
| **Clean Baseline** | 50% | M3-Selective | 48.08% [42.12, 53.66] | 0.40% [0.00, 1.61] | Reference | Validated operating point |
| **Clean Baseline** | 50% | **M4 Selective** | **81.54% [73.07, 89.23]** | **2.59% [0.96, 4.63]** | **2.19% [0.35, 4.51]** | **Feasible**<br/>*Validation-tuned operating point locked prior to held-out test.* |
| **Clean Baseline** | 70% | M3-Selective | 68.27% [63.65, 73.27] | 1.13% [0.00, 2.53] | Reference | Validated operating point |
| **Clean Baseline** | 70% | **M4 Selective** | **81.54% [73.07, 89.23]** | **2.59% [0.96, 4.63]** | **1.47% [-0.90, 3.82]** | **Feasible**<br/>*Validation-tuned operating point locked prior to held-out test.* |
| **Sensor Faults (Stuck & Missing)** | 30% | M3-Selective | 18.27% [14.81, 21.74] | 0.00% [0.00, 0.00] | Reference | Validated operating point |
| **Sensor Faults (Stuck & Missing)** | 30% | **M4 Selective** | **58.65% [50.77, 66.54]** | **9.18% [4.03, 14.33]** | **9.18% [4.03, 14.33]** | **Feasible**<br/>*Validation-tuned operating point locked prior to held-out test.* |
| **Sensor Faults (Stuck & Missing)** | 50% | M3-Selective | 33.27% [28.65, 38.08] | 0.00% [0.00, 0.00] | Reference | Validated operating point |
| **Sensor Faults (Stuck & Missing)** | 50% | **M4 Selective** | **58.65% [50.77, 66.54]** | **9.18% [4.03, 14.33]** | **9.18% [4.03, 14.33]** | **Feasible**<br/>*Validation-tuned operating point locked prior to held-out test.* |
| **Sensor Faults (Stuck & Missing)** | 70% | M3-Selective | 51.15% [44.80, 56.93] | 2.63% [0.40, 5.42] | Reference | Validated operating point |
| **Sensor Faults (Stuck & Missing)** | 70% | **M4 Selective** | **58.65% [50.77, 66.54]** | **9.18% [4.03, 14.33]** | **6.55% [0.99, 12.27]** | **Infeasible (Diagnostic Bound)**<br/>*Diagnostic Gating Bound: In faulted condition, frozen sensors on sensor_002 trigger diagnostic vetoes on ~38.5% of episodes, bounding maximum achievable coverage at ~61.5%.* |

## 4. Statistical Assumptions & Methodological Limitations

1. **Finite Seed Clusters:** In a 10-seed experiment, simulation runs form 10 discrete clusters.
   Hierarchical resampling of seeds reflects between-seed variability, but discrete cluster counts limit inferential granularity.
2. **Effective Sample Size Shrinkage:** At low target coverage (e.g. $\Phi^* = 0.30$), selective risk is evaluated on a small accepted denominator ($N_{\text{accepted}} = 156$ out of 520 test episodes across 10 seeds). Confidence intervals widen substantially at low coverage.
3. **Zero-Denominator Replicates:** Replicates with 0 accepted predictions are tracked explicitly (`replicates_undefined`) and never coerced to zero.
4. **Sensor Health Diagnostic Feasibility Limit:** Under sensor faults, hardware diagnostics reject frozen registers unconditionally, placing a structural ceiling on achievable coverage at $\approx 61.5\%$. This trade-off is reported transparently as a domain safety constraint.