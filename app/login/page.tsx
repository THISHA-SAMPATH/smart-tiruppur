"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import backdropImg from "@/public/noyyal_green_landscape_backdrop.jpg";

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
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        overflowY: "auto",
        backgroundColor: "#faf9f6",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: "#18181b",
        boxSizing: "border-box",
      }}
    >
      {/* Dedicated Landscape Graphic Pinned to Full Viewport */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
          background: `url(${backdropImg.src}) no-repeat bottom center / cover`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={backdropImg.src}
          alt="Green Landscape Backdrop"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "bottom center",
            display: "block",
          }}
        />
      </div>

      {/* Main Page Layout Container */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        {/* Header Navigation floating over backdrop */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px 44px",
            width: "100%",
            position: "relative",
            zIndex: 30,
            boxSizing: "border-box",
          }}
        >
          {/* Top Left Brand Title & Tagline */}
          <Link
            href="/about"
            style={{
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              position: "relative",
              zIndex: 30,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: "16px",
                color: "#18181b",
                letterSpacing: "-0.02em",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>Tiruppur</span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 7px",
                  borderRadius: "999px",
                  background: "#e0f2fe",
                  color: "#0369a1",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                SMART CITY
              </span>
            </div>
            <span style={{ fontSize: "11.5px", color: "#71717a", fontWeight: 400 }}>
              Noyyal River Basin Environmental Intelligence
            </span>
          </Link>

          {/* Perfectly Centered Professional Logo (No Water Icon) */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 600,
              fontSize: "22px",
              color: "#18181b",
              letterSpacing: "-0.03em",
              pointerEvents: "none",
            }}
          >
            NoyyalSense
          </div>

          {/* Top Right About Link */}
          <Link
            href="/about"
            style={{
              fontSize: "13.5px",
              color: "#18181b",
              textDecoration: "none",
              fontWeight: 600,
              padding: "8px 18px",
              borderRadius: "999px",
              border: "1px solid #e4e4e7",
              background: "#ffffff",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              position: "relative",
              zIndex: 30,
              cursor: "pointer",
            }}
          >
            <span>About</span>
            <span style={{ fontSize: "12px", opacity: 0.6 }}>→</span>
          </Link>
        </header>

        {/* Main Centered Login Card */}
        <main
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px 16px 60px",
            flex: 1,
          }}
        >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            width: "100%",
            maxWidth: "410px",
            padding: "36px 32px 32px",
            boxSizing: "border-box",
          }}
        >
          {/* Card Title & Subtitle */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <h1
              style={{
                fontSize: "25px",
                fontFamily: "'Fraunces', Georgia, serif",
                fontWeight: 500,
                color: "#18181b",
                margin: "0 0 6px",
                letterSpacing: "-0.01em",
              }}
            >
              Log in to NoyyalSense
            </h1>
            <p
              style={{
                fontSize: "13.5px",
                color: "#71717a",
                margin: 0,
              }}
            >
              Sign in to your role-based workspace
            </p>
          </div>

          {/* Quick Role Selection Pills */}
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <button
                type="button"
                onClick={() => selectDemoRole("admin", "admin@smarttiruppur.local")}
                style={{
                  height: "42px",
                  borderRadius: "10px",
                  border: selectedRole === "admin" ? "1.5px solid #18181b" : "1px solid #e4e4e7",
                  background: selectedRole === "admin" ? "#fafafa" : "#ffffff",
                  color: selectedRole === "admin" ? "#18181b" : "#3f3f46",
                  fontWeight: 500,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
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
                  height: "42px",
                  borderRadius: "10px",
                  border: selectedRole === "regulator" ? "1.5px solid #18181b" : "1px solid #e4e4e7",
                  background: selectedRole === "regulator" ? "#fafafa" : "#ffffff",
                  color: selectedRole === "regulator" ? "#18181b" : "#3f3f46",
                  fontWeight: 500,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
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
                  height: "42px",
                  borderRadius: "10px",
                  border: selectedRole === "industry" ? "1.5px solid #18181b" : "1px solid #e4e4e7",
                  background: selectedRole === "industry" ? "#fafafa" : "#ffffff",
                  color: selectedRole === "industry" ? "#18181b" : "#3f3f46",
                  fontWeight: 500,
                  fontSize: "12.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
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
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={() => selectDemoRole("groundwater", "groundwater@smarttiruppur.local")}
                style={{
                  height: "38px",
                  borderRadius: "10px",
                  border: selectedRole === "groundwater" ? "1.5px solid #18181b" : "1px solid #e4e4e7",
                  background: selectedRole === "groundwater" ? "#fafafa" : "#ffffff",
                  color: selectedRole === "groundwater" ? "#18181b" : "#52525b",
                  fontWeight: 500,
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
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
                  border: selectedRole === "citizen" ? "1.5px solid #18181b" : "1px solid #e4e4e7",
                  background: selectedRole === "citizen" ? "#fafafa" : "#ffffff",
                  color: selectedRole === "citizen" ? "#18181b" : "#52525b",
                  fontWeight: 500,
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
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
              margin: "20px 0",
              color: "#a1a1aa",
              fontSize: "12px",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "#f4f4f5" }} />
            <span style={{ padding: "0 10px", color: "#a1a1aa" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "#f4f4f5" }} />
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fee2e2",
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

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#3f3f46",
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
                  padding: "12px 14px",
                  border: "1px solid #e4e4e7",
                  borderRadius: "10px",
                  background: "#ffffff",
                  color: "#18181b",
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
                    color: "#3f3f46",
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
                  padding: "12px 14px",
                  border: "1px solid #e4e4e7",
                  borderRadius: "10px",
                  background: "#ffffff",
                  color: "#18181b",
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
                background: "#18181b",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "13px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                marginTop: "4px",
                transition: "background 0.15s ease",
              }}
            >
              {loading ? "Authenticating session…" : "Continue with Email"}
            </button>
          </form>

          <p
            style={{
              fontSize: "12.5px",
              color: "#71717a",
              textAlign: "center",
              marginTop: "20px",
              marginBottom: 0,
            }}
          >
            Don&rsquo;t have an account?{" "}
            <a
              href="mailto:admin@smarttiruppur.local"
              style={{
                color: "#18181b",
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
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ color: "#71717a", fontSize: "14px" }}>Loading portal…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

