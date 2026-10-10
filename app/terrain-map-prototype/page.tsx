"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function TerrainMapPrototypePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const [status, setStatus] = useState("Preparing map...");
  const [is3D, setIs3D] = useState(true);
  const [showRiver, setShowRiver] = useState(true);

  useEffect(() => {
    let active = true;
    let map: MapLibreMap | null = null;

    async function initialiseMap() {
      try {
        const ml = await import("maplibre-gl");

        if (!active || !containerRef.current) return;

        // Use the worker matching the installed MapLibre version.
        ml.setWorkerUrl(
          `https://unpkg.com/maplibre-gl@${ml.getVersion()}/dist/maplibre-gl-worker.mjs`
        );

        map = new ml.Map({
          container: containerRef.current,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [77.3411, 11.1085],
          zoom: 13.5,
          pitch: 52,
          bearing: -18,
          maxPitch: 65,
        });

        mapRef.current = map;

        map.addControl(
          new ml.NavigationControl({ visualizePitch: true }),
          "top-right"
        );

        map.addControl(
          new ml.ScaleControl({
            maxWidth: 110,
            unit: "metric",
          }),
          "bottom-left"
        );

        map.on("load", async () => {
          if (!active || !map) return;

          setStatus("Basemap loaded. Loading Noyyal River...");

          try {
            // Use the project's existing river geometry.
            const response = await fetch("/geo/noyyal-river.geojson");

            if (!response.ok) {
              throw new Error("Could not load the local Noyyal River data.");
            }

            const riverData = await response.json();

            if (!active || !map) return;

            map.addSource("prototype-noyyal-river", {
              type: "geojson",
              data: riverData,
            });

            const firstLabel = map
              .getStyle()
              .layers?.find((layer) => layer.type === "symbol")?.id;

            map.addLayer(
              {
                id: "prototype-noyyal-river-glow",
                type: "line",
                source: "prototype-noyyal-river",
                layout: {
                  "line-join": "round",
                  "line-cap": "round",
                },
                paint: {
                  "line-color": "#38bdf8",
                  "line-width": 10,
                  "line-opacity": 0.18,
                  "line-blur": 2,
                },
              },
              firstLabel
            );

            map.addLayer(
              {
                id: "prototype-noyyal-river-core",
                type: "line",
                source: "prototype-noyyal-river",
                layout: {
                  "line-join": "round",
                  "line-cap": "round",
                },
                paint: {
                  "line-color": "#0284c7",
                  "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    1.5,
                    14,
                    3.5,
                    17,
                    6,
                  ],
                },
              },
              firstLabel
            );

            setStatus("Map ready · Noyyal River overlay loaded");
          } catch (error) {
            console.error("River overlay:", error);
            if (active) {
              setStatus("Basemap loaded; river overlay needs checking");
            }
          }
        });

        map.on("error", (event) => {
          console.error("MapLibre:", event.error);
        });
      } catch (error) {
        console.error("Map initialisation:", error);
        if (active) setStatus("Map could not initialise. Check the browser console.");
      }
    }

    void initialiseMap();

    return () => {
      active = false;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  function toggleView() {
    const nextIs3D = !is3D;
    setIs3D(nextIs3D);

    mapRef.current?.easeTo({
      pitch: nextIs3D ? 52 : 0,
      bearing: nextIs3D ? -18 : 0,
      duration: 700,
    });
  }

  function toggleRiver() {
    const nextVisible = !showRiver;
    setShowRiver(nextVisible);

    const map = mapRef.current;

    if (!map) return;

    for (const id of [
      "prototype-noyyal-river-glow",
      "prototype-noyyal-river-core",
    ]) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(
          id,
          "visibility",
          nextVisible ? "visible" : "none"
        );
      }
    }
  }

  return (
    <div
      style={{
        padding: "18px",
        background: "#edf2f7",
        color: "#172b3a",
        minHeight: "calc(100vh - 70px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "2px",
              color: "#0f766e",
            }}
          >
            NOYYALSENSE · EXPERIMENTAL MAP
          </div>

          <h1
            style={{
              margin: "5px 0",
              fontSize: "24px",
              fontWeight: 800,
            }}
          >
            Tiruppur City Map Prototype
          </h1>

          <p style={{ margin: 0, fontSize: "13px", color: "#526477" }}>
            Vector basemap with the existing Noyyal River geometry
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={toggleView} style={buttonStyle}>
            {is3D ? "Switch to 2D" : "Switch to 3D"}
          </button>

          <button onClick={toggleRiver} style={buttonStyle}>
            {showRiver ? "Hide Noyyal" : "Show Noyyal"}
          </button>
        </div>
      </div>

      <div
        style={{
          overflow: "hidden",
          position: "relative",
          height: "calc(100vh - 215px)",
          minHeight: "520px",
          borderRadius: "16px",
          border: "1px solid #cad5df",
          boxShadow: "0 12px 35px rgba(24, 48, 65, 0.12)",
          background: "#dce5eb",
        }}
      >
        <div
          ref={containerRef}
          style={{
            position: "absolute",
            inset: 0,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            padding: "12px 15px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.94)",
            boxShadow: "0 4px 18px rgba(20,40,55,0.12)",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 800 }}>
            TIRUPPUR, TAMIL NADU
          </div>
          <div
            style={{
              fontSize: "11px",
              marginTop: "4px",
              color: "#526477",
            }}
          >
            {status}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "16px",
            right: "16px",
            padding: "12px 15px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 4px 18px rgba(20,40,55,0.12)",
            fontSize: "12px",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "7px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "24px",
                height: "4px",
                borderRadius: "4px",
                background: "#0284c7",
              }}
            />
            Noyyal River · local GeoJSON
          </div>

          <div style={{ color: "#526477" }}>
            Buildings and streets · vector basemap
          </div>
        </div>
      </div>

      <p style={{ fontSize: "12px", color: "#526477", marginTop: "10px" }}>
        Prototype for comparison only. The basemap is supplied by OpenFreeMap;
        the river overlay uses your existing project dataset.
      </p>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: "9px",
  padding: "10px 14px",
  background: "#ffffff",
  color: "#173548",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
};