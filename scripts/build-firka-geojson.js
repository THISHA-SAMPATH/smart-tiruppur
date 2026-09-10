const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "public", "geo");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "tiruppur-firka-boundaries.geojson");

// Definitions for all 33 Tiruppur FIRKAs in the CGWB 2024 groundwater assessment dataset
const firkas = [
  // Tiruppur Urban & Sub-Urban Firkas
  {
    zone_id: "tiruppur_north",
    name: "TIRUPPUR NORTH",
    bbox: [77.300, 11.110, 77.360, 11.160]
  },
  {
    zone_id: "tiruppur_south",
    name: "TIRUPPUR SOUTH",
    bbox: [77.310, 11.060, 77.370, 11.110]
  },
  {
    zone_id: "tiruppur_velampalayam",
    name: "VELAMPALAYAM",
    bbox: [77.290, 11.130, 77.330, 11.170]
  },
  {
    zone_id: "tiruppur_nallur_t",
    name: "NALLUR(T)",
    bbox: [77.350, 11.070, 77.400, 11.120]
  },
  {
    zone_id: "tiruppur_perumanallur",
    name: "PERUMANALLUR",
    bbox: [77.320, 11.160, 77.380, 11.210]
  },

  // Avinashi Taluk Firkas
  {
    zone_id: "tiruppur_avanashi_east",
    name: "AVANASHI EAST",
    bbox: [77.260, 11.180, 77.320, 11.240]
  },
  {
    zone_id: "tiruppur_avinashi_west",
    name: "AVINASHI WEST",
    bbox: [77.200, 11.180, 77.260, 11.240]
  },
  {
    zone_id: "tiruppur_sevur",
    name: "SEVUR",
    bbox: [77.230, 11.240, 77.300, 11.300]
  },

  // Uthukuli Taluk Firkas
  {
    zone_id: "tiruppur_uthukkuli",
    name: "UTHUKKULI",
    bbox: [77.380, 11.140, 77.460, 11.210]
  },
  {
    zone_id: "tiruppur_kunnuthur",
    name: "KUNNUTHUR",
    bbox: [77.340, 11.210, 77.420, 11.280]
  },

  // Palladam Taluk Firkas
  {
    zone_id: "tiruppur_palladam",
    name: "PALLADAM",
    bbox: [77.240, 10.980, 77.320, 11.060]
  },
  {
    zone_id: "tiruppur_samalapuram",
    name: "SAMALAPURAM",
    bbox: [77.210, 11.040, 77.280, 11.110]
  },
  {
    zone_id: "tiruppur_karadivavi",
    name: "KARADIVAVI",
    bbox: [77.160, 10.950, 77.240, 11.030]
  },
  {
    zone_id: "tiruppur_pongalore",
    name: "PONGALORE",
    bbox: [77.320, 10.970, 77.400, 11.050]
  },
  {
    zone_id: "tiruppur_south_avanashipalayam",
    name: "SOUTH AVANASHIPALAYAM",
    bbox: [77.370, 10.940, 77.450, 11.020]
  },

  // Kangeyam Taluk Firkas
  {
    zone_id: "tiruppur_kangeyam",
    name: "KANGEYAM",
    bbox: [77.500, 10.980, 77.600, 11.070]
  },
  {
    zone_id: "tiruppur_nathakadayur",
    name: "NATHAKADAYUR",
    bbox: [77.550, 11.070, 77.650, 11.160]
  },
  {
    zone_id: "tiruppur_uhiyur",
    name: "UHIYUR",
    bbox: [77.430, 10.990, 77.510, 11.070]
  },
  {
    zone_id: "tiruppur_vellakoil",
    name: "VELLAKOIL",
    bbox: [77.600, 10.920, 77.720, 11.020]
  },
  {
    zone_id: "tiruppur_sangarandampalayam",
    name: "SANGARANDAMPALAYAM",
    bbox: [77.620, 10.850, 77.720, 10.930]
  },

  // Dharapuram Taluk Firkas
  {
    zone_id: "tiruppur_dharapuram",
    name: "DHARAPURAM",
    bbox: [77.480, 10.680, 77.580, 10.770]
  },
  {
    zone_id: "tiruppur_alangiyam_dup",
    name: "ALANGIYAM-DUP",
    bbox: [77.450, 10.600, 77.540, 10.690]
  },
  {
    zone_id: "tiruppur_kannivadi",
    name: "KANNIVADI",
    bbox: [77.380, 10.650, 77.470, 10.740]
  },
  {
    zone_id: "tiruppur_kundadam",
    name: "KUNDADAM",
    bbox: [77.430, 10.770, 77.530, 10.860]
  },
  {
    zone_id: "tiruppur_moolanur",
    name: "MOOLANUR",
    bbox: [77.600, 10.700, 77.720, 10.800]
  },
  {
    zone_id: "tiruppur_ponnapuram",
    name: "PONNAPURAM",
    bbox: [77.540, 10.770, 77.640, 10.860]
  },

  // Udumalaipettai & Madathukulam Taluk Firkas
  {
    zone_id: "tiruppur_udumalaipettai",
    name: "UDUMALAIPETTAI",
    bbox: [77.200, 10.530, 77.300, 10.620]
  },
  {
    zone_id: "tiruppur_gudimangalam",
    name: "GUDIMANGALAM",
    bbox: [77.280, 10.630, 77.380, 10.720]
  },
  {
    zone_id: "tiruppur_kurichikottai",
    name: "KURICHIKOTTAI",
    bbox: [77.120, 10.500, 77.220, 10.590]
  },
  {
    zone_id: "tiruppur_madathukulam",
    name: "MADATHUKULAM",
    bbox: [77.300, 10.520, 77.400, 10.610]
  },
  {
    zone_id: "tiruppur_peddappampatti",
    name: "PEDDAPPAMPATTI",
    bbox: [77.220, 10.620, 77.300, 10.700]
  },
  {
    zone_id: "tiruppur_periavalavadi",
    name: "PERIAVALAVADI",
    bbox: [77.340, 10.450, 77.440, 10.530]
  },
  {
    zone_id: "tiruppur_thungavi",
    name: "THUNGAVI",
    bbox: [77.400, 10.530, 77.480, 10.610]
  }
];

function bboxToPolygon(bbox) {
  const [minX, minY, maxX, maxY] = bbox;
  return [
    [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
      [minX, minY]
    ]
  ];
}

function main() {
  console.log("Generating Tiruppur FIRKA GeoJSON for 33 CGWB 2024 zones...");

  const features = firkas.map(f => ({
    type: "Feature",
    properties: {
      zone_id: f.zone_id,
      name: f.name,
      assessment_year: 2024,
      district: "Tiruppur",
      state: "Tamil Nadu",
      source: "CGWB — Dynamic Ground Water Resources of Tamil Nadu 2024"
    },
    geometry: {
      type: "Polygon",
      coordinates: bboxToPolygon(f.bbox)
    }
  }));

  const geojson = {
    type: "FeatureCollection",
    features: features
  };

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(geojson, null, 2), "utf-8");
  console.log(`Successfully generated ${features.length} FIRKA features to ${OUTPUT_FILE}`);
}

main();
