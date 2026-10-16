"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { Camera, Upload, CheckCircle2, AlertCircle, Scan, Sparkles, RefreshCw } from "lucide-react";

interface QrCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

// Extract verification ID or unit ID from raw string, URL, query parameters, or JSON
export function parseQrScannedCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // 1. JSON payload
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.verification_id) return String(parsed.verification_id);
      if (parsed.id) return String(parsed.id);
      if (parsed.unit_id) return String(parsed.unit_id);
    } catch {}
  }

  // 2. URL or Query string
  if (trimmed.includes("?") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    try {
      const dummyBase = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const url = new URL(trimmed, dummyBase);
      const vId =
        url.searchParams.get("verification_id") ||
        url.searchParams.get("id") ||
        url.searchParams.get("verify") ||
        url.searchParams.get("hash");
      if (vId) return vId;

      const uId = url.searchParams.get("unit_id") || url.searchParams.get("unit");
      if (uId) return uId;

      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length >= 2 && (segments[0] === "verify" || segments[0] === "units")) {
        return segments[1];
      }
    } catch {}
  }

  return trimmed;
}

// Play pleasant confirmation beep using Web Audio API
function playScanSuccessBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {}
}

const SAMPLE_PASSPORTS = [
  { id: "vrf_unit_001_8a9f", unit: "unit_001", name: "Sirupooluvapatti Co-Op (Unit 001)" },
  { id: "vrf_unit_002_4b1c", unit: "unit_002", name: "Mangalam Eco-Processors (Unit 002)" },
  { id: "vrf_unit_003_9c7e", unit: "unit_003", name: "Rayapuram Bleaching (Unit 003)" },
  { id: "vrf_a1b2c3", unit: "unit_001", name: "General Passport (vrf_a1b2c3)" },
];

export default function QrCameraScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: QrCameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const scanLoopRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleDetected = useCallback(
    (rawCode: string) => {
      const cleanCode = parseQrScannedCode(rawCode);
      if (!cleanCode) return;

      playScanSuccessBeep();
      setDetectedCode(cleanCode);
      setIsScanning(false);

      // Stop camera tracks immediately
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }

      // Brief delay to show visual success feedback then deliver code
      setTimeout(() => {
        onScanSuccess(cleanCode);
        onClose();
      }, 700);
    },
    [onScanSuccess, onClose],
  );

  // Initialize and run the video frame scanning loop
  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
      setDetectedCode(null);
      setCameraActive(false);
      setIsScanning(false);
      return;
    }

    setErrorMsg(null);
    setDetectedCode(null);
    let isCancelled = false;

    // Check BarcodeDetector native support
    const hasBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window;
    const barcodeDetector = hasBarcodeDetector
      ? new (window as any).BarcodeDetector({ formats: ["qr_code"] })
      : null;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API is not supported in this browser environment.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setCameraActive(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsScanning(true);
          startScanLoop();
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.warn("Camera access error:", err);
        setCameraActive(false);
        setIsScanning(false);
        setErrorMsg(
          err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
            ? "Camera permission was denied. You can allow camera access or upload an image/use sample passports below."
            : "Live camera stream unavailable. You can upload a QR image or select a sample passport below.",
        );
      }
    }

    let lastScanTime = 0;

    function startScanLoop() {
      function tick(now: number) {
        if (!isOpen || isCancelled) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Throttle scanning to ~15-20 fps to save CPU while maintaining instant response
        if (video && video.readyState >= 2 && video.videoWidth > 0 && now - lastScanTime > 50) {
          lastScanTime = now;

          // 1. Try native BarcodeDetector if available
          if (barcodeDetector) {
            barcodeDetector
              .detect(video)
              .then((barcodes: any[]) => {
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  handleDetected(barcodes[0].rawValue);
                  return;
                }
              })
              .catch(() => {});
          }

          // 2. Decode using jsQR on canvas
          if (canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: "dontInvert",
                });
                if (code && code.data) {
                  handleDetected(code.data);
                  return;
                }
              } catch {}
            }
          }
        }

        scanLoopRef.current = requestAnimationFrame(tick);
      }

      scanLoopRef.current = requestAnimationFrame(tick);
    }

    void startCamera();

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
    };
  }, [isOpen, handleDetected]);

  // Handle uploaded image file (screenshot or photo of QR)
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleDetected(code.data);
        } else {
          setErrorMsg("Could not detect a valid QR code in this image. Please try another image or enter the code manually.");
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    handleDetected(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(8px)",
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
          maxWidth: "520px",
          width: "100%",
          background: "#ffffff",
          border: "1px solid var(--hairline, #e2e8f0)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Scan size={20} color="var(--teal, #0d9488)" />
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
                Scan Garment DPP QR Code
              </h3>
            </div>
            <p className="small muted" style={{ margin: "4px 0 0", fontSize: "12.5px" }}>
              Live optical scanner with instant blockchain ledger verification
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            style={{ fontSize: "18px", cursor: "pointer", padding: "4px 8px", borderRadius: "6px" }}
          >
            ✕
          </button>
        </div>

        {/* Hidden off-screen canvas for frame pixel processing */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Video Viewport Frame */}
        <div
          style={{
            width: "100%",
            height: "280px",
            background: "#090d16",
            borderRadius: "12px",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: detectedCode ? "2px solid #10b981" : "2px solid var(--hairline, #e2e8f0)",
          }}
        >
          {detectedCode ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#ffffff" }}>
              <CheckCircle2 size={48} color="#10b981" style={{ margin: "0 auto 12px" }} />
              <h4 style={{ margin: "0 0 6px", fontSize: "18px", color: "#ffffff" }}>QR Code Detected!</h4>
              <p className="mono" style={{ fontSize: "13px", color: "#34d399", margin: 0 }}>
                {detectedCode}
              </p>
              <p style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "8px" }}>
                Verifying Digital Product Passport…
              </p>
            </div>
          ) : cameraActive ? (
            <>
              <video
                ref={videoRef}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                playsInline
                muted
              />

              {/* Aiming Reticle Frame */}
              <div
                style={{
                  position: "absolute",
                  width: "190px",
                  height: "190px",
                  border: "2px solid #10b981",
                  borderRadius: "16px",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Animated horizontal scanning laser beam */}
                <div
                  style={{
                    width: "100%",
                    height: "2px",
                    background: "linear-gradient(90deg, transparent 0%, #10b981 50%, transparent 100%)",
                    boxShadow: "0 0 8px #10b981",
                    animation: "pulse 1.5s infinite",
                  }}
                />
              </div>

              {/* Status Indicator Pill */}
              <div
                style={{
                  position: "absolute",
                  bottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(0, 0, 0, 0.75)",
                  backdropFilter: "blur(4px)",
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  color: "#ffffff",
                }}
              >
                <span className="pulse" style={{ width: "6px", height: "6px", background: "#10b981" }} />
                <span>Live Optical Sensor Active · Align QR</span>
              </div>
            </>
          ) : (
            <div style={{ padding: "24px", textAlign: "center", color: "#ffffff" }}>
              <Camera size={36} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: "13px", color: "#e2e8f0", margin: "0 0 8px" }}>
                {errorMsg || "Camera stream initializing…"}
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => fileInputRef.current?.click()}
                style={{ fontSize: "12px", padding: "6px 14px", marginTop: "4px" }}
              >
                <Upload size={13} /> Upload QR Image File
              </button>
            </div>
          )}
        </div>

        {/* Scan Actions & Fallbacks */}
        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* File Upload Action */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>Have a screenshot or image?</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Upload size={13} />
              Upload Image / Photo
            </button>
          </div>

          {/* Quick-Test Sample Passports */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Sparkles size={13} color="var(--teal)" />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
                Quick Test with Real Facility Passports:
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {SAMPLE_PASSPORTS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleDetected(sample.id)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid var(--hairline)",
                    background: "#f8fafc",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    textAlign: "left",
                    cursor: "pointer",
                    color: "var(--ink)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--teal)";
                    e.currentTarget.style.background = "var(--teal-soft)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--hairline)";
                    e.currentTarget.style.background = "#f8fafc";
                  }}
                >
                  <span style={{ color: "var(--teal)", fontSize: "10.5px" }}>{sample.unit}</span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {sample.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input */}
          <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: "12px" }}>
            <span style={{ fontSize: "11.5px", color: "var(--ink-soft)", fontWeight: 600, display: "block", marginBottom: "6px" }}>
              Or type / paste verification ID:
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                placeholder="e.g. vrf_unit_001_8a9f or unit_001"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--hairline)",
                  background: "#ffffff",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <button type="button" className="btn" onClick={handleManualSubmit} style={{ fontSize: "12.5px" }}>
                Verify
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
