const https = require("https");
const http = require("http");

async function testEndpoint(urlStr) {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr);
      const client = url.protocol === "https:" ? https : http;

      const req = client.get(urlStr, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/html, application/xml, */*"
        },
        timeout: 10000
      }, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({
            url: urlStr,
            status: res.statusCode,
            contentType: res.headers["content-type"] || "",
            snippet: body.substring(0, 400).replace(/\s+/g, " ")
          });
        });
      });

      req.on("error", (e) => resolve({ url: urlStr, error: e.message }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ url: urlStr, error: "Connection Timeout (10s)" });
      });
    } catch (e) {
      resolve({ url: urlStr, error: e.message });
    }
  });
}

async function main() {
  console.log("Investigating official government GIS endpoints...");

  const endpoints = [
    "https://tiruppur.nic.in/administrative-setup/revfir/",
    "https://tngis.tn.gov.in/apps.html",
    "https://tngis.tn.gov.in/apps/cumta/",
    "https://onlinemaps.surveyofindia.gov.in/",
    "https://webgis1.nic.in/nicstreet/rest/services/admin2024/MapServer?f=pjson",
    "https://webgis1.nic.in/nicstreet/rest/services/admin2024/MapServer/layers?f=pjson",
    "https://www.nwdp.nwic.gov.in/dataset/village-boundary",
    "https://tngis.tn.gov.in/geoserver/wfs?request=GetCapabilities",
    "https://tngis.tn.gov.in/arcgis/rest/services?f=pjson"
  ];

  for (const ep of endpoints) {
    const res = await testEndpoint(ep);
    console.log("\n----------------------------------------");
    console.log("Endpoint:", res.url);
    if (res.error) {
      console.log("Error:", res.error);
    } else {
      console.log("Status:", res.status);
      console.log("Content-Type:", res.contentType);
      console.log("Snippet:", res.snippet);
    }
  }
}

main();
