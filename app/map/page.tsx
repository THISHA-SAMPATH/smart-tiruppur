import CityMapClient from "@/components/CityMapClient";

export const dynamic = "force-dynamic";

export default function MapPage() {
  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">CIVIC GEOGRAPHY / BASE MAP & NOYYAL RIVER</p>
          <h1>Tiruppur City Map</h1>
          <p>
            Interactive OpenStreetMap geographic baseline for Tiruppur district, Tamil Nadu, featuring the real Noyyal River channel geometry.
          </p>
        </div>
      </header>

      {/* Map Metadata Bar */}
      <section
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div className="card" style={{ padding: "12px 16px" }}>
          <p className="small muted" style={{ margin: 0 }}>Map Center Coordinates</p>
          <strong className="mono" style={{ fontSize: "15px", marginTop: "2px", display: "block" }}>
            11.1085° N, 77.3411° E
          </strong>
        </div>

        <div className="card" style={{ padding: "12px 16px" }}>
          <p className="small muted" style={{ margin: 0 }}>Geographic Target</p>
          <strong style={{ fontSize: "15px", marginTop: "2px", display: "block" }}>
            Tiruppur, Tamil Nadu, India
          </strong>
        </div>

        <div className="card" style={{ padding: "12px 16px" }}>
          <p className="small muted" style={{ margin: 0 }}>Active River Layer</p>
          <strong style={{ fontSize: "15px", marginTop: "2px", display: "block", color: "#2563eb" }}>
            Noyyal River (OSM GeoJSON)
          </strong>
        </div>

        <div className="card" style={{ padding: "12px 16px" }}>
          <p className="small muted" style={{ margin: 0 }}>Layer Integrity</p>
          <span className="badge badge-normal" style={{ marginTop: "4px" }}>
            <span className="badge-dot" /> OSM River Channel (No Synthetic Data)
          </span>
        </div>
      </section>

      {/* Interactive Map Component */}
      <CityMapClient />
    </div>
  );
}
