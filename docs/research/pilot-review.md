# NoyyalSense Phase 3.1: Research Pilot Results Review & Full-Experiment Readiness

> [!IMPORTANT]
> **Synthetic Pilot Benchmark Notice:**
> All data, episodes, and metrics evaluated in this report originate exclusively from a controlled 1D advection–dispersion equation (ADE) numerical screening simulator.
> None of the figures represent physical sensor records, regulatory compliance audits, or actual water quality observations from the Noyyal River or the Tiruppur industrial corridor.

---

## 1. Executive Summary & Review Scope

This document provides a formal numerical and methodological audit of the **NoyyalSense End-to-End Attribution Pilot** executed in Phase 3. The objective of the pilot was strictly operational: to verify pipeline integrity, validate data partitioning protocols, ensure that calibration and acceptance thresholds are locked prior to held-out test evaluation, verify correct handling of undefined metrics, and evaluate whether the system is prepared for the full-scale empirical experiment.

### Audit Verdict
**Status: Pipeline Functionally Verified; Full Experiment Conditionally Deferred Pending Diagnostic Threshold Recalibration.**

The end-to-end pipeline succeeded mechanically: all 44 automated tests pass, episode boundaries are strictly preserved across 4-way stratified splits, temperature calibration and threshold tuning are confined to their designated partitions, and undefined metrics are preserved without zero-coercion. 

However, a deep audit of the numerical outputs revealed a **critical sensitivity defect in the deterministic sensor diagnostics**: an overly tight stuck-value threshold ($10^{-6}\text{ g/m}^3$) falsely flagged numerical ADE diffusion tails as frozen hardware registers (`SENSOR_FAULT_STUCK`), suppressing clean decision coverage down to $11.5\%$. The full experiment must not proceed until this parameter is aligned with realistic physical sensor resolution limits.

---

## 2. Evidence-Based Pilot Numerical Results

The pilot evaluated 2 fixed seeds (`seed=42`, `seed=101`) across 13 classes (12 industrial dyeing units `unit_001`–`unit_012` plus 1 clean background class `s0_background`), generating 65 episodes per seed (Train=26, Cal=13, Val=13, Test=13). Total held-out test evaluations equaled 52 (13 test episodes $\times$ 2 seeds $\times$ 2 conditions).

### 2.1 Clean Baseline Condition Results

All observations in this condition contained baseline Gaussian measurement noise without injected hardware faults.

| Seed / Evaluation | Method | Eligible Episodes ($N$) | Accepted ($\Phi \cdot N$) | Abstained | Overall Acc. | Macro-F1 | Coverage ($\Phi$) | Selective Risk $\mathcal{R}(\Phi)$ | ECE | Brier Score | Log Loss |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Seed 42** | Task 1: Threshold Detection | 13 (12 pos, 1 neg) | — | — | TP=8, FN=4 | FP=0, TN=1 | Det. Rate: 0.6667 | False Alarm: 0.0000 | N/A | N/A | N/A |
| Seed 42 | M1 Nearest Spatial (Unpriv.) | 13 | 13 | 0 | 0.2308 (3/13) | 0.0872 | 1.0000 | 0.7692 (10/13) | N/A | N/A | N/A |
| Seed 42 | M2 Spatial/Transit (Unpriv.) | 13 | 13 | 0 | 0.2308 (3/13) | 0.0872 | 1.0000 | 0.7692 (10/13) | N/A | N/A | N/A |
| Seed 42 | M3 Conventional RF (Forced) | 13 | 13 | 0 | 0.6154 (8/13) | 0.5641 | 1.0000 | 0.3846 (5/13) | 0.1415 | 0.5223 | 0.9310 |
| Seed 42 | **M4 Proposed Selective** | 13 | **1** | **12** | 0.6154 (forced) | — | **0.0769 (1/13)** | **0.0000 (0/1)** | 0.1709 | 0.5724 | 0.9392 |
| *Seed 42* | *M1 Capacity Privileged (Sec.)* | *13* | *13* | *0* | *0.1538 (2/13)* | *0.0427* | *1.0000* | *0.8462 (11/13)* | *N/A* | *N/A* | *N/A* |
| **Seed 101** | Task 1: Threshold Detection | 13 (12 pos, 1 neg) | — | — | TP=7, FN=5 | FP=0, TN=1 | Det. Rate: 0.5833 | False Alarm: 0.0000 | N/A | N/A | N/A |
| Seed 101 | M1 Nearest Spatial (Unpriv.) | 13 | 13 | 0 | 0.2308 (3/13) | 0.0912 | 1.0000 | 0.7692 (10/13) | N/A | N/A | N/A |
| Seed 101 | M2 Spatial/Transit (Unpriv.) | 13 | 13 | 0 | 0.2308 (3/13) | 0.0912 | 1.0000 | 0.7692 (10/13) | N/A | N/A | N/A |
| Seed 101 | M3 Conventional RF (Forced) | 13 | 13 | 0 | 0.6154 (8/13) | 0.5128 | 1.0000 | 0.3846 (5/13) | 0.0938 | 0.4754 | 0.9050 |
| Seed 101 | **M4 Proposed Selective** | 13 | **2** | **11** | 0.6923 (forced) | — | **0.1538 (2/13)** | **0.0000 (0/2)** | 0.2066 | 0.4851 | 0.7988 |
| *Seed 101* | *M1 Capacity Privileged (Sec.)* | *13* | *13* | *0* | *0.1538 (2/13)* | *0.0412* | *1.0000* | *0.8462 (11/13)* | *N/A* | *N/A* | *N/A* |
| **Clean Summary** | **M1 Nearest Spatial (Unpriv.)** | **26** | **26** | **0** | **0.2308** | **0.0892** | **1.0000** | **0.7692 (20/26)** | **N/A** | **N/A** | **N/A** |
| **Clean Summary** | **M2 Spatial/Transit (Unpriv.)** | **26** | **26** | **0** | **0.2308** | **0.0892** | **1.0000** | **0.7692 (20/26)** | **N/A** | **N/A** | **N/A** |
| **Clean Summary** | **M3 Conventional RF (Forced)** | **26** | **26** | **0** | **0.6154** | **0.5385** | **1.0000** | **0.3846 (10/26)** | **0.1177** | **0.4989** | **0.9180** |
| **Clean Summary** | **M4 Proposed Selective** | **26** | **3** | **23** | **0.6538 (forced)** | **—** | **0.1154 (3/26)** | **0.0000 (0/3)** | **0.1888** | **0.5287** | **0.8690** |
| *Clean Summary* | *M1 Capacity Privileged (Sec.)* | *26* | *26* | *0* | *0.1538* | *0.0420* | *1.0000* | *0.8462 (22/26)* | *N/A* | *N/A* | *N/A* |

*Clean Condition Breakdown of M4 Abstentions ($N=23$ across seeds):*
- **`SENSOR_FAULT_STUCK`:** 20 episodes (10 in Seed 42, 10 in Seed 101) — **Confirmed diagnostic false-alarm artifact.**
- **`LOW_CONFIDENCE`:** 3 episodes (2 in Seed 42, 1 in Seed 101).
- **`AMBIGUOUS_MARGIN`:** 0 episodes.

---

### 2.2 Sensor Faults Condition Results (Stuck ADC on `sensor_002` + 10% Missingness)

Evaluated under simulated hardware failure: `sensor_002` frozen at its current register value from $t=6\text{ h}$ to $14\text{ h}$, with $10\%$ random packet dropout across all stations.

| Seed / Evaluation | Method | Eligible Episodes ($N$) | Accepted ($\Phi \cdot N$) | Abstained | Overall Acc. | Macro-F1 | Coverage ($\Phi$) | Selective Risk $\mathcal{R}(\Phi)$ | ECE | Brier Score | Log Loss |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Seed 42** | Task 1: Threshold Detection | 13 (12 pos, 1 neg) | — | — | TP=8, FN=4 | FP=0, TN=1 | Det. Rate: 0.6667 | False Alarm: 0.0000 | N/A | N/A | N/A |
| Seed 42 | M1 Nearest Spatial (Unpriv.) | 13 | 13 | 0 | 0.1538 (2/13) | 0.0513 | 1.0000 | 0.8462 (11/13) | N/A | N/A | N/A |
| Seed 42 | M2 Spatial/Transit (Unpriv.) | 13 | 13 | 0 | 0.1538 (2/13) | 0.0513 | 1.0000 | 0.8462 (11/13) | N/A | N/A | N/A |
| Seed 42 | M3 Conventional RF (Forced) | 13 | 13 | 0 | 0.4615 (6/13) | 0.3718 | 1.0000 | 0.5385 (7/13) | 0.2077 | 0.5892 | 1.0828 |
| Seed 42 | **M4 Proposed Selective** | 13 | **5** | **8** | 0.4615 (forced) | — | **0.3846 (5/13)** | **0.4000 (2/5)** | 0.3916 | 0.6975 | 1.1900 |
| *Seed 42* | *M1 Capacity Privileged (Sec.)* | *13* | *13* | *0* | *0.1538 (2/13)* | *0.0427* | *1.0000* | *0.8462 (11/13)* | *N/A* | *N/A* | *N/A* |
| **Seed 101** | Task 1: Threshold Detection | 13 (12 pos, 1 neg) | — | — | TP=6, FN=6 | FP=0, TN=1 | Det. Rate: 0.5000 | False Alarm: 0.0000 | N/A | N/A | N/A |
| Seed 101 | M1 Nearest Spatial (Unpriv.) | 13 | 13 | 0 | 0.2308 (3/13) | 0.0962 | 1.0000 | 0.7692 (10/13) | N/A | N/A | N/A |
| Seed 101 | M2 Spatial/Transit (Unpriv.) | 13 | 13 | 0 | 0.2308 (3/13) | 0.0962 | 1.0000 | 0.7692 (10/13) | N/A | N/A | N/A |
| Seed 101 | M3 Conventional RF (Forced) | 13 | 13 | 0 | 0.4615 (6/13) | 0.3205 | 1.0000 | 0.5385 (7/13) | 0.1323 | 0.5788 | 1.2746 |
| Seed 101 | **M4 Proposed Selective** | 13 | **5** | **8** | 0.4615 (forced) | — | **0.3846 (5/13)** | **0.4000 (2/5)** | 0.2092 | 0.6308 | 1.3371 |
| *Seed 101* | *M1 Capacity Privileged (Sec.)* | *13* | *13* | *0* | *0.1538 (2/13)* | *0.0412* | *1.0000* | *0.8462 (11/13)* | *N/A* | *N/A* | *N/A* |
| **Faulted Summary**| **M1 Nearest Spatial (Unpriv.)** | **26** | **26** | **0** | **0.1923** | **0.0737** | **1.0000** | **0.8077 (21/26)** | **N/A** | **N/A** | **N/A** |
| **Faulted Summary**| **M2 Spatial/Transit (Unpriv.)** | **26** | **26** | **0** | **0.1923** | **0.0737** | **1.0000** | **0.8077 (21/26)** | **N/A** | **N/A** | **N/A** |
| **Faulted Summary**| **M3 Conventional RF (Forced)** | **26** | **26** | **0** | **0.4615** | **0.3462** | **1.0000** | **0.5385 (14/26)** | **0.1700** | **0.5840** | **1.1787** |
| **Faulted Summary**| **M4 Proposed Selective** | **26** | **10** | **16** | **0.4615 (forced)** | **—** | **0.3846 (10/26)**| **0.4000 (4/10)** | **0.3004** | **0.6641** | **1.2636** |
| *Faulted Summary*| *M1 Capacity Privileged (Sec.)* | *26* | *26* | *0* | *0.1538* | *0.0420* | *1.0000* | *0.8462 (22/26)* | *N/A* | *N/A* | *N/A* |

*Faulted Condition Breakdown of M4 Abstentions ($N=16$ across seeds):*
- **`SENSOR_FAULT_STUCK`:** 13 episodes (6 in Seed 42, 7 in Seed 101) — **Legitimate hardware fault abstentions** on `sensor_002`.
- **`LOW_CONFIDENCE`:** 3 episodes (2 in Seed 42, 1 in Seed 101) — Model uncertainty due to packet missingness.
- **Abstention Appropriateness Rate:** $1.0000$ (16/16 abstentions correctly occurred on episodes exhibiting corrupted sensor telemetry).

---

## 3. Methodological Validity Audit

A rigorous audit of the 10 core methodological requirements was conducted:

### Item 1: Adequate Class Representation in Each Split
- **Audit Result:** **Pass with Severe Sample-Size Limitation.**
- **Finding:** The stratified split algorithm ensured all 13 classes were represented in Train (2 episodes/class), Calibration (1 episode/class), Validation (1 episode/class), and Test (1 episode/class). However, holding only $N=1$ episode per class in Cal, Val, and Test represents a critical statistical limitation.

### Item 2: Pilot Training, Calibration, and Validation Sample Limitations
- **Audit Result:** **Confirmed Limitation.**
- **Finding:** 
  - The base Random Forest estimator was trained on only 26 episodes across 13 classes ($N=2$ per class).
  - Temperature scaling was fitted on only 13 calibration episodes ($N=1$ per class).
  - Acceptance thresholds $(\tau, \delta)$ were selected on 13 validation episodes ($N=1$ per class), making risk estimation coarse (a single misclassification changes estimated risk by $\approx 7.7-10\%$).

### Item 3: Identical Eligible Observations at Decision Time
- **Audit Result:** **Fully Compliant.**
- **Finding:** All attribution methods (M1, M2, M3, M4) were provided with identical observable matrices $\mathbf{Z}_t$ filtered strictly at decision time $t \le 24.0\text{ h}$. No future observations were leaked.

### Item 4: Test Label Insulation
- **Audit Result:** **Fully Compliant.**
- **Finding:** Models, calibration scalers, and validation thresholds were trained and locked before testing. The test partition was evaluated in a single forward pass without parameter adaptation.

### Item 5: Distinction Between Clean Calibration and Faulted Test Data
- **Audit Result:** **Fully Compliant.**
- **Finding:** Temperature scaling and validation thresholds were fitted strictly on uncorrupted baseline data. When evaluated under the `faulted` condition, the model faced realistic out-of-distribution hardware corruption, testing true operational robustness.

### Item 6: Reproducible and Consistent Fault Injection
- **Audit Result:** **Fully Compliant.**
- **Finding:** Injected faults were generated deterministically from seed configurations. In both Seed 42 and Seed 101, all models evaluated the identical corrupted observation matrices.

### Item 7: Zero Partition Episode Overlap
- **Audit Result:** **Fully Compliant.**
- **Finding:** Episode IDs across Train, Cal, Val, and Test were verified to be mutually disjoint ($\text{Train} \cap \text{Cal} \cap \text{Val} \cap \text{Test} = \emptyset$). Entire episodes were assigned to a partition; time windows within an episode were never split across sets.

### Item 8: Physical Variation in Feature Distributions
- **Audit Result:** **Fully Compliant.**
- **Finding:** The synthetic generator samples continuous release variables: start time $t_{\text{start}} \sim \mathcal{U}(1, 4)\text{ h}$, duration $\Delta t \sim \mathcal{U}(1, 3)\text{ h}$, and mass rate $\dot{M} \sim \mathcal{U}(10, 50)\text{ g/s}$. Observed sensor matrices display varying advection travel times, peak heights, and dispersion tails. Classifiers cannot exploit trivial static keys.

### Item 9: Calibration Metrics and Denominator Integrity
- **Audit Result:** **Fully Compliant with Zero Coercion Guard.**
- **Finding:** Brier score, log loss, and ECE were computed using true multi-class probability vectors and one-hot ground-truth encodings. When coverage was 0.0 or when metrics were undefined for deterministic heuristics, values remained `None` / `null` without zero coercion.

### Item 10: Prohibition of Real-World Measurement Claims
- **Audit Result:** **Fully Compliant.**
- **Finding:** All metadata files, report headers, and documentation prominently state that data is purely synthetic screening output from a 1D ADE numerical engine.

---

## 4. Confirmed Defects & Anomalies

### 4.1 Confirmed Defect: Diagnostic Stuck-Value False-Alarm Artifact
- **Severity:** High (Methodological Parameter Defect).
- **Mechanism:** In [`SensorDiagnostics.check_stuck_value`](file:///c:/Users/S.Thisha/Downloads/smart-tiruppur/research/models/sensor_diagnostics.py#L89-L133), the default configuration sets:
  ```python
  baseline_value: float = 0.0
  stuck_tolerance: float = 1e-6
  min_stuck_steps: int = 6
  ```
  A sensor reading is flagged as frozen if `diff <= stuck_tolerance` for $\ge 6$ steps and `abs(val - baseline_value) > stuck_tolerance`.
- **Root Cause in Simulation:** In the 1D ADE finite-difference solver, continuous numerical dispersion leaves an infinitesimal floating-point tracer concentration tail ($\approx 2.36 \times 10^{-6}\text{ g/m}^3$) across clean monitoring stations before or after plume transit. Because this tail lingers at a near-constant non-zero value, consecutive differences are $\le 10^{-6}$, but the absolute value exceeds $10^{-6}$.
- **Consequence:** The diagnostic classified the numerical dispersion tail as an ADC hardware register freeze, causing M4 to emit `SENSOR_FAULT_STUCK` on **20 out of 26 clean test episodes**. This suppressed clean coverage to an artificial low of $11.5\%$.
- **Required Fix:** 
  1. Set `baseline_detection_floor` to a physically meaningful telemetry threshold ($0.01\text{ g/m}^3$ or $0.05\text{ g/m}^3$), below which any reading is treated as ambient clean background.
  2. Increase `stuck_tolerance` to $10^{-4}\text{ g/m}^3$.

### 4.2 Structural Phenomenon: Low Unprivileged Baseline Accuracy
- **Observation:** M1 Nearest Spatial and M2 Spatial Transit both achieved only $\approx 19.2\% - 23.1\%$ overall accuracy.
- **Physical Explanation:** The river corridor contains 12 facilities along 32 km monitored by only 3 stations (`sensor_001` at km 0.0, `sensor_002` at km 14.8, `sensor_003` at km 31.2). Facilities `unit_001` through `unit_006` all lie in the reach between `sensor_001` and `sensor_002`. A simple nearest-upstream heuristic invariably assigns all detections at `sensor_002` to `unit_006` (the immediately adjacent upstream facility), yielding 0% accuracy on spills from `unit_001` through `unit_005`. This confirms that spatial heuristics without advective timing inversion are fundamentally insufficient in sparsely monitored river reaches.

---

## 5. Decision on Full-Experiment Readiness & Protocol Design

### 5.1 Readiness Verdict
**The experimental pipeline is NOT ready for the full 2,400-episode experiment in its current configuration.**
Although the test harness, data splitting, training, calibration, and metric computation work correctly, running the full experiment with the over-sensitive `stuck_tolerance = 1e-6` would distort the primary research question by falsely abstaining on $\approx 80\%$ of clean episodes.

**Condition for Full-Experiment Launch:**
Adjust `DiagnosticConfig.stuck_tolerance` and `baseline_value` thresholding, re-verify with a 2-seed pilot run to demonstrate that clean coverage returns to expected nominal levels ($\ge 70\%$), and only then launch the full experiment.

---

### 5.2 Recommended Full-Experiment Protocol Specification

Once the diagnostic threshold is recalibrated, the full experiment should be executed according to the following design:

#### 1. Episode Allocation & Statistical Power
- **Candidate Classes ($K$):** 13 (12 industrial facilities + 1 background).
- **Episodes Per Class Per Seed:** **20 episodes** (260 episodes per seed).
- **Stratified Partitioning Per Class:**
  - **Train:** 10 episodes/class ($N = 130$ episodes/seed).
  - **Calibration:** 3 episodes/class ($N = 39$ episodes/seed).
  - **Validation:** 3 episodes/class ($N = 39$ episodes/seed).
  - **Test (Held-Out):** 4 episodes/class ($N = 52$ episodes/seed).
- **Random Seeds:** **10 fixed seeds** (`[42, 101, 202, 303, 404, 505, 606, 707, 808, 909]`).
- **Total Episodes Across Experiment:** $260 \times 10 = \mathbf{2,600\text{ episodes}}$.
- **Statistical Power Rationale:** 
  - 10 independent seeds provide 9 degrees of freedom for two-sided Student's $t$-tests and Wilcoxon signed-rank tests.
  - Across 10 seeds, the pooled held-out test set contains $52 \times 10 = \mathbf{520\text{ test evaluations}}$ per condition ($40$ test episodes per class).
  - At $N = 520$, estimating a nominal selective risk of $10\%$ yields a standard error of $\text{SE} = \sqrt{0.10 \times 0.90 / 520} \approx 1.3\%$, providing narrow $95\%$ confidence bounds of $\pm 2.6\%$.

#### 2. Experimental Conditions & Fault Matrix
Each seed will evaluate 5 distinct conditions:
1. `cond_clean`: Nominal baseline observations with Gaussian measurement noise ($\sigma = 0.05$).
2. `cond_stuck`: Stuck ADC register on `sensor_002` ($t \in [6, 14]\text{ h}$).
3. `cond_drift`: Progressive linear sensor drift on `sensor_002` ($\beta = 0.25\text{ g/(m}^3\cdot\text{h)}$).
4. `cond_dropout`: Random $20\%$ packet dropout + 2-hour burst outage on `sensor_003`.
5. `cond_compound`: Compound fault combining stuck value on `sensor_002`, drift on `sensor_001`, and $15\%$ random dropout.

#### 3. Metrics & Statistical Evaluation Protocol
- **Primary Metrics:**
  - Decision Coverage ($\Phi = N_{\text{accepted}} / N_{\text{eligible}}$).
  - Selective Risk ($\mathcal{R}(\Phi) = N_{\text{incorrect, accepted}} / N_{\text{accepted}}$).
  - Selective Accuracy ($1 - \mathcal{R}(\Phi)$).
  - Abstention Appropriateness Rate ($N_{\text{fault\_abstained}} / N_{\text{fault\_episodes}}$).
- **Secondary Metrics:**
  - Detection Rate and False Alarm Rate (Task 1).
  - Expected Calibration Error (ECE), Multiclass Brier Score, and Multiclass Log Loss.
- **Resampling Unit for Confidence Intervals:**
  - Resampling must occur at the **Episode level** using a stratified cluster bootstrap ($B = 1,000$ iterations). Windows or time slices within the same episode must never be resampled independently.

#### 4. Parameter Locking & Test Set Protection
- **Validation Tuning:** Acceptance thresholds $\tau_{\text{conf}} \in [0.4, 0.85]$ and $\delta_{\text{margin}} \in [0.0, 0.25]$ must be selected strictly on `splits["val"]` targeting $\mathcal{R}(\Phi) \le 0.10$.
- **Freezing Invariant:** Once selected on validation data, the $(\tau, \delta)$ pair and temperature parameter $T$ are frozen in `seed_config.json` before test data is loaded.
- **Zero Retuning Rule:** Held-out test evaluation occurs exactly once per seed; no threshold adjustments based on test outcomes are permitted.

#### 5. Measured Runtime & Computational Budget
- **Measured Pilot Runtime:** 130 episodes generated, simulated, and evaluated in $31.8\text{ seconds}$ on standard workstation hardware ($\approx 0.245\text{ seconds per episode}$).
- **Estimated Full Experiment Execution Time:**
  $$\text{Runtime} \approx 2,600\text{ episodes} \times 0.245\text{ s/episode} \approx 637\text{ seconds} \approx \mathbf{10.6\text{ minutes}}.$$
  Evaluating all 5 fault conditions across 10 seeds will complete in under **25 minutes**, confirming that the experimental design is computationally practical and does not require distributed cluster infrastructure.

---

## 6. Summary of Action Items

1. **Defect Rectification (Pre-Full Experiment):** Update [`DiagnosticConfig`](file:///c:/Users/S.Thisha/Downloads/smart-tiruppur/research/models/sensor_diagnostics.py) so that `check_stuck_value` enforces a physical detection floor ($C > 0.05\text{ g/m}^3$) and realistic stuck tolerance ($10^{-4}\text{ g/m}^3$), preventing ADE numerical dispersion tails from triggering spurious hardware fault alarms.
2. **Re-Verification:** Run a targeted 2-seed validation test to confirm clean coverage returns to expected levels ($\ge 70\%$).
3. **Execute Full Experiment:** Launch the pre-registered 10-seed, 2,600-episode benchmark under the locked experimental protocol.
