"""Evaluation Metrics for River Contamination Anomaly Detection and Selective Attribution.

Provides mathematically explicit, unit-tested metrics decoupled by evaluation task:
Task 1: Anomaly Detection Performance (Detection Rate, False Alarm Rate, Time to Detect).
Task 2: Source Attribution & Selective Classification Performance (Overall Accuracy,
        Macro-F1, Decision Coverage, Selective Risk, Selective Accuracy, Abstention
        Appropriateness Rate, Risk-Coverage Curve).

Strict Safeguards:
- Explicit denominators with safe handling for empty sets (0/0 never raises an exception).
- Abstentions (ABSTAIN) are NEVER counted as correct source attributions.
- Normal background episodes (s0_background) are preserved as a distinct evaluation class.
- Missed detections, false alarms, incorrect source labels, and abstentions enter their
  respective decoupled formulas as documented.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
from sklearn.metrics import f1_score


# ==============================================================================
# Task 1: Anomaly Detection Metrics
# ==============================================================================

def detection_rate(
    y_true_is_event: Sequence[bool],
    y_pred_is_event: Sequence[bool],
) -> float:
    """Calculates Detection Rate (Sensitivity / Recall) for contamination events.

    DR = (True Contamination Episodes Detected) / (Total Ground-Truth Contamination Episodes)

    Denominator: Count of episodes where y_true_is_event is True.
    If denominator is 0 (no true events in split), returns 0.0.
    """
    y_true = np.asarray(y_true_is_event, dtype=bool)
    y_pred = np.asarray(y_pred_is_event, dtype=bool)

    if len(y_true) != len(y_pred):
        raise ValueError(f"Length mismatch: {len(y_true)} vs {len(y_pred)}")

    n_pos = int(np.sum(y_true))
    if n_pos == 0:
        return 0.0

    tp = int(np.sum(y_true & y_pred))
    return float(tp / n_pos)


def false_alarm_rate(
    y_true_is_event: Sequence[bool],
    y_pred_is_event: Sequence[bool],
) -> float:
    """Calculates False Alarm Rate (Fall-out) during clean background river flow.

    FAR = (Alarms Triggered on Clean Background) / (Total Clean Background Episodes)

    Denominator: Count of episodes where y_true_is_event is False (clean flow).
    If denominator is 0 (no clean background episodes in split), returns 0.0.
    """
    y_true = np.asarray(y_true_is_event, dtype=bool)
    y_pred = np.asarray(y_pred_is_event, dtype=bool)

    if len(y_true) != len(y_pred):
        raise ValueError(f"Length mismatch: {len(y_true)} vs {len(y_pred)}")

    n_clean = int(np.sum(~y_true))
    if n_clean == 0:
        return 0.0

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

def decision_coverage(decisions: Sequence[str]) -> float:
    """Calculates Decision Coverage Phi (Fraction of accepted predictions).

    Phi = |{i : D_i == 'ATTRIBUTE'}| / N

    Denominator: Total evaluation episodes N.
    If N == 0, returns 0.0.
    """
    if len(decisions) == 0:
        return 0.0
    accepted = sum(1 for d in decisions if d == "ATTRIBUTE")
    return float(accepted / len(decisions))


def abstention_rate(decisions: Sequence[str]) -> float:
    """Calculates Abstention Rate (1 - Phi).

    Abstain_Rate = |{i : D_i == 'ABSTAIN'}| / N

    Denominator: Total evaluation episodes N.
    If N == 0, returns 0.0.
    """
    if len(decisions) == 0:
        return 0.0
    abstained = sum(1 for d in decisions if d == "ABSTAIN")
    return float(abstained / len(decisions))


def overall_accuracy(
    y_true: Sequence[str],
    y_pred_forced: Sequence[str],
) -> float:
    """Calculates forced-choice overall source attribution accuracy across all episodes.

    Acc_overall = (1 / N) * sum(I(y_pred_forced == y_true))

    Denominator: Total episodes N.
    If N == 0, returns 0.0.
    """
    if len(y_true) == 0:
        return 0.0
    if len(y_true) != len(y_pred_forced):
        raise ValueError("Length mismatch between y_true and y_pred_forced")

    correct = sum(1 for yt, yp in zip(y_true, y_pred_forced) if yt == yp)
    return float(correct / len(y_true))


def selective_risk(
    y_true: Sequence[str],
    y_pred_accepted: Sequence[Optional[str]],
    decisions: Sequence[str],
) -> float:
    """Calculates Selective Risk R(Phi): Error rate among ACCEPTED predictions.

    R(Phi) = |{i : D_i == 'ATTRIBUTE' and y_pred_i != y_true_i}| / |{i : D_i == 'ATTRIBUTE'}|

    Operational Meaning:
    The fraction of false accusations made by the system among decisions it accepted.

    Denominator: Number of accepted predictions (N_accepted).
    Zero-Denominator Handling:
    If N_accepted == 0 (system abstained on every episode), zero false accusations were
    committed, so returns 0.0.
    """
    n_total = len(decisions)
    if n_total == 0:
        return 0.0

    accepted_errors = 0
    n_accepted = 0

    for yt, yp, d in zip(y_true, y_pred_accepted, decisions):
        if d == "ATTRIBUTE":
            n_accepted += 1
            if yp != yt:
                accepted_errors += 1

    if n_accepted == 0:
        return 0.0

    return float(accepted_errors / n_accepted)


def selective_accuracy(
    y_true: Sequence[str],
    y_pred_accepted: Sequence[Optional[str]],
    decisions: Sequence[str],
) -> float:
    """Calculates Selective Accuracy (1 - R(Phi)) among accepted predictions.

    Acc(Phi) = |{i : D_i == 'ATTRIBUTE' and y_pred_i == y_true_i}| / |{i : D_i == 'ATTRIBUTE'}|

    Denominator: Number of accepted predictions.
    If N_accepted == 0, returns 0.0.
    """
    n_total = len(decisions)
    if n_total == 0:
        return 0.0

    accepted_correct = 0
    n_accepted = 0

    for yt, yp, d in zip(y_true, y_pred_accepted, decisions):
        if d == "ATTRIBUTE":
            n_accepted += 1
            if yp == yt:
                accepted_correct += 1

    if n_accepted == 0:
        return 0.0

    return float(accepted_correct / n_accepted)


def attribution_macro_f1(
    y_true: Sequence[str],
    y_pred_forced: Sequence[str],
    labels: Optional[Sequence[str]] = None,
) -> float:
    """Calculates macro-averaged F1 score across all candidate source classes.

    Denominator handles zero divisions safely via zero_division=0.0.
    """
    if len(y_true) == 0:
        return 0.0
    return float(
        f1_score(
            y_true,
            y_pred_forced,
            labels=labels,
            average="macro",
            zero_division=0.0,
        )
    )


def abstention_appropriateness_rate(
    decisions: Sequence[str],
    is_faulty_or_ambiguous: Sequence[bool],
) -> float:
    """Calculates Abstention Appropriateness Rate (AAR).

    AAR = |{i : D_i == 'ABSTAIN' and justified_i}| / |{i : D_i == 'ABSTAIN'}|

    Evaluates whether abstentions were justified by actual sensor faults
    or overlapping, unidentifiable plume signatures.

    Denominator: Total abstentions (N_abstained).
    If N_abstained == 0, returns 1.0 (no inappropriate abstentions occurred).
    """
    n_abstained = 0
    justified_count = 0

    for d, justified in zip(decisions, is_faulty_or_ambiguous):
        if d == "ABSTAIN":
            n_abstained += 1
            if justified:
                justified_count += 1

    if n_abstained == 0:
        return 1.0

    return float(justified_count / n_abstained)


def compute_risk_coverage_curve(
    confidences: Sequence[float],
    y_true: Sequence[str],
    y_pred_forced: Sequence[str],
    tau_grid: Optional[Sequence[float]] = None,
) -> Dict[str, np.ndarray]:
    """Sweeps confidence threshold tau_conf to construct the Risk-Coverage trade-off curve.

    Returns:
        Dict with keys:
        - "thresholds": 1D array of evaluated thresholds
        - "coverages": 1D array of coverage Phi(tau)
        - "selective_risks": 1D array of selective risk R(Phi(tau))
        - "selective_accuracies": 1D array of selective accuracy
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

        coverages.append(cov)
        risks.append(risk)
        accs.append(acc)

    return {
        "thresholds": np.asarray(tau_grid, dtype=np.float64),
        "coverages": np.asarray(coverages, dtype=np.float64),
        "selective_risks": np.asarray(risks, dtype=np.float64),
        "selective_accuracies": np.asarray(accs, dtype=np.float64),
    }
