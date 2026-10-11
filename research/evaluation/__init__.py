"""Research evaluation metrics and benchmarks."""

from .attribution_metrics import (
    abstention_appropriateness_rate,
    abstention_rate,
    attribution_macro_f1,
    compute_risk_coverage_curve,
    decision_coverage,
    detection_rate,
    false_alarm_rate,
    mean_time_to_detect_hours,
    overall_accuracy,
    selective_accuracy,
    selective_risk,
)

__all__ = [
    "detection_rate",
    "false_alarm_rate",
    "mean_time_to_detect_hours",
    "decision_coverage",
    "abstention_rate",
    "overall_accuracy",
    "selective_risk",
    "selective_accuracy",
    "attribution_macro_f1",
    "abstention_appropriateness_rate",
    "compute_risk_coverage_curve",
]
