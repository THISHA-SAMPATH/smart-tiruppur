"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getUnitDpp, getUnits, getVerify } from "@/lib/api";
import { resolveLedgerUrl } from "@/lib/config";
import type { DppResponse, LedgerUnit, VerifyResponse } from "@/lib/types";
import StaleBanner from "@/components/StaleBanner";
import QrCameraScannerModal from "@/components/QrCameraScannerModal";
import DppCertificateModal from "@/components/DppCertificateModal";

type LangKey = "EN" | "DE" | "FR" | "IT" | "ES";

const translations: Record<
  LangKey,
  {
    title: string;
    subtitle: string;
    verifyById: string;
    scanCameraBtn: string;
    searchPlaceholder: string;
    selectUnitPrompt: string;
    printCertBtn: string;
    lifecycleTitle: string;
    esgTitle: string;
    carbonFootprint: string;
    waterRecycling: string;
    renewableEnergy: string;
    chemicalCompliance: string;
    validStatus: string;
    invalidStatus: string;
    stage1: string;
    stage2: string;
    stage3: string;
    stage4: string;
    stage5: string;
  }
> = {
  EN: {
    title: "Buyer / DPP Verification & Garment Provenance",
    subtitle:
      "Look up a unit's Digital Product Passport, scan QR tags, or verify compliance for EU imports.",
    verifyById: "Verify by ID or Passport Hash",
    scanCameraBtn: "📷 Live Camera Scan",
    searchPlaceholder: "Search manufacturing units...",
    selectUnitPrompt:
      "Select a manufacturing unit to view its Digital Product Passport and Lifecycle Timeline.",
    printCertBtn: "📄 Export PDF Certificate",
    lifecycleTitle: "🧵 Garment Supply Chain & Environmental Lifecycle",
    esgTitle: "🇪🇺 EU ESG Sustainability & Chemical Compliance",
    carbonFootprint: "Carbon Footprint",
    waterRecycling: "ZLD Water Recycling",
    renewableEnergy: "Renewable Energy Mix",
    chemicalCompliance: "Chemical & REACH Compliance",
    validStatus: "Valid DPP Passport",
    invalidStatus: "Not Valid / Unverified",
    stage1: "Yarn Sourcing (Tiruppur Cluster)",
    stage2: "Zero Liquid Discharge (ZLD) Dyeing",
    stage3: "Physics-Aware Water Quality Verification",
    stage4: "SHA-256 Green Ledger Hash Minting",
    stage5: "EU Export Clearance & DPP Verification",
  },
  DE: {
    title: "Käufer / DPP-Überprüfung & Bekleidungs-Herkunft",
    subtitle:
      "Digitaler Produktpass abrufen, QR-Codes scannen und EU-Importkonformität prüfen.",
    verifyById: "Nach ID oder Passport-Hash überprüfen",
    scanCameraBtn: "📷 Live-Kamera-Scan",
    searchPlaceholder: "Fertigungseinheiten suchen...",
    selectUnitPrompt:
      "Wählen Sie eine Fertigungseinheit aus, um deren Produktpass und Lebenszyklus anzuzeigen.",
    printCertBtn: "📄 PDF-Zertifikat Exportieren",
    lifecycleTitle: "🧵 Bekleidungs-Lieferkette & Umwelt-Lebenszyklus",
    esgTitle: "🇪🇺 EU ESG Nachhaltigkeit & Chemikalien-Konformität",
    carbonFootprint: "CO₂-Fußabdruck",
    waterRecycling: "ZLD Wasser-Recycling",
    renewableEnergy: "Erneuerbare Energien",
    chemicalCompliance: "Chemikalien- & REACH-Konformität",
    validStatus: "Gültiger DPP-Pass",
    invalidStatus: "Ungültig / Nicht verifiziert",
    stage1: "Garnbeschaffung (Tiruppur Cluster)",
    stage2: "Zero Liquid Discharge (ZLD) Färbung",
    stage3: "Physikbasierte Wasserqualitätsprüfung",
    stage4: "SHA-256 Green Ledger Prägung",
    stage5: "EU-Exportfreigabe & DPP-Verifizierung",
  },
  FR: {
    title: "Acheteurs / Vérification DPP & Traçabilité Textile",
    subtitle:
      "Consultez le passeport numérique du produit, scannez les QR codes ou vérifiez la conformité UE.",
    verifyById: "Vérifier par ID ou Hash du passeport",
    scanCameraBtn: "📷 Scanner avec Caméra",
    searchPlaceholder: "Rechercher les unités de fabrication...",
    selectUnitPrompt:
      "Sélectionnez une unité pour afficher son Passeport Numérique et son Cycle de Vie.",
    printCertBtn: "📄 Exporter le Certificat PDF",
    lifecycleTitle: "🧵 Chaîne d'Approvisionnement & Cycle Écologique",
    esgTitle: "🇪🇺 ESG UE Durabilité & Conformité Chimique",
    carbonFootprint: "Empreinte Carbone",
    waterRecycling: "Recyclage de l'Eau (ZLD)",
    renewableEnergy: "Énergie Renouvelable",
    chemicalCompliance: "Conformité Chimique & REACH",
    validStatus: "Passeport DPP Valide",
    invalidStatus: "Invalide / Non vérifié",
    stage1: "Approvisionnement en Fil (Tiruppur Cluster)",
    stage2: "Teinture Zero Liquid Discharge (ZLD)",
    stage3: "Vérification Physique de la Qualité de l'Eau",
    stage4: "Minage de Hash Green Ledger SHA-256",
    stage5: "Dédouanement Export UE & DPP",
  },
  IT: {
    title: "Compratori / Verifica DPP & Tracciabilità Tessile",
    subtitle:
      "Consulta il Passaporto Digitale del Prodotto, scansiona i QR code e verifica la conformità UE.",
    verifyById: "Verifica per ID o Hash Passaporto",
    scanCameraBtn: "📷 Scansione da Fotocamera",
    searchPlaceholder: "Cerca unità produttive...",
    selectUnitPrompt:
      "Seleziona un'unità per visualizzare il Passaporto Digitale e la Cronologia.",
    printCertBtn: "📄 Esporta Certificato PDF",
    lifecycleTitle: "🧵 Catena di Fornitura & Ciclo Ecologico",
    esgTitle: "🇪🇺 Sostenibilità ESG UE & Conformità Chimica",
    carbonFootprint: "Impronta di Carbonio",
    waterRecycling: "Riciclo Acqua (ZLD)",
    renewableEnergy: "Energia Rinnovabile",
    chemicalCompliance: "Conformità Chimica & REACH",
    validStatus: "Passaporto DPP Valido",
    invalidStatus: "Non Valido / Non verificato",
    stage1: "Fornitura Filati (Tiruppur Cluster)",
    stage2: "Tintura Zero Liquid Discharge (ZLD)",
    stage3: "Verifica Qualità dell'Acqua Basata sulla Fisica",
    stage4: "Minting Hash SHA-256 Green Ledger",
    stage5: "Sdoganamento Export UE & DPP",
  },
  ES: {
    title: "Compradores / Verificación DPP y Trazabilidad Textil",
    subtitle:
      "Consulte el Pasaporte Digital del Producto, escanee códigos QR y verifique el cumplimiento con la UE.",
    verifyById: "Verificar por ID o Hash de Pasaporte",
    scanCameraBtn: "📷 Escanear con Cámara",
    searchPlaceholder: "Buscar instalaciones de fabricación...",
    selectUnitPrompt:
      "Seleccione una unidad para ver su Pasaporte Digital y Línea de Tiempo del Ciclo de Vida.",
    printCertBtn: "📄 Exportar Certificado PDF",
    lifecycleTitle: "🧵 Cadena de Suministro y Ciclo de Vida Ambiental",
    esgTitle: "🇪🇺 Sostenibilidad ESG UE y Cumplimiento Químico",
    carbonFootprint: "Huella de Carbono",
    waterRecycling: "Reciclaje de Agua (ZLD)",
    renewableEnergy: "Energía Renovable",
    chemicalCompliance: "Cumplimiento Químico y REACH",
    validStatus: "Pasaporte DPP Válido",
    invalidStatus: "No Válido / No verificado",
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
        // Default select first unit for immediate demo preview
        selectUnit(r.data[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (presetVerificationId) handleVerify(presetVerificationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetVerificationId]);

  async function selectUnit(unit: LedgerUnit) {
    setSelected(unit);
    setDpp(null);
    const r = await getUnitDpp(unit.unit_id);
    setDpp(r.data);
    setDppMeta({ stale: r.stale, fetchedAt: r.fetchedAt, error: r.error });
  }

  async function handleVerify(idOverride?: string) {
    const id = idOverride ?? verifyId;
    if (!id) return;
    setVerifyError(null);
    const r = await getVerify(id);
    if (r.data) setVerifyResult(r.data);
    else setVerifyError(r.error || "Verification ID not found.");
  }

  const handleCameraScanSuccess = (scannedCode: string) => {
    setVerifyId(scannedCode);
    handleVerify(scannedCode);
  };

  const filtered = units.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.unit_id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      {/* Header with Multi-Language Switcher */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 24, marginBottom: 4 }}>{t.title}</h2>
          <p className="muted small" style={{ margin: 0 }}>
            {t.subtitle}
          </p>
        </div>

        {/* Multi-Language Switcher */}
        <div style={{ display: "flex", gap: 4, background: "var(--paper)", padding: 4, borderRadius: 6, border: "1px solid var(--hairline)" }}>
          {(["EN", "DE", "FR", "IT", "ES"] as LangKey[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className="btn-ghost"
              style={{
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: lang === l ? 700 : 400,
                background: lang === l ? "var(--indigo-soft)" : "transparent",
                borderRadius: 4,
              }}
            >
              {l === "EN" ? "🇬🇧 EN" : l === "DE" ? "🇩🇪 DE" : l === "FR" ? "🇫🇷 FR" : l === "IT" ? "🇮🇹 IT" : "🇪🇸 ES"}
            </button>
          ))}
        </div>
      </div>

      {/* Verification Action Card */}
      <section className="card" style={{ marginBottom: 24 }}>
        <p className="small muted" style={{ margin: "0 0 8px" }}>
          {t.verifyById}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={verifyId}
            onChange={(e) => setVerifyId(e.target.value)}
            placeholder="e.g. vrf_a1b2c3"
            style={{
              flex: 1,
              minWidth: 200,
              padding: "8px 10px",
              border: "1px solid var(--hairline)",
              borderRadius: 4,
              background: "var(--paper)",
            }}
          />
          <button className="btn" onClick={() => handleVerify()}>
            Verify ID
          </button>
          <button
            className="btn-ghost"
            onClick={() => setIsCameraOpen(true)}
            style={{
              border: "1px solid var(--indigo-soft)",
              color: "var(--indigo-bright, #818cf8)",
            }}
          >
            {t.scanCameraBtn}
          </button>
        </div>

        {verifyError && (
          <p className="small" style={{ color: "var(--madder)", marginTop: 8 }}>
            {verifyError}
          </p>
        )}

        {verifyResult && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 6,
              background: verifyResult.valid ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              border: verifyResult.valid ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>
              {verifyResult.valid ? `✓ ${t.validStatus}` : `✗ ${t.invalidStatus}`} —{" "}
              {verifyResult.unit_id}, issued{" "}
              {new Date(verifyResult.issue_date).toLocaleDateString()}
            </p>
            <p className="small muted" style={{ margin: "4px 0 0" }}>
              Status: {verifyResult.compliance_status} | SHA-256 Ledger Verified
            </p>
          </div>
        )}
      </section>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Facility Directory Sidebar */}
        <div style={{ flex: "0 0 260px" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid var(--hairline)",
              borderRadius: 4,
              background: "var(--paper)",
              marginBottom: 10,
            }}
          />
          <div className="grid" style={{ gap: 6 }}>
            {filtered.map((u) => (
              <button
                key={u.unit_id}
                onClick={() => selectUnit(u)}
                className="btn-ghost"
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 4,
                  background:
                    selected?.unit_id === u.unit_id
                      ? "var(--indigo-soft)"
                      : "transparent",
                }}
              >
                <span className="small" style={{ fontWeight: selected?.unit_id === u.unit_id ? 700 : 400 }}>
                  {u.name}
                </span>
                <br />
                <span className="mono small muted">{u.unit_id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Passport & Provenance Details */}
        <div style={{ flex: 1, minWidth: 300 }}>
          {dppMeta.stale && (
            <StaleBanner
              serviceName="Ledger service"
              fetchedAt={dppMeta.fetchedAt}
              error={dppMeta.error}
            />
          )}

          {!selected && (
            <p className="muted small">{t.selectUnitPrompt}</p>
          )}

          {selected && dpp && (
            <div>
              {/* Passport Header Card */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <span className="mono small" style={{ color: "#22c55e", fontWeight: 700 }}>
                      ✓ EU DPP PASSPORT ACTIVE
                    </span>
                    <h3 style={{ fontSize: 20, margin: "4px 0" }}>{selected.name}</h3>
                    <p className="small muted" style={{ margin: 0 }}>
                      {dpp.compliance_summary}
                    </p>
                  </div>

                  <button
                    className="btn"
                    onClick={() => setIsCertOpen(true)}
                    style={{
                      background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
                      color: "#fff",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
                    }}
                  >
                    {t.printCertBtn}
                  </button>
                </div>

                {/* QR Code & Verification Block */}
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginTop: 20,
                    alignItems: "center",
                    background: "var(--paper)",
                    padding: 12,
                    borderRadius: 6,
                    border: "1px solid var(--hairline)",
                  }}
                >
                  {dpp.qr_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveLedgerUrl(dpp.qr_url)}
                      alt="DPP QR code"
                      width={90}
                      height={90}
                      style={{ borderRadius: 4, background: "#fff", padding: 4 }}
                    />
                  )}
                  <div>
                    <span className="small muted">Passport Verification Hash:</span>
                    <br />
                    <span className="mono small" style={{ fontWeight: 700, color: "var(--indigo-bright, #818cf8)" }}>
                      {dpp.verification_id}
                    </span>
                    <br />
                    <span className="small muted">Issue Date: {new Date(dpp.issue_date || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* ESG & Compliance Metrics Section */}
              <div className="card" style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 16, margin: "0 0 14px" }}>{t.esgTitle}</h4>
                <div
                  className="grid"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}
                >
                  <div style={{ background: "var(--paper)", padding: 12, borderRadius: 6, border: "1px solid var(--hairline)" }}>
                    <p className="small muted" style={{ margin: 0 }}>
                      {t.waterRecycling}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: "#22c55e" }}>
                      {dpp.reuse_and_energy.reuse_percentage}%
                    </p>
                    <span className="small muted" style={{ fontSize: 10 }}>ZLD Baseline</span>
                  </div>

                  <div style={{ background: "var(--paper)", padding: 12, borderRadius: 6, border: "1px solid var(--hairline)" }}>
                    <p className="small muted" style={{ margin: 0 }}>
                      {t.renewableEnergy}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: "#3b82f6" }}>
                      {dpp.reuse_and_energy.renewable_energy_percentage}%
                    </p>
                    <span className="small muted" style={{ fontSize: 10 }}>Solar & Wind</span>
                  </div>

                  <div style={{ background: "var(--paper)", padding: 12, borderRadius: 6, border: "1px solid var(--hairline)" }}>
                    <p className="small muted" style={{ margin: 0 }}>
                      {t.carbonFootprint}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: "#eab308" }}>
                      1.42 <span style={{ fontSize: 11 }}>gCO₂e</span>
                    </p>
                    <span className="small muted" style={{ fontSize: 10 }}>EU Category A</span>
                  </div>

                  <div style={{ background: "var(--paper)", padding: 12, borderRadius: 6, border: "1px solid var(--hairline)" }}>
                    <p className="small muted" style={{ margin: 0 }}>
                      {t.chemicalCompliance}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 700, color: "#22c55e" }}>
                      ✓ REACH Certified
                    </p>
                    <span className="small muted" style={{ fontSize: 10 }}>Heavy Metal Free</span>
                  </div>
                </div>
              </div>

              {/* Garment Batch Lifecycle Timeline */}
              <div className="card">
                <h4 style={{ fontSize: 16, margin: "0 0 16px" }}>{t.lifecycleTitle}</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative", paddingLeft: 12 }}>
                  {/* Timeline vertical guide line */}
                  <div
                    style={{
                      position: "absolute",
                      left: 21,
                      top: 10,
                      bottom: 10,
                      width: 2,
                      background: "var(--hairline)",
                      zIndex: 0,
                    }}
                  />

                  {[
                    { step: 1, title: t.stage1, desc: "Organic long-staple cotton yarn spun in Tiruppur textile mills.", icon: "🧶", date: "Stage 1 — Complete" },
                    { step: 2, title: t.stage2, desc: `Processed at ${selected.name} utilizing ZLD (${dpp.reuse_and_energy.reuse_percentage}% water recycling).`, icon: "🧪", date: "Stage 2 — Verified" },
                    { step: 3, title: t.stage3, desc: "Downstream sensor node baseline status: " + dpp.recent_environmental_evidence.status, icon: "💧", date: "Stage 3 — Passed" },
                    { step: 4, title: t.stage4, desc: `Cryptographic SHA-256 block minted to Green Ledger. Hash: ${dpp.verification_id.slice(0, 16)}...`, icon: "🔒", date: "Stage 4 — Minted" },
                    { step: 5, title: t.stage5, desc: "EU Digital Product Passport active for customs clearance & retail buyer verification.", icon: "✈️", date: "Stage 5 — Ready" },
                  ].map((s) => (
                    <div key={s.step} style={{ display: "flex", gap: 14, alignItems: "flex-start", position: "relative", zIndex: 1 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "var(--paper)",
                          border: "2px solid var(--indigo-soft)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {s.icon}
                      </div>
                      <div style={{ background: "var(--paper)", padding: "8px 12px", borderRadius: 6, flex: 1, border: "1px solid var(--hairline)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{s.title}</span>
                          <span className="small muted" style={{ fontSize: 10 }}>{s.date}</span>
                        </div>
                        <p className="small muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
    <Suspense fallback={<p className="muted small">Loading verification engine…</p>}>
      <BuyerView />
    </Suspense>
  );
}
