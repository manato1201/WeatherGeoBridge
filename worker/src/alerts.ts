// 差分ベースのアラート判定(notifications/alert_rules.py からの移植)。
//
// 検知した「事実」(WeatherDiff)と、購読者ごとの通知条件(NotificationPreferences)
// を分離する。購読者はそれぞれ異なる閾値(気温急変の何℃で通知するか等)を
// 設定できるため、閾値判定は差分の事実が確定したあと購読者ごとに行う。

import type { NotificationPreferences, WeatherObservation } from "./types";

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  notifyPrecipitation: true,
  temperatureSwingThresholdC: 5.0,
};

export interface WeatherDiff {
  precipitationStarted: boolean;
  currentPrecipitationMm: number;
  temperatureDeltaC: number;
}

export interface Alert {
  title: string;
  body: string;
}

export function computeDiff(previous: WeatherObservation | null, current: WeatherObservation): WeatherDiff | null {
  if (!previous) return null;
  return {
    precipitationStarted: previous.precipitationMm === 0 && current.precipitationMm > 0,
    currentPrecipitationMm: current.precipitationMm,
    temperatureDeltaC: current.temperatureC - previous.temperatureC,
  };
}

export function buildAlerts(diff: WeatherDiff, prefs: NotificationPreferences): Alert[] {
  const alerts: Alert[] = [];

  if (prefs.notifyPrecipitation && diff.precipitationStarted) {
    alerts.push({
      title: "降水が始まりました",
      body: `降水量 ${diff.currentPrecipitationMm.toFixed(1)}mm を検知しました。`,
    });
  }

  if (Math.abs(diff.temperatureDeltaC) >= prefs.temperatureSwingThresholdC) {
    const direction = diff.temperatureDeltaC > 0 ? "上昇" : "下降";
    alerts.push({
      title: "気温が急変しています",
      body: `前回計測から気温が${Math.abs(diff.temperatureDeltaC).toFixed(1)}℃${direction}しました。`,
    });
  }

  return alerts;
}
