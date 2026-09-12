"use client";

import { useState } from "react";
import DailyWaterSafetyCard from "@/components/DailyWaterSafetyCard";
import CitizenEcoRewardsSection from "@/components/CitizenEcoRewardsSection";
import WhatsAppSubscribeModal from "@/components/WhatsAppSubscribeModal";

export default function CitizenWorkspaceClient() {
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);

  return (
    <>
      {/* WhatsApp Subscription Trigger Bar */}
      <div
        style={{
          background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
          color: "#ffffff",
          borderRadius: "8px",
          padding: "12px 18px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "0 4px 14px rgba(16, 185, 129, 0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>📲</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "14.5px" }}>
              Get Daily Morning Water Safety Alerts on WhatsApp
            </p>
            <p style={{ margin: 0, fontSize: "12px", opacity: 0.9 }}>
              Free 08:00 AM daily updates on tap TDS, hardness, and neighborhood safety scores.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsWaModalOpen(true)}
          style={{
            background: "#ffffff",
            color: "#047857",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          Subscribe Free 💬
        </button>
      </div>

      {/* 1. Daily Neighborhood Water Score */}
      <DailyWaterSafetyCard />

      {/* 2. Garment Eco Rewards & Sentinel Badges */}
      <CitizenEcoRewardsSection />

      {/* WhatsApp Modal */}
      <WhatsAppSubscribeModal
        isOpen={isWaModalOpen}
        onClose={() => setIsWaModalOpen(false)}
      />
    </>
  );
}
