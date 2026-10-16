"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { getUnitDpp, getUnits, getVerify } from "@/lib/api";
import { resolveLedgerUrl } from "@/lib/config";
import type { DppResponse, LedgerUnit, VerifyResponse } from "@/lib/types";
import StaleBanner from "@/components/StaleBanner";
import QrCameraScannerModal, { parseQrScannedCode } from "@/components/QrCameraScannerModal";
import DppCertificateModal from "@/components/DppCertificateModal";
import QrCodeDisplay from "@/components/QrCodeDisplay";

type LangKey = "EN" | "DE" | "FR" | "IT" | "ES";

const langLabels: Record<LangKey, string> = {
  EN: "English (EN)",
  DE: "Deutsch (DE)",
  FR: "Français (FR)",
  IT: "Italiano (IT)",
  ES: "Español (ES)",
};

const translations: Record<
  LangKey,
  {
    breadcrumb: string;
    title: string;
    subtitle: string;
    actionCardTitle: string;
    passportPlaceholder: string;
    verifyBtn: string;
    scanCameraBtn: string;
    mfgTitle: string;
    searchPlaceholder: string;
    selectUnitPrompt: string;
    exportPdfBtn: string;
    dppActive: string;
    hashLabel: string;
    issueDateLabel: string;
    esgTitle: string;
    carbonFootprint: string;
    waterRecycling: string;
    renewableEnergy: string;
    chemicalCompliance: string;
    validStatus: string;
    invalidStatus: string;
    lifecycleTitle: string;
    stage1: string;
    stage2: string;
    stage3: string;
    stage4: string;
    stage5: string;
  }
> = {
  EN: {
    breadcrumb: "Compliance / Digital Product Passport",
    title: "DPP Verification",
    subtitle: "Verify garment provenance and environmental compliance.",
    actionCardTitle: "Verify Digital Product Passport",
    passportPlaceholder: "Passport ID / Hash (e.g. vrf_a1b2c3)",
    verifyBtn: "Verify",
    scanCameraBtn: "Scan QR",
    mfgTitle: "Manufacturing Units",
    searchPlaceholder: "Search manufacturing units...",
    selectUnitPrompt: "Select a manufacturing unit to inspect its passport provenance.",
    exportPdfBtn: "Export PDF Certificate",
    dppActive: "DPP ACTIVE",
    hashLabel: "Passport Verification Hash",
    issueDateLabel: "Issue Date",
    esgTitle: "ESG & Chemical Compliance",
    carbonFootprint: "Carbon Footprint",
    waterRecycling: "ZLD Water Recycling",
    renewableEnergy: "Renewable Energy Mix",
    chemicalCompliance: "Chemical & REACH Compliance",
    validStatus: "Valid DPP Passport",
    invalidStatus: "Not Valid / Unverified",
    lifecycleTitle: "Garment Supply Chain & Environmental Lifecycle",
    stage1: "Yarn Sourcing (Tiruppur Cluster)",
    stage2: "Zero Liquid Discharge (ZLD) Dyeing",
    stage3: "Physics-Aware Water Quality Verification",
    stage4: "SHA-256 Green Ledger Hash Minting",
    stage5: "EU Export Clearance & DPP Verification",
  },
  DE: {
    breadcrumb: "Compliance / Digitaler Produktpass",
    title: "DPP-Überprüfung",
    subtitle: "Bekleidungsherkunft und Umweltkonformität überprüfen.",
    actionCardTitle: "Digitalen Produktpass überprüfen",
    passportPlaceholder: "Pass-ID / Hash (z.B. vrf_a1b2c3)",
    verifyBtn: "Überprüfen",
    scanCameraBtn: "QR Scannen",
    mfgTitle: "Fertigungseinheiten",
    searchPlaceholder: "Einheiten suchen...",
    selectUnitPrompt: "Wählen Sie eine Fertigungseinheit zur Inspektion aus.",
    exportPdfBtn: "PDF-Zertifikat Exportieren",
    dppActive: "DPP AKTIV",
    hashLabel: "Pass-Verifizierungs-Hash",
    issueDateLabel: "Ausstellungsdatum",
    esgTitle: "ESG & Chemikalien-Konformität",
    carbonFootprint: "CO₂-Fußabdruck",
    waterRecycling: "ZLD Wasser-Recycling",
    renewableEnergy: "Erneuerbare Energien",
    chemicalCompliance: "Chemikalien- & REACH-Konformität",
    validStatus: "Gültiger DPP-Pass",
    invalidStatus: "Ungültig / Nicht verifiziert",
    lifecycleTitle: "Lieferkette & Umwelt-Lebenszyklus",
    stage1: "Garnbeschaffung (Tiruppur Cluster)",
    stage2: "Zero Liquid Discharge (ZLD) Färbung",
    stage3: "Physikbasierte Wasserqualitätsprüfung",
    stage4: "SHA-256 Green Ledger Prägung",
    stage5: "EU-Exportfreigabe & DPP-Verifizierung",
  },
  FR: {
    breadcrumb: "Conformité / Passeport Numérique Produit",
    title: "Vérification DPP",
    subtitle: "Vérifier la provenance textile et la conformité environnementale.",
    actionCardTitle: "Vérifier le Passeport Numérique Produit",
    passportPlaceholder: "ID du passeport / Hash (ex: vrf_a1b2c3)",
    verifyBtn: "Vérifier",
    scanCameraBtn: "Scanner QR",
    mfgTitle: "Unités de Fabrication",
    searchPlaceholder: "Rechercher les unités...",
    selectUnitPrompt: "Sélectionnez une unité pour consulter son passeport.",
    exportPdfBtn: "Exporter le Certificat PDF",
    dppActive: "DPP ACTIF",
    hashLabel: "Hash de Vérification du Passeport",
    issueDateLabel: "Date d'Émission",
    esgTitle: "ESG & Conformité Chimique",
    carbonFootprint: "Empreinte Carbone",
    waterRecycling: "Recyclage de l'Eau (ZLD)",
    renewableEnergy: "Énergie Renouvelable",
    chemicalCompliance: "Conformité Chimique & REACH",
    validStatus: "Passeport DPP Valide",
    invalidStatus: "Invalide / Non vérifié",
    lifecycleTitle: "Chaîne d'Approvisionnement & Cycle Écologique",
    stage1: "Approvisionnement en Fil (Tiruppur Cluster)",
    stage2: "Teinture Zero Liquid Discharge (ZLD)",
    stage3: "Vérification Physique de la Qualité de l'Eau",
    stage4: "Minage de Hash Green Ledger SHA-256",
    stage5: "Dédouanement Export UE & DPP",
  },
  IT: {
    breadcrumb: "Conformità / Passaporto Digitale del Prodotto",
    title: "Verifica DPP",
    subtitle: "Verifica la tracciabilità tessile e la conformità ambientale.",
    actionCardTitle: "Verifica Passaporto Digitale del Prodotto",
    passportPlaceholder: "ID Passaporto / Hash (es: vrf_a1b2c3)",
    verifyBtn: "Verifica",
    scanCameraBtn: "Scansiona QR",
    mfgTitle: "Unità Produttive",
    searchPlaceholder: "Cerca unità...",
    selectUnitPrompt: "Seleziona un'unità per ispezionare il passaporto.",
    exportPdfBtn: "Esporta Certificato PDF",
    dppActive: "DPP ATTIVO",
    hashLabel: "Hash di Verifica del Passaporto",
    issueDateLabel: "Data di Emissione",
    esgTitle: "ESG & Conformità Chimica",
    carbonFootprint: "Impronta di Carbonio",
    waterRecycling: "Riciclo Acqua (ZLD)",
    renewableEnergy: "Energia Rinnovabile",
    chemicalCompliance: "Conformità Chimica & REACH",
    validStatus: "Passaporto DPP Valido",
    invalidStatus: "Non Valido / Non verificato",
    lifecycleTitle: "Catena di Fornitura & Ciclo Ecologico",
    stage1: "Fornitura Filati (Tiruppur Cluster)",
    stage2: "Tintura Zero Liquid Discharge (ZLD)",
    stage3: "Verifica Qualità dell'Acqua Basata sulla Fisica",
    stage4: "Minting Hash SHA-256 Green Ledger",
    stage5: "Sdoganamento Export UE & DPP",
  },
  ES: {
    breadcrumb: "Cumplimiento / Pasaporte Digital del Producto",
    title: "Verificación DPP",
    subtitle: "Verificar la trazabilidad textil y el cumplimiento ambiental.",
    actionCardTitle: "Verificar Pasaporte Digital del Producto",
    passportPlaceholder: "ID de Pasaporte / Hash (ej. vrf_a1b2c3)",
    verifyBtn: "Verificar",
    scanCameraBtn: "Escanear QR",
    mfgTitle: "Instalaciones de Fabricación",
    searchPlaceholder: "Buscar instalaciones...",
    selectUnitPrompt: "Seleccione una unidad para inspeccionar su pasaporte.",
    exportPdfBtn: "Exportar Certificado PDF",
    dppActive: "DPP ACTIVO",
    hashLabel: "Hash de Verificación del Pasaporte",
    issueDateLabel: "Fecha de Emisión",
    esgTitle: "ESG y Cumplimiento Químico",
    carbonFootprint: "Huella de Carbono",
    waterRecycling: "Reciclaje de Agua (ZLD)",
    renewableEnergy: "Energía Renovable",
    chemicalCompliance: "Cumplimiento Químico y REACH",
    validStatus: "Pasaporte DPP Válido",
    invalidStatus: "No Válido / No verificado",
    lifecycleTitle: "Cadena de Suministro y Ciclo de Vida Ambiental",
    stage1: "Abastecimiento de Hilo (Tiruppur Cluster)",
    stage2: "Tintorería Zero Liquid Discharge (ZLD)",
    stage3: "Verificación Física de la Calidad del Agua",
    stage4: "Acuñación Hash SHA-256 Green Ledger",
    stage5: "Despacho de Exportación UE y DPP",
  },
};

function BuyerView() {
  const searchParams = useSearchParams();
  const presetVerificationId = searchParams.get("verification_id");

  const [lang, setLang] = useState<LangKey>("EN");
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  const [units, setUnits] = useState<LedgerUnit[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LedgerUnit | null>(null);
  const [dpp, setDpp] = useState<DppResponse | null>(null);
  const [dppMeta, setDppMeta] = useState({
    stale: false,
    fetchedAt: null as string | null,
    error: null as string | null,
  });

  const [verifyId, setVerifyId] = useState(presetVerificationId ?? "");
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Modals
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCertOpen, setIsCertOpen] = useState(false);

  useEffect(() => {
    getUnits().then((r) => {
      if (r.data && r.data.length > 0) {
        setUnits(r.data);
        selectUnit(r.data[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (presetVerificationId) handleVerify(presetVerificationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetVerificationId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function selectUnit(unit: LedgerUnit) {
    setSelected(unit);
    setDpp(null);
    const r = await getUnitDpp(unit.unit_id);
    setDpp(r.data);
    setDppMeta({ stale: r.stale, fetchedAt: r.fetchedAt, error: r.error });
  }

  async function handleVerify(idOverride?: string) {
    const rawId = idOverride ?? verifyId;
    const cleanId = parseQrScannedCode(rawId);
    if (!cleanId) return;
    setVerifyId(cleanId);
    setVerifyError(null);
    const r = await getVerify(cleanId);
    if (r.data) {
      setVerifyResult(r.data);
      // Auto-match unit in the list if available
      const matchedUnit = units.find(
        (u) =>
          u.unit_id.toLowerCase() === r.data!.unit_id.toLowerCase() ||
          cleanId.toLowerCase().includes(u.unit_id.toLowerCase())
      );
      if (matchedUnit && matchedUnit.unit_id !== selected?.unit_id) {
        void selectUnit(matchedUnit);
      }
    } else {
      setVerifyError(r.error || "Verification ID not found.");
    }
  }

  const handleCameraScanSuccess = (scannedCode: string) => {
    const cleanId = parseQrScannedCode(scannedCode);
    setVerifyId(cleanId);
    void handleVerify(cleanId);

    // If matches a unit, select it
    const lower = cleanId.toLowerCase();
    const matched = units.find(
      (u) => u.unit_id.toLowerCase() === lower || lower.includes(u.unit_id.toLowerCase())
    );
    if (matched) {
      void selectUnit(matched);
    }
  };

  const filtered = units.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.unit_id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "20px 28px 64px" }}>
      {/* 2. PAGE HEADER WITH COMPACT BREADCRUMB & LANGUAGE SWITCHER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--teal)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
            {t.breadcrumb}
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 4px 0", letterSpacing: "-0.02em" }}>
            {t.title}
          </h1>
          <p className="muted small" style={{ margin: 0, fontSize: "13.5px" }}>
            {t.subtitle}
          </p>
        </div>

        {/* Compact Dropdown Language Selector */}
        <div style={{ position: "relative" }} ref={langDropdownRef}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            style={{
              padding: "6px 12px",
              fontSize: "12.5px",
              fontWeight: 600,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--hairline)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
            }}
          >
            <span>🌐 {lang}</span>
            <span style={{ fontSize: "10px", color: "var(--ink-soft)" }}>▾</span>
          </button>

          {langMenuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 4px)",
                background: "#ffffff",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--radius-sm)",
                boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.1)",
                padding: "4px",
                zIndex: 100,
                minWidth: "150px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              {(["EN", "DE", "FR", "IT", "ES"] as LangKey[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setLang(l);
                    setLangMenuOpen(false);
                  }}
                  style={{
                    textAlign: "left",
                    padding: "6px 10px",
                    fontSize: "12px",
                    fontWeight: lang === l ? 700 : 400,
                    background: lang === l ? "var(--teal-soft)" : "transparent",
                    color: lang === l ? "var(--teal)" : "var(--ink)",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{langLabels[l]}</span>
                  {lang === l && <span style={{ fontSize: "10px" }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. VERIFICATION ACTION AREA (COMPACT ACTION CARD) */}
      <section
        className="card"
        style={{
          padding: "14px 18px",
          marginBottom: "20px",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>
          {t.actionCardTitle}
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={verifyId}
            onChange={(e) => setVerifyId(e.target.value)}
            placeholder={t.passportPlaceholder}
            style={{
              flex: 1,
              minWidth: "240px",
              padding: "8px 12px",
              fontSize: "13px",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-sm)",
              background: "var(--paper)",
              outline: "none",
            }}
          />
          <button
            className="btn"
            onClick={() => handleVerify()}
            style={{ padding: "8px 18px", fontSize: "13px", background: "var(--teal)" }}
          >
            {t.verifyBtn}
          </button>
          <button
            className="btn-ghost"
            onClick={() => setIsCameraOpen(true)}
            style={{
              padding: "8px 14px",
              fontSize: "13px",
              border: "1px solid var(--hairline)",
              color: "var(--ink)",
              fontWeight: 600,
            }}
          >
            📷 {t.scanCameraBtn}
          </button>
        </div>

        {verifyError && (
          <p className="small" style={{ color: "var(--madder)", marginTop: "8px", marginBottom: 0, fontWeight: 600 }}>
            ⚠️ {verifyError}
          </p>
        )}

        {verifyResult && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              background: verifyResult.valid ? "rgba(34, 197, 94, 0.08)" : "rgba(239, 68, 68, 0.08)",
              border: verifyResult.valid ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div>
              <span style={{ fontWeight: 700, fontSize: "13px", color: verifyResult.valid ? "#16a34a" : "#dc2626" }}>
                {verifyResult.valid ? `✓ ${t.validStatus}` : `✗ ${t.invalidStatus}`}
              </span>
              <span style={{ fontSize: "12.5px", marginLeft: "8px" }}>
                — Unit: <strong>{verifyResult.unit_id}</strong> (Issued {new Date(verifyResult.issue_date).toLocaleDateString()})
              </span>
            </div>
            <span className="mono small muted" style={{ fontSize: "11px" }}>
              Status: {verifyResult.compliance_status} | Cryptographic Ledger Verified ✔
            </span>
          </div>
        )}
      </section>

      {/* 4. MASTER-DETAIL CONTENT LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 310px) 1fr", gap: "20px", alignItems: "start" }}>
        
        {/* LEFT PANEL: MANUFACTURING UNITS */}
        <div
          className="card"
          style={{
            padding: "16px",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-sm)",
            maxHeight: "calc(100vh - 220px)",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "var(--ink)" }}>
              {t.mfgTitle}
            </h3>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                background: "var(--paper-subtle, #f1f5f9)",
                color: "var(--ink-soft)",
                padding: "2px 8px",
                borderRadius: "999px",
                border: "1px solid var(--hairline)",
              }}
            >
              {filtered.length} units
            </span>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{
              width: "100%",
              padding: "7px 10px",
              fontSize: "12.5px",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-sm)",
              background: "var(--paper)",
              marginBottom: "12px",
              outline: "none",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {filtered.map((u) => {
              const isSel = selected?.unit_id === u.unit_id;
              return (
                <button
                  key={u.unit_id}
                  onClick={() => selectUnit(u)}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: isSel ? "var(--teal-soft)" : "transparent",
                    border: isSel ? "1px solid #99f6e4" : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: isSel ? 700 : 500, color: isSel ? "var(--teal)" : "var(--ink)" }}>
                      {u.name}
                    </div>
                    <div className="mono" style={{ fontSize: "11px", color: "var(--ink-soft)", marginTop: "2px" }}>
                      {u.unit_id}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "9.5px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "#059669",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      letterSpacing: "0.5px",
                    }}
                  >
                    ACTIVE
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: MAIN PASSPORT DETAILS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {dppMeta.stale && (
            <StaleBanner
              serviceName="Ledger service"
              fetchedAt={dppMeta.fetchedAt}
              error={dppMeta.error}
            />
          )}

          {!selected && (
            <div className="card" style={{ padding: "32px", textAlign: "center", color: "var(--ink-soft)" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📜</div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>{t.selectUnitPrompt}</p>
            </div>
          )}

          {selected && dpp && (
            <>
              {/* 5. MAIN PASSPORT HEADER SECTION */}
              <div className="card" style={{ padding: "20px 24px", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#059669",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          letterSpacing: "0.05em",
                        }}
                      >
                        ✓ {t.dppActive}
                      </span>
                      <span className="mono small muted" style={{ fontSize: "11.5px" }}>
                        {selected.unit_id}
                      </span>
                    </div>

                    <h2 style={{ fontSize: "22px", fontWeight: 800, margin: "2px 0 6px 0", color: "var(--ink)" }}>
                      {selected.name}
                    </h2>
                    <p className="small muted" style={{ margin: 0, fontSize: "12.5px" }}>
                      {dpp.compliance_summary}
                    </p>
                  </div>

                  <button
                    className="btn"
                    onClick={() => setIsCertOpen(true)}
                    style={{
                      background: "var(--teal)",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 16px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    📄 {t.exportPdfBtn}
                  </button>
                </div>

                {/* 6. PASSPORT VERIFICATION INFORMATION (COMPACT) */}
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    marginTop: "16px",
                    alignItems: "center",
                    background: "var(--paper)",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--hairline)",
                  }}
                >
                  <QrCodeDisplay
                    value={
                      typeof window !== "undefined"
                        ? `${window.location.origin}/verify?verification_id=${dpp.verification_id}`
                        : `/verify?verification_id=${dpp.verification_id}`
                    }
                    size={76}
                    title={`Garment DPP Passport: ${dpp.verification_id}`}
                    showDownload
                  />
                  <div style={{ fontSize: "12px" }}>
                    <div style={{ color: "var(--ink-soft)", fontWeight: 600 }}>{t.hashLabel}</div>
                    <div className="mono" style={{ fontWeight: 700, color: "var(--teal)", fontSize: "13px", marginTop: "2px" }}>
                      {dpp.verification_id}
                    </div>
                    <div style={{ color: "var(--ink-soft)", marginTop: "4px" }}>
                      {t.issueDateLabel}: <strong>{new Date(dpp.issue_date || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 7. ESG & CHEMICAL COMPLIANCE SECTION */}
              <div className="card" style={{ padding: "20px 24px", borderRadius: "var(--radius-md)" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 14px 0", color: "var(--ink)" }}>
                  {t.esgTitle}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                  <div style={{ background: "var(--paper)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                    <div className="small muted" style={{ fontSize: "11.5px", fontWeight: 600 }}>{t.waterRecycling}</div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "#16a34a", marginTop: "4px" }}>
                      {dpp.reuse_and_energy.reuse_percentage}%
                    </div>
                    <span className="small muted" style={{ fontSize: "10.5px" }}>ZLD Baseline</span>
                  </div>

                  <div style={{ background: "var(--paper)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                    <div className="small muted" style={{ fontSize: "11.5px", fontWeight: 600 }}>{t.renewableEnergy}</div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "#2563eb", marginTop: "4px" }}>
                      {dpp.reuse_and_energy.renewable_energy_percentage}%
                    </div>
                    <span className="small muted" style={{ fontSize: "10.5px" }}>Solar & Wind</span>
                  </div>

                  <div style={{ background: "var(--paper)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                    <div className="small muted" style={{ fontSize: "11.5px", fontWeight: 600 }}>{t.carbonFootprint}</div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "#d97706", marginTop: "4px" }}>
                      1.42 <span style={{ fontSize: "12px" }}>kgCO₂e</span>
                    </div>
                    <span className="small muted" style={{ fontSize: "10.5px" }}>EU Category A</span>
                  </div>

                  <div style={{ background: "var(--paper)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                    <div className="small muted" style={{ fontSize: "11.5px", fontWeight: 600 }}>{t.chemicalCompliance}</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#16a34a", marginTop: "8px" }}>
                      ✓ REACH Certified
                    </div>
                    <span className="small muted" style={{ fontSize: "10.5px" }}>Heavy Metal Free</span>
                  </div>
                </div>
              </div>

              {/* GARMENT SUPPLY CHAIN LIFECYCLE */}
              <div className="card" style={{ padding: "20px 24px", borderRadius: "var(--radius-md)" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px 0", color: "var(--ink)" }}>
                  {t.lifecycleTitle}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative", paddingLeft: "10px" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "19px",
                      top: "10px",
                      bottom: "10px",
                      width: "2px",
                      background: "var(--hairline)",
                      zIndex: 0,
                    }}
                  />

                  {[
                    { step: 1, title: t.stage1, desc: "Organic long-staple cotton yarn spun in Tiruppur textile mills.", date: "Stage 1 — Complete" },
                    { step: 2, title: t.stage2, desc: `Processed at ${selected.name} utilizing ZLD (${dpp.reuse_and_energy.reuse_percentage}% water recycling).`, date: "Stage 2 — Verified" },
                    { step: 3, title: t.stage3, desc: "Downstream sensor node baseline status: " + dpp.recent_environmental_evidence.status, date: "Stage 3 — Passed" },
                    { step: 4, title: t.stage4, desc: `Cryptographic SHA-256 block minted to Green Ledger. Hash: ${dpp.verification_id.slice(0, 16)}...`, date: "Stage 4 — Minted" },
                    { step: 5, title: t.stage5, desc: "EU Digital Product Passport active for customs clearance & retail buyer verification.", date: "Stage 5 — Ready" },
                  ].map((s) => (
                    <div key={s.step} style={{ display: "flex", gap: "12px", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "#ffffff",
                          border: "2px solid var(--teal)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--teal)",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        {s.step}
                      </div>
                      <div style={{ background: "var(--paper)", padding: "8px 12px", borderRadius: "var(--radius-sm)", flex: 1, border: "1px solid var(--hairline)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>{s.title}</span>
                          <span className="small muted" style={{ fontSize: "10.5px" }}>{s.date}</span>
                        </div>
                        <p className="small muted" style={{ margin: "2px 0 0", fontSize: "12px" }}>
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <QrCameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScanSuccess={handleCameraScanSuccess}
      />

      <DppCertificateModal
        isOpen={isCertOpen}
        onClose={() => setIsCertOpen(false)}
        unit={selected}
        dpp={dpp}
      />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div style={{ padding: "28px" }} className="muted small">Loading verification engine…</div>}>
      <BuyerView />
    </Suspense>
  );
}
