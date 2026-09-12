import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import CitizenReportSection from "@/components/CitizenReportSection";
import CitizenWorkspaceClient from "@/components/CitizenWorkspaceClient";

export const dynamic = "force-dynamic";

export default async function CitizenDashboardPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">CIVIC TRANSPARENCY / CITIZEN PORTAL</p>
          <h1>Public Environmental Overview</h1>
          <p>
            Welcome, {currentUser?.name || "Citizen"}. Public transparency interface for Tiruppur industrial water stewardship and Digital Product Passport verification.
          </p>
        </div>
        <Link href="/verify" className="btn">
          Verify Product Passport ↗
        </Link>
      </header>

      {/* Daily Citizen Adoption Suite (Water Score, Eco-Discounts, WhatsApp Alerts) */}
      <CitizenWorkspaceClient />

      {/* Intro Cards */}
      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px", marginBottom: "32px" }}>
        <div className="card">
          <span className="card-index">[ PUBLIC INTELLIGENCE ]</span>
          <h3 style={{ fontSize: "20px", margin: "8px 0" }}>Water Stewardship & Transparency</h3>
          <p className="small muted">
            Tiruppur textile facilities operate zero liquid discharge (ZLD) systems. The NoyyalSense platform enables verifiable compliance and environmental accountability.
          </p>
        </div>

        <div className="card">
          <span className="card-index">[ VERIFICATION ]</span>
          <h3 style={{ fontSize: "20px", margin: "8px 0" }}>Garment Digital Passport (DPP)</h3>
          <p className="small muted">
            Every garment batch carries a cryptographic QR code verifying its textile dyeing facility compliance, water recycling percentage, and energy baseline.
          </p>
          <Link href="/verify" className="module-link" style={{ marginTop: "12px", display: "inline-block" }}>
            Scan & verify garment QR →
          </Link>
        </div>
      </section>

      {/* Active Citizen Incident Report Loop */}
      <CitizenReportSection />
    </div>
  );
}

