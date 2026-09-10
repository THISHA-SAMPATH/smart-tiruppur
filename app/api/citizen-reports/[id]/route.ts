import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db, ReportStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID_STATUSES: ReportStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "RESOLVED",
  "REJECTED",
];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.role !== "REGULATOR" && currentUser.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Only regulators can update report status" },
      { status: 403 }
    );
  }

  const reportId = params.id;
  if (!reportId) {
    return NextResponse.json({ error: "Missing report ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const status = body.status as ReportStatus;
    const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const updatedReport = await db.citizenReport.updateStatus({
      id: reportId,
      status,
      updatedBy: `${currentUser.name} (${currentUser.role})`,
      notes: notes || `Status updated to ${status} by regulator`,
    });

    return NextResponse.json({ ok: true, report: updatedReport });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update report status" },
      { status: 500 }
    );
  }
}
