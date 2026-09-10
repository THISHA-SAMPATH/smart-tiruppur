"use client";

import { useState, useEffect } from "react";
import LoginPage from "@/app/login/page";

const FULL_TEXT = "Tiruppur";

export default function HomePage() {
  const [displayedText, setDisplayedText] = useState("");
  const [isSliding, setIsSliding] = useState(false);
  const [isDoneSliding, setIsDoneSliding] = useState(false);

  useEffect(() => {
    let index = 0;
    // Typewriter effect: 130ms per character
    const typeInterval = setInterval(() => {
      if (index < FULL_TEXT.length) {
        setDisplayedText(FULL_TEXT.slice(0, index + 1));
        index++;
      } else {
        clearInterval(typeInterval);
        // Wait 1.4 seconds after typing completes, then slide right
        setTimeout(() => {
          setIsSliding(true);
          setTimeout(() => {
            setIsDoneSliding(true);
          }, 900);
        }, 1400);
      }
    }, 130);

    return () => clearInterval(typeInterval);
  }, []);

  const handleSkip = () => {
    setIsSliding(true);
    setTimeout(() => {
      setIsDoneSliding(true);
    }, 900);
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", background: "#faf9f5" }}>
      {/* Background Login Page (Revealed after slide) */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <LoginPage />
      </div>

      {/* Intro Overlay Panel (Slides to the right) */}
      {!isDoneSliding && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 10000,
            background: "#faf9f5",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "40px 24px",
            boxSizing: "border-box",
            transform: isSliding ? "translateX(100vw)" : "translateX(0)",
            transition: "transform 0.85s cubic-bezier(0.77, 0, 0.175, 1)",
            boxShadow: isSliding ? "-25px 0 60px rgba(0, 0, 0, 0.15)" : "none",
          }}
        >
          {/* Skip Intro Link */}
          <button
            type="button"
            onClick={handleSkip}
            style={{
              position: "absolute",
              top: "28px",
              right: "36px",
              background: "none",
              border: "1px solid #d8d0bc",
              borderRadius: "999px",
              padding: "8px 18px",
              fontSize: "13px",
              fontWeight: 500,
              color: "#4b5850",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Skip Intro →
          </button>

          {/* Centered Typewriter Intro Content */}
          <div
            style={{
              maxWidth: "720px",
              width: "100%",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <p
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "12px",
                letterSpacing: "0.12em",
                color: "#3e6b63",
                textTransform: "uppercase",
                margin: "0 0 10px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#73a58e",
                  display: "inline-block",
                }}
              />
              NoyyalSense · Environmental Intelligence
            </p>

            <p
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "12px",
                letterSpacing: "0.1em",
                color: "#4b5850",
                textTransform: "uppercase",
                margin: "0 0 24px",
              }}
            >
              TIRUPPUR, TAMIL NADU
            </p>

            {/* Typewriter Title */}
            <h1
              style={{
                fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: "clamp(60px, 9vw, 115px)",
                fontWeight: 600,
                letterSpacing: "-0.08em",
                lineHeight: 0.85,
                color: "#17251e",
                margin: "0 0 28px",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <span>{displayedText}</span>
              <span
                style={{
                  color: "#3e6b63",
                  marginLeft: "4px",
                  fontWeight: 300,
                }}
              >
                |
              </span>
            </h1>

            {/* Tagline & Subtitle */}
            <p
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: "clamp(26px, 3.5vw, 42px)",
                lineHeight: 1.1,
                margin: "0 0 16px",
                letterSpacing: "-0.03em",
                color: "#1f2a24",
              }}
            >
              Industry that can <em style={{ color: "#3e6b63", fontStyle: "italic", fontWeight: 400 }}>account for its water.</em>
            </p>

            <p
              style={{
                maxWidth: "520px",
                color: "#4b5850",
                fontSize: "15.5px",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              A single civic intelligence layer for discharge evidence, groundwater stewardship and accountable regulatory decisions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
