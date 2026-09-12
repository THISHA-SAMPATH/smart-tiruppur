"use client";

import { useState } from "react";

interface WhatsAppSubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsAppSubscribeModal({
  isOpen,
  onClose,
}: WhatsAppSubscribeModalProps) {
  const [phone, setPhone] = useState("");
  const [neighborhood, setNeighborhood] = useState("Avinashi Road");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setSuccess(true);
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
          maxWidth: "420px",
          width: "100%",
          background: "var(--paper, #18191c)",
          border: "1px solid var(--hairline, #333)",
          borderRadius: "12px",
          padding: "24px",
          color: "inherit",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px" }}>📲 Morning WhatsApp Water Alert</h3>
            <p className="small muted" style={{ margin: "4px 0 0" }}>
              Get daily 08:00 AM water safety alerts on your phone
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

        {success ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <span style={{ fontSize: "40px" }}>✅</span>
            <h4 style={{ margin: "10px 0 4px", fontSize: "16px", color: "#22c55e" }}>
              Subscribed Successfully!
            </h4>
            <p className="small muted" style={{ margin: "0 0 16px" }}>
              You will receive daily morning WhatsApp updates for <strong>{neighborhood}</strong> at +91 {phone}.
            </p>
            <button className="btn" onClick={onClose} style={{ width: "100%" }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "14px" }}>
              <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>
                Select Your Locality / Neighborhood:
              </label>
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--hairline)",
                  background: "var(--surface, #222)",
                  color: "inherit",
                }}
              >
                <option value="Avinashi Road">Avinashi Road / North City</option>
                <option value="Velampalayam">Velampalayam & West Ward</option>
                <option value="Kumaran Road">Kumaran Road & Market Hub</option>
                <option value="Dharapuram Road">Dharapuram Road & South Sector</option>
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>
                WhatsApp Mobile Number:
              </label>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span className="mono small" style={{ padding: "8px", background: "var(--hairline)", borderRadius: "4px" }}>
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98765 43210"
                  required
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--hairline)",
                    background: "var(--surface, #222)",
                    color: "inherit",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn"
              style={{
                width: "100%",
                background: "#25d366",
                color: "#fff",
                border: "none",
                fontWeight: 700,
              }}
            >
              Start Free WhatsApp Alerts 💬
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
