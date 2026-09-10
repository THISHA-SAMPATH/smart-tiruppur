"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorBanner } from "@/components/StaleBanner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }

      // Redirect to role dashboard or callback URL
      const role = data.user?.role;
      let targetPath = callbackUrl;

      if (callbackUrl === "/dashboard" || callbackUrl === "/") {
        switch (role) {
          case "ADMIN":
            targetPath = "/admin";
            break;
          case "REGULATOR":
            targetPath = "/regulator";
            break;
          case "INDUSTRY":
            targetPath = "/industry";
            break;
          case "GROUNDWATER_OFFICER":
            targetPath = "/groundwater";
            break;
          case "CITIZEN":
            targetPath = "/citizen";
            break;
          default:
            targetPath = "/";
        }
      }

      router.push(targetPath);
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const setDemoUser = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("SmartTiruppur2026!");
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "32px 28px",
          boxShadow: "0 12px 30px rgba(31,42,36,0.06)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <p className="eyebrow" style={{ marginBottom: "6px" }}>
            <span className="pulse" /> CIVIC INTELLIGENCE PORTAL
          </p>
          <h1
            style={{
              fontSize: "28px",
              fontFamily: "Fraunces, serif",
              marginBottom: "8px",
            }}
          >
            NoyyalSense<span style={{ color: "var(--teal)" }}>TN</span>
          </h1>
          <p className="muted small" style={{ margin: 0 }}>
            Sign in to access your role-based Smart Tiruppur workspace
          </p>
        </div>

        {error && <ErrorBanner message={error} />}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "18px" }}>
          <div>
            <label
              htmlFor="login-email"
              className="small muted"
              style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}
            >
              Email Address / Username
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. regulator@smarttiruppur.local"
              required
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--radius-sm)",
                background: "var(--paper)",
                color: "var(--ink)",
                fontSize: "14px",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "6px",
              }}
            >
              <label
                htmlFor="login-password"
                className="small muted"
                style={{ fontWeight: 500 }}
              >
                Password
              </label>
              <button
                type="button"
                className="text-link small"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "var(--teal)",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--radius-sm)",
                background: "var(--paper)",
                color: "var(--ink)",
                fontSize: "14px",
                fontFamily: "inherit",
              }}
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn"
            disabled={loading}
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "11px",
              marginTop: "6px",
            }}
          >
            {loading ? "Authenticating session…" : "Sign In to Workspace →"}
          </button>
        </form>

        <div className="hairline" style={{ margin: "24px 0 18px" }} />

        <div style={{ fontSize: "12.5px" }}>
          <p
            className="muted small"
            style={{ fontWeight: 600, marginBottom: "10px" }}
          >
            QUICK DEMO ACCOUNTS (DEVELOPMENT ONLY):
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
            }}
          >
            <button
              type="button"
              className="scenario-button"
              onClick={() => setDemoUser("admin@smarttiruppur.local")}
            >
              Admin
            </button>
            <button
              type="button"
              className="scenario-button"
              onClick={() => setDemoUser("regulator@smarttiruppur.local")}
            >
              Regulator
            </button>
            <button
              type="button"
              className="scenario-button"
              onClick={() => setDemoUser("industry@smarttiruppur.local")}
            >
              Industry (Unit 001)
            </button>
            <button
              type="button"
              className="scenario-button"
              onClick={() => setDemoUser("groundwater@smarttiruppur.local")}
            >
              GW Officer
            </button>
            <button
              type="button"
              className="scenario-button"
              onClick={() => setDemoUser("citizen@smarttiruppur.local")}
            >
              Citizen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
