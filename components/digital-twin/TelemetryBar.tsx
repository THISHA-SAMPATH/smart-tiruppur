"use client";
import React from "react";
import SourceBadge from "@/components/provenance/SourceBadge";
import { verifyChain } from "@/lib/evidence/ledger";
interface TelemetryBarProps { unitCount: number; avgReuse: number; criticalZones: number; activeAlerts: number; }
export default function TelemetryBar({ unitCount, avgReuse, criticalZones, activeAlerts }: TelemetryBarProps) {
  const ledgerValid = verifyChain([]); // Empty until persisted alerts are loaded; never a hard-coded verification result.
  const item = (label:string, type:"MODELLED"|"SIMULATED", value:string) => <div style={{display:"flex",alignItems:"center",gap:10}}><div><div style={{color:"var(--color-slate-muted)",fontSize:10.5,fontWeight:700}}>{label} <SourceBadge type={type}/></div><div style={{fontWeight:600,color:"var(--color-slate-text)"}}>{value}</div></div></div>;
  return <footer className="dt-footer-strip">{item("WATER-QUALITY MODEL (NOYYAL)","SIMULATED","Synthetic demonstration values")}{item("INDUSTRIAL SCENARIO","SIMULATED",`${unitCount} simulated units · ${avgReuse}% modelled reuse indicator`)}{item("GROUNDWATER STRESS","MODELLED",`${criticalZones} modelled FIRKA zones`)}<div style={{display:"flex",alignItems:"center",gap:10}}><div><div style={{color:"var(--color-slate-muted)",fontSize:10.5,fontWeight:700}}>ALERT LEDGER <SourceBadge type="MODELLED"/></div><div style={{fontWeight:600,color:ledgerValid?"var(--color-green)":"var(--color-red)"}}>{ledgerValid ? "Chain valid (no loaded entries)" : "Chain verification failed"} · {activeAlerts} modelled alert{activeAlerts===1?"":"s"}</div></div></div></footer>;
}
