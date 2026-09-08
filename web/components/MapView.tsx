"use client";

import maplibregl, { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { useEffect, useRef, useState } from "react";
import type { LocationContext } from "@/lib/types";

const DEFAULT_CENTER: [number, number] = [139.7671, 35.6812]; // 東京

let protocolRegistered = false;

function ensurePmtilesProtocol() {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  protocolRegistered = true;
}

export function MapView({
  location,
  onPick,
}: {
  location: LocationContext | null;
  onPick?: (lat: number, lon: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [tileLoadFailed, setTileLoadFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // 地図初期化effect(マウント時に一度だけ実行)がクリックハンドラを
  // 登録する際、onPickの最新の参照をrefで持って読むことで、親の再レンダー
  // で関数の参照が変わっても古いonPickを掴んだままにならないようにする。
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!containerRef.current) return;
    ensurePmtilesProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "/map/style.json",
      // 初回マウント時点で選択済みの地点があればそこを、無ければ東京を中心にする
      // (以前は常に東京固定で、大阪等の地点を選んでもマーカーが画面外になっていた)。
      center: location ? [location.lon, location.lat] : DEFAULT_CENTER,
      zoom: 10,
    });
    mapRef.current = map;

    // 自前ホストのpmtilesファイルが未配置(プレースホルダー状態)でも
    // ページ全体をクラッシュさせない。
    map.on("error", (e) => {
      console.warn("[MapView] map error", e.error);
      setTileLoadFailed(true);
    });

    map.on("load", () => setMapReady(true));

    map.on("click", (e) => {
      onPickRef.current?.(e.lngLat.lat, e.lngLat.lng);
    });
    map.getCanvas().style.cursor = "crosshair";

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 選択中の地点が変わるたびに、ピン型マーカーを置き直し、その地点へ
  // カメラを移動する(検索や地図クリックで地点を変えた際、マーカーが
  // 画面外に置かれたままにならないようにする)。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !location) return;

    const lngLat: [number, number] = [location.lon, location.lat];

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ color: "#f5c2c8" })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(lngLat);
    }

    map.flyTo({ center: lngLat, zoom: Math.max(map.getZoom(), 10), speed: 1.2 });
  }, [location, mapReady]);

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
