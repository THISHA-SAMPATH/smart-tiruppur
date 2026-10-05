import { NextRequest, NextResponse } from "next/server";
import { predictionService } from "@/lib/prediction/service";
import { PredictionHorizon, TargetMetricType } from "@/lib/prediction/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get("targetId") || "tnpcb_noyyal_002";
    const targetType = (searchParams.get("targetType") as TargetMetricType) || "water_quality";
    const horizon = (searchParams.get("horizon") as PredictionHorizon) || "+3h";
    const all = searchParams.get("all") === "true";

    if (all) {
      const results = await predictionService.getAllTargetPredictions(horizon);
      return NextResponse.json(results);
    }

    const prediction = await predictionService.getPrediction(targetId, targetType, {}, horizon);
    return NextResponse.json(prediction);
  } catch (error) {
    console.error("Error in GET /api/predictions:", error);
    return NextResponse.json({ error: "Failed to generate prediction" }, { status: 500 });
  }
}
