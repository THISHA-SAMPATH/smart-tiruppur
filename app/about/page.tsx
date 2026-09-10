"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf9f5",
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#1f2a24",
      }}
    >
      {/* Top Header Navigation */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px 44px",
          borderBottom: "1px solid #e5e0d3",
          background: "#f6f3ea",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#3e6b63",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
              }}
            >
              💧
            </span>
            <span style={{ font: "600 22px 'Fraunces', serif", letterSpacing: "-0.03em" }}>
              NoyyalSense<span style={{ fontSize: "14px", color: "#3e6b63", marginLeft: "4px" }}>TN</span>
            </span>
          </div>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link
            href="/map"
            style={{ fontSize: "14px", color: "#4b5850", textDecoration: "none", fontWeight: 500 }}
          >
            City Map
          </Link>
          <Link
            href="/verify"
            style={{ fontSize: "14px", color: "#4b5850", textDecoration: "none", fontWeight: 500 }}
          >
            Verify DPP
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: "13.5px",
              color: "#ffffff",
              background: "#1f2a24",
              textDecoration: "none",
              fontWeight: 600,
              padding: "8px 18px",
              borderRadius: "999px",
            }}
          >
            Sign In Portal →
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "64px 24px 48px",
        }}
      >
        <div style={{ maxWidth: "820px" }}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "12px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#3e6b63",
              marginBottom: "12px",
              fontWeight: 600,
            }}
          >
            Noyyal River Basin • Smart City Intelligence Platform
          </div>
          <h1
            style={{
              font: "500 clamp(38px, 5vw, 60px) 'Fraunces', serif",
              lineHeight: 1.05,
              color: "#17251e",
              margin: "0 0 20px",
              letterSpacing: "-0.03em",
            }}
          >
            Pioneering Sustainable Growth for <em style={{ color: "#3e6b63", fontStyle: "normal" }}>Tiruppur</em>
          </h1>
          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.6,
              color: "#4b5850",
              margin: "0 0 32px",
            }}
          >
            NoyyalSense combines physics-aware river telemetry, cryptographic compliance ledgers, and CGWB groundwater risk modeling to transform South India&rsquo;s textile capital into a global benchmark for sustainable industrial ecosystems.
          </p>
        </div>

        {/* Impact Metrics Banner */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            background: "#f6f3ea",
            border: "1px solid #d8d0bc",
            borderRadius: "12px",
            overflow: "hidden",
            marginTop: "16px",
          }}
        >
          <div style={{ padding: "24px", borderRight: "1px solid #d8d0bc" }}>
            <strong style={{ font: "500 36px 'Fraunces', serif", color: "#1f2a24", display: "block" }}>$4B+</strong>
            <span style={{ fontSize: "13px", color: "#4b5850" }}>Annual Textile Exports Protected</span>
          </div>
          <div style={{ padding: "24px", borderRight: "1px solid #d8d0bc" }}>
            <strong style={{ font: "500 36px 'Fraunces', serif", color: "#3e6b63", display: "block" }}>6 FIRKAs</strong>
            <span style={{ fontSize: "13px", color: "#4b5850" }}>Groundwater Administrative Zones</span>
          </div>
          <div style={{ padding: "24px", borderRight: "1px solid #d8d0bc" }}>
            <strong style={{ font: "500 36px 'Fraunces', serif", color: "#2b3a67", display: "block" }}>SHA-256</strong>
            <span style={{ fontSize: "13px", color: "#4b5850" }}>Tamper-Evident Green Ledger</span>
          </div>
          <div style={{ padding: "24px" }}>
            <strong style={{ font: "500 36px 'Fraunces', serif", color: "#9c3b22", display: "block" }}>100% DPP</strong>
            <span style={{ fontSize: "13px", color: "#4b5850" }}>Verifiable Product Passports</span>
          </div>
        </div>
      </section>

      {/* The Tiruppur Story */}
      <section
        style={{
          background: "#ffffff",
          borderTop: "1px solid #e5e0d3",
          borderBottom: "1px solid #e5e0d3",
          padding: "72px 24px",
        }}
      >
        <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "56px", alignItems: "center" }}>
            <div>
              <h2
                style={{
                  font: "500 36px 'Fraunces', serif",
                  color: "#17251e",
                  margin: "0 0 18px",
                  letterSpacing: "-0.02em",
                }}
              >
                The Dollar City&rsquo;s Environmental Challenge & Vision
              </h2>
              <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#4b5850", marginBottom: "16px" }}>
                Known worldwide as the <strong>Dollar City</strong>, Tiruppur produces over 90% of India&rsquo;s cotton knitwear exports. However, rapid growth along the Noyyal River basin created severe stress on local water resources, leading to strict Zero Liquid Discharge (ZLD) mandates and Central Ground Water Board (CGWB) extraction monitoring.
              </p>
              <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#4b5850", marginBottom: "0" }}>
                NoyyalSense bridges the gap between regulatory enforcement and industrial competitiveness. By deploying Bayesian uncertainty models, regulators gain high-confidence evidence without false accusations, while compliant textile facilities issue verifiable <strong>Digital Product Passports (DPP)</strong> that prove environmental stewardship to international apparel brands.
              </p>
            </div>

            <div
              style={{
                background: "linear-gradient(135deg, #183a53 0%, #347066 100%)",
                borderRadius: "16px",
                padding: "36px",
                color: "#ffffff",
                boxShadow: "0 20px 40px rgba(24, 58, 83, 0.15)",
              }}
            >
              <h3 style={{ font: "500 24px 'Fraunces', serif", margin: "0 0 16px", color: "#ffffff" }}>
                How NoyyalSense Drives Tiruppur&rsquo;s Growth:
              </h3>
              <ul style={{ paddingLeft: "20px", margin: 0, fontSize: "14.5px", lineHeight: 1.8 }}>
                <li style={{ marginBottom: "10px" }}>
                  <strong>Global Buyer Confidence:</strong> International buyers verify fabric environmental compliance via public QR codes.
                </li>
                <li style={{ marginBottom: "10px" }}>
                  <strong>Fair Regulatory Action:</strong> Bayesian models distinguish baseline noise from real discharge events, eliminating false penalties.
                </li>
                <li style={{ marginBottom: "10px" }}>
                  <strong>Groundwater Table Protection:</strong> Real-time FIRKA zone risk modeling balances industrial extraction with artificial recharge.
                </li>
                <li>
                  <strong>Democratized Citizen Action:</strong> Enables public pollution reporting with transparent status tracking.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars Grid */}
      <section
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "80px 24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 56px" }}>
          <h2 style={{ font: "500 38px 'Fraunces', serif", color: "#17251e", margin: "0 0 12px" }}>
            The Four Core Pillars of NoyyalSense
          </h2>
          <p style={{ fontSize: "15.5px", color: "#4b5850" }}>
            An integrated, multi-tenant platform serving every stakeholder in Tiruppur&rsquo;s water ecosystem.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
          {/* Pillar 1 */}
          <div
            style={{
              background: "#f6f3ea",
              border: "1px solid #d8d0bc",
              borderRadius: "12px",
              padding: "32px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "#2b3a67",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontSize: "20px",
                marginBottom: "20px",
              }}
            >
              🌊
            </div>
            <h3 style={{ font: "500 22px 'Fraunces', serif", color: "#17251e", margin: "0 0 10px" }}>
              1. Physics-Aware Sensor Telemetry
            </h3>
            <p style={{ fontSize: "14px", lineHeight: 1.65, color: "#4b5850", margin: 0 }}>
              Monitors pH, Electrical Conductivity (EC), Turbidity, and Flow across Noyyal reaches. Evaluates posterior probability distributions to categorize events into <strong>Investigate</strong>, <strong>Normal</strong>, or <strong>Abstain</strong>.
            </p>
          </div>

          {/* Pillar 2 */}
          <div
            style={{
              background: "#f6f3ea",
              border: "1px solid #d8d0bc",
              borderRadius: "12px",
              padding: "32px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "#3e6b63",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontSize: "20px",
                marginBottom: "20px",
              }}
            >
              📜
            </div>
            <h3 style={{ font: "500 22px 'Fraunces', serif", color: "#17251e", margin: "0 0 10px" }}>
              2. Cryptographic Green Ledger
            </h3>
            <p style={{ fontSize: "14px", lineHeight: 1.65, color: "#4b5850", margin: 0 }}>
              Writes sensor logs, Bayesian attributions, and regulatory actions into an immutable SHA-256 hash chain. Powers public Digital Product Passports (DPP) with instant QR code verification.
            </p>
          </div>

          {/* Pillar 3 */}
          <div
            style={{
              background: "#f6f3ea",
              border: "1px solid #d8d0bc",
              borderRadius: "12px",
              padding: "32px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "#a8721c",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontSize: "20px",
                marginBottom: "20px",
              }}
            >
              🌐
            </div>
            <h3 style={{ font: "500 22px 'Fraunces', serif", color: "#17251e", margin: "0 0 10px" }}>
              3. CGWB FIRKA Groundwater Modeling
            </h3>
            <p style={{ fontSize: "14px", lineHeight: 1.65, color: "#4b5850", margin: 0 }}>
              Calculates annual recharge vs. draft across Tiruppur&rsquo;s 6 administrative FIRKAs. Categorizes groundwater stress levels into Safe, Semi-Critical, Critical, and Over-Exploited.
            </p>
          </div>

          {/* Pillar 4 */}
          <div
            style={{
              background: "#f6f3ea",
              border: "1px solid #d8d0bc",
              borderRadius: "12px",
              padding: "32px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "#9c3b22",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontSize: "20px",
                marginBottom: "20px",
              }}
            >
              👥
            </div>
            <h3 style={{ font: "500 22px 'Fraunces', serif", color: "#17251e", margin: "0 0 10px" }}>
              4. Multi-Tenant Role-Based Access
            </h3>
            <p style={{ fontSize: "14px", lineHeight: 1.65, color: "#4b5850", margin: 0 }}>
              Tailored dashboards for Admin, Regulator, Industry Unit, Groundwater Officer, and Citizen. Features a public citizen portal for geo-referenced pollution incident reports.
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer
        style={{
          background: "#1f2a24",
          color: "#eee9dc",
          padding: "64px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ font: "500 32px 'Fraunces', serif", margin: "0 0 14px", color: "#ffffff" }}>
            Ready to Explore Smart Tiruppur?
          </h2>
          <p style={{ fontSize: "15px", color: "#a3b0a8", marginBottom: "28px" }}>
            Access role-based workspaces or explore live GIS maps and verified compliance ledgers.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
            <Link
              href="/login"
              style={{
                background: "#3e6b63",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "999px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              Go to Login Portal →
            </Link>
            <Link
              href="/map"
              style={{
                background: "transparent",
                color: "#eee9dc",
                border: "1px solid #4b5850",
                padding: "12px 24px",
                borderRadius: "999px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              View City GIS Map
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
