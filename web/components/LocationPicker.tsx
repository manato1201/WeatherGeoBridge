"use client";

import { useState } from "react";
import type { LocationContext } from "@/lib/types";

const DEFAULT_LAT = 35.6812;
const DEFAULT_LON = 139.7671;

export function LocationPicker({
  onChange,
}: {
  onChange: (location: LocationContext) => void;
}) {
  const [manualLat, setManualLat] = useState(String(DEFAULT_LAT));
  const [manualLon, setManualLon] = useState(String(DEFAULT_LON));
  const [error, setError] = useState<string | null>(null);

  function useBrowserGps() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("このブラウザはGeolocation APIに対応していません。手動でピン留めしてください。");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          source: "browser_gps",
        });
      },
      (err) => {
        setError(`現在地の取得に失敗しました(${err.message})。手動でピン留めしてください。`);
      },
    );
  }

  function useManualPin() {
    const lat = Number(manualLat);
    const lon = Number(manualLon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      setError("緯度・経度は数値で入力してください。");
      return;
    }
    setError(null);
    onChange({ lat, lon, accuracyMeters: null, source: "manual_pin" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button onClick={useBrowserGps} type="button">
        現在地を取得
      </button>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          aria-label="緯度"
          value={manualLat}
          onChange={(e) => setManualLat(e.target.value)}
          style={{ width: 100 }}
        />
        <input
          aria-label="経度"
          value={manualLon}
          onChange={(e) => setManualLon(e.target.value)}
          style={{ width: 100 }}
        />
        <button onClick={useManualPin} type="button">
          手動ピン留め
        </button>
      </div>
      {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
    </div>
  );
}
