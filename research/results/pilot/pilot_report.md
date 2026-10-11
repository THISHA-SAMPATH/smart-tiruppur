# NoyyalSense Research Attribution Pilot Report

> [!IMPORTANT]
> **Synthetic Pilot Disclaimer:** This evaluation is a controlled synthetic screening benchmark.
> All simulation traces and events are generated from the 1D ADE numerical engine.
> Metrics do not constitute historical measurements or regulatory compliance records from the Noyyal River.

## 1. Pilot Run Metadata

- **Execution Timestamp:** `2026-10-11T16:53:17.595495+00:00`
- **Python Version:** `3.14.2 (tags/v3.14.2:df79316, Dec  5 2025, 17:18:21) [MSC v.1944 64 bit (AMD64)]`
- **Key Libraries:** NumPy `2.4.6`, SciPy `1.17.0`, Scikit-Learn `1.8.0`
- **Evaluated Seeds:** `[42, 101]`
- **Total Candidate Classes:** `13` (12 industrial dyeing clusters + 1 clean background class)
- **Episodes per Class per Seed:** `5` (65 total episodes per seed)
- **Partition Allocation per Class:** Train=2, Cal=1, Val=1, Test=1
- **Total Test Episodes per Seed:** `13` (26 pooled across seeds per condition)

## 2. Primary Comparative Methodology Summary (Table 1: Operating Threshold Evaluation)

| Evaluation Condition | Method Name | Decision Coverage ($\Phi$) | Selective Risk ($\mathcal{R}(\Phi)$) | Error Avoidance Rate | Fault Diagnostic Precision | Abstention–Fault Co-occurrence | Expected Cal. Error (ECE) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Clean Baseline** | M1 Nearest Spatial Heuristic (Unprivileged) | **Pooled:** 26/26 (100.00%)<br/>*Seed Mean:* 100.00% ± 0.00% | **Pooled:** 20/26 (76.92%)<br/>*Seed Mean:* 76.92% ± 0.00% | N/A (No Abstain) | N/A (No Diagnostic) | N/A (No Abstain) | N/A |
| **Clean Baseline** | M3 Conventional Random Forest (Forced Choice) | **Pooled:** 26/26 (100.00%)<br/>*Seed Mean:* 100.00% ± 0.00% | **Pooled:** 10/26 (38.46%)<br/>*Seed Mean:* 38.46% ± 0.00% | N/A (Forced) | N/A (No Diagnostic) | N/A (Forced) | 0.1177 |
| **Clean Baseline** | M3-Selective RF (Confidence-Only Abstention) | **Pooled:** 11/26 (42.31%)<br/>*Seed Mean:* 42.31% ± 59.83% | **Pooled:** 4/11 (36.36%)<br/>*Seed Mean:* 36.36% ± 0.00% | **Pooled:** 6/15 (40.00%)<br/>*Seed Mean:* 44.23% ± 8.16% | **N/A (No Diagnostic)** | **Pooled:** 0/15 (0.00%)<br/>*Seed Mean:* 0.00% ± 0.00% | N/A |
| **Clean Baseline** | **M4 Proposed Selective Attributor** | ****Pooled:** 17/26 (65.38%)<br/>*Seed Mean:* 65.38% ± 27.20%** | ****Pooled:** 6/17 (35.29%)<br/>*Seed Mean:* 34.85% ± 2.14%** | ****Pooled:** 3/9 (33.33%)<br/>*Seed Mean:* 21.43% ± 30.30%** | ****Pooled:** N/A<br/>*Seed Mean:* N/A** | ****Pooled:** 0/9 (0.00%)<br/>*Seed Mean:* 0.00% ± 0.00%** | 0.1888 |
| *Clean Baseline (Secondary)* | *M1 Capacity-Weighted Heuristic (Privileged Prior)* | ***Pooled:** 26/26 (100.00%)<br/>*Seed Mean:* 100.00% ± 0.00%* | ***Pooled:** 22/26 (84.62%)<br/>*Seed Mean:* 84.62% ± 0.00%* | *N/A* | *N/A (No Diagnostic)* | *N/A* | *N/A* |
| **Sensor Faults (Stuck & Missing)** | M1 Nearest Spatial Heuristic (Unprivileged) | **Pooled:** 26/26 (100.00%)<br/>*Seed Mean:* 100.00% ± 0.00% | **Pooled:** 21/26 (80.77%)<br/>*Seed Mean:* 80.77% ± 5.44% | N/A (No Abstain) | N/A (No Diagnostic) | N/A (No Abstain) | N/A |
| **Sensor Faults (Stuck & Missing)** | M3 Conventional Random Forest (Forced Choice) | **Pooled:** 26/26 (100.00%)<br/>*Seed Mean:* 100.00% ± 0.00% | **Pooled:** 14/26 (53.85%)<br/>*Seed Mean:* 53.85% ± 0.00% | N/A (Forced) | N/A (No Diagnostic) | N/A (Forced) | 0.1700 |
| **Sensor Faults (Stuck & Missing)** | M3-Selective RF (Confidence-Only Abstention) | **Pooled:** 8/26 (30.77%)<br/>*Seed Mean:* 30.77% ± 43.51% | **Pooled:** 3/8 (37.50%)<br/>*Seed Mean:* 37.50% ± 0.00% | **Pooled:** 11/18 (61.11%)<br/>*Seed Mean:* 66.92% ± 18.49% | **N/A (No Diagnostic)** | **Pooled:** 18/18 (100.00%)<br/>*Seed Mean:* 100.00% ± 0.00% | N/A |
| **Sensor Faults (Stuck & Missing)** | **M4 Proposed Selective Attributor** | ****Pooled:** 15/26 (57.69%)<br/>*Seed Mean:* 57.69% ± 5.44%** | ****Pooled:** 6/15 (40.00%)<br/>*Seed Mean:* 40.18% ± 3.79%** | ****Pooled:** 8/11 (72.73%)<br/>*Seed Mean:* 73.33% ± 9.43%** | ****Pooled:** 7/7 (100.00%)<br/>*Seed Mean:* 100.00% ± 0.00%** | ****Pooled:** 11/11 (100.00%)<br/>*Seed Mean:* 100.00% ± 0.00%** | 0.3004 |
| *Sensor Faults (Stuck & Missing) (Secondary)* | *M1 Capacity-Weighted Heuristic (Privileged Prior)* | ***Pooled:** 26/26 (100.00%)<br/>*Seed Mean:* 100.00% ± 0.00%* | ***Pooled:** 22/26 (84.62%)<br/>*Seed Mean:* 84.62% ± 0.00%* | *N/A* | *N/A (No Diagnostic)* | *N/A* | *N/A* |

> [!NOTE]
> **Reconciliation of Pooled Ratios vs Seed Means (Phase 3.4 Audit):**
> - **Clean M4 Selective Risk:** Seed 42 observed 2 errors / 6 accepted (33.33%), Seed 101 observed 4 errors / 11 accepted (36.36%). The unweighted seed mean is $(33.33\% + 36.36\%) / 2 = 34.85\%$, whereas pooled across episodes it is $(2 + 4) / (6 + 11) = 6/17 = 35.29\%$.
> - **Faulted M4 Selective Risk:** Seed 42 observed 3 errors / 7 accepted (42.86%), Seed 101 observed 3 errors / 8 accepted (37.50%). The unweighted seed mean is $(42.86\% + 37.50\%) / 2 = 40.18\%$, whereas pooled across episodes it is $(3 + 3) / (7 + 8) = 6/15 = 40.00\%$.
> - Both pooled episode-level rates (`errors/accepted = %`) and seed distributions (`mean ± std`) are explicitly reported side by side above to eliminate macro- vs micro-averaging ambiguity.
> - **Diagnostic Labeling Correction:** M3-Selective operates solely by confidence thresholding and possesses no sensor diagnostic checks; its Fault Diagnostic Precision is strictly `N/A (No Diagnostic)`. Abstention–Fault Co-occurrence is reported separately as an associative statistic.
> - **Coverage Disparity Note:** At default validation operating points targeting risk $\le 0.10$, observed test coverages differ substantially between M3-Selective and M4 (e.g. 42.31% vs 65.38% under clean, 30.77% vs 57.69% under faults). This comparison does NOT represent matched coverage. See Section 3 for the pre-registered matched-coverage benchmark.

## 3. Pre-Registered Target Coverage Protocol (Table 2: Matched-Coverage Benchmark)

To rigorously compare selective mechanisms, operating thresholds were tuned strictly on validation data to achieve pre-registered target coverages $\Phi^* \in \{0.30, 0.50, 0.70\}$, locked before evaluating the held-out test partition.

| Evaluation Condition | Target Coverage ($\Phi^*$) | Method Name | Locked Validation Thresholds | Achieved Test Coverage ($\Phi_{\text{test}}$) | Test Selective Risk ($\mathcal{R}(\Phi)$) | Feasibility & Diagnostic Gating Notes |
| :--- | :---: | :--- | :---: | :---: | :---: | :--- |
| **Clean Baseline** | 30% | M3-Selective (Confidence-Only) | $\tau=0.60, 0.60$ | Pooled: 8/26 (30.77%)<br/>Seed Mean: 30.77% | Pooled: 2/8 (25.00%)<br/>Seed Mean: 20.00% | Validation-tuned confidence thresholding. |
| **Clean Baseline** | 30% | **M4 Proposed Selective** | $\tau=0.90, 0.90, \delta=0.00, 0.00$ | **Pooled: 8/26 (30.77%)<br/>Seed Mean: 30.77%** | **Pooled: 2/8 (25.00%)<br/>Seed Mean: 20.00%** | Validated operating point locked prior to test. |
| **Clean Baseline** | 50% | M3-Selective (Confidence-Only) | $\tau=0.55, 0.50$ | Pooled: 12/26 (46.15%)<br/>Seed Mean: 46.15% | Pooled: 4/12 (33.33%)<br/>Seed Mean: 34.29% | Validation-tuned confidence thresholding. |
| **Clean Baseline** | 50% | **M4 Proposed Selective** | $\tau=0.80, 0.70, \delta=0.00, 0.00$ | **Pooled: 14/26 (53.85%)<br/>Seed Mean: 53.85%** | **Pooled: 4/14 (28.57%)<br/>Seed Mean: 29.17%** | Validated operating point locked prior to test. |
| **Clean Baseline** | 70% | M3-Selective (Confidence-Only) | $\tau=0.45, 0.45$ | Pooled: 20/26 (76.92%)<br/>Seed Mean: 76.92% | Pooled: 7/20 (35.00%)<br/>Seed Mean: 35.00% | Validation-tuned confidence thresholding. |
| **Clean Baseline** | 70% | **M4 Proposed Selective** | $\tau=0.70, 0.60, \delta=0.00, 0.00$ | **Pooled: 18/26 (69.23%)<br/>Seed Mean: 69.23%** | **Pooled: 6/18 (33.33%)<br/>Seed Mean: 33.33%** | Validated operating point locked prior to test. |
| **Sensor Faults (Stuck & Missing)** | 30% | M3-Selective (Confidence-Only) | $\tau=0.60, 0.60$ | Pooled: 8/26 (30.77%)<br/>Seed Mean: 30.77% | Pooled: 2/8 (25.00%)<br/>Seed Mean: 20.00% | Validation-tuned confidence thresholding. |
| **Sensor Faults (Stuck & Missing)** | 30% | **M4 Proposed Selective** | $\tau=0.90, 0.90, \delta=0.00, 0.00$ | **Pooled: 6/26 (23.08%)<br/>Seed Mean: 23.08%** | **Pooled: 2/6 (33.33%)<br/>Seed Mean: 25.00%** | Validated operating point locked prior to test. |
| **Sensor Faults (Stuck & Missing)** | 50% | M3-Selective (Confidence-Only) | $\tau=0.55, 0.50$ | Pooled: 10/26 (38.46%)<br/>Seed Mean: 38.46% | Pooled: 2/10 (20.00%)<br/>Seed Mean: 16.67% | Validation-tuned confidence thresholding. |
| **Sensor Faults (Stuck & Missing)** | 50% | **M4 Proposed Selective** | $\tau=0.80, 0.70, \delta=0.00, 0.00$ | **Pooled: 12/26 (46.15%)<br/>Seed Mean: 46.15%** | **Pooled: 5/12 (41.67%)<br/>Seed Mean: 41.43%** | Validated operating point locked prior to test. |
| **Sensor Faults (Stuck & Missing)** | 70% | M3-Selective (Confidence-Only) | $\tau=0.45, 0.45$ | Pooled: 15/26 (57.69%)<br/>Seed Mean: 57.69% | Pooled: 5/15 (33.33%)<br/>Seed Mean: 33.04% | Validation-tuned confidence thresholding. |
| **Sensor Faults (Stuck & Missing)** | 70% | **M4 Proposed Selective** | $\tau=0.70, 0.60, \delta=0.00, 0.00$ | **Pooled: 14/26 (53.85%)<br/>Seed Mean: 53.85%** | **Pooled: 6/14 (42.86%)<br/>Seed Mean: 43.75%** | **Diagnostic Gating Bound:** In faulted condition, frozen sensors on `sensor_002` trigger diagnostic vetoes on ~38.5% of episodes, bounding maximum achievable coverage at ~61.5%. Target coverage 70% is physically unachievable without disabling hardware diagnostics. |

## 4. Key Diagnostic & Methodological Findings

1. **Identical Eligible Telemetry:** All attribution methods (M1, M3, M3-Selective, M4) evaluated the identical set of held-out test episodes using exclusively telemetry observations available at decision time.
2. **Strict Validation Tuning Freeze:** All operating thresholds were selected on validation partitions and frozen prior to held-out test set evaluation. No thresholds were selected post-hoc after inspecting test outcomes.
3. **Physical Diagnostic Gating Limit:** M4's sensor diagnostics reject frozen sensors unconditionally (`SENSOR_FAULT_STUCK`). Under severe sensor faults, this imposes an upper bound on achievable coverage (~61.5%). Reporting this limitation is scientifically sound; forcing coverage matching at 70% would require disabling safety checks.
4. **Diagnostic Precision Decoupling:** M3-Selective has no sensor diagnostics, so its Fault Diagnostic Precision is strictly `N/A`. Fault–Abstention Co-occurrence is reported separately as an associative metric.
5. **Zero-Denominator Invariants:** When coverage was zero, selective risk remained `None` / `N/A` without zero-coercion.

## 5. Statistical Rationale, Precision Targets & Pilot Limitations

1. **Exploratory Pilot Scope:** This two-seed pilot (`seeds = [42, 101]`, 65 episodes/seed) is strictly exploratory. Its sole function is verifying software pipeline execution, numerical stability, metric denominator handling, and protocol correctness. It does NOT prove that M4 is superior.
2. **Paired Test Structure:** Clean and faulted evaluations derived from the same physical episode are paired across conditions. Competing models (M3 vs M4) evaluated on the same test episode are paired. Inferential testing must preserve this pairing via episode-level cluster bootstrap.
3. **Effective Sample Size Shrinkage for Selective Risk:** In selective classification, selective risk $\mathcal{R}(\Phi)$ is evaluated exclusively on accepted predictions ($N_{\text{accepted}} = \Phi \cdot N_{\text{test}}$). For $N_{\text{test}} = 520$ held-out episodes across 10 confirmatory seeds:
   - At $\Phi = 0.50$, $N_{\text{accepted}} = 260$ episodes, yielding normal approximation margin of error $\pm 5.8\%$ at risk $r \approx 0.35$.
   - At $\Phi = 0.30$, $N_{\text{accepted}} = 156$ episodes, yielding margin of error $\pm 7.5\%$.
   - Prior claims of detecting a 5-percentage-point difference with $\pm 3.1\%$ margin of error failed to account for this denominator shrinkage.
4. **Pragmatic Benchmark Design:** The confirmatory sample-size plan ($N_{\text{test}} = 520$ independent episodes across 10 fresh seeds) is explicitly acknowledged as a pragmatic computational benchmark design bounded by discrete ADE simulation runtime.