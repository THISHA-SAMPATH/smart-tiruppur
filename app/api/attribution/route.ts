import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { buildRiverGraph, rankUpstreamSources } from "@/lib/attribution/engine";
export async function GET(request: NextRequest) { try { const stationId=new URL(request.url).searchParams.get("stationId"); if(!stationId) return NextResponse.json({error:"stationId is required"},{status:400}); const geojson=JSON.parse(await readFile(path.join(process.cwd(),"public/geo/noyyal-river.geojson"),"utf8")); return NextResponse.json({ label:"SIMULATED inspection priority — not proof of violation", sourceType:"SIMULATED", candidates:rankUpstreamSources(buildRiverGraph(geojson),stationId) }); } catch(error) { console.error("attribution",error); return NextResponse.json({error:"Unable to compute modelled inspection priorities"},{status:500}); } }
