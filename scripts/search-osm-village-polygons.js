const fs = require("fs");
const https = require("https");

const query = `[out:json][timeout:60];
(
  relation["boundary"="administrative"](10.4,77.0,11.4,77.8);
  relation["admin_level"~"7|8|9|10"](10.4,77.0,11.4,77.8);
  way["boundary"="administrative"](10.4,77.0,11.4,77.8);
);
out tags;`;

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
  const data = await fetchOverpassData();
  console.log(`Received ${data.elements?.length || 0} total elements.`);
  const adminLevels = {};
  for (const el of data.elements || []) {
    const lvl = el.tags?.admin_level || "no_level";
    adminLevels[lvl] = (adminLevels[lvl] || 0) + 1;
  }
  console.log("Admin Levels summary:", adminLevels);

  const level789 = (data.elements || []).filter(el => ["7", "8", "9"].includes(el.tags?.admin_level));
  console.log(`Found ${level789.length} elements with admin_level 7/8/9:`);
  console.log(level789.map(el => ({ id: el.id, type: el.type, name: el.tags?.name, admin_level: el.tags?.admin_level })));
}

main();
