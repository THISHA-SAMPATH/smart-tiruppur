import {
  IPredictionModelProvider,
  TimeSeriesPrediction,
  PredictionHorizon,
  TargetMetricType,
  PredictionInputs,
} from "./types";
import { HeuristicTimePointProvider } from "./providers/heuristicProvider";

class PredictionServiceManager {
  private activeProvider: IPredictionModelProvider;

  constructor() {
    this.activeProvider = new HeuristicTimePointProvider();
  }

  public setProvider(provider: IPredictionModelProvider) {
    this.activeProvider = provider;
  }

  public getActiveProviderInfo() {
    return {
      name: this.activeProvider.name,
      version: this.activeProvider.version,
    };
  }

  public async getPrediction(
    targetId: string = "tnpcb_noyyal_002",
    targetType: TargetMetricType = "water_quality",
    inputs?: Partial<PredictionInputs>,
    horizon: PredictionHorizon = "+3h"
  ): Promise<TimeSeriesPrediction> {
    const fullInputs: PredictionInputs = {
      ph: 6.8,
      ec: 2850,
      turbidity: 45,
      flow: 128,
      rainfallMmDay: 48,
      riverFlowM3s: 14.2,
      industrialActivityLoadPct: 84,
      groundwaterStagePct: 112,
      spatialContextName: "Kasipalayam Noyyal Exit Station",
      ...inputs,
    };

    return this.activeProvider.predict(targetId, targetType, fullInputs, horizon);
  }

  public async getAllTargetPredictions(horizon: PredictionHorizon = "+3h"): Promise<TimeSeriesPrediction[]> {
    const targets = [
      { id: "tnpcb_noyyal_002", name: "Kasipalayam Noyyal Exit Station", type: "water_quality" as TargetMetricType, ec: 2850, ph: 6.8 },
      { id: "unit_007", name: "Angeripalayam Fabric Sector", type: "pollution" as TargetMetricType, load: 92, ec: 3100 },
      { id: "kasipalayam_flood", name: "Kasipalayam Urban Flood Channel", type: "flood" as TargetMetricType, rain: 65 },
      { id: "firka_south", name: "Tiruppur South FIRKA Aquifer", type: "groundwater" as TargetMetricType, stage: 112 },
    ];

    return Promise.all(
      targets.map((t) =>
        this.getPrediction(t.id, t.type, { spatialContextName: t.name, ec: t.ec, ph: t.ph, industrialActivityLoadPct: t.load, rainfallMmDay: t.rain, groundwaterStagePct: t.stage }, horizon)
      )
    );
  }
}

export const predictionService = new PredictionServiceManager();
