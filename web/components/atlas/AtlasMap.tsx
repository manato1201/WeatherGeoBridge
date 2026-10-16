"use client";

// アトラス画面の主役の地図。MapLibreの「平面(fill)」と「立体(fill-extrusion)」を
// 同じGeoJSON(同じ値・同じ色)から描き分けるだけなので、2Dと3Dで数値が食い違わない。
// 自前ホストのPMTilesの上に重ねるだけで、外部タイルへの依存は増えない。

import maplibregl, { Map as MapLibreMap, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { useEffect, useRef, useState } from "react";
import {
  buildMeshGeoJson,
  flattenMesh,
  formatTimeLabel,
  lerpMesh,
  type AtlasMetric,
  type GridSeriesSet,
  type MeshFeatureProps,
} from "@/lib/atlas";
import type { ResolvedTheme } from "@/lib/ThemeContext";

export type AtlasView = "flat" | "3d";

const SOURCE_ID = "atlas-mesh";
const FILL_ID = "atlas-mesh-fill";
const EXTRUSION_ID = "atlas-mesh-extrusion";
const DEFAULT_CENTER: [number, number] = [139.7671, 35.6812];
const TWEEN_MS = 420;
const RISE_MS = 760;
const DRAWER_W = 340;

type Mesh = GeoJSON.FeatureCollection<GeoJSON.Polygon, MeshFeatureProps>;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// 選択地点のピン。選択が変わるたびに波紋を2回だけ広げる(常時は動かさない: P8)。
function createPin(): HTMLElement {
  const root = document.createElement("div");
  root.className = "atlas-pin";
  const ring = document.createElement("span");
  ring.className = "atlas-pin__ring";
  const dot = document.createElement("span");
  dot.className = "atlas-pin__dot";
  root.append(ring, dot);
  return root;
}

let protocolRegistered = false;
function ensurePmtilesProtocol() {
  if (protocolRegistered) return;
  maplibregl.addProtocol("pmtiles", new Protocol().tile);
  protocolRegistered = true;
}

function meshKey(fetchedAt: string, metric: AtlasMetric, timeIndex: number): string {
  return `${fetchedAt}|${metric}|${timeIndex}`;
}

function styleUrl(theme: ResolvedTheme): string {
  return theme === "dark" ? "/map/style.json" : "/map/style-light.json";
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function popupContent(props: MeshFeatureProps, timeLabel: string): HTMLElement {
  // 値は自前で整形した文字列だけなのでtextContentで組み立てる(HTMLは流し込まない)。
  const root = document.createElement("div");
  root.style.fontFamily = "var(--font-mono)";
  root.style.fontSize = "12px";
  root.style.lineHeight = "1.6";
  root.style.color = "#111";
  const title = document.createElement("div");
  title.style.fontWeight = "600";
  title.textContent = timeLabel;
  root.appendChild(title);
  for (const [label, value] of [
    ["気温", props.temperature],
    ["降水", props.precipitation],
    ["風", props.wind],
  ] as const) {
    const row = document.createElement("div");
    row.textContent = `${label} ${value}`;
    root.appendChild(row);
  }
  return root;
}

export function AtlasMap({
  grid,
  metric,
  timeIndex,
  view,
  selected,
  theme,
  reserveSide,
}: {
  grid: GridSeriesSet | null;
  metric: AtlasMetric;
  timeIndex: number;
  view: AtlasView;
  selected: { lat: number; lon: number } | null;
  theme: ResolvedTheme;
  /** 詳細ドロワー/ボトムシートが地図の上に出ている間、選択地点がその下に隠れないよう余白を取る。 */
  reserveSide: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const appliedStyleRef = useRef<string | null>(null);
  // 画面に最後に流し込んだメッシュ(補間の起点)と、それが何の値かの識別子。
  const shownRef = useRef<Mesh | null>(null);
  const shownKeyRef = useRef<string | null>(null);
  const tweenRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // style.loadのハンドラ(テーマ切替でスタイルを差し替えるたびに走る)から
  // 常に最新の表示状態を読むためのref。
  const latest = useRef({ grid, metric, timeIndex, view });
  latest.current = { grid, metric, timeIndex, view };

  useEffect(() => {
    if (!containerRef.current) return;
    ensurePmtilesProtocol();

    const url = styleUrl(theme);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: url,
      center: selected ? [selected.lon, selected.lat] : DEFAULT_CENTER,
      zoom: 6.4,
      maxPitch: 70,
    });
    mapRef.current = map;
    appliedStyleRef.current = url;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    function addMeshLayers() {
      if (map.getSource(SOURCE_ID)) return;
      const { grid, metric, timeIndex, view } = latest.current;
      const initial: Mesh = grid
        ? buildMeshGeoJson(grid, metric, timeIndex)
        : { type: "FeatureCollection", features: [] };
      shownRef.current = initial;
      shownKeyRef.current = grid ? meshKey(grid.fetchedAt, metric, timeIndex) : null;
      map.addSource(SOURCE_ID, { type: "geojson", data: initial });
      // 地名ラベルをメッシュの上に残す。
      const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
      map.addLayer(
        {
          id: FILL_ID,
          type: "fill",
          source: SOURCE_ID,
          layout: { visibility: view === "flat" ? "visible" : "none" },
          paint: { "fill-color": ["get", "color"], "fill-opacity": 0.72 },
        },
        firstSymbol,
      );
      map.addLayer(
        {
          id: EXTRUSION_ID,
          type: "fill-extrusion",
          source: SOURCE_ID,
          layout: { visibility: view === "3d" ? "visible" : "none" },
          paint: {
            "fill-extrusion-color": ["get", "color"],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.9,
          },
        },
        firstSymbol,
      );
    }

    map.on("style.load", () => {
      addMeshLayers();
      setReady(true);
    });

    // 地名ラベル用フォント等の取得失敗でもページは壊さず、小さく知らせる。
    map.on("error", (e) => {
      console.warn("[AtlasMap] map error", e.error);
      setFailed(true);
    });

    map.on("click", (e) => {
      const layers = [FILL_ID, EXTRUSION_ID].filter((id) => map.getLayer(id));
      const hit = map.queryRenderedFeatures(e.point, { layers })[0];
      popupRef.current?.remove();
      if (!hit) return;
      const { grid } = latest.current;
      const timeLabel = grid ? formatTimeLabel(grid.times[latest.current.timeIndex] ?? "") : "";
      popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: "200px" })
        .setLngLat(e.lngLat)
        .setDOMContent(popupContent(hit.properties as unknown as MeshFeatureProps, timeLabel))
        .addTo(map);
    });
    for (const id of [FILL_ID, EXTRUSION_ID]) {
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
    }

    return () => {
      if (tweenRef.current !== null) cancelAnimationFrame(tweenRef.current);
      popupRef.current?.remove();
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // 地図の生成はマウント時に1回だけ(以降の変化は下のeffectで反映する)。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // メッシュを from → target へ滑らかに動かす(高さと色だけ。最後のフレームは target と同一)。
  function runTween(map: MapLibreMap, from: Mesh, target: Mesh, durationMs: number) {
    if (tweenRef.current !== null) cancelAnimationFrame(tweenRef.current);
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const push = (mesh: Mesh) => {
      source.setData(mesh);
      shownRef.current = mesh;
    };
    if (prefersReducedMotion() || durationMs <= 0) {
      push(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      push(lerpMesh(from, target, easeOutCubic(t)));
      tweenRef.current = t < 1 ? requestAnimationFrame(tick) : null;
    };
    tweenRef.current = requestAnimationFrame(tick);
  }

  // 値の更新(時刻スライダー・指標の切替・新しいメッシュ)。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !grid) return;
    const key = meshKey(grid.fetchedAt, metric, timeIndex);
    if (shownKeyRef.current === key) return;
    shownKeyRef.current = key;
    const target = buildMeshGeoJson(grid, metric, timeIndex);
    const from = shownRef.current;
    if (from && from.features.length === target.features.length) {
      runTween(map, from, target, TWEEN_MS);
    } else if (view === "3d") {
      // 初回のメッシュ到着: 立体なら柱が下から立ち上がる。
      runTween(map, flattenMesh(target), target, RISE_MS);
    } else {
      runTween(map, target, target, 0);
    }
    // runTween は ref とmapだけを使う。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, metric, timeIndex, ready]);

  // 平面⇔立体。立体では傾けて高さが見えるようにし、柱を立ち上げる。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setLayoutProperty(FILL_ID, "visibility", view === "flat" ? "visible" : "none");
    map.setLayoutProperty(EXTRUSION_ID, "visibility", view === "3d" ? "visible" : "none");
    map.easeTo({
      pitch: view === "3d" ? 58 : 0,
      bearing: view === "3d" ? -14 : 0,
      duration: prefersReducedMotion() ? 0 : 700,
    });
    const { grid, metric, timeIndex } = latest.current;
    if (view === "3d" && grid && shownRef.current?.features.length) {
      const target = buildMeshGeoJson(grid, metric, timeIndex);
      runTween(map, flattenMesh(target), target, RISE_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, ready]);

  // ライト/ダークで地図のスタイルを切り替える。
  useEffect(() => {
    const map = mapRef.current;
    const url = styleUrl(theme);
    if (!map || appliedStyleRef.current === url) return;
    appliedStyleRef.current = url;
    // diff:falseでスタイルを丸ごと作り直す。差分更新だとstyle.loadが再度発火せず、
    // 自前のメッシュ層が消えたまま戻らない。
    map.setStyle(url, { diff: false });
  }, [theme]);

  // 選択中の地点にピンを置き、そこへ移動する(ドロワーが出ている間は隠れない位置へ)。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    const lngLat: [number, number] = [selected.lon, selected.lat];
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ element: createPin() })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(lngLat);
    }
    // 波紋を最初から再生し直す(クラスを外して再付与)。
    const el = markerRef.current.getElement();
    el.classList.remove("is-pulsing");
    void el.offsetWidth;
    el.classList.add("is-pulsing");

    const narrow = window.innerWidth <= 900;
    const height = containerRef.current?.clientHeight ?? 0;
    map.easeTo({
      center: lngLat,
      padding: {
        top: 0,
        left: 0,
        right: reserveSide && !narrow ? DRAWER_W : 0,
        bottom: reserveSide && narrow ? Math.round(height * 0.42) : 0,
      },
      duration: prefersReducedMotion() ? 0 : 800,
    });
  }, [selected, reserveSide]);

  return (
    <div className="atlas-map">
      <div ref={containerRef} className="atlas-map__canvas" />
      {failed && (
        <div className="badge badge--soft atlas-map__badge">
          地図の一部を読み込めませんでした(ラベル等)。メッシュの値は表示されます。
        </div>
      )}
    </div>
  );
}
