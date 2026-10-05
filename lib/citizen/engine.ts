import { GeoComplaint, ComplaintHotspot, ComplaintCategory } from "./types";

/**
 * Calculates distance in meters between two lat/lon points using the Haversine formula.
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Initial Demonstration Dataset of Geocoded Citizen Complaints covering Tiruppur.
 */
export const DEMO_GEOSPATIAL_COMPLAINTS: GeoComplaint[] = [
  {
    id: "cmp_001",
    title: "Stormwater Drain Overflow at Kasipalayam Bridge",
    category: "drainage",
    description: "Heavy silt accumulation blocking culvert outflow; wastewater stagnating on access road.",
    latitude: 11.11975,
    longitude: 77.39716,
    locationDescription: "Kasipalayam Bridge North Approach, Tiruppur",
    wardOrFirka: "Tiruppur North / Kasipalayam Sector",
    timestamp: new Date().toISOString(),
    severity: "CRITICAL",
    severityScore: 92,
    status: "SUBMITTED",
    reporterName: "K. Ranganathan",
    nearbyInfrastructure: ["Drain Segment D-183", "Kasipalayam Bridge Telemetry"],
    isDemoData: true,
  },
  {
    id: "cmp_002",
    title: "Water Stagnation Near Bus Stand Road",
    category: "flooding/water stagnation",
    description: "Roadway completely submerged after 45mm rainfall; traffic disrupted.",
    latitude: 11.1210,
    longitude: 77.3985,
    locationDescription: "Near Kasipalayam Main Bus Stop",
    wardOrFirka: "Kasipalayam Sector",
    timestamp: new Date().toISOString(),
    severity: "HIGH",
    severityScore: 84,
    status: "UNDER_REVIEW",
    reporterName: "S. Priya",
    nearbyInfrastructure: ["Drain Segment D-183"],
    isDemoData: true,
  },
  {
    id: "cmp_003",
    title: "Culvert Blockage and Sewage Spill",
    category: "drainage",
    description: "Plastic debris clogging municipal drain box near market entry.",
    latitude: 11.1185,
    longitude: 77.3960,
    locationDescription: "Kasipalayam Market Entry Road",
    wardOrFirka: "Kasipalayam Sector",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    severity: "HIGH",
    severityScore: 78,
    status: "SUBMITTED",
    reporterName: "M. Saravanan",
    nearbyInfrastructure: ["Drain Segment D-183"],
    isDemoData: true,
  },
  {
    id: "cmp_004",
    title: "Chemical Odor and Effluent Discoloration",
    category: "pollution",
    description: "Dark reddish water observed in Noyyal side channel with strong chemical smell.",
    latitude: 11.1420,
    longitude: 77.3310,
    locationDescription: "Angeripalayam Fabric Sector",
    wardOrFirka: "Tiruppur North FIRKA / Angeripalayam",
    timestamp: new Date().toISOString(),
    severity: "CRITICAL",
    severityScore: 95,
    status: "SUBMITTED",
    reporterName: "P. Velusamy",
    nearbyInfrastructure: ["Unit 007 Processing Facility", "Angeripalayam Bridge"],
    isDemoData: true,
  },
  {
    id: "cmp_005",
    title: "Waterlogging at Angeripalayam Low-Lying Slope",
    category: "flooding/water stagnation",
    description: "Water accumulating near residential houses due to missing roadside channel.",
    latitude: 11.1435,
    longitude: 77.3325,
    locationDescription: "Angeripalayam West Extension",
    wardOrFirka: "Angeripalayam Sector",
    timestamp: new Date().toISOString(),
    severity: "HIGH",
    severityScore: 81,
    status: "SUBMITTED",
    reporterName: "V. Lakshmi",
    nearbyInfrastructure: ["Angeripalayam Processing Cluster"],
    isDemoData: true,
  },
  {
    id: "cmp_006",
    title: "Borewell Water Salinity Spike in Tiruppur South",
    category: "drinking water",
    description: "Groundwater TDS exceeds 2400 ppm; yellow tinge in well water.",
    latitude: 11.0820,
    longitude: 77.3550,
    locationDescription: "Tiruppur South FIRKA / Nallur Road",
    wardOrFirka: "Tiruppur South FIRKA",
    timestamp: new Date().toISOString(),
    severity: "HIGH",
    severityScore: 75,
    status: "UNDER_REVIEW",
    reporterName: "A. Murugan",
    nearbyInfrastructure: ["CGWB Piezometer Well #TN-TPR-08"],
    isDemoData: true,
  },
];

/**
 * Detects spatial complaint clusters and builds environmental risk hotspots.
 */
export function detectComplaintHotspots(
  complaints: GeoComplaint[] = DEMO_GEOSPATIAL_COMPLAINTS,
  radiusMeters: number = 500
): ComplaintHotspot[] {
  const hotspots: ComplaintHotspot[] = [];
  const visited = new Set<string>();

  complaints.forEach((cmp) => {
    if (visited.has(cmp.id)) return;

    // Find nearby complaints within radiusMeters
    const cluster = complaints.filter((other) => {
      const dist = calculateDistanceMeters(cmp.latitude, cmp.longitude, other.latitude, other.longitude);
      return dist <= radiusMeters;
    });

    if (cluster.length >= 2) {
      cluster.forEach((c) => visited.add(c.id));

      const avgLat = cluster.reduce((sum, c) => sum + c.latitude, 0) / cluster.length;
      const avgLon = cluster.reduce((sum, c) => sum + c.longitude, 0) / cluster.length;
      const maxSeverity = Math.max(...cluster.map((c) => c.severityScore));

      // Primary category in cluster
      const categoryCounts: Record<string, number> = {};
      cluster.forEach((c) => {
        categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
      });
      let dominantCategory: ComplaintCategory = cmp.category;
      let maxCatCount = 0;
      Object.entries(categoryCounts).forEach(([cat, cnt]) => {
        if (cnt > maxCatCount) {
          maxCatCount = cnt;
          dominantCategory = cat as ComplaintCategory;
        }
      });

      let riskCategory: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH" | "CRITICAL" = "HIGH";
      if (maxSeverity >= 90) riskCategory = "CRITICAL";
      else if (maxSeverity >= 75) riskCategory = "VERY HIGH";
      else if (maxSeverity >= 60) riskCategory = "HIGH";
      else if (maxSeverity >= 40) riskCategory = "MODERATE";

      const primaryInfra = cluster[0].nearbyInfrastructure[0] || "Municipal Corridor";

      hotspots.push({
        id: `hotspot_${cmp.wardOrFirka.toLowerCase().replace(/\s+/g, "_")}_${cmp.id}`,
        title: `Potential ${cmp.wardOrFirka.split("/")[0].trim()} ${dominantCategory.toUpperCase()} Hotspot`,
        category: dominantCategory,
        centerLat: avgLat,
        centerLon: avgLon,
        radiusMeters,
        complaintCount: cluster.length,
        complaints: cluster,
        severityScore: maxSeverity,
        riskCategory,
        affectedAreaKm2: Number(((Math.PI * Math.pow(radiusMeters, 2)) / 1000000).toFixed(2)),
        affectedPopulationEst: cluster.length * 2400,
        environmentalCorrelation: {
          elevatedRainfallMmDay: 48,
          nearbyDrainageSegment: primaryInfra,
          elevationMetersASL: Math.round(290 + (avgLat - 11.10) * 100),
          riverProximityMeters: Math.round(calculateDistanceMeters(avgLat, avgLon, 11.11, 77.34)),
          groundwaterStagePct: 112,
          waterQualityWqiScore: 78,
        },
        recommendedAction: `Despatch municipal inspection crew to clear ${primaryInfra} choke points and audit ${dominantCategory} infrastructure.`,
        timestamp: new Date().toISOString(),
        isDemoData: true,
      });
    }
  });

  return hotspots;
}
