import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RBAC Filtering
  if (currentUser.role === "CITIZEN") {
    // Citizens view only their own submitted reports
    const userReports = await db.citizenReport.findMany({
      where: { reporterId: currentUser.id },
    });
    return NextResponse.json({ reports: userReports });
  }

  if (currentUser.role === "REGULATOR" || currentUser.role === "ADMIN") {
    // Regulators and Admins view all citizen reports
    const allReports = await db.citizenReport.findMany();
    return NextResponse.json({ reports: allReports });
  }

  return NextResponse.json(
    { error: "Forbidden: Role does not have access to citizen reports" },
    { status: 403 }
  );
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.role !== "CITIZEN" && currentUser.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Only authenticated citizens can submit reports" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const pollutionType = typeof body.pollutionType === "string" ? body.pollutionType.trim() : "Water Pollution";
    const locationDescription = typeof body.locationDescription === "string" ? body.locationDescription.trim() : "";

    if (!title || !description || !locationDescription) {
      return NextResponse.json(
        { error: "Title, description, and location description are required." },
        { status: 400 }
      );
    }

    // Latitude & Longitude parsing: Keep strictly null if not provided or invalid
    let latitude: number | null = null;
    if (body.latitude !== undefined && body.latitude !== null && body.latitude !== "") {
      const parsedLat = parseFloat(body.latitude);
      if (Number.isFinite(parsedLat)) {
        latitude = parsedLat;
      }
    }

    let longitude: number | null = null;
    if (body.longitude !== undefined && body.longitude !== null && body.longitude !== "") {
      const parsedLng = parseFloat(body.longitude);
      if (Number.isFinite(parsedLng)) {
        longitude = parsedLng;
      }
    }

    const report = await db.citizenReport.create({
      data: {
        title,
        description,
        pollutionType,
        locationDescription,
        latitude,
        longitude,
        reporterId: currentUser.id,
        reporterName: currentUser.name,
        reporterEmail: currentUser.email,
      },
    });

    return NextResponse.json({ ok: true, report }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create citizen report" },
      { status: 500 }
    );
  }
}
