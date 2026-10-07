"use client";
import React from "react";
export type SourceType = "MEASURED" | "MODELLED" | "SIMULATED" | "HISTORICAL";
const colors: Record<SourceType, string> = { MEASURED: "#38bdf8", MODELLED: "#f472b6", SIMULATED: "#f59e0b", HISTORICAL: "#a78bfa" };
export default function SourceBadge({ type }: { type: SourceType }) { return <span style={{ color: colors[type], border: `1px solid ${colors[type]}`, borderRadius: 4, padding: "1px 5px", fontSize: 9, fontWeight: 800, letterSpacing: ".04em" }}>{type}</span>; }
