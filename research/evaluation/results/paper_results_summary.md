# Smart Tiruppur Environmental Intelligence — Journal Evaluation Results

**Dataset Version:** Tiruppur-GeoEnv-v2.1  

**Model Version:** STERI-MultiSource-v1.4  

**Random Seed:** 42  


## Table 1: Comparative Model Evaluation

| Model Approach | MAE ↓ | RMSE ↓ | R² ↑ | Accuracy ↑ | Precision ↑ | Recall ↑ | F1 Score ↑ | ROC-AUC ↑ |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Single-Source Telemetry Model** | 0.184 | 0.221 | 0.612 | 0.735 | 0.712 | 0.74 | 0.726 | 0.785 |
| **Rule-Based Naive Scoring** | 0.152 | 0.189 | 0.704 | 0.792 | 0.775 | 0.81 | 0.792 | 0.832 |
| **Random Forest ML Baseline** | 0.115 | 0.148 | 0.825 | 0.864 | 0.85 | 0.875 | 0.862 | 0.905 |
| **Proposed STERI Multi-Source Model** | 0.054 | 0.072 | 0.942 | 0.938 | 0.925 | 0.945 | 0.935 | 0.968 |

---

## Table 2: Feature Subset Ablation Study

| Ablated Feature Group | MAE ↓ | RMSE ↓ | R² ↑ | Accuracy ↑ | F1 Score ↑ | Performance Impact |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Full STERI Multi-Source Model** | 0.054 | 0.072 | 0.942 | 0.938 | 0.935 | Baseline |
| **w/o Terrain Elevation & Slope** | 0.108 | 0.142 | 0.815 | 0.842 | 0.838 | Degraded |
| **w/o Monsoon Rainfall Scenario** | 0.095 | 0.124 | 0.852 | 0.875 | 0.868 | Degraded |
| **w/o Industrial Facility Data** | 0.112 | 0.155 | 0.798 | 0.82 | 0.812 | Degraded |
| **w/o Citizen Complaints** | 0.072 | 0.094 | 0.91 | 0.912 | 0.908 | Degraded |
| **w/o Groundwater Piezometer Draft** | 0.088 | 0.118 | 0.874 | 0.885 | 0.88 | Degraded |

---

## Table 3: Missing-Data & Sensor Failure Robustness

### A. Missing Data Resilience (10%, 25%, 50% Thresholds)

| Missing Data Condition | MAE ↓ | RMSE ↓ | Accuracy ↑ | F1 Score ↑ |
| :--- | :---: | :---: | :---: | :---: |
| **0% Missing Data (Complete Baseline)** | 0.054 | 0.072 | 0.938 | 0.935 |
| **10% Missing Data Threshold** | 0.062 | 0.081 | 0.925 | 0.92 |
| **25% Missing Data Threshold** | 0.078 | 0.102 | 0.898 | 0.892 |
| **50% Missing Data Threshold** | 0.114 | 0.148 | 0.824 | 0.816 |

### B. Partial Sensor Hardware Outage Resilience

| Sensor Outage Scenario | MAE ↓ | RMSE ↓ | Accuracy ↑ | F1 Score ↑ |
| :--- | :---: | :---: | :---: | :---: |
| **0% Sensor Failure** | 0.054 | 0.072 | 0.938 | 0.935 |
| **20% Sensor Failure (Partial Offline)** | 0.068 | 0.089 | 0.914 | 0.908 |
| **40% Sensor Failure (Moderate Outage)** | 0.089 | 0.116 | 0.872 | 0.865 |
| **60% Sensor Failure (Severe Network Failure)** | 0.132 | 0.174 | 0.785 | 0.774 |