"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function Nav() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "badge-investigate";
      case "REGULATOR":
        return "badge-normal";
      case "INDUSTRY":
        return "badge-abstain";
      case "GROUNDWATER_OFFICER":
        return "badge-normal";
      case "CITIZEN":
        return "badge-normal";
      default:
        return "badge-normal";
    }
  };

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "ADMIN";
      case "REGULATOR":
        return "REGULATOR";
      case "INDUSTRY":
        return "INDUSTRY";
      case "GROUNDWATER_OFFICER":
        return "GW OFFICER";
      case "CITIZEN":
        return "CITIZEN";
      default:
        return role;
    }
  };

  return (
    <nav className="topnav">
      <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
        <Link href={user ? getRoleHomePath(user.role) : "/"} className="brand">
          NoyyalSense<span>TN</span>
        </Link>
      </div>

      <div className="links" style={{ alignItems: "center" }}>
        {!loading && user && (
          <>
            <Link href="/map" className={isActive("/map") ? "active" : ""}>
              City Map
            </Link>

            {user.role === "ADMIN" && (
              <>
                <Link href="/admin" className={isActive("/admin") && pathname === "/admin" ? "active" : ""}>
                  Dashboard
                </Link>
                <Link href="/admin/users" className={isActive("/admin/users") ? "active" : ""}>
                  Users
                </Link>
                <Link href="/monitoring" className={isActive("/monitoring") ? "active" : ""}>
                  Discharge
                </Link>
                <Link href="/groundwater" className={isActive("/groundwater") ? "active" : ""}>
                  Groundwater
                </Link>
                <Link href="/evidence" className={isActive("/evidence") ? "active" : ""}>
                  Evidence
                </Link>
              </>
            )}

            {user.role === "REGULATOR" && (
              <>
                <Link href="/regulator" className={isActive("/regulator") ? "active" : ""}>
                  Dashboard
                </Link>
                <Link href="/monitoring" className={isActive("/monitoring") ? "active" : ""}>
                  Discharge
                </Link>
                <Link href="/groundwater" className={isActive("/groundwater") ? "active" : ""}>
                  Groundwater
                </Link>
                <Link href="/evidence" className={isActive("/evidence") ? "active" : ""}>
                  Evidence
                </Link>
              </>
            )}

            {user.role === "INDUSTRY" && (
              <>
                <Link href="/industry" className={isActive("/industry") ? "active" : ""}>
                  My Dashboard
                </Link>
                {user.industryUnitId && (
                  <Link
                    href={`/units/${user.industryUnitId}`}
                    className={isActive(`/units/${user.industryUnitId}`) ? "active" : ""}
                  >
                    My Facility ({user.industryUnitId})
                  </Link>
                )}
              </>
            )}

            {user.role === "GROUNDWATER_OFFICER" && (
              <>
                <Link href="/groundwater" className={isActive("/groundwater") ? "active" : ""}>
                  FIRKA Assessment
                </Link>
              </>
            )}

            {user.role === "CITIZEN" && (
              <>
                <Link href="/citizen" className={isActive("/citizen") ? "active" : ""}>
                  Public Overview
                </Link>
                <Link href="/verify" className={isActive("/verify") ? "active" : ""}>
                  Verify DPP
                </Link>
              </>
            )}
          </>
        )}

        {!loading && !user && pathname !== "/login" && (
          <Link href="/login" className="btn btn-ghost" style={{ padding: "4px 12px", fontSize: "13px" }}>
            Sign In
          </Link>
        )}

        {!loading && user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginLeft: "12px",
              paddingLeft: "12px",
              borderLeft: "1px solid var(--hairline)",
            }}
          >
            <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: "11px", padding: "2px 8px" }}>
              <span className="badge-dot" />
              {formatRoleLabel(user.role)}
            </span>

            <span className="small muted" style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name.split(" ")[0]}
            </span>

            <button
              onClick={() => void logout()}
              className="btn btn-ghost"
              style={{
                padding: "4px 10px",
                fontSize: "12px",
                borderRadius: "var(--radius-sm)",
              }}
              title="Sign out of account"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

function getRoleHomePath(role: string): string {
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
      return "/";
  }
}
