import Link from "next/link";
import type { LedgerUnit } from "@/lib/types";

export default function UnitCard({ unit }: { unit: LedgerUnit }) {
  return (
    <Link href={`/units/${unit.unit_id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="card" style={{ height: "100%" }}>
        <p className="mono small muted" style={{ margin: 0 }}>
          {unit.unit_id}
        </p>
        <h3 style={{ fontSize: 16, margin: "4px 0 8px" }}>{unit.name}</h3>
        <p className="small muted" style={{ margin: 0 }}>
          {unit.cetp_zld_status} · {unit.compliance_status}
        </p>
        <p className="small muted" style={{ margin: "6px 0 0" }}>
          Reuse {unit.reuse_percentage}% · Renewable {unit.renewable_energy_percentage}%
        </p>
      </div>
    </Link>
  );
}
