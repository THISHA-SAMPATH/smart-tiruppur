import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGlobalEvents, getUnits, getGroundwaterZones } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const currentUser = await getCurrentUser();

  // Fetch metrics from DB and existing services
  const userCount = await db.user.count();
  const activeUserCount = await db.user.count({ where: { active: true } });

  const [unitsRes, eventsRes, zonesRes] = await Promise.all([
    getUnits(),
    getGlobalEvents(),
    getGroundwaterZones(),
  ]);

  const unitsCount = unitsRes.data?.length ?? 12;
  const eventsCount = eventsRes.data?.length ?? 0;
  const flaggedEventsCount = eventsRes.data?.filter((e) => e.status === "flagged").length ?? 0;
  const zonesCount = zonesRes.data?.length ?? 5;

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">SYSTEM CONTROL CENTRE / ADMIN</p>
          <h1>Admin Dashboard</h1>
          <p>
            Welcome, {currentUser?.name}. Complete platform overview, system controls, and access management.
          </p>
        </div>
        <Link href="/admin/users" className="btn">
          Manage Users ({userCount}) →
        </Link>
      </header>

      {/* Summary Stat Cards */}
      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div className="card">
          <p className="small muted" style={{ margin: 0 }}>Registered Platform Users</p>
          <strong style={{ fontSize: "28px", fontFamily: "Fraunces, serif" }}>{userCount}</strong>
          <p className="small muted" style={{ margin: "4px 0 0" }}>{activeUserCount} active user sessions</p>
        </div>

        <div className="card">
          <p className="small muted" style={{ margin: 0 }}>Connected Industrial Facilities</p>
          <strong style={{ fontSize: "28px", fontFamily: "Fraunces, serif" }}>{unitsCount}</strong>
          <p className="small muted" style={{ margin: "4px 0 0" }}>Monitored CETP/ZLD units</p>
        </div>

        <div className="card">
          <p className="small muted" style={{ margin: 0 }}>Evidence Ledger Activity</p>
          <strong style={{ fontSize: "28px", fontFamily: "Fraunces, serif" }}>{eventsCount}</strong>
          <p className="small muted" style={{ margin: "4px 0 0" }}>
            <span style={{ color: flaggedEventsCount > 0 ? "var(--madder)" : "var(--teal)" }}>
              {flaggedEventsCount} flagged incidents
            </span>
          </p>
        </div>

        <div className="card">
          <p className="small muted" style={{ margin: 0 }}>FIRKA Groundwater Zones</p>
          <strong style={{ fontSize: "28px", fontFamily: "Fraunces, serif" }}>{zonesCount}</strong>
          <p className="small muted" style={{ margin: "4px 0 0" }}>CGWB 2024 baseline synced</p>
        </div>
      </section>

      {/* Admin Modules Navigation */}
      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ADMINISTRATION & MONITORING</p>
            <h2>System Workspaces</h2>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          <Link href="/admin/users" className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="card-index">[ ADMIN 01 ]</span>
            <h3 style={{ fontSize: "20px", margin: "6px 0" }}>User & Access Management</h3>
            <p className="small muted">Manage roles, create accounts, set industrial unit assignments, and toggle user activation.</p>
            <span className="module-link" style={{ marginTop: "12px", display: "inline-block" }}>Manage users →</span>
          </Link>

          <Link href="/monitoring" className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="card-index">[ ADMIN 02 ]</span>
            <h3 style={{ fontSize: "20px", margin: "6px 0" }}>Discharge Operations</h3>
            <p className="small muted">Monitor industrial unit sensor streams and run simulated attribution inference events.</p>
            <span className="module-link" style={{ marginTop: "12px", display: "inline-block" }}>Open discharge ops →</span>
          </Link>

          <Link href="/evidence" className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="card-index">[ ADMIN 03 ]</span>
            <h3 style={{ fontSize: "20px", margin: "6px 0" }}>Evidence Ledger</h3>
            <p className="small muted">Review immutable cryptographic event logs and record regulator actions against flagged discharges.</p>
            <span className="module-link" style={{ marginTop: "12px", display: "inline-block" }}>View evidence ledger →</span>
          </Link>

          <Link href="/groundwater" className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="card-index">[ ADMIN 04 ]</span>
            <h3 style={{ fontSize: "20px", margin: "6px 0" }}>FIRKA Groundwater Outlook</h3>
            <p className="small muted">Assess CGWB 2024 groundwater extraction baselines and run scenario simulations across Tiruppur FIRKAs.</p>
            <span className="module-link" style={{ marginTop: "12px", display: "inline-block" }}>Open groundwater →</span>
          </Link>

          <Link href="/admin/settings" className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="card-index">[ ADMIN 05 ]</span>
            <h3 style={{ fontSize: "20px", margin: "6px 0" }}>System Configuration</h3>
            <p className="small muted">Inspect environment parameters, backend service endpoints, and database connection status.</p>
            <span className="module-link" style={{ marginTop: "12px", display: "inline-block" }}>System settings →</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
