"use client";

import { useUnits } from "@/lib/UnitsContext";

export function UnitToggle() {
  const { tempUnit, speedUnit, setTempUnit, setSpeedUnit } = useUnits();

  return (
    <div style={{ display: "flex", gap: "var(--space-8)" }}>
      <button
        className="btn btn--outline"
        type="button"
        onClick={() => setTempUnit(tempUnit === "C" ? "F" : "C")}
        title="気温の単位を切り替え"
      >
        °{tempUnit}
      </button>
      <button
        className="btn btn--outline"
        type="button"
        onClick={() => setSpeedUnit(speedUnit === "ms" ? "kmh" : "ms")}
        title="風速の単位を切り替え"
      >
        {speedUnit === "ms" ? "m/s" : "km/h"}
      </button>
    </div>
  );
}
