import { NextResponse } from "next/server";
import { db, Role } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Unauthorized access. Admin role required." },
      { status: 403 }
    );
  }

  try {
    const userId = params.id;
    const body = await request.json();
    const { name, role, industryUnitId, organization, active, password } = body;

    const existingUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (name) updateData.name = String(name).trim();
    const validRoles: Role[] = ["ADMIN", "REGULATOR", "INDUSTRY", "GROUNDWATER_OFFICER", "CITIZEN"];
    if (role && validRoles.includes(role as Role)) {
      updateData.role = role as Role;
    }
    if (industryUnitId !== undefined) {
      updateData.industryUnitId = industryUnitId || null;
    }
    if (organization !== undefined) {
      updateData.organization = organization || null;
    }
    if (typeof active === "boolean") {
      updateData.active = active;
    }
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { passwordHash: _, ...sanitized } = updatedUser;

    return NextResponse.json({ success: true, user: sanitized });
  } catch (error) {
    console.error("Update User Error:", error);
    return NextResponse.json(
      { error: "Failed to update user." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Unauthorized access. Admin role required." },
      { status: 403 }
    );
  }

  try {
    const userId = params.id;

    if (currentUser.id === userId) {
      return NextResponse.json(
        { error: "You cannot delete your own admin account." },
        { status: 400 }
      );
    }

    await db.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true, message: "User deleted." });
  } catch (error) {
    console.error("Delete User Error:", error);
    return NextResponse.json(
      { error: "Failed to delete user." },
      { status: 500 }
    );
  }
}
