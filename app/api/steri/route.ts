import { NextRequest, NextResponse } from "next/server";
import { calculateSteri, evaluateSteriModels, DEFAULT_STERI_WEIGHTS } from "@/lib/steri/calculator";
import { SteriWeights } from "@/lib/steri/types";

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
      if (val !== null && !isNaN(Number(val))) {
        customWeights[key] = Number(val);
      }
    });

    if (compare) {
      const comparison = evaluateSteriModels(customWeights);
      return NextResponse.json(comparison);
    }

    const overview = calculateSteri(customWeights);
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
    const body = await request.json();
    const weights: Partial<SteriWeights> = body.weights || {};
    const compare: boolean = Boolean(body.compare);

    if (compare) {
      const comparison = evaluateSteriModels(weights);
      return NextResponse.json(comparison);
    }

    const overview = calculateSteri(weights);
    return NextResponse.json(overview);
  } catch (error) {
    console.error("Error in POST /api/steri:", error);
    return NextResponse.json(
      { error: "Invalid STERI payload or weight configuration" },
      { status: 400 }
    );
  }
}
