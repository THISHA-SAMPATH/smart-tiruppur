"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function Nav() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when pathname changes or when clicking outside
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (pathname === "/login") return null;

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  const isDropdownActive = (paths: string[]) =>
    paths.some((p) => pathname.startsWith(p));

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

  const getIndustryRouteForRole = (role?: string) => {
    switch (role) {
      case "REGULATOR":
        return "/regulator";
      case "INDUSTRY":
        return "/industry";
      case "CITIZEN":
        return "/citizen";
      case "ADMIN":
      default:
        return "/admin";
    }
  };

  const getIndustryLabelForRole = (role?: string) => {
    switch (role) {
      case "REGULATOR":
        return "Regulator Hub";
      case "INDUSTRY":
        return "My Facility";
      case "CITIZEN":
        return "Citizen Portal";
      case "ADMIN":
      default:
        return "Industries";
    }
  };

  const toggleDropdown = (name: string) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
    setUserMenuOpen(false);
  };

  return (
    <nav className="topnav" ref={dropdownRef}>
      {/* Brand Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <Link href={user ? getRoleHomePath(user.role) : "/"} className="brand">
          NoyyalSense<span>TN</span>
        </Link>
      </div>

      {/* Primary Desktop Navigation Groups */}
      {!loading && user && (
        <div className="links links-desktop" style={{ alignItems: "center" }}>
          {/* Overview */}
          <Link
            href={getRoleHomePath(user.role)}
            className={`nav-link-item ${isActive(getRoleHomePath(user.role)) ? "active" : ""}`}
          >
            Overview
          </Link>

          {/* Digital Twin (Direct) */}
          <Link
            href="/terrain"
            className={`nav-link-item ${isActive("/terrain") ? "active" : ""}`}
          >
            Digital Twin
          </Link>

          {/* GIS (Direct) */}
          <Link
            href="/map"
            className={`nav-link-item ${isActive("/map") ? "active" : ""}`}
          >
            GIS
          </Link>

          {/* INTELLIGENCE Dropdown */}
          <div
            className="nav-dropdown"
            onMouseEnter={() => setActiveDropdown("intelligence")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              className={`nav-link-item ${isDropdownActive(["/monitoring", "/groundwater", "/steri", "/predictions"]) ? "active" : ""}`}
              onClick={() => toggleDropdown("intelligence")}
            >
              Intelligence ▾
            </button>
            {activeDropdown === "intelligence" && (
              <div className="nav-dropdown-menu">
                <Link
                  href="/monitoring"
                  className={`nav-dropdown-item ${isActive("/monitoring") ? "active" : ""}`}
                >
                  Environment
                </Link>
                <Link
                  href="/groundwater"
                  className={`nav-dropdown-item ${isActive("/groundwater") ? "active" : ""}`}
                >
                  Groundwater
                </Link>
                <Link
                  href="/steri"
                  className={`nav-dropdown-item ${isActive("/steri") ? "active" : ""}`}
                >
                  STERI Index
                </Link>
                <Link
                  href="/predictions"
                  className={`nav-dropdown-item ${isActive("/predictions") ? "active" : ""}`}
                >
                  Early Warning
                </Link>
              </div>
            )}
          </div>

          {/* OPERATIONS Dropdown */}
          <div
            className="nav-dropdown"
            onMouseEnter={() => setActiveDropdown("operations")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              className={`nav-link-item ${isDropdownActive(["/actions", "/flood-analysis", getIndustryRouteForRole(user.role), "/evidence"]) ? "active" : ""}`}
              onClick={() => toggleDropdown("operations")}
            >
              Operations ▾
            </button>
            {activeDropdown === "operations" && (
              <div className="nav-dropdown-menu">
                <Link
                  href="/actions"
                  className={`nav-dropdown-item ${isActive("/actions") ? "active" : ""}`}
                >
                  Action Engine
                </Link>
                <Link
                  href="/flood-analysis"
                  className={`nav-dropdown-item ${isActive("/flood-analysis") ? "active" : ""}`}
                >
                  Flood Analysis
                </Link>
                <Link
                  href={getIndustryRouteForRole(user.role)}
                  className={`nav-dropdown-item ${isActive(getIndustryRouteForRole(user.role)) ? "active" : ""}`}
                >
                  {getIndustryLabelForRole(user.role)}
                </Link>
                <Link
                  href="/evidence"
                  className={`nav-dropdown-item ${isActive("/evidence") ? "active" : ""}`}
                >
                  Incidents
                </Link>
              </div>
            )}
          </div>

          {/* COMPLIANCE Dropdown */}
          <div
            className="nav-dropdown"
            onMouseEnter={() => setActiveDropdown("compliance")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              className={`nav-link-item ${isDropdownActive(["/circularity", "/verify", "/evidence"]) ? "active" : ""}`}
              onClick={() => toggleDropdown("compliance")}
            >
              Compliance ▾
            </button>
            {activeDropdown === "compliance" && (
              <div className="nav-dropdown-menu">
                <Link
                  href="/circularity"
                  className={`nav-dropdown-item ${isActive("/circularity") ? "active" : ""}`}
                >
                  Circularity
                </Link>
                <Link
                  href="/verify"
                  className={`nav-dropdown-item ${isActive("/verify") ? "active" : ""}`}
                >
                  DPP Verification
                </Link>
                <Link
                  href="/evidence"
                  className={`nav-dropdown-item ${isActive("/evidence") ? "active" : ""}`}
                >
                  Evidence Ledger
                </Link>
              </div>
            )}
          </div>

          {/* MORE Dropdown */}
          <div
            className="nav-dropdown"
            onMouseEnter={() => setActiveDropdown("more")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              className={`nav-link-item ${isDropdownActive(["/scenarios", "/about"]) ? "active" : ""}`}
              onClick={() => toggleDropdown("more")}
            >
              More ▾
            </button>
            {activeDropdown === "more" && (
              <div className="nav-dropdown-menu">
                <Link
                  href="/scenarios"
                  className={`nav-dropdown-item ${isActive("/scenarios") ? "active" : ""}`}
                >
                  Scenarios
                </Link>
                <Link
                  href="/monitoring"
                  className="nav-dropdown-item"
                >
                  Data Sources
                </Link>
                <Link
                  href="/about"
                  className={`nav-dropdown-item ${isActive("/about") ? "active" : ""}`}
                >
                  System Status
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Right Controls: User Profile & Compact Role Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {!loading && !user && pathname !== "/login" && (
          <Link href="/login" className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: "13px" }}>
            Sign In
          </Link>
        )}

        {!loading && user && (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: "10.5px", padding: "2px 8px" }}>
                <span className="badge-dot" />
                {formatRoleLabel(user.role)}
              </span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                {user.name.split(" ")[0]} ▾
              </span>
            </button>

            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <div
                className="nav-dropdown-menu"
                style={{ right: 0, left: "auto", minWidth: "180px", marginTop: "4px" }}
              >
                <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--hairline)" }}>
                  <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>Logged in as</div>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink)" }}>{user.name}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    void logout();
                  }}
                  className="nav-dropdown-item"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    color: "var(--madder)",
                    fontWeight: 600,
                    marginTop: "2px",
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}

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
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="nav-mobile-drawer">
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {!loading && user && (
              <>
                <Link href={getRoleHomePath(user.role)} className="nav-link-item">
                  Overview
                </Link>
                <Link href="/terrain" className="nav-link-item">
                  Digital Twin
                </Link>
                <Link href="/map" className="nav-link-item">
                  GIS Map
                </Link>
                <div style={{ padding: "6px 0", borderTop: "1px solid var(--hairline)", fontWeight: 700, fontSize: "11px", color: "var(--ink-soft)" }}>
                  INTELLIGENCE
                </div>
                <Link href="/monitoring" className="nav-link-item">Environment</Link>
                <Link href="/groundwater" className="nav-link-item">Groundwater</Link>
                <Link href="/steri" className="nav-link-item">STERI Index</Link>
                <Link href="/predictions" className="nav-link-item">Early Warning</Link>
                <div style={{ padding: "6px 0", borderTop: "1px solid var(--hairline)", fontWeight: 700, fontSize: "11px", color: "var(--ink-soft)" }}>
                  OPERATIONS
                </div>
                <Link href="/actions" className="nav-link-item">Action Engine</Link>
                <Link href="/flood-analysis" className="nav-link-item">Flood Analysis</Link>
                <Link href={getIndustryRouteForRole(user.role)} className="nav-link-item">{getIndustryLabelForRole(user.role)}</Link>
                <Link href="/evidence" className="nav-link-item">Incidents</Link>
                <div style={{ padding: "6px 0", borderTop: "1px solid var(--hairline)", fontWeight: 700, fontSize: "11px", color: "var(--ink-soft)" }}>
                  COMPLIANCE
                </div>
                <Link href="/circularity" className="nav-link-item">Circularity</Link>
                <Link href="/verify" className="nav-link-item">DPP Verification</Link>
                <Link href="/evidence" className="nav-link-item">Evidence Ledger</Link>
                <div style={{ padding: "6px 0", borderTop: "1px solid var(--hairline)", fontWeight: 700, fontSize: "11px", color: "var(--ink-soft)" }}>
                  MORE
                </div>
                <Link href="/scenarios" className="nav-link-item">Scenarios</Link>
              </>
            )}

            {!loading && !user && pathname !== "/login" && (
              <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--hairline)" }}>
                <Link href="/login" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
                  Sign In
                </Link>
              </div>
            )}

            {!loading && user && (
              <div className="nav-user-panel" style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--hairline)" }}>
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
                    marginTop: "8px",
                  }}
                >
                  Sign Out
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
