import { NextRequest, NextResponse } from "next/server";
import { calculateSteri, evaluateSteriModels, DEFAULT_STERI_WEIGHTS } from "@/lib/steri/calculator";
import { SteriScenarioInput, SteriWeights } from "@/lib/steri/types";
import { db } from "@/lib/db";

async function loadGeocodedReports() {
  const reports = await db.citizenReport.findMany();
  const points: Array<{ latitude: number; longitude: number }> = [];
  reports.forEach((report) => {
    if (typeof report.latitude === "number" && typeof report.longitude === "number") {
      points.push({ latitude: report.latitude, longitude: report.longitude });
    }
  });
  return points;
}

function numberParam(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function boundedNumber(value: unknown, minimum: number, maximum: number): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum ? value : undefined;
}

function sanitizeWeights(input: unknown): Partial<SteriWeights> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const weights: Partial<SteriWeights> = {};
  (Object.keys(DEFAULT_STERI_WEIGHTS) as Array<keyof SteriWeights>).forEach((key) => {
    const value = boundedNumber((input as Record<string, unknown>)[key], 0, 1);
    if (value !== undefined) weights[key] = value;
  });
  return weights;
}

function sanitizeScenario(input: unknown): SteriScenarioInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const candidate = input as Record<string, unknown>;
  const floodPreset = candidate.floodPreset;
  return {
    floodPreset: floodPreset === "BASELINE" || floodPreset === "MODERATE_RAIN" || floodPreset === "HEAVY_RAIN" || floodPreset === "EXTREME_RAIN" ? floodPreset : undefined,
    rainfallPctChange: boundedNumber(candidate.rainfallPctChange, -100, 200),
    industrialLoadPctChange: boundedNumber(candidate.industrialLoadPctChange, -100, 200),
    pollutionLoadPctChange: boundedNumber(candidate.pollutionLoadPctChange, -100, 200),
    groundwaterExtractionPctChange: boundedNumber(candidate.groundwaterExtractionPctChange, -100, 200),
  };
}

function readScenario(values: URLSearchParams): SteriScenarioInput {
  const floodPreset = values.get("floodPreset");
  const boundedQueryValue = (key: string) => {
    const value = numberParam(values.get(key));
    return value !== undefined && value >= -100 && value <= 200 ? value : undefined;
  };
  return {
    floodPreset: floodPreset === "BASELINE" || floodPreset === "MODERATE_RAIN" || floodPreset === "HEAVY_RAIN" || floodPreset === "EXTREME_RAIN" ? floodPreset : undefined,
    rainfallPctChange: boundedQueryValue("rainfallPctChange"),
    industrialLoadPctChange: boundedQueryValue("industrialLoadPctChange"),
    pollutionLoadPctChange: boundedQueryValue("pollutionLoadPctChange"),
    groundwaterExtractionPctChange: boundedQueryValue("groundwaterExtractionPctChange"),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const compare = searchParams.get("compare") === "true";

    const customWeights: Partial<SteriWeights> = {};
    const keys: Array<keyof SteriWeights> = [
      "pollution",
      "waterQuality",
      "flood",
      "groundwater",
      "industrialPressure",
      "complaintIntensity",
    ];

    keys.forEach((key) => {
      const val = searchParams.get(key);
      const parsed = numberParam(val);
      if (parsed !== undefined && parsed >= 0 && parsed <= 1) {
        customWeights[key] = parsed;
      }
    });

    if (compare) {
      const comparison = evaluateSteriModels(customWeights, readScenario(searchParams), await loadGeocodedReports());
      return NextResponse.json(comparison);
    }

    const overview = calculateSteri(customWeights, readScenario(searchParams), await loadGeocodedReports());
    return NextResponse.json(overview);
  } catch (error) {
    console.error("Error in GET /api/steri:", error);
    return NextResponse.json(
      { error: "Failed to calculate Smart Tiruppur Environmental Risk Index (STERI)" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "STERI payload must be an object" }, { status: 400 });
    }
    const payload = body as Record<string, unknown>;
    const weights = sanitizeWeights(payload.weights);
    const compare = payload.compare === true;
    const scenario = sanitizeScenario(payload.scenario);

    if (compare) {
      const comparison = evaluateSteriModels(weights, scenario, await loadGeocodedReports());
      return NextResponse.json(comparison);
    }

    const overview = calculateSteri(weights, scenario, await loadGeocodedReports());
    return NextResponse.json(overview);
  } catch (error) {
    console.error("Error in POST /api/steri:", error);
    return NextResponse.json(
      { error: "Invalid STERI payload or weight configuration" },
      { status: 400 }
    );
  }
}
