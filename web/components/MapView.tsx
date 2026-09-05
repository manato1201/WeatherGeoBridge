"use client";

import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { useEffect, useRef, useState } from "react";
import type { WeatherObservation } from "@/lib/types";

const WEATHER_SOURCE_ID = "weather-points";

let protocolRegistered = false;

function ensurePmtilesProtocol() {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  protocolRegistered = true;
}

export function MapView({
  observation,
}: {
  observation: WeatherObservation | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [tileLoadFailed, setTileLoadFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    ensurePmtilesProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "/map/style.json",
      center: [139.7671, 35.6812],
      zoom: 9,
    });
    mapRef.current = map;

    // 自前ホストのpmtilesファイルが未配置(プレースホルダー状態)でも
    // ページ全体をクラッシュさせない。
    map.on("error", (e) => {
      console.warn("[MapView] map error", e.error);
      setTileLoadFailed(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !observation) return;

    const applyWeatherOverlay = () => {
      const geojson = {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [observation.lon, observation.lat],
            },
            properties: {
              temp: observation.temperatureC,
              code: observation.weatherCode,
            },
          },
        ],
      };

      const existing = map.getSource(WEATHER_SOURCE_ID) as
        maplibregl.GeoJSONSource | undefined;
      if (existing) {
        existing.setData(geojson);
        return;
      }

      map.addSource(WEATHER_SOURCE_ID, { type: "geojson", data: geojson });
      map.addLayer({
        id: "weather-points-layer",
        type: "circle",
        source: WEATHER_SOURCE_ID,
        paint: {
          "circle-radius": 8,
          "circle-color": "#0a0a0a",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    };

    if (map.isStyleLoaded()) {
      applyWeatherOverlay();
    } else {
      map.once("load", applyWeatherOverlay);
    }
  }, [observation]);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ position: "relative", width: "100%", height: 400 }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        {tileLoadFailed && (
          <div
            className="badge badge--soft"
            style={{
              position: "absolute",
              top: "var(--space-12)",
              left: "var(--space-12)",
              maxWidth: "calc(100% - 24px)",
            }}
          >
            地図タイル(PMTiles)が未配置です。web/public/map/README.md を参照してください。
          </div>
        )}
      </div>
    </div>
  );
}
