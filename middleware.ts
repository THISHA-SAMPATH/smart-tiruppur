import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  RoleType,
} from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, api auth routes, and verification
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  // 1. Unauthenticated users trying to access public pages can proceed
  if (!user) {
    if (
      pathname === "/login" ||
      pathname === "/about" ||
      pathname === "/map" ||
      pathname === "/" ||
      pathname.startsWith("/verify")
    ) {
      return NextResponse.next();
    }
    // Any other protected route redirects to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated user trying to access /login -> redirect to their role dashboard
  if (pathname === "/login") {
    return NextResponse.redirect(
      new URL(getRoleDefaultDashboard(user.role), request.url)
    );
  }

  // 3. Scoped check for INDUSTRY user accessing /units/[id]
  if (pathname.startsWith("/units/")) {
    const requestedUnitId = pathname.split("/units/")[1]?.split("/")[0];

    if (user.role === "INDUSTRY") {
      if (!user.industryUnitId || requestedUnitId !== user.industryUnitId) {
        // Industry user is trying to access another unit's private data
        return NextResponse.redirect(new URL("/industry", request.url));
      }
    } else if (user.role === "GROUNDWATER_OFFICER" || user.role === "CITIZEN") {
      // Groundwater officers and Citizens cannot access raw unit detail pages
      return NextResponse.redirect(
        new URL(getRoleDefaultDashboard(user.role), request.url)
      );
    }
  }

  // 4. Role-based Route Protection
  const role = user.role;

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(
      new URL(getRoleDefaultDashboard(role), request.url)
    );
  }

  if (pathname.startsWith("/regulator") && role !== "ADMIN" && role !== "REGULATOR") {
    return NextResponse.redirect(
      new URL(getRoleDefaultDashboard(role), request.url)
    );
  }

  if (pathname.startsWith("/industry") && role !== "ADMIN" && role !== "INDUSTRY") {
    return NextResponse.redirect(
      new URL(getRoleDefaultDashboard(role), request.url)
    );
  }

  if (
    pathname.startsWith("/groundwater") &&
    role !== "ADMIN" &&
    role !== "REGULATOR" &&
    role !== "GROUNDWATER_OFFICER"
  ) {
    return NextResponse.redirect(
      new URL(getRoleDefaultDashboard(role), request.url)
    );
  }

  if (
    (pathname.startsWith("/monitoring") || pathname.startsWith("/evidence")) &&
    role !== "ADMIN" &&
    role !== "REGULATOR"
  ) {
    return NextResponse.redirect(
      new URL(getRoleDefaultDashboard(role), request.url)
    );
  }

  if (pathname.startsWith("/citizen") && role !== "ADMIN" && role !== "CITIZEN") {
    return NextResponse.redirect(
      new URL(getRoleDefaultDashboard(role), request.url)
    );
  }

  return NextResponse.next();
}

function getRoleDefaultDashboard(role: RoleType): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "REGULATOR":
      return "/regulator";
    case "INDUSTRY":
      return "/industry";
    case "GROUNDWATER_OFFICER":
      return "/groundwater";
    case "CITIZEN":
      return "/citizen";
    default:
      return "/login";
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
