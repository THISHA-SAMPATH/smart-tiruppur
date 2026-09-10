import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LEDGER_BASE_URL, INFERENCE_BASE_URL, GROUNDWATER_BASE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="workspace-page">
      <p className="small muted" style={{ marginBottom: "8px" }}>
        <Link href="/admin">← Back to Admin Dashboard</Link>
      </p>

      <header className="workspace-header">
        <div>
          <p className="eyebrow">ADMINISTRATION / CONFIGURATION</p>
          <h1>System Settings & Health</h1>
          <p>Inspect active backend services, environment variables, authentication protocols, and system parameters.</p>
        </div>
      </header>

      <div className="grid" style={{ gap: "20px" }}>
        <div className="card">
          <h3 style={{ fontSize: "18px", marginBottom: "12px" }}>Authentication & RBAC Configuration</h3>
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td className="muted small">Auth Strategy</td>
                <td><strong>HTTP-Only Cookie + HMAC SHA-256 JWT</strong></td>
              </tr>
              <tr>
                <td className="muted small">Session Cookie Name</td>
                <td className="mono">smart_tiruppur_session</td>
              </tr>
              <tr>
                <td className="muted small">Password Hashing</td>
                <td><strong>Bcrypt (Salt Rounds: 10)</strong></td>
              </tr>
              <tr>
                <td className="muted small">Active Admin Session</td>
                <td className="mono">{currentUser?.email} ({currentUser?.id})</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "18px", marginBottom: "12px" }}>Microservices & Backend URLs</h3>
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td className="muted small">Industrial Discharge Ledger Service</td>
                <td className="mono">{LEDGER_BASE_URL}</td>
              </tr>
              <tr>
                <td className="muted small">Inference & Signal Service</td>
                <td className="mono">{INFERENCE_BASE_URL}</td>
              </tr>
              <tr>
                <td className="muted small">FIRKA Groundwater Service</td>
                <td className="mono">{GROUNDWATER_BASE_URL}</td>
              </tr>
              <tr>
                <td className="muted small">Database Provider</td>
                <td className="mono">Prisma ORM (Neon PostgreSQL)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>Supported Platform Roles</h3>
          <ul style={{ paddingLeft: "20px", margin: 0, fontSize: "14px", lineHeight: "1.8" }}>
            <li><strong>ADMIN</strong> — Full system read/write access, user management, and system configuration.</li>
            <li><strong>REGULATOR</strong> — Access to industrial discharge monitoring, inference simulator, evidence ledger, and groundwater assessments.</li>
            <li><strong>INDUSTRY</strong> — Scoped access strictly to assigned industrial unit data (`industryUnitId`), alerts, and compliance status.</li>
            <li><strong>GROUNDWATER_OFFICER</strong> — Scoped access to Tiruppur FIRKA groundwater baselines, extraction scenarios, and risk classifications.</li>
            <li><strong>CITIZEN</strong> — Access to public intelligence summaries and Digital Product Passport (DPP) verification.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
