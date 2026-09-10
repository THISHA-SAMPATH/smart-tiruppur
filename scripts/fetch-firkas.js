const fs = require("fs");
const path = require("path");
const https = require("https");

const OUTPUT_DIR = path.join(__dirname, "..", "public", "geo");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "tiruppur-firka-boundaries.geojson");

const query = `[out:json][timeout:60];
(
  relation["boundary"="administrative"](10.5,77.0,11.4,77.8);
);
out body;
>;
out skel qt;`;

function fetchOverpassData() {
  return new Promise((resolve, reject) => {
    const postData = `data=${encodeURIComponent(query)}`;
    const req = https.request(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
          "User-Agent": "SmartTiruppur/1.0",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (e) {
            reject(new Error("Failed to parse Overpass response: " + e.message));
          }
        });
      }
    );

    req.on("error", (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log("Fetching Tiruppur boundary relations from OpenStreetMap...");
  try {
    const osmData = await fetchOverpassData();
    console.log(`Received ${osmData.elements?.length || 0} total elements.`);
    
    const relations = (osmData.elements || []).filter(e => e.type === "relation");
    console.log(`Found ${relations.length} relations.`);
    
    const names = relations.map(r => ({
      id: r.id,
      name: r.tags?.name,
      admin_level: r.tags?.admin_level,
      boundary: r.tags?.boundary
    }));
    
    console.log("Boundary relations found:", JSON.stringify(names, null, 2));
  } catch (err) {
    console.error("Error fetching boundaries:", err.message);
  }
}

main();
