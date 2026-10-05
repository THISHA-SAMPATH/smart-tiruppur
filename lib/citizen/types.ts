// ---------------------------------------------------------------------------
// GEOSPATIAL CITIZEN INTELLIGENCE — DOMAIN TYPES & SCHEMAS
// Spatial clustering, duplicate detection, hotspot analysis & risk correlation.
// ---------------------------------------------------------------------------

export type ComplaintCategory =
  | "drainage"
  | "flooding/water stagnation"
  | "drinking water"
  | "sewage"
  | "garbage"
  | "street lighting"
  | "road/pothole"
  | "pollution"
  | "mosquito breeding"
  | "other";

export type ComplaintSeverity = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface GeoComplaint {
  id: string;
  title: string;
  category: ComplaintCategory;
  description: string;
  latitude: number;
  longitude: number;
  locationDescription: string;
  wardOrFirka: string;
  timestamp: string;
  severity: ComplaintSeverity;
  severityScore: number; // 0 to 100
  status: "SUBMITTED" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";
  reporterName?: string;
  evidencePhotoUrl?: string;
  
  // Spatial Context & Proximity
  nearbyInfrastructure: string[]; // e.g. ["Drain Segment D-183", "Kasipalayam Bridge"]
  isDuplicate?: boolean;
  duplicateOfId?: string;
  isDemoData: boolean;
}

export interface ComplaintHotspot {
  id: string;
  title: string;                    // e.g. "Potential Kasipalayam Drainage Hotspot"
  category: ComplaintCategory;
  centerLat: number;
  centerLon: number;
  radiusMeters: number;             // e.g. 500m
  complaintCount: number;
  complaints: GeoComplaint[];
  
  // Aggregate Metrics
  severityScore: number;            // 0 to 100
  riskCategory: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH" | "CRITICAL";
  affectedAreaKm2: number;
  affectedPopulationEst: number;
  
  // Environmental Risk Correlation
  environmentalCorrelation: {
    elevatedRainfallMmDay: number;
    nearbyDrainageSegment: string;
    elevationMetersASL: number;
    riverProximityMeters: number;
    groundwaterStagePct: number;
    waterQualityWqiScore: number;
  };
  
  recommendedAction: string;
  timestamp: string;
  isDemoData: boolean;
}
