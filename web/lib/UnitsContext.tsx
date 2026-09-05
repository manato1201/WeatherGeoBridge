"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SpeedUnit, TempUnit } from "@/lib/units";

interface UnitsState {
  tempUnit: TempUnit;
  speedUnit: SpeedUnit;
  setTempUnit: (unit: TempUnit) => void;
  setSpeedUnit: (unit: SpeedUnit) => void;
}

const STORAGE_KEY = "weathergeobridge:units";

const UnitsContext = createContext<UnitsState | null>(null);

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [tempUnit, setTempUnitState] = useState<TempUnit>("C");
  const [speedUnit, setSpeedUnitState] = useState<SpeedUnit>("ms");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.tempUnit === "C" || parsed.tempUnit === "F")
        setTempUnitState(parsed.tempUnit);
      if (parsed.speedUnit === "ms" || parsed.speedUnit === "kmh")
        setSpeedUnitState(parsed.speedUnit);
    } catch {
      // 無視して既定値のまま進める。
    }
  }, []);

  function persist(next: { tempUnit: TempUnit; speedUnit: SpeedUnit }) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorageが使えない環境では諦める。
    }
  }

  function setTempUnit(unit: TempUnit) {
    setTempUnitState(unit);
    persist({ tempUnit: unit, speedUnit });
  }

  function setSpeedUnit(unit: SpeedUnit) {
    setSpeedUnitState(unit);
    persist({ tempUnit, speedUnit: unit });
  }

  return (
    <UnitsContext.Provider
      value={{ tempUnit, speedUnit, setTempUnit, setSpeedUnit }}
    >
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits(): UnitsState {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error("useUnits must be used within a UnitsProvider");
  return ctx;
}
