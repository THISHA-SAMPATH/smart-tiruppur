import { NextRequest, NextResponse } from "next/server";
import { actionService } from "@/lib/actions/service";
import { ActionStatus } from "@/lib/actions/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ActionStatus | null;

    const list = actionService.getRecommendations(status || undefined);
    return NextResponse.json(list);
  } catch (error) {
    console.error("Error in GET /api/actions:", error);
    return NextResponse.json({ error: "Failed to fetch action recommendations" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, notes, assignedTo } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields: id, status" }, { status: 400 });
    }

    const updated = actionService.updateStatus(id, status as ActionStatus, notes, assignedTo);
    if (!updated) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error in PATCH /api/actions:", error);
    return NextResponse.json({ error: "Failed to update recommendation status" }, { status: 500 });
  }
}
