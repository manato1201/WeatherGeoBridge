// 差分ベースのアラート判定(notifications/alert_rules.py からの移植)。

import type { WeatherObservation } from "./types";

const TEMPERATURE_SWING_THRESHOLD_C = 5.0;

export interface Alert {
  title: string;
  body: string;
}

export function checkAlerts(previous: WeatherObservation | null, current: WeatherObservation): Alert[] {
  if (!previous) return [];

  const alerts: Alert[] = [];

  if (previous.precipitationMm === 0 && current.precipitationMm > 0) {
    alerts.push({
      title: "降水が始まりました",
      body: `降水量 ${current.precipitationMm.toFixed(1)}mm を検知しました。`,
    });
  }

  const tempDelta = current.temperatureC - previous.temperatureC;
  if (Math.abs(tempDelta) >= TEMPERATURE_SWING_THRESHOLD_C) {
    const direction = tempDelta > 0 ? "上昇" : "下降";
    alerts.push({
      title: "気温が急変しています",
      body: `前回計測から気温が${Math.abs(tempDelta).toFixed(1)}℃${direction}しました。`,
    });
  }

  return alerts;
}
