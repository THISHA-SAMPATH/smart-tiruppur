const fs = require("fs");
const path = require("path");
const https = require("https");

const OUTPUT_DIR = path.join(__dirname, "..", "public", "geo");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "tiruppur-firka-boundaries.geojson");

// Fetch relations for Tiruppur district administrative boundaries (Taluks & sub-regions)
const relIds = [
  10326820, // Tiruppur North
  10315412, // Tiruppur South
  10315414, // Avanashi
  10326821, // Uthukuli
  10315413, // Palladam
  10315411, // Kangeyam
  10315410, // Dharapuram
  10315409, // Madathukulam
  10315408  // Udumalaipettai
];

const query = `[out:json][timeout:60];
(
  relation(id:${relIds.join(",")});
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
  console.log("Fetching Tiruppur boundary geometry from OpenStreetMap...");
  try {
    const data = await fetchOverpassData();
    console.log(`Received ${data.elements?.length || 0} elements.`);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
