"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

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

  const selectDemoRole = (roleKey: string, demoEmail: string) => {
    setSelectedRole(roleKey);
    setEmail(demoEmail);
    setPassword("SmartTiruppur2026!");
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#faf9f5 url('/noyyal_green_landscape_backdrop.jpg') no-repeat bottom center / cover",
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#0f172a",
        position: "relative",
      }}
    >
      {/* Top Header Navigation */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px 44px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: "14px",
            color: "#334155",
            textDecoration: "none",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ← Back
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 700,
            fontSize: "18px",
            letterSpacing: "-0.02em",
          }}
        >
          <span
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "#0284c7",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
            }}
          >
            💧
          </span>
          <span>NoyyalSense</span>
        </div>

        <a
          href="mailto:support@smarttiruppur.local"
          style={{
            fontSize: "13.5px",
            color: "#334155",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Contact support
        </a>
      </header>

      {/* Main Centered Login Card */}
      <main
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "10px 16px 70px",
          flex: 1,
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.97)",
            backdropFilter: "blur(12px)",
            borderRadius: "20px",
            boxShadow: "0 25px 60px rgba(15, 23, 42, 0.1), 0 4px 16px rgba(0, 0, 0, 0.03)",
            border: "1px solid rgba(226, 232, 240, 0.9)",
            width: "100%",
            maxWidth: "430px",
            padding: "36px 36px 32px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "22px" }}>
            <h1
              style={{
                fontSize: "26px",
                fontFamily: "'Fraunces', serif",
                fontWeight: 600,
                color: "#0f172a",
                margin: "0 0 6px",
                letterSpacing: "-0.01em",
              }}
            >
              Log in to NoyyalSense
            </h1>
            <p
              style={{
                fontSize: "13.5px",
                color: "#64748b",
                margin: 0,
              }}
            >
              Sign in to your role-based workspace
            </p>
          </div>

          {/* Quick Social / Role Pills Bar matching reference screenshot */}
          <div style={{ marginBottom: "18px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
                marginBottom: "8px",
              }}
            >
              <button
                type="button"
                onClick={() => selectDemoRole("admin", "admin@smarttiruppur.local")}
                style={{
                  height: "44px",
                  borderRadius: "10px",
                  border: selectedRole === "admin" ? "2px solid #0284c7" : "1px solid #e2e8f0",
                  background: selectedRole === "admin" ? "#f0f9ff" : "#ffffff",
                  color: selectedRole === "admin" ? "#0369a1" : "#334155",
                  fontWeight: 600,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "all 0.15s ease",
                }}
              >
                <span>👑</span>
                <span>Admin</span>
              </button>

              <button
                type="button"
                onClick={() => selectDemoRole("regulator", "regulator@smarttiruppur.local")}
                style={{
                  height: "44px",
                  borderRadius: "10px",
                  border: selectedRole === "regulator" ? "2px solid #0284c7" : "1px solid #e2e8f0",
                  background: selectedRole === "regulator" ? "#f0f9ff" : "#ffffff",
                  color: selectedRole === "regulator" ? "#0369a1" : "#334155",
                  fontWeight: 600,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "all 0.15s ease",
                }}
              >
                <span>🛡️</span>
                <span>Regulator</span>
              </button>

              <button
                type="button"
                onClick={() => selectDemoRole("industry", "industry@smarttiruppur.local")}
                style={{
                  height: "44px",
                  borderRadius: "10px",
                  border: selectedRole === "industry" ? "2px solid #0284c7" : "1px solid #e2e8f0",
                  background: selectedRole === "industry" ? "#f0f9ff" : "#ffffff",
                  color: selectedRole === "industry" ? "#0369a1" : "#334155",
                  fontWeight: 600,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "all 0.15s ease",
                }}
              >
                <span>🏭</span>
                <span>Industry</span>
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => selectDemoRole("groundwater", "groundwater@smarttiruppur.local")}
                style={{
                  height: "38px",
                  borderRadius: "10px",
                  border: selectedRole === "groundwater" ? "2px solid #0284c7" : "1px solid #e2e8f0",
                  background: selectedRole === "groundwater" ? "#f0f9ff" : "#ffffff",
                  color: selectedRole === "groundwater" ? "#0369a1" : "#475569",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "all 0.15s ease",
                }}
              >
                <span>🌐</span>
                <span>GW Officer</span>
              </button>

              <button
                type="button"
                onClick={() => selectDemoRole("citizen", "citizen@smarttiruppur.local")}
                style={{
                  height: "38px",
                  borderRadius: "10px",
                  border: selectedRole === "citizen" ? "2px solid #0284c7" : "1px solid #e2e8f0",
                  background: selectedRole === "citizen" ? "#f0f9ff" : "#ffffff",
                  color: selectedRole === "citizen" ? "#0369a1" : "#475569",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "all 0.15s ease",
                }}
              >
                <span>👤</span>
                <span>Citizen</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              margin: "18px 0",
              color: "#94a3b8",
              fontSize: "12px",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
            <span style={{ padding: "0 12px" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
          </div>

          {/* Error Message Display */}
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "10px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Email address
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
                  padding: "11px 14px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <label
                  htmlFor="login-password"
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#334155",
                  }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: "#0284c7",
                    fontSize: "12.5px",
                    fontWeight: 500,
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
                  padding: "11px 14px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "#1e293b",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "13px",
                fontSize: "14.5px",
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                marginTop: "6px",
                transition: "background 0.2s ease",
              }}
            >
              {loading ? "Authenticating session…" : "Continue with Email"}
            </button>
          </form>

          <p
            style={{
              fontSize: "12.5px",
              color: "#64748b",
              textAlign: "center",
              marginTop: "20px",
              marginBottom: 0,
            }}
          >
            Don&rsquo;t have an account?{" "}
            <a
              href="mailto:admin@smarttiruppur.local"
              style={{
                color: "#0f172a",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Sign up
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ color: "#64748b", fontSize: "14px" }}>Loading portal…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
