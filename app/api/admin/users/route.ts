import { NextResponse } from "next/server";
import { db, Role } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Unauthorized access. Admin role required." },
      { status: 403 }
    );
  }

  const users = await db.user.findMany();

  const sanitizedUsers = users.map(({ passwordHash: _, ...rest }) => rest);

  return NextResponse.json({ users: sanitizedUsers });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Unauthorized access. Admin role required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, email, password, role, industryUnitId, organization } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password, and role are required." },
        { status: 400 }
      );
    }

    const validRoles: Role[] = ["ADMIN", "REGULATOR", "INDUSTRY", "GROUNDWATER_OFFICER", "CITIZEN"];
    if (!validRoles.includes(role as Role)) {
      return NextResponse.json(
        { error: "Invalid role specified." },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email address already exists." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await db.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        passwordHash,
        role: role as Role,
        industryUnitId: industryUnitId || null,
        organization: organization || null,
        active: true,
      },
    });

    const { passwordHash: _, ...sanitizedNewUser } = newUser;

    return NextResponse.json({ success: true, user: sanitizedNewUser }, { status: 201 });
  } catch (error) {
    console.error("Create User Error:", error);
    return NextResponse.json(
      { error: "Failed to create user." },
      { status: 500 }
    );
  }
}
