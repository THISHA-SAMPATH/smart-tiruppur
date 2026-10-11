"""Proposed Selective Source Attributor with Calibrated Confidence and Fault-Gated Abstention (M4).

Implements the uncertainty-aware selective attribution architecture:
1. Probabilistic Classifier fitted on training split only.
2. Temperature-scaled Probability Calibration fitted strictly on the dedicated calibration split.
3. Acceptance Threshold Selection (tau_conf, delta_margin) tuned strictly on the validation split.
4. Sensor-Quality Diagnostic Gate evaluating hardware integrity from observable telemetry.
5. Final Evaluation strictly on held-out test split without tuning or feedback.

Calibration Caveat (Phase 2.1 Audit):
Temperature scaling scales unnormalized logits by a single scalar parameter T > 0 to optimize
cross-entropy on calibration data without altering class ranking. While parameter-efficient,
it does NOT theoretically guarantee zero calibration error under non-stationary noise or
skewed class distributions. All calibration quality must be explicitly evaluated on held-out
predictions using Brier score, log loss, and Expected Calibration Error (ECE).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
from scipy.optimize import minimize_scalar
from sklearn.ensemble import RandomForestClassifier

from .feature_extractor import ObservableFeatureExtractor
from .sensor_diagnostics import DiagnosticConfig, DiagnosticSuiteResult, SensorDiagnostics


class AbstainCauseCode(str, Enum):
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    AMBIGUOUS_MARGIN = "AMBIGUOUS_MARGIN"
    SENSOR_FAULT_MISSING = "SENSOR_FAULT_MISSING"
    SENSOR_FAULT_STUCK = "SENSOR_FAULT_STUCK"
    SENSOR_FAULT_DRIFT = "SENSOR_FAULT_DRIFT"
    EXCESSIVE_LATENCY = "EXCESSIVE_LATENCY"
    DATA_UNAVAILABLE = "DATA_UNAVAILABLE"


@dataclass
class SelectiveAttributionConfig:
    """Configurable decision policy parameters for M4."""
    # Decision thresholds
    tau_conf: float = 0.60  # Minimum calibrated posterior confidence required to accept attribution
    delta_margin: float = 0.15  # Minimum probability margin between top-1 and top-2 candidates

    # Calibration mode
    calibration_mode: str = "temperature_scaling"  # "temperature_scaling" or "none"

    # Hardware diagnostics gating
    enable_sensor_diagnostics: bool = True
    diagnostic_config: DiagnosticConfig = field(default_factory=DiagnosticConfig)

    # Base classifier hyperparameters
    n_estimators: int = 150
    random_state: int = 42


@dataclass
class SelectiveAttributionResult:
    """Structured decision returned by the selective attribution engine."""
    event_id: str
    decision: str  # "ATTRIBUTE" or "ABSTAIN"
    predicted_source: Optional[str]  # None if ABSTAIN
    calibrated_confidence: float
    probability_margin: float
    calibrated_probabilities: Dict[str, float]
    raw_probabilities: Dict[str, float]
    diagnostic_result: Optional[DiagnosticSuiteResult]
    abstain_cause: Optional[str]  # None if ATTRIBUTE
    temperature: float
    metadata: Dict[str, Any] = field(default_factory=dict)


class SelectiveAttributor:
    """M4: Uncertainty-Aware Selective Attribution Framework."""

    def __init__(self, config: Optional[SelectiveAttributionConfig] = None) -> None:
        self.config = config or SelectiveAttributionConfig()
        self.diagnostics = SensorDiagnostics(self.config.diagnostic_config)
        self.feature_extractor = ObservableFeatureExtractor()

        self.base_model = RandomForestClassifier(
            n_estimators=self.config.n_estimators,
            random_state=self.config.random_state,
            class_weight="balanced",
        )
        self.classes_: np.ndarray = np.array([])
        self.class_to_idx_: Dict[str, int] = {}
        self.temperature_: float = 1.0
        self.is_fitted: bool = False
        self.is_calibrated: bool = False
        self.thresholds_locked: bool = False

    def fit_base_model(self, X_train: np.ndarray, y_train: np.ndarray) -> "SelectiveAttributor":
        """Fits the base classifier strictly on the training partition."""
        if len(X_train) == 0 or len(y_train) == 0:
            raise ValueError("Training split is empty")

        self.base_model.fit(X_train, y_train)
        self.classes_ = self.base_model.classes_
        self.class_to_idx_ = {str(c): i for i, c in enumerate(self.classes_)}
        self.is_fitted = True
        return self

    def calibrate(self, X_cal: np.ndarray, y_cal: np.ndarray) -> "SelectiveAttributor":
        """Calibrates output probabilities strictly on the dedicated calibration partition.

        Uses Temperature Scaling:
        z = log(p_raw + eps)
        p_calibrated = softmax(z / T)
        Finds T > 0 minimizing negative log-likelihood on held-out calibration data.
        """
        if not self.is_fitted:
            raise RuntimeError("Base model must be fitted before calibration")

        if len(X_cal) == 0 or len(y_cal) == 0:
            raise ValueError("Calibration split is empty")

        if self.config.calibration_mode == "none":
            self.temperature_ = 1.0
            self.is_calibrated = True
            return self

        raw_probs = self.base_model.predict_proba(X_cal)
        eps = 1e-12
        raw_probs = np.clip(raw_probs, eps, 1.0 - eps)
        raw_probs = raw_probs / np.sum(raw_probs, axis=1, keepdims=True)

        logits = np.log(raw_probs)

        target_indices = np.array([
            self.class_to_idx_.get(str(label), -1) for label in y_cal
        ])

        valid_mask = target_indices >= 0
        if not np.any(valid_mask):
            self.temperature_ = 1.0
            self.is_calibrated = True
            return self

        valid_logits = logits[valid_mask]
        valid_targets = target_indices[valid_mask]

        def _nll(temp: float) -> float:
            scaled = valid_logits / temp
            max_s = np.max(scaled, axis=1, keepdims=True)
            log_denom = max_s + np.log(np.sum(np.exp(scaled - max_s), axis=1, keepdims=True))
            log_probs = scaled - log_denom
            nll_val = -np.mean(log_probs[np.arange(len(valid_targets)), valid_targets])
            return float(nll_val)

        res = minimize_scalar(_nll, bounds=(0.1, 10.0), method="bounded")
        if res.success:
            self.temperature_ = float(res.x)
        else:
            self.temperature_ = 1.0

        self.is_calibrated = True
        return self

    def _scale_probabilities(self, raw_probs: np.ndarray) -> np.ndarray:
        """Applies fitted temperature scaling to raw probability vector."""
        if self.temperature_ == 1.0 or self.config.calibration_mode == "none":
            return raw_probs

        eps = 1e-12
        clipped = np.clip(raw_probs, eps, 1.0 - eps)
        logits = np.log(clipped)
        scaled = logits / self.temperature_
        exp_scaled = np.exp(scaled - np.max(scaled))
        return exp_scaled / np.sum(exp_scaled)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Returns calibrated probability distributions for a batch of feature vectors."""
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted before predict_proba")
        raw_probs = self.base_model.predict_proba(X)
        return np.array([self._scale_probabilities(p) for p in raw_probs])

    def tune_thresholds_on_validation(
        self,
        X_val: np.ndarray,
        y_val: np.ndarray,
        target_max_risk: float = 0.05,
        tau_candidates: Optional[Sequence[float]] = None,
        delta_candidates: Optional[Sequence[float]] = None,
    ) -> Dict[str, Any]:
        """Selects acceptance thresholds (tau_conf, delta_margin) strictly using validation episodes.

        Fairness & Leakage Safeguards (Phase 2.1 Audit):
        - Operates strictly on validation features and ground-truth labels.
        - Has ZERO access to the held-out test partition.
        - Selects the operating point (tau, delta) maximizing decision coverage subject
          to validation selective risk <= target_max_risk.
        - Locks the thresholds so test evaluation uses only fixed frozen parameters.
        """
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted before threshold tuning")
        if not self.is_calibrated:
            raise RuntimeError("Model must be calibrated before threshold tuning")

        if len(X_val) == 0 or len(y_val) == 0:
            raise ValueError("Validation set must not be empty")

        if tau_candidates is None:
            tau_candidates = [0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90]
        if delta_candidates is None:
            delta_candidates = [0.00, 0.05, 0.10, 0.15, 0.20, 0.25]

        cal_probs = self.predict_proba(X_val)
        sorted_indices = np.argsort(cal_probs, axis=1)[:, ::-1]
        top_indices = sorted_indices[:, 0]
        runner_up_indices = sorted_indices[:, 1]

        top_classes = np.array([self.classes_[idx] for idx in top_indices])
        top_confs = cal_probs[np.arange(len(X_val)), top_indices]
        margins = top_confs - cal_probs[np.arange(len(X_val)), runner_up_indices]

        best_tau = self.config.tau_conf
        best_delta = self.config.delta_margin
        best_cov = -1.0
        best_risk: Optional[float] = None

        grid_results = []

        for tau in tau_candidates:
            for delta in delta_candidates:
                accepted_mask = (top_confs >= tau) & (margins >= delta)
                n_acc = int(np.sum(accepted_mask))
                cov = n_acc / len(X_val)

                if n_acc == 0:
                    risk = None  # Undefined
                else:
                    err_count = int(np.sum(top_classes[accepted_mask] != y_val[accepted_mask]))
                    risk = err_count / n_acc

                grid_results.append({
                    "tau": float(tau),
                    "delta": float(delta),
                    "coverage": float(cov),
                    "selective_risk": risk,
                })

                if risk is not None and risk <= target_max_risk:
                    if cov > best_cov:
                        best_cov = cov
                        best_risk = risk
                        best_tau = tau
                        best_delta = delta

        # Fallback to minimum risk configuration if target is unattainable
        if best_cov < 0.0:
            valid_risks = [r for r in grid_results if r["selective_risk"] is not None]
            if valid_risks:
                min_risk_cfg = min(valid_risks, key=lambda r: (r["selective_risk"], -r["coverage"]))
                best_tau = min_risk_cfg["tau"]
                best_delta = min_risk_cfg["delta"]
                best_cov = min_risk_cfg["coverage"]
                best_risk = min_risk_cfg["selective_risk"]
            else:
                best_tau = tau_candidates[0]
                best_delta = delta_candidates[0]
                best_cov = 0.0
                best_risk = None

        # Lock thresholds
        self.config.tau_conf = float(best_tau)
        self.config.delta_margin = float(best_delta)
        self.thresholds_locked = True

        return {
            "selected_tau": float(best_tau),
            "selected_delta": float(best_delta),
            "validation_coverage": float(best_cov),
            "validation_selective_risk": best_risk,
            "target_max_risk": target_max_risk,
            "grid_evaluated_count": len(grid_results),
        }

    def predict_single(
        self,
        event_id: str,
        sample_times_sec: np.ndarray,
        station_arrival_times: Dict[str, np.ndarray],
        station_values: Dict[str, np.ndarray],
        decision_time_sec: float,
        critical_stations: Optional[List[str]] = None,
    ) -> SelectiveAttributionResult:
        """Executes the complete selective attribution decision rule at decision time.

        Steps:
        1. Sensor-Quality Diagnostics check observable telemetry integrity.
        2. If diagnostics detect corruption, abstain immediately with matching cause code.
        3. Extract non-leaking tabular features available at decision time.
        4. Predict posterior distribution and apply temperature calibration.
        5. Evaluate confidence tau_conf and margin delta_margin criteria.
        6. Return accepted attribution or explicit abstain decision.
        """
        if not self.is_fitted:
            raise RuntimeError("SelectiveAttributor must be fitted before predict_single")

        # 1. Sensor Health Diagnostics Gate
        diag_res: Optional[DiagnosticSuiteResult] = None
        if self.config.enable_sensor_diagnostics:
            diag_res = self.diagnostics.evaluate_suite(
                sample_times_sec=sample_times_sec,
                station_arrival_times=station_arrival_times,
                station_values=station_values,
                decision_time_sec=decision_time_sec,
                critical_stations=critical_stations,
            )

            if not diag_res.is_healthy:
                cause = diag_res.primary_fault_cause or AbstainCauseCode.SENSOR_FAULT_MISSING.value
                return SelectiveAttributionResult(
                    event_id=event_id,
                    decision="ABSTAIN",
                    predicted_source=None,
                    calibrated_confidence=0.0,
                    probability_margin=0.0,
                    calibrated_probabilities={},
                    raw_probabilities={},
                    diagnostic_result=diag_res,
                    abstain_cause=cause,
                    temperature=self.temperature_,
                    metadata={"gate": "hardware_diagnostic_failure"},
                )

        # 2. Observable Feature Extraction
        feats = self.feature_extractor.extract(
            sample_times_sec=sample_times_sec,
            station_arrival_times=station_arrival_times,
            station_values=station_values,
            decision_time_sec=decision_time_sec,
        ).reshape(1, -1)

        # 3. Probability estimation & calibration
        raw_probs = self.base_model.predict_proba(feats)[0]
        cal_probs = self._scale_probabilities(raw_probs)

        # 4. Rank candidates
        sorted_indices = np.argsort(cal_probs)[::-1]
        top_idx = sorted_indices[0]
        runner_up_idx = sorted_indices[1] if len(sorted_indices) > 1 else top_idx

        top_source = str(self.classes_[top_idx])
        top_conf = float(cal_probs[top_idx])
        margin = float(cal_probs[top_idx] - cal_probs[runner_up_idx])

        raw_prob_dict = {str(c): float(p) for c, p in zip(self.classes_, raw_probs)}
        cal_prob_dict = {str(c): float(p) for c, p in zip(self.classes_, cal_probs)}

        # 5. Acceptance Evaluation
        if top_conf < self.config.tau_conf:
            return SelectiveAttributionResult(
                event_id=event_id,
                decision="ABSTAIN",
                predicted_source=None,
                calibrated_confidence=top_conf,
                probability_margin=margin,
                calibrated_probabilities=cal_prob_dict,
                raw_probabilities=raw_prob_dict,
                diagnostic_result=diag_res,
                abstain_cause=AbstainCauseCode.LOW_CONFIDENCE.value,
                temperature=self.temperature_,
                metadata={"required_confidence": self.config.tau_conf},
            )

        if margin < self.config.delta_margin:
            return SelectiveAttributionResult(
                event_id=event_id,
                decision="ABSTAIN",
                predicted_source=None,
                calibrated_confidence=top_conf,
                probability_margin=margin,
                calibrated_probabilities=cal_prob_dict,
                raw_probabilities=raw_prob_dict,
                diagnostic_result=diag_res,
                abstain_cause=AbstainCauseCode.AMBIGUOUS_MARGIN.value,
                temperature=self.temperature_,
                metadata={"required_margin": self.config.delta_margin},
            )

        # All criteria satisfied: Accept attribution
        return SelectiveAttributionResult(
            event_id=event_id,
            decision="ATTRIBUTE",
            predicted_source=top_source,
            calibrated_confidence=top_conf,
            probability_margin=margin,
            calibrated_probabilities=cal_prob_dict,
            raw_probabilities=raw_prob_dict,
            diagnostic_result=diag_res,
            abstain_cause=None,
            temperature=self.temperature_,
            metadata={"status": "accepted_with_high_confidence"},
        )


def create_ablation_model(
    ablation_variant: str,
    base_config: Optional[SelectiveAttributionConfig] = None,
) -> SelectiveAttributor:
    """Factory creating M4 variants matching the experimental plan ablation grid."""
    cfg = base_config or SelectiveAttributionConfig()

    if ablation_variant in ("ABL_1_FULL", "ABL-1"):
        return SelectiveAttributor(cfg)

    elif ablation_variant in ("ABL_2_NO_DIAGNOSTICS", "ABL-2"):
        cfg.enable_sensor_diagnostics = False
        return SelectiveAttributor(cfg)

    elif ablation_variant in ("ABL_3_NO_CALIBRATION", "ABL-3"):
        cfg.calibration_mode = "none"
        return SelectiveAttributor(cfg)

    elif ablation_variant in ("ABL_4_NO_MARGIN", "ABL-4"):
        cfg.delta_margin = 0.0
        return SelectiveAttributor(cfg)

    elif ablation_variant in ("ABL_5_FORCED_CHOICE", "ABL-5"):
        cfg.tau_conf = 0.0
        cfg.delta_margin = 0.0
        cfg.enable_sensor_diagnostics = False
        return SelectiveAttributor(cfg)

    else:
        raise ValueError(f"Unknown ablation variant '{ablation_variant}'")
