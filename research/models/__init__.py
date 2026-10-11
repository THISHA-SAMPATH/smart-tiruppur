"""Research attribution models and sensor diagnostics."""

from .baselines import (
    BaselineAttributionResult,
    ConventionalClassifier,
    DetectionResult,
    SpatialTransitHeuristicAttributor,
    ThresholdEventDetector,
    ThresholdHeuristicAttributor,
)
from .feature_extractor import ObservableFeatureExtractor
from .selective_attributor import (
    AbstainCauseCode,
    SelectiveAttributionConfig,
    SelectiveAttributionResult,
    SelectiveAttributor,
    create_ablation_model,
)
from .sensor_diagnostics import (
    DiagnosticConfig,
    DiagnosticSuiteResult,
    SensorDiagnostics,
    StationHealthResult,
)

__all__ = [
    "ThresholdEventDetector",
    "ThresholdHeuristicAttributor",
    "SpatialTransitHeuristicAttributor",
    "ConventionalClassifier",
    "ObservableFeatureExtractor",
    "SelectiveAttributor",
    "SelectiveAttributionConfig",
    "SelectiveAttributionResult",
    "AbstainCauseCode",
    "create_ablation_model",
    "DiagnosticConfig",
    "SensorDiagnostics",
    "StationHealthResult",
    "DiagnosticSuiteResult",
    "DetectionResult",
    "BaselineAttributionResult",
]
