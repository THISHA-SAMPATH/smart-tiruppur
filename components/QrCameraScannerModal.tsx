"use client";

import { useEffect, useRef, useState } from "react";

interface QrCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

export default function QrCameraScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: QrCameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;

    if (isOpen) {
      setErrorMsg(null);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: "environment" } })
          .then((s) => {
            stream = s;
            if (videoRef.current) {
              videoRef.current.srcObject = s;
              videoRef.current.play().catch(() => {});
            }
          })
          .catch((err) => {
            console.warn("Camera access failed or unavailable:", err);
            setErrorMsg(
              "Camera stream unavailable or permission denied. You can enter or simulate a code below."
            );
          });
      } else {
        setErrorMsg("Camera access not supported on this device/browser.");
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulatedScan = (codeToUse?: string) => {
    const target = codeToUse || manualCode || "vrf_a1b2c3";
    onScanSuccess(target);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "var(--paper, #18191c)",
          border: "1px solid var(--hairline, #333)",
          borderRadius: "12px",
          padding: "24px",
          color: "var(--fg, #eee)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px" }}>📷 Scan Garment QR Code</h3>
            <p className="small muted" style={{ margin: "4px 0 0" }}>
              Align garment tag QR code inside frame
            </p>
          </div>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ fontSize: "20px", cursor: "pointer", padding: "4px 8px" }}
          >
            ✕
          </button>
        </div>

        {/* Video Viewport Frame */}
        <div
          style={{
            width: "100%",
            height: "260px",
            background: "#000",
            borderRadius: "8px",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px dashed var(--indigo-soft, #4f46e5)",
          }}
        >
          {errorMsg ? (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <p className="small" style={{ color: "#f87171", margin: "0 0 12px" }}>
                {errorMsg}
              </p>
              <button
                className="btn"
                onClick={() => handleSimulatedScan("vrf_a1b2c3")}
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                ⚡ Use Sample QR Passport (vrf_a1b2c3)
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                playsInline
                muted
              />
              {/* Target Bounding Frame Overlay */}
              <div
                style={{
                  position: "absolute",
                  width: "180px",
                  height: "180px",
                  border: "2px solid #22c55e",
                  borderRadius: "12px",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)",
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ width: "100%", height: "2px", background: "rgba(34,197,94,0.8)" }} />
              </div>
            </>
          )}
        </div>

        {/* Quick ID Input Fallback */}
        <div style={{ marginTop: "20px" }}>
          <p className="small muted" style={{ margin: "0 0 6px" }}>
            Or type/paste verification hash manually:
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. vrf_a1b2c3"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--hairline, #444)",
                background: "var(--paper, #222)",
                color: "inherit",
              }}
            />
            <button className="btn" onClick={() => handleSimulatedScan()}>
              Load
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
