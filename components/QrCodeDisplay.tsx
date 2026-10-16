"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
  title?: string;
  showDownload?: boolean;
}

export default function QrCodeDisplay({
  value,
  size = 120,
  className = "",
  title,
  showDownload = false,
}: QrCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!value) return;

    let isMounted = true;
    QRCode.toDataURL(value, {
      width: size * 2, // 2x for retina sharpness
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setError(false);
        }
      })
      .catch((err) => {
        console.error("QR Code Generation Error:", err);
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `DPP_QR_${encodeURIComponent(value.slice(0, 16))}.png`;
    a.click();
  };

  if (error || !dataUrl) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          border: "1px dashed #cbd5e1",
          borderRadius: "6px",
          fontSize: "11px",
          color: "#94a3b8",
          textAlign: "center",
          padding: "6px",
        }}
      >
        QR Loading…
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={title || `QR Code for ${value}`}
        width={size}
        height={size}
        style={{
          borderRadius: "6px",
          background: "#ffffff",
          padding: "4px",
          border: "1px solid var(--hairline, #e2e8f0)",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          display: "block",
        }}
        title={title || `Scan to verify: ${value}`}
      />
      {showDownload && (
        <button
          type="button"
          onClick={handleDownload}
          style={{
            fontSize: "10.5px",
            background: "transparent",
            border: "none",
            color: "var(--teal, #0d9488)",
            cursor: "pointer",
            fontWeight: 600,
            textDecoration: "underline",
            padding: "2px 4px",
          }}
        >
          Download QR
        </button>
      )}
    </div>
  );
}
