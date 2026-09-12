"use client";

import { useState } from "react";
import TnpcbAuditReportModal from "@/components/TnpcbAuditReportModal";

export default function TnpcbReportButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="btn"
        onClick={() => setIsOpen(true)}
        style={{
          background: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
          color: "#ffffff",
          border: "none",
          boxShadow: "0 4px 12px rgba(21, 128, 61, 0.3)",
        }}
      >
        📄 Export TNPCB Audit Report ↗
      </button>

      <TnpcbAuditReportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
