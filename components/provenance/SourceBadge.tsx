"use client";
import React from "react";
export type SourceType = "MEASURED" | "MODELLED" | "SIMULATED" | "HISTORICAL";
const tones: Record<SourceType, { background: string; color: string }> = { MEASURED: { background: "var(--teal-soft)", color: "var(--teal)" }, MODELLED: { background: "var(--indigo-soft)", color: "var(--indigo)" }, SIMULATED: { background: "var(--turmeric-soft)", color: "var(--turmeric)" }, HISTORICAL: { background: "#f1f5f9", color: "var(--ink-soft)" } };
export default function SourceBadge({ type }: { type: SourceType }) { const tone=tones[type]; return <span style={{ display:"inline-flex", alignItems:"center", gap:4, color:tone.color, background:tone.background, border:"1px solid var(--hairline)", borderRadius:999, padding:"2px 6px", fontSize:9, fontWeight:800, letterSpacing:".04em", whiteSpace:"nowrap" }}><i aria-hidden="true" style={{width:5,height:5,borderRadius:"50%",background:"currentColor"}} />{type}</span>; }
