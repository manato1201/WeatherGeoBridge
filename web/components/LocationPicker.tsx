"use client";

import { useEffect, useState } from "react";
import { addFavorite, loadFavorites, removeFavorite, type FavoriteLocation } from "@/lib/favorites";
import { JAPAN_CITY_PRESETS } from "@/lib/japanCities";
import type { LocationContext } from "@/lib/types";

const DEFAULT_LAT = 35.6812;
const DEFAULT_LON = 139.7671;

interface GeocodeResult {
  name: string;
  admin1: string | null;
  country: string | null;
  lat: number;
  lon: number;
}

export function LocationPicker({
  location,
  onChange,
}: {
  location: LocationContext | null;
  onChange: (location: LocationContext) => void;
}) {
  const [manualLat, setManualLat] = useState(String(DEFAULT_LAT));
  const [manualLon, setManualLon] = useState(String(DEFAULT_LON));
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);

  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [favoriteName, setFavoriteName] = useState("");

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

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

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.results ?? []);
      if ((data.results ?? []).length === 0) {
        setError("該当する地名が見つかりませんでした(ローマ字で入力してください。例: Tokyo, Osaka)。");
      }
    } catch {
      setError("地名検索に失敗しました。");
    } finally {
      setSearching(false);
    }
  }

  function pick(lat: number, lon: number) {
    setError(null);
    setResults([]);
    onChange({ lat, lon, accuracyMeters: null, source: "manual_pin" });
  }

  function saveFavorite() {
    if (!location) return;
    const name = favoriteName.trim() || `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`;
    setFavorites(addFavorite({ name, lat: location.lat, lon: location.lon }));
    setFavoriteName("");
  }

  function deleteFavorite(name: string) {
    setFavorites(removeFavorite(name));
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
      <div className="section" style={{ gap: "var(--space-8)" }}>
        <p className="section__heading">地点</p>
        <button className="btn btn--primary" onClick={useBrowserGps} type="button">
          現在地を取得
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <label className="field__label" htmlFor="loc-search">
          地名検索(ローマ字)
        </label>
        <div style={{ display: "flex", gap: "var(--space-8)" }}>
          <input
            id="loc-search"
            className="input"
            placeholder="例: Tokyo, Osaka, Kyoto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button className="btn btn--secondary" onClick={search} type="button" disabled={searching}>
            検索
          </button>
        </div>
        {results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {results.map((r, i) => (
              <button
                key={i}
                className="btn btn--outline"
                type="button"
                style={{ justifyContent: "flex-start", height: "auto", padding: "var(--space-8)" }}
                onClick={() => pick(r.lat, r.lon)}
              >
                {r.name}
                {r.admin1 ? ` / ${r.admin1}` : ""}
                {r.country ? ` (${r.country})` : ""}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <p className="field__label">日本の主要都市</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-8)" }}>
          {JAPAN_CITY_PRESETS.map((city) => (
            <button
              key={city.name}
              className="badge badge--outline"
              type="button"
              style={{ cursor: "pointer", border: "1px solid var(--color-hairline)" }}
              onClick={() => pick(city.lat, city.lon)}
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <p className="field__label">お気に入り</p>
        {favorites.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-8)" }}>
            {favorites.map((f) => (
              <span
                key={f.name}
                className="badge badge--soft"
                style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-4)" }}
              >
                <button
                  type="button"
                  onClick={() => pick(f.lat, f.lon)}
                  style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }}
                >
                  {f.name}
                </button>
                <button
                  type="button"
                  aria-label={`${f.name}を削除`}
                  onClick={() => deleteFavorite(f.name)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: "var(--color-mid-gray)",
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {location && (
          <div style={{ display: "flex", gap: "var(--space-8)" }}>
            <input
              className="input"
              placeholder="名前を付けて保存"
              value={favoriteName}
              onChange={(e) => setFavoriteName(e.target.value)}
            />
            <button className="btn btn--outline" type="button" onClick={saveFavorite}>
              保存
            </button>
          </div>
        )}
      </div>

      <details>
        <summary className="field__label" style={{ cursor: "pointer" }}>
          緯度経度を直接入力
        </summary>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)", marginTop: "var(--space-8)" }}>
          <div className="field">
            <label className="field__label" htmlFor="loc-lat">
              緯度
            </label>
            <input
              id="loc-lat"
              className="input"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="loc-lon">
              経度
            </label>
            <input
              id="loc-lon"
              className="input"
              value={manualLon}
              onChange={(e) => setManualLon(e.target.value)}
            />
          </div>
          <button className="btn btn--outline" onClick={useManualPin} type="button">
            手動ピン留め
          </button>
        </div>
      </details>

      {error && (
        <p className="text-destructive" style={{ fontSize: "var(--text-caption)", margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}
