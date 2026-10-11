"""Evaluation Metrics for River Contamination Anomaly Detection and Selective Attribution.

Provides mathematically explicit, unit-tested metrics decoupled by evaluation task:
Task 1: Anomaly Detection Performance (Detection Rate, False Alarm Rate, Time to Detect).
Task 2: Source Attribution & Selective Classification Performance (Overall Accuracy,
        Macro-F1, Decision Coverage, Selective Risk, Selective Accuracy, Abstention
        Appropriateness Rate, Risk-Coverage Curve).
Calibration Evaluation: Multiclass Brier Score, Multiclass Log Loss, Expected Calibration Error (ECE).

Correctness & Denominator Invariants (Phase 2.1 Audit):
- Undefined metrics due to zero denominators are strictly represented as `None` (or `np.nan`
  in numeric float arrays) rather than silently converted to 0.0 or 1.0:
  * Selective risk R(Phi) is `None` when zero predictions are accepted (N_accepted == 0).
  * Selective accuracy Acc(Phi) is `None` when zero predictions are accepted (N_accepted == 0).
  * Detection rate DR is `None` when evaluation set contains no positive events (N_pos == 0).
  * False alarm rate FAR is `None` when evaluation set contains no clean background events (N_clean == 0).
  * Abstention appropriateness AAR is `None` when no decisions are abstained (N_abstained == 0).
  * Overall accuracy and Macro-F1 are `None` when evaluation set is empty (N == 0).
- Abstentions (ABSTAIN) are NEVER counted as correct source attributions.
- Normal background episodes (s0_background) are preserved as a distinct evaluation class.
- Serialization and formatting utilities handle `None` explicitly without zero-coercion.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
from sklearn.metrics import f1_score


# ==============================================================================
# Serialization & Formatting Utility
# ==============================================================================

def format_metric(
    val: Optional[float],
    decimals: int = 4,
    na_repr: str = "N/A (undefined)",
) -> str:
    """Formats metric for human-readable tables, explicitly preserving undefined state."""
    if val is None or (isinstance(val, (float, np.floating)) and np.isnan(val)):
        return na_repr
    return f"{val:.{decimals}f}"


# ==============================================================================
# Task 1: Anomaly Detection Metrics
# ==============================================================================

def detection_rate(
    y_true_is_event: Sequence[bool],
    y_pred_is_event: Sequence[bool],
) -> Optional[float]:
    """Calculates Detection Rate (Sensitivity / Recall) for contamination events.

    DR = (True Contamination Episodes Detected) / (Total Ground-Truth Contamination Episodes)

    Denominator: Count of episodes where y_true_is_event is True.
    Undefined Case:
    If denominator is 0 (no positive contamination events in evaluation set), DR is undefined
    and returns None.
    """
    y_true = np.asarray(y_true_is_event, dtype=bool)
    y_pred = np.asarray(y_pred_is_event, dtype=bool)

    if len(y_true) != len(y_pred):
        raise ValueError(f"Length mismatch: {len(y_true)} vs {len(y_pred)}")

    n_pos = int(np.sum(y_true))
    if n_pos == 0:
        return None

    tp = int(np.sum(y_true & y_pred))
    return float(tp / n_pos)


def false_alarm_rate(
    y_true_is_event: Sequence[bool],
    y_pred_is_event: Sequence[bool],
) -> Optional[float]:
    """Calculates False Alarm Rate (Fall-out) during clean background river flow.

    FAR = (Alarms Triggered on Clean Background) / (Total Clean Background Episodes)

    Denominator: Count of episodes where y_true_is_event is False (clean flow).
    Undefined Case:
    If denominator is 0 (no clean background episodes in evaluation set), FAR is undefined
    and returns None.
    """
    y_true = np.asarray(y_true_is_event, dtype=bool)
    y_pred = np.asarray(y_pred_is_event, dtype=bool)

    if len(y_true) != len(y_pred):
        raise ValueError(f"Length mismatch: {len(y_true)} vs {len(y_pred)}")

    n_clean = int(np.sum(~y_true))
    if n_clean == 0:
        return None

    fp = int(np.sum((~y_true) & y_pred))
    return float(fp / n_clean)


def mean_time_to_detect_hours(
    detection_times_sec: Sequence[Optional[float]],
    event_start_times_sec: Sequence[float],
    detected_mask: Sequence[bool],
) -> Optional[float]:
    """Calculates mean elapsed hours from spill start to first downstream alarm.

    TTD = mean(detection_time_sec - start_time_sec) / 3600 for detected episodes.
    Returns None if no true episodes were detected.
    """
    elapsed: List[float] = []
    for d_time, s_time, det in zip(detection_times_sec, event_start_times_sec, detected_mask):
        if det and d_time is not None and d_time >= s_time:
            elapsed.append((d_time - s_time) / 3600.0)

    if not elapsed:
        return None
    return float(np.mean(elapsed))


# ==============================================================================
# Task 2: Source Attribution & Selective Classification Metrics
# ==============================================================================

def decision_coverage(decisions: Sequence[str]) -> Optional[float]:
    """Calculates Decision Coverage Phi (Fraction of accepted predictions).

    Phi = |{i : D_i == 'ATTRIBUTE'}| / N

    Denominator: Total evaluation episodes N.
    Undefined Case: If N == 0, returns None.
    """
    if len(decisions) == 0:
        return None
    accepted = sum(1 for d in decisions if d == "ATTRIBUTE")
    return float(accepted / len(decisions))


def abstention_rate(decisions: Sequence[str]) -> Optional[float]:
    """Calculates Abstention Rate (1 - Phi).

    Abstain_Rate = |{i : D_i == 'ABSTAIN'}| / N

    Denominator: Total evaluation episodes N.
    Undefined Case: If N == 0, returns None.
    """
    if len(decisions) == 0:
        return None
    abstained = sum(1 for d in decisions if d == "ABSTAIN")
    return float(abstained / len(decisions))


def overall_accuracy(
    y_true: Sequence[str],
    y_pred_forced: Sequence[str],
) -> Optional[float]:
    """Calculates forced-choice overall source attribution accuracy across all episodes.

    Acc_overall = (1 / N) * sum(I(y_pred_forced == y_true))

    Denominator: Total episodes N.
    Undefined Case: If N == 0, returns None.
    """
    if len(y_true) == 0:
        return None
    if len(y_true) != len(y_pred_forced):
        raise ValueError("Length mismatch between y_true and y_pred_forced")

    correct = sum(1 for yt, yp in zip(y_true, y_pred_forced) if yt == yp)
    return float(correct / len(y_true))


def selective_risk(
    y_true: Sequence[str],
    y_pred_accepted: Sequence[Optional[str]],
    decisions: Sequence[str],
) -> Optional[float]:
    """Calculates Selective Risk R(Phi): Error rate among ACCEPTED predictions.

    R(Phi) = |{i : D_i == 'ATTRIBUTE' and y_pred_i != y_true_i}| / |{i : D_i == 'ATTRIBUTE'}|

    Operational Meaning:
    The fraction of false accusations made by the system among decisions it accepted.

    Denominator: Number of accepted predictions (N_accepted).
    Undefined Case (Phase 2.1 Audit):
    If N_accepted == 0 (system abstained on every episode), selective risk is mathematically
    undefined and returns None. It must NOT be reported as 0.0.
    """
    n_total = len(decisions)
    if n_total == 0:
        return None

    accepted_errors = 0
    n_accepted = 0

    for yt, yp, d in zip(y_true, y_pred_accepted, decisions):
        if d == "ATTRIBUTE":
            n_accepted += 1
            if yp != yt:
                accepted_errors += 1

    if n_accepted == 0:
        return None

    return float(accepted_errors / n_accepted)


def selective_accuracy(
    y_true: Sequence[str],
    y_pred_accepted: Sequence[Optional[str]],
    decisions: Sequence[str],
) -> Optional[float]:
    """Calculates Selective Accuracy (1 - R(Phi)) among accepted predictions.

    Acc(Phi) = |{i : D_i == 'ATTRIBUTE' and y_pred_i == y_true_i}| / |{i : D_i == 'ATTRIBUTE'}|

    Denominator: Number of accepted predictions.
    Undefined Case:
    If N_accepted == 0, returns None.
    """
    n_total = len(decisions)
    if n_total == 0:
        return None

    accepted_correct = 0
    n_accepted = 0

    for yt, yp, d in zip(y_true, y_pred_accepted, decisions):
        if d == "ATTRIBUTE":
            n_accepted += 1
            if yp == yt:
                accepted_correct += 1

    if n_accepted == 0:
        return None

    return float(accepted_correct / n_accepted)


def attribution_macro_f1(
    y_true: Sequence[str],
    y_pred_forced: Sequence[str],
    labels: Optional[Sequence[str]] = None,
) -> Optional[float]:
    """Calculates macro-averaged F1 score across all candidate source classes.

    Undefined Case: If N == 0, returns None.
    """
    if len(y_true) == 0:
        return None
    return float(
        f1_score(
            y_true,
            y_pred_forced,
            labels=labels,
            average="macro",
            zero_division=0.0,
        )
    )


def abstention_fault_cooccurrence_rate(
    decisions: Sequence[str],
    has_injected_hardware_fault: Sequence[bool],
) -> Optional[float]:
    """Calculates empirical co-occurrence rate between abstention decisions and injected hardware faults.

    CoOccurRate = |{i : D_i == 'ABSTAIN' and has_fault_i}| / |{i : D_i == 'ABSTAIN'}|

    Scientific Audit Note:
    - This is an empirical association/co-occurrence rate and must NOT be interpreted as causal
      proof that a specific abstention was justified. A fault may occur on an uninformative upstream
      station without affecting downstream plumes, or an abstention may be triggered by low confidence.
    - If N_abstained == 0, returns None.
    """
    n_abstained = 0
    cooccur_count = 0

    for d, has_fault in zip(decisions, has_injected_hardware_fault):
        if d == "ABSTAIN":
            n_abstained += 1
            if has_fault:
                cooccur_count += 1

    if n_abstained == 0:
        return None

    return float(cooccur_count / n_abstained)


def selective_error_avoidance_rate(
    y_true: Sequence[str],
    y_pred_forced: Sequence[str],
    decisions: Sequence[str],
) -> Optional[float]:
    """Calculates Error Avoidance Rate (EAR) among abstained decisions.

    EAR = |{i : D_i == 'ABSTAIN' and y_forced_i != y_true_i}| / |{i : D_i == 'ABSTAIN'}|

    In selective classification theory (Geifman & El-Yaniv, 2017; Chow, 1970), an abstention
    is objectively error-avoiding if the forced-choice prediction on that episode was erroneous.
    Conversely, if the forced-choice model was already correct, abstaining sacrificed coverage
    without preventing an accusation error.

    Denominator: Total abstained episodes (N_abstained).
    Undefined Case: If N_abstained == 0, returns None.
    """
    n_abstained = 0
    avoided_errors = 0

    for yt, yf, d in zip(y_true, y_pred_forced, decisions):
        if d == "ABSTAIN":
            n_abstained += 1
            if yf != yt:
                avoided_errors += 1

    if n_abstained == 0:
        return None

    return float(avoided_errors / n_abstained)


def fault_diagnostic_precision(
    decisions: Sequence[str],
    abstain_causes: Sequence[Optional[str]],
    has_injected_hardware_fault: Sequence[bool],
) -> Optional[float]:
    """Calculates precision of hardware fault diagnostic vetoes.

    Precision = |{i : D_i == 'ABSTAIN' and cause is SENSOR_FAULT_* and has_fault_i}| /
                |{i : D_i == 'ABSTAIN' and cause is SENSOR_FAULT_*}|

    Evaluates whether decisions that specifically attributed their abstention to a sensor
    health diagnostic alarm were actually accompanied by an injected sensor fault.

    Denominator: Abstentions triggered specifically by SENSOR_FAULT_* cause codes.
    Undefined Case: If no decisions abstained due to sensor diagnostic alarms, returns None.
    """
    n_diagnostic_abstains = 0
    true_positive_alarms = 0

    for d, cause, has_fault in zip(decisions, abstain_causes, has_injected_hardware_fault):
        if d == "ABSTAIN" and cause is not None and cause.startswith("SENSOR_FAULT_"):
            n_diagnostic_abstains += 1
            if has_fault:
                true_positive_alarms += 1

    if n_diagnostic_abstains == 0:
        return None

    return float(true_positive_alarms / n_diagnostic_abstains)


# Legacy alias for backward compatibility with existing tests and scripts
abstention_appropriateness_rate = abstention_fault_cooccurrence_rate


def compute_risk_coverage_curve(
    confidences: Sequence[float],
    y_true: Sequence[str],
    y_pred_forced: Sequence[str],
    tau_grid: Optional[Sequence[float]] = None,
) -> Dict[str, np.ndarray]:
    """Sweeps confidence threshold tau_conf to construct the Risk-Coverage trade-off curve.

    When coverage is 0.0 (no predictions accepted), selective risk and selective accuracy
    are undefined and represented as np.nan in numeric arrays.

    Returns:
        Dict with keys:
        - "thresholds": 1D array of evaluated thresholds
        - "coverages": 1D array of coverage Phi(tau)
        - "selective_risks": 1D array of selective risk R(Phi(tau)) (np.nan when undefined)
        - "selective_accuracies": 1D array of selective accuracy (np.nan when undefined)
    """
    conf_arr = np.asarray(confidences, dtype=np.float64)
    y_t = list(y_true)
    y_p = list(y_pred_forced)
    n = len(conf_arr)

    if n == 0:
        return {
            "thresholds": np.array([]),
            "coverages": np.array([]),
            "selective_risks": np.array([]),
            "selective_accuracies": np.array([]),
        }

    if tau_grid is None:
        tau_grid = np.linspace(0.0, 0.99, 100)

    coverages: List[float] = []
    risks: List[float] = []
    accs: List[float] = []

    for tau in tau_grid:
        decisions = ["ATTRIBUTE" if c >= tau else "ABSTAIN" for c in conf_arr]
        preds = [p if d == "ATTRIBUTE" else None for p, d in zip(y_p, decisions)]

        cov = decision_coverage(decisions)
        risk = selective_risk(y_t, preds, decisions)
        acc = selective_accuracy(y_t, preds, decisions)

        coverages.append(cov if cov is not None else 0.0)
        risks.append(np.nan if risk is None else risk)
        accs.append(np.nan if acc is None else acc)

    return {
        "thresholds": np.asarray(tau_grid, dtype=np.float64),
        "coverages": np.asarray(coverages, dtype=np.float64),
        "selective_risks": np.asarray(risks, dtype=np.float64),
        "selective_accuracies": np.asarray(accs, dtype=np.float64),
    }


# ==============================================================================
# Calibration Evaluation Metrics (Phase 2.1 Audit)
# ==============================================================================

def multiclass_brier_score(
    y_true: Sequence[str],
    probabilities: np.ndarray,
    classes: Sequence[str],
) -> Optional[float]:
    """Calculates multiclass Brier score on probabilistic predictions.

    BS = (1 / N) * sum_{i=1}^N sum_{k=1}^K (P_{i, k} - Y_{i, k})^2

    where Y_{i, k} = 1 if y_true[i] == classes[k] else 0.
    Lower is better (0.0 is perfect prediction).
    Returns None if N == 0.
    """
    n = len(y_true)
    if n == 0:
        return None

    probs = np.asarray(probabilities, dtype=np.float64)
    if probs.ndim != 2 or probs.shape[0] != n or probs.shape[1] != len(classes):
        raise ValueError(f"Probabilities shape {probs.shape} does not match (N={n}, K={len(classes)})")

    class_to_idx = {str(c): i for i, c in enumerate(classes)}
    one_hot = np.zeros_like(probs)

    for i, label in enumerate(y_true):
        idx = class_to_idx.get(str(label))
        if idx is not None:
            one_hot[i, idx] = 1.0

    brier = float(np.mean(np.sum((probs - one_hot) ** 2, axis=1)))
    return brier


def multiclass_log_loss(
    y_true: Sequence[str],
    probabilities: np.ndarray,
    classes: Sequence[str],
    eps: float = 1e-15,
) -> Optional[float]:
    """Calculates multiclass cross-entropy log loss on probabilistic predictions.

    NLL = -(1 / N) * sum_{i=1}^N sum_{k=1}^K Y_{i, k} * log(max(P_{i, k}, eps))

    Returns None if N == 0.
    """
    n = len(y_true)
    if n == 0:
        return None

    probs = np.asarray(probabilities, dtype=np.float64)
    if probs.ndim != 2 or probs.shape[0] != n or probs.shape[1] != len(classes):
        raise ValueError(f"Probabilities shape {probs.shape} does not match (N={n}, K={len(classes)})")

    # Clip probabilities for numerical stability
    clipped_probs = np.clip(probs, eps, 1.0 - eps)
    # Re-normalize rows to ensure valid distribution
    clipped_probs = clipped_probs / np.sum(clipped_probs, axis=1, keepdims=True)

    class_to_idx = {str(c): i for i, c in enumerate(classes)}
    nll_sum = 0.0
    valid_count = 0

    for i, label in enumerate(y_true):
        idx = class_to_idx.get(str(label))
        if idx is not None:
            nll_sum -= float(np.log(clipped_probs[i, idx]))
            valid_count += 1

    if valid_count == 0:
        return None

    return float(nll_sum / valid_count)


def expected_calibration_error(
    confidences: Sequence[float],
    accuracies: Sequence[bool],
    n_bins: int = 10,
) -> Optional[float]:
    """Calculates Expected Calibration Error (ECE) for confidence predictions.

    Formulation:
    Given top-candidate confidence c_i in [0, 1] and top-candidate correctness a_i in {0, 1}.
    Divides [0, 1] into M equal-width bins B_m = ((m-1)/M, m/M].
    For each bin:
      acc(B_m) = (1 / |B_m|) * sum_{i in B_m} a_i
      conf(B_m) = (1 / |B_m|) * sum_{i in B_m} c_i
      weight = |B_m| / N

    ECE = sum_{m=1}^M (|B_m| / N) * |acc(B_m) - conf(B_m)|

    Empty Bin Handling:
    If a bin B_m contains 0 samples (|B_m| == 0), its weight |B_m| / N is 0.0,
    so its calibration error contribution is strictly 0.0.
    Empty bins do not produce division-by-zero or NaN artifacts.

    Undefined Case:
    Returns None if N == 0.
    """
    n = len(confidences)
    if n == 0:
        return None

    confs = np.asarray(confidences, dtype=np.float64)
    accs = np.asarray(accuracies, dtype=bool)

    if len(confs) != len(accs):
        raise ValueError(f"Length mismatch: {len(confs)} vs {len(accs)}")

    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0

    for i in range(n_bins):
        low = bin_edges[i]
        high = bin_edges[i + 1]

        if i == 0:
            in_bin = (confs >= low) & (confs <= high)
        else:
            in_bin = (confs > low) & (confs <= high)

        bin_count = int(np.sum(in_bin))
        if bin_count == 0:
            # Documented rule: empty bin weight is 0.0, contributes 0 to ECE
            continue

        bin_acc = float(np.mean(accs[in_bin]))
        bin_conf = float(np.mean(confs[in_bin]))
        weight = float(bin_count / n)
        ece += weight * abs(bin_acc - bin_conf)

    return float(ece)
