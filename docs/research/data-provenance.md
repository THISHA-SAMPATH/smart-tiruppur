# Data Provenance and Inventory: Smart Tiruppur / NoyyalSense

**Project:** Smart Tiruppur Environmental Digital Twin / NoyyalSense
**Document Type:** Data Provenance Inventory & Lineage Registry
**Target Audience:** Academic Reviewers, Data Stewards, Environmental Modelers
**Last Updated:** October 2026
**Framework:** Geospatial Data Lineage & Scientific Provenance Inventory (Transparency & Audit Guidelines)

---

## 1. Provenance Classification Taxonomy

To ensure scientific honesty and transparency, all data layers and analytical outputs in the Smart Tiruppur platform are strictly classified according to this seven-tier taxonomy:

1. **Open Data (GIS):** Freely accessible, community- or agency-maintained geospatial records (e.g., OpenStreetMap, OpenFreeMap, OpenMapTiles).
2. **Official Baseline / Government Statistics:** Published public-sector environmental assessments (e.g., Central Ground Water Board 2024 Dynamic Assessment).
3. **Registry Coordinates (Official Station Locations):** Verified spatial coordinates matching physical statutory monitoring sites (e.g., TNPCB NWMP sampling stations).
4. **Modelled:** Outputs produced by deterministic algorithms, empirical equations, or spatial multi-criteria evaluations (e.g., snapped river transit pathways, terrain accumulation scores).
5. **Simulated / Demonstration:** Synthetic parameters designed to exercise application workflows in the absence of continuous live telemetry (e.g., facility effluent concentrations, real-time sensor parameters).
6. **Scenario Assumption:** Parametric input adjustments representing hypothetical stress tests (e.g., $1.2\times$ extraction multiplier, extreme monsoon rainfall).
7. **Derived:** Mathematically computed ratios, percentage changes, differences, or aggregations based on primary inputs (e.g., net groundwater balance, absolute delta).

---

## 2. Comprehensive Data Inventory Matrix

| # | Dataset / Source Name | Source File / API / Service | Spatial Coverage & Resolution | Temporal Coverage / Year | Relevant Attributes & Units | Provenance Tier | Known Limitations | Consumed By Application |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **OpenFreeMap Liberty Vector Basemap** | `https://tiles.openfreemap.org/styles/liberty` | Tiruppur District & Tamil Nadu regional extents (Zoom 0–18) | Continuously updated OpenStreetMap extract | Roads, landuse, water bodies, administrative borders, place labels | **Open Data (GIS)** | Vector tile styling dependent on OpenFreeMap CDN availability. | `app/terrain-map-prototype/page.tsx`, `components/Terrain3DViewer.tsx` |
| **2** | **OpenMapTiles 3D Building Extrusions** | Vector basemap tile source (`openmaptiles` schema, `building` layer) | Tiruppur municipal urban extent | OpenStreetMap snapshot | Building footprints, `render_height` (m), `render_min_height` (m) | **Open Data (GIS)** | Building height tags are incomplete across Tiruppur; uses 16m fallback display height for unmeasured footprints. | Vector layer `building-3d` in MapLibre map |
| **3** | **Noyyal River Centerline Geometry** | `public/geo/noyyal-river.geojson` | 220 KB LineString geometry along Noyyal River corridor (Tiruppur stretch) | Extracted 2024 from OpenStreetMap waterways | LineString coordinates (lon, lat) | **Open Data (GIS)** | Centerline representation; lacks dynamic bathymetry, channel cross-sections, or seasonally varying river widths. | Rendered as dual-stroke river layer; used for trace pollution snapping |
| **4** | **TNPCB Monitoring Station Coordinates** | `public/geo/tnpcb-noyyal-stations.json` | 3 point locations along Noyyal River (Mangalam, Kasipalayam Bridge, Orathapalayam Dam Exit) | 2023–2024 TNPCB Policy Note / CPCB NWMP Registry | `station_id`, `station_name`, `latitude`, `longitude`, `monitoring_agency` | **Registry Coordinates (Official Locations)** | Station coordinates match official sampling locations; baseline chemical parameters in JSON are `null` pending historical data ingestion. | Base coordinates for `ENVIRONMENTAL_SENSOR_REGISTRY` |
| **5** | **Simulated Monitoring Telemetry Readings** | `lib/digital-twin/sensors.ts` (`ENVIRONMENTAL_SENSOR_REGISTRY`) | 3 mapped station points along river stem | Demonstration time-series / fixed sample snapshot | pH (dimensionless), EC ($\mu S/\text{cm}$), Turbidity (NTU), River Flow ($m^3/\text{s}$) | **Simulated / Demonstration** | Synthetic values intended for demonstration; not live IoT telemetry or lab-certified chemical assays. | Station popups, details panel, sensor marker badges |
| **6** | **Industrial Facilities Demo Registry** | `lib/digital-twin/industrial.ts` (`INDUSTRIAL_UNITS_GEO`) | 12 cluster locations across Tiruppur textile zones | Representative archetype configuration | Unit ID, name, coordinates, sector type, compliance status, reuse (%), flow ($m^3/\text{d}$), confidence | **Simulated / Demonstration** | Archetypes representing industrial clusters; does not represent an official regulatory prosecution register. | Facility markers, facility details card, trace pollution source picker |
| **7** | **Simulated Industrial Outfalls** | `lib/digital-twin/industrial.ts` (`INDUSTRIAL_OUTFALLS`) | 12 point coordinates offset from facilities | Synthetic configuration | `flow_rate` (relative demonstration index), `concentration` (relative indicator), `pollutant` | **Simulated / Demonstration** | Nominal discharge parameters; not metered flow measurements. | Outfall connectors, trace pollution calculation |
| **8** | **Modelled Pollution Pathways** | Dynamically computed via `findNearestWaterwaySnap()` in `page.tsx` | Linear snapped line from outfall to river centerline to downstream sensor | Generated on-demand | Geodesic distance (m), river chainage (m), estimated transit time (hours) | **Modelled** | Snapping uses 2D orthogonal projection; assumes constant advective velocity ($0.25\text{ m/s}$; $\pm 50\%$ uncalibrated uncertainty); does not establish physical drain connectivity or downstream water-quality impact. | Trace Pollution visual path overlay, transit time cards |
| **9** | **Terrain Flood Hazard Indicators** | `lib/flood/engine.ts` (`runFloodAnalysisPipeline()`) | 6 nominal urban sector points (Kasipalayam, Angeripalayam, Tiruppur S/N, Arulpuram, Mangalam) | Scenario-driven (Baseline to Extreme 250 mm/d) | Accumulation indicator (m), flood-risk score (0–1), risk classification | **Modelled** | Evaluates 6 sector points using nominal elevation profile constants; does not generate 2D inundation polygons. | Flood Exposure layer, sector badges, Scenario Comparison table |
| **10** | **CGWB 2024 Dynamic Groundwater Assessment** | Official dataset embedded in groundwater service / `CGWB_TIRUPPUR_FIRKAS` in `page.tsx` | 33 Revenue Firkas covering Tiruppur District | Assessment Year 2024 (Published by CGWB, Ministry of Jal Shakti) | Extractable resource (ham), Annual draft (ham), Extraction stage (%), CGWB Category | **Official Baseline / Government Statistics** | Assessment published at Firka administrative level; spatial markers represent Firka geographic centroids, not wellheads. | Groundwater Assessment layer, Firka details panel, Scenario Comparison |
| **11** | **Groundwater Scenario Multipliers** | `GET /zones/{id}/assess?extraction_multiplier={m}` | 33 Firkas | User-selectable ($0.8\times$, $1.0\times$, $1.2\times$) | Scaled annual extraction (ham), Scaled stage (%), Category transition | **Scenario Assumption** | Hypothetical sensitivity multipliers; not field-measured changes in extraction rate. | Groundwater panel scenario selector, Scenario Comparison |
| **12** | **STERI What-If Sensitivity Scores** | `lib/scenarios/engine.ts` (`runScenarioWhatIfEngine()`) | District-wide aggregate index | Sensitivity evaluation | Composite score (0.00–1.00), component sub-scores (0.00–1.00) | **Modelled** | Simplified parametric sensitivity response; does not replace complex numerical environmental forecasting. | Scenario Comparison STERI tab, sensitivity cards |
| **13** | **Scenario Comparison Delta Metrics** | Dynamically computed in `page.tsx` (`computeDeltaNumber()`) | Pairwise comparison between Baseline and Alternative | Real-time calculation | Absolute delta ($\Delta$), Percentage change ($\%\Delta$), Directional status | **Derived** | Mathematical derivation; handles zero-baseline values safely without division-by-zero errors. | Side-by-side comparison tables in Scenario Comparison module |
| **14** | **Firka Administrative Boundary GeoJSON** | `public/geo/tiruppur-firka-boundaries.geojson` | Empty FeatureCollection (`features: []`, 54 bytes) | Current workspace state | None | **Unavailable** | Official cadastral Firka boundary polygons are not available in public GIS; system correctly uses Firka centroids instead. | Documented why polygon extrusion is omitted for groundwater |

---

## 3. Detailed Data Lineage & Scientific Provenance Notes

### 3.1 Noyyal River Vector Geometry
* **Lineage:** The river geometry in `public/geo/noyyal-river.geojson` was obtained by extracting the `waterway=river` relation for the Noyyal River from OpenStreetMap.
* **Integrity Guarantee:** The centerline coordinates follow the real natural and canalized path of the river through Tiruppur town.
* **Limitations:** The file contains line geometry only, without river width polygons, seasonal discharge cross-sections, or depth profiles.

### 3.2 Industrial Facility Dataset vs. Regulatory Registry
* **Provenance:** The 12 industrial facilities defined in `lib/digital-twin/industrial.ts` were created as realistic representative archetypes for system demonstration.
* **Clusters Covered:** Major industrial textile concentrations including Arulpuram CETP, Veerapandi, Mangalam Road, Kasipalayam, Rayapuram, Tiruppur North CETP, Angeripalayam, Murugampalayam, Nallur, Palayakkarai, Uthukuli Road, and Vijayapuram.
* **Ethical & Scientific Safeguard:** The application makes clear that individual facility compliance flags (`COMPLIANT`, `WARNING`, `INVESTIGATE`) are demonstration indicators and do not represent verified regulatory non-compliance citations from the Tamil Nadu Pollution Control Board.
* **Physical Conveyance Disclaimer:** Where a facility lies beyond the $2,500\text{ m}$ catchment snapping threshold, its physical conveyance route is classified as **unknown**. The software does not claim closed-loop ZLD or indirect CETP conveyance without facility-specific evidence.

### 3.3 Water Quality Monitoring Stations
* **Provenance:** Coordinates for `sensor_001` (Mangalam: $11.10651^\circ\text{ N}, 77.26001^\circ\text{ E}$), `sensor_002` (Kasipalayam: $11.11975^\circ\text{ N}, 77.39716^\circ\text{ E}$), and `sensor_003` (Orathapalayam: $11.11084^\circ\text{ N}, 77.53981^\circ\text{ E}$) match official TNPCB NWMP station entries recorded in public government documents (`public/geo/tnpcb-noyyal-stations.json`).
* **Distinction:** Station metadata and spatial locations are authoritative open data; parameter values (pH 6.8–7.8, EC 1420–3100 $\mu S/\text{cm}$, turbidity, flow) are simulated demonstration figures.

### 3.4 Groundwater Assessment (CGWB 2024)
* **Provenance:** Derived from the official *National Compilation on Dynamic Ground Water Resources of India, 2024*, Central Ground Water Board, Department of Water Resources, River Development and Ganga Rejuvenation, Ministry of Jal Shakti.
* **Data Unit:** All volumetric resources and drafts are expressed in **ham (hectare-metres)**, where $1\text{ ham} = 10,000\text{ m}^3 = 0.01\text{ MCM}$.
* **Spatial Granularity:** 33 Revenue Firkas across Tiruppur District.
* **Baseline Figures (e.g., Tiruppur South):**
  * Annual Extractable Resource: $2,985.45\text{ ham}$
  * Total Annual Extraction: $3,355.65\text{ ham}$
  * Stage of Extraction: $112.4\%$
  * Net Balance: $-370.20\text{ ham}$
  * Category: **Over Exploited**
* **Geometric Handling:** Because the local file `public/geo/tiruppur-firka-boundaries.geojson` contains an empty FeatureCollection, the application represents each Firka by its geographic centroid. **No synthetic boundary polygons are generated**, avoiding false geospatial precision.

### 3.5 Flood Scenario Indicators
* **Provenance:** Deterministic multi-criteria screening formulation implemented in `lib/flood/engine.ts`.
* **Output Type:** Point indicators at six representative sector locations.
* **Explicit Exclusion:** The model does not produce continuous flood extents, depth grids, or velocity vectors, and the software makes no claim to be a 2D hydrodynamic simulation.
