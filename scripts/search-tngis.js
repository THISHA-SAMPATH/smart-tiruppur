const https = require("https");

async function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'SmartTiruppur/1.0' } }, (res) => {
      let b = "";
      res.on("data", (chunk) => (b += chunk));
      res.on("end", () => {
        resolve({ status: res.statusCode, bodySnippet: b.substring(0, 300) });
      });
    }).on("error", (e) => resolve({ error: e.message }));
  });
}

async function main() {
  console.log("Checking TNGIS / Spatial portals for FIRKA layers...");
  
  const urls = [
    "https://tngis.tn.gov.in/",
    "https://tngis.tn.gov.in/geoserver/wfs?request=GetCapabilities",
    "https://tngis.tn.gov.in/arcgis/rest/services?f=pjson",
    "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms?service=WMS&version=1.1.1&request=GetCapabilities",
    "https://raw.githubusercontent.com/datameet/maps/master/villages/TN/Tiruppur.geojson"
  ];

  for (const u of urls) {
    console.log("Checking:", u);
    const res = await checkUrl(u);
    console.log("Result:", JSON.stringify(res, null, 2));
  }
}

main();
