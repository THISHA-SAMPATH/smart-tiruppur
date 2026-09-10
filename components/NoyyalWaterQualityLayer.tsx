"use client";

import { useEffect, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

export interface TnpcbStation {
  station_id: string;
  station_name: string;
  designation: string;
  latitude: number;
  longitude: number;
  monitoring_agency: string;
  data_type: string;
  period: string;
  source: string;
  parameters: {
    ph: number | null;
    tds_mg_l: number | null;
    do_mg_l: number | null;
    bod_mg_l: number | null;
    tss_mg_l: number | null;
    ec_us_cm: number | null;
  };
}

export default function NoyyalWaterQualityLayer() {
  const [stations, setStations] = useState<TnpcbStation[]>([]);
  const [icon, setIcon] = useState<L.DivIcon | null>(null);

  useEffect(() => {
    // Create Leaflet Icon on client side only to ensure SSR safety
    if (typeof window !== "undefined") {
      const wqIcon = L.divIcon({
        className: "tnpcb-wq-marker-icon",
        html: `<div style="
          width: 26px;
          height: 26px;
          background: #0284c7;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 3px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 13px;
          font-weight: bold;
        ">💧</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -14],
      });
      setIcon(wqIcon);
    }

    fetch("/geo/tnpcb-noyyal-stations.json")
      .then((res) => res.json())
      .then((data: TnpcbStation[]) => setStations(data))
      .catch((err) =>
        console.error("Could not load TNPCB Noyyal stations JSON:", err)
      );
  }, []);

  if (stations.length === 0 || !icon) return null;

  return (
    <>
      {stations.map((st) => (
        <Marker
          key={st.station_id}
          position={[st.latitude, st.longitude]}
          icon={icon}
        >
          <Popup>
            <div style={{ fontFamily: "IBM Plex Sans, sans-serif", padding: "4px", minWidth: "240px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                <h4 style={{ margin: 0, fontFamily: "Fraunces, serif", fontSize: "15px", color: "#0369a1" }}>
                  {st.station_name}
                </h4>
              </div>

              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>
                <div><strong>Designation:</strong> <span style={{ color: "#0284c7", fontWeight: 600 }}>{st.designation}</span></div>
                <div><strong>Agency:</strong> {st.monitoring_agency}</div>
              </div>

              {/* Data Type & Provenance Badge */}
              <div
                style={{
                  background: "#f0f9ff",
                  padding: "4px 6px",
                  borderRadius: "4px",
                  border: "1px solid #bae6fd",
                  marginBottom: "8px",
                  fontSize: "10.5px",
                  color: "#0369a1",
                  lineHeight: "1.4",
                }}
              >
                <div><strong>Type:</strong> {st.data_type}</div>
                <div><strong>Period:</strong> {st.period}</div>
              </div>

              {/* Parameters Table */}
              <div style={{ fontSize: "12px", lineHeight: "1.6", marginBottom: "8px", background: "#f8fafc", padding: "6px 8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "10px", fontWeight: "bold", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                  Measured Parameters (2024 Baseline)
                </div>
                <div>
                  <strong>pH:</strong> {st.parameters.ph !== null ? st.parameters.ph : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>not available in verified source data</span>}
                </div>
                <div>
                  <strong>TDS:</strong> {st.parameters.tds_mg_l !== null ? `${st.parameters.tds_mg_l} mg/L` : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>not available in verified source data</span>}
                </div>
                <div>
                  <strong>DO:</strong> {st.parameters.do_mg_l !== null ? `${st.parameters.do_mg_l} mg/L` : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>not available in verified source data</span>}
                </div>
                <div>
                  <strong>BOD:</strong> {st.parameters.bod_mg_l !== null ? `${st.parameters.bod_mg_l} mg/L` : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>not available in verified source data</span>}
                </div>
                <div>
                  <strong>EC:</strong> {st.parameters.ec_us_cm !== null ? `${st.parameters.ec_us_cm} µS/cm` : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>not available in verified source data</span>}
                </div>
                <div>
                  <strong>TSS:</strong> {st.parameters.tss_mg_l !== null ? `${st.parameters.tss_mg_l} mg/L` : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>not available in verified source data</span>}
                </div>
              </div>

              <div style={{ fontSize: "10.5px", color: "#94a3b8", borderTop: "1px solid #e2e8f0", paddingTop: "4px" }}>
                Source: {st.source}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
