const fs = require("fs");
const https = require("https");

const query = `[out:json][timeout:60];
(
  relation["boundary"="administrative"](10.5,77.0,11.4,77.8);
  way["boundary"="administrative"](10.5,77.0,11.4,77.8);
  node["place"](10.5,77.0,11.4,77.8);
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
  const firkaMatches = (data.elements || []).filter(e => {
    const tagStr = JSON.stringify(e.tags || {});
    return /firka|block|taluk|panchayat/i.test(tagStr);
  });
  console.log(`Found ${firkaMatches.length} matching elements for firka/block/taluk.`);
  console.log(firkaMatches.slice(0, 20).map(e => ({ type: e.type, id: e.id, tags: e.tags })));
}

main();
