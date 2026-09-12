"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function Nav() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer when pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (pathname === "/login") return null;

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

  const navLinks = !loading && user ? (
    <>
      <Link href="/map" className={isActive("/map") ? "active nav-link-item" : "nav-link-item"}>
        City Map
      </Link>

      {user.role === "ADMIN" && (
        <>
          <Link href="/admin" className={isActive("/admin") && pathname === "/admin" ? "active nav-link-item" : "nav-link-item"}>
            Dashboard
          </Link>
          <Link href="/admin/users" className={isActive("/admin/users") ? "active nav-link-item" : "nav-link-item"}>
            Users
          </Link>
          <Link href="/monitoring" className={isActive("/monitoring") ? "active nav-link-item" : "nav-link-item"}>
            Discharge
          </Link>
          <Link href="/groundwater" className={isActive("/groundwater") ? "active nav-link-item" : "nav-link-item"}>
            Groundwater
          </Link>
          <Link href="/evidence" className={isActive("/evidence") ? "active nav-link-item" : "nav-link-item"}>
            Evidence
          </Link>
          <Link href="/verify" className={isActive("/verify") ? "active nav-link-item" : "nav-link-item"}>
            Verify DPP
          </Link>
        </>
      )}

      {user.role === "REGULATOR" && (
        <>
          <Link href="/regulator" className={isActive("/regulator") ? "active nav-link-item" : "nav-link-item"}>
            Dashboard
          </Link>
          <Link href="/monitoring" className={isActive("/monitoring") ? "active nav-link-item" : "nav-link-item"}>
            Discharge
          </Link>
          <Link href="/groundwater" className={isActive("/groundwater") ? "active nav-link-item" : "nav-link-item"}>
            Groundwater
          </Link>
          <Link href="/evidence" className={isActive("/evidence") ? "active nav-link-item" : "nav-link-item"}>
            Evidence
          </Link>
          <Link href="/verify" className={isActive("/verify") ? "active nav-link-item" : "nav-link-item"}>
            Verify DPP
          </Link>
        </>
      )}

      {user.role === "INDUSTRY" && (
        <>
          <Link href="/industry" className={isActive("/industry") ? "active nav-link-item" : "nav-link-item"}>
            My Dashboard
          </Link>
          {user.industryUnitId && (
            <Link
              href={`/units/${user.industryUnitId}`}
              className={isActive(`/units/${user.industryUnitId}`) ? "active nav-link-item" : "nav-link-item"}
            >
              My Facility ({user.industryUnitId})
            </Link>
          )}
          <Link href="/verify" className={isActive("/verify") ? "active nav-link-item" : "nav-link-item"}>
            Verify DPP
          </Link>
        </>
      )}

      {user.role === "GROUNDWATER_OFFICER" && (
        <>
          <Link href="/groundwater" className={isActive("/groundwater") ? "active nav-link-item" : "nav-link-item"}>
            FIRKA Assessment
          </Link>
          <Link href="/verify" className={isActive("/verify") ? "active nav-link-item" : "nav-link-item"}>
            Verify DPP
          </Link>
        </>
      )}

      {user.role === "CITIZEN" && (
        <>
          <Link href="/citizen" className={isActive("/citizen") ? "active nav-link-item" : "nav-link-item"}>
            Public Overview
          </Link>
          <Link href="/simulator" className={isActive("/simulator") ? "active nav-link-item" : "nav-link-item"}>
            Visual Simulator 🎨
          </Link>
          <Link href="/verify" className={isActive("/verify") ? "active nav-link-item" : "nav-link-item"}>
            Verify DPP
          </Link>
        </>
      )}
    </>
  ) : null;

  return (
    <nav className="topnav">
      <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
        <Link href={user ? getRoleHomePath(user.role) : "/"} className="brand">
          NoyyalSense<span>TN</span>
        </Link>
      </div>

      {/* Desktop Links */}
      <div className="links links-desktop" style={{ alignItems: "center" }}>
        {navLinks}

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

      {/* Mobile Hamburger Button */}
      <button
        type="button"
        className="nav-hamburger"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle navigation menu"
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? "✕" : "☰"}
      </button>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="nav-mobile-drawer">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {navLinks}

            {!loading && !user && pathname !== "/login" && (
              <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--hairline)" }}>
                <Link href="/login" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
                  Sign In
                </Link>
              </div>
            )}

            {!loading && user && (
              <div className="nav-user-panel">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="small muted">
                    Logged in as <strong>{user.name}</strong>
                  </span>
                  <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: "11px", padding: "2px 8px" }}>
                    <span className="badge-dot" />
                    {formatRoleLabel(user.role)}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void logout();
                  }}
                  className="btn btn-ghost"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    padding: "8px 12px",
                    fontSize: "13px",
                    color: "var(--madder)",
                    borderColor: "var(--madder)",
                    marginTop: "6px",
                  }}
                >
                  Sign Out of Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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
