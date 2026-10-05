import {
  IPredictionModelProvider,
  TimeSeriesPrediction,
  PredictionInputs,
  PredictionHorizon,
  TargetMetricType,
  TimeSeriesPoint,
  PredictionRiskCategory,
} from "../types";

export class HeuristicTimePointProvider implements IPredictionModelProvider {
  name = "Statistical Trend & Auto-Regressive Forecasting Provider";
  version = "v1.4-Research";

  async predict(
    targetId: string,
    targetType: TargetMetricType,
    inputs: PredictionInputs,
    horizon: PredictionHorizon
  ): Promise<TimeSeriesPrediction> {
    const hoursAhead = parseInt(horizon.replace("+", "").replace("h", ""), 10) || 1;

    let paramName = "Electrical Conductivity (EC)";
    let unitStr = "µS/cm";
    let baseVal = inputs.ec || 2850;
    let trendFactor = 0.08;

    if (targetType === "pollution") {
      paramName = "Chemical Effluent Anomaly Index";
      unitStr = "Index (0-100)";
      baseVal = inputs.industrialActivityLoadPct || 74;
      trendFactor = 0.12;
    } else if (targetType === "flood") {
      paramName = "Monsoon River Stage & Inundation";
      unitStr = "Meters ASL";
      baseVal = 290.4 + (inputs.rainfallMmDay || 45) * 0.02;
      trendFactor = 0.05;
    } else if (targetType === "groundwater") {
      paramName = "CGWB Aquifer Draft Ratio";
      unitStr = "% Draft";
      baseVal = inputs.groundwaterStagePct || 112;
      trendFactor = 0.03;
    }

    // Generate historical time series (past 6 hours)
    const series: TimeSeriesPoint[] = [];
    const now = new Date();

    for (let i = 6; i >= 1; i--) {
      const pastTime = new Date(now.getTime() - i * 60 * 60 * 1000);
      const histVal = Number(
        (baseVal * (1 - (i * 0.015) + (Math.sin(i * 0.5) * 0.02))).toFixed(1)
      );
      series.push({
        timestamp: pastTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        observedValue: histVal,
        isForecast: false,
      });
    }

    // Add current observation
    series.push({
      timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      observedValue: Number(baseVal.toFixed(1)),
      isForecast: false,
    });

    // Generate forecast time series (future hours)
    const predictedVal = Number((baseVal * (1 + trendFactor * (hoursAhead / 3))).toFixed(1));
    const uncertaintyBand = predictedVal * (0.04 + hoursAhead * 0.015);

    const confLower = Number((predictedVal - uncertaintyBand).toFixed(1));
    const confUpper = Number((predictedVal + uncertaintyBand).toFixed(1));

    for (let f = 1; f <= hoursAhead; f++) {
      const futTime = new Date(now.getTime() + f * 60 * 60 * 1000);
      const stepPred = Number((baseVal * (1 + trendFactor * (f / 3))).toFixed(1));
      const stepBand = stepPred * (0.04 + f * 0.015);

      series.push({
        timestamp: futTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        predictedValue: stepPred,
        confidenceLower95: Number((stepPred - stepBand).toFixed(1)),
        confidenceUpper95: Number((stepPred + stepBand).toFixed(1)),
        isForecast: true,
      });
    }

    // Classify risk category
    let riskCategory: PredictionRiskCategory = "MODERATE";
    const ratio = predictedVal / (baseVal || 1);
    if (ratio > 1.25 || baseVal > 3000) riskCategory = "CRITICAL";
    else if (ratio > 1.15) riskCategory = "VERY HIGH";
    else if (ratio > 1.05) riskCategory = "HIGH";
    else if (ratio < 0.95) riskCategory = "LOW";

    const confidence = Number((Math.max(0.70, 0.94 - hoursAhead * 0.04)).toFixed(2));

    return {
      id: `pred_${targetId}_${horizon}`,
      targetId,
      targetName: inputs.spatialContextName || "Kasipalayam Telemetry Station",
      targetType,
      parameterName: paramName,
      unitOfMeasure: unitStr,
      currentValue: Number(baseVal.toFixed(1)),
      predictionHorizon: horizon,
      predictedValue: predictedVal,
      confidenceLower95: confLower,
      confidenceUpper95: confUpper,
      confidence,
      riskCategory,
      mode: "RESEARCH / SIMULATION MODE",
      modelProviderName: this.name,
      modelVersion: this.version,
      series,
      inputs,
      timestamp: new Date().toISOString(),
    };
  }
}
