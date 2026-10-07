import { INDUSTRIAL_OUTFALLS, INDUSTRIAL_UNITS_GEO } from "@/lib/digital-twin/industrial";
import { ENVIRONMENTAL_SENSOR_REGISTRY } from "@/lib/digital-twin/sensors";

export type RiverPoint = [number, number]; // longitude, latitude
export interface RiverSegment { id: string; from: RiverPoint; to: RiverPoint; lengthMeters: number; downstream: string | null; }
export interface Candidate { unitId: string; unitName: string; score: number; distanceMeters: number; travelTimeHours: number; breakdown: { distance: number; timing: number; load: number; complaints: number }; confidence: number; caveat: string; }
export const DEFAULT_FLOW_VELOCITY_MPS = 0.25;
export const FLOW_VELOCITY_UNCERTAINTY = "±50%; uncalibrated model parameter";
const distance = (a: RiverPoint, b: RiverPoint) => { const r=6371000, p=Math.PI/180, dLat=(b[1]-a[1])*p,dLon=(b[0]-a[0])*p; const x=dLon*Math.cos((a[1]+b[1])*p/2); return r*Math.hypot(dLat,x); };
export function buildRiverGraph(geojson: { features?: Array<{ geometry?: { type?: string; coordinates?: RiverPoint[] }; properties?: { id?: string | number } }> }): RiverSegment[] {
 const segments: RiverSegment[]=[]; geojson.features?.forEach((feature, featureIndex)=>{ if(feature.geometry?.type!=="LineString") return; const points=feature.geometry.coordinates||[]; for(let i=1;i<points.length;i++) segments.push({id:`${feature.properties?.id??featureIndex}-${i-1}`,from:points[i-1],to:points[i],lengthMeters:distance(points[i-1],points[i]),downstream:null}); });
 return segments.map((segment)=>({ ...segment, downstream: segments.find((other)=>other.id!==segment.id && distance(segment.to,other.from)<15)?.id??null }));
}
function nearest(point: RiverPoint, segments: RiverSegment[]) { return segments.reduce((best, segment)=>{ const d=Math.min(distance(point,segment.from),distance(point,segment.to)); return d<best.d?{segment,d}:{segment:best.segment,d:best.d}; },{segment:segments[0],d:Infinity}); }
function downstreamDistance(from: RiverSegment, to: RiverSegment, all: RiverSegment) { return 0; }
export function rankUpstreamSources(graph: RiverSegment[], stationId: string, observedAt = new Date().toISOString(), velocityMps = DEFAULT_FLOW_VELOCITY_MPS): Candidate[] {
 const station=ENVIRONMENTAL_SENSOR_REGISTRY.find((sensor)=>sensor.sensor_id===stationId); if(!station||!graph.length) return [];
 const stationSnap=nearest([station.lon,station.lat],graph); const observation=new Date(observedAt).getTime();
 return INDUSTRIAL_OUTFALLS.map((outfall)=>{ const unit=INDUSTRIAL_UNITS_GEO.find((item)=>item.unit_id===outfall.unit_id)!; const sourceSnap=nearest([outfall.lon,outfall.lat],graph); const direct=distance(sourceSnap.segment.to,stationSnap.segment.from); const travelHours=(sourceSnap.segment.lengthMeters+direct)/velocityMps/3600; const distanceScore=Math.exp(-(sourceSnap.d+direct)/10000); const timingScore=Math.exp(-Math.abs((observation-new Date(observedAt).getTime())/36e5-travelHours)/24); const load=Math.min(1,(outfall.flow_rate*outfall.concentration)/Math.max(...INDUSTRIAL_OUTFALLS.map((item)=>item.flow_rate*item.concentration))); const score=.45*distanceScore+.25*timingScore+.30*load;
 return {unitId:unit.unit_id,unitName:unit.name,score:Number(score.toFixed(3)),distanceMeters:Math.round(sourceSnap.d+direct),travelTimeHours:Number(travelHours.toFixed(2)),breakdown:{distance:Number(distanceScore.toFixed(3)),timing:Number(timingScore.toFixed(3)),load:Number(load.toFixed(3)),complaints:0},confidence:.35,caveat:`SIMULATED inspection-priority estimate using ${FLOW_VELOCITY_UNCERTAINTY}; it is not proof of a discharge or violation.`}; }).sort((a,b)=>b.score-a.score);
}
