// 既存データ(降水確率・UV指数・風速・寒暖差・大気質)から、数値を読み解かなくても
// 行動に直結する一言アドバイスを組み立てる。新しいAPI呼び出しは増やさない。

import { europeanAqiLabel } from "./airQuality";
import type { AirQuality, ForecastDay, WeatherObservation } from "./types";

export interface AdviceItem {
  icon: string;
  text: string;
}

// 大気質の「注意」以上に相当するしきい値(lib/airQuality.tsのeuropeanAqiLabelと対応)。
const AQI_CAUTION_THRESHOLD = 60;
const STRONG_WIND_MS = 10; // 気象庁の「強風」目安(10m/s前後)に合わせる
const LARGE_TEMP_SWING_C = 10;

export function buildAdvice(
  observation: WeatherObservation,
  today: ForecastDay | undefined,
  airQuality: AirQuality | null,
): AdviceItem[] {
  const advice: AdviceItem[] = [];

  if (today && today.precipitationProbabilityPercent >= 50) {
    advice.push({
      icon: "☂️",
      text: `降水確率${today.precipitationProbabilityPercent}%。傘を持って出かけましょう`,
    });
  }

  if (today && today.uvIndexMax >= 8) {
    advice.push({
      icon: "🧴",
      text: "UV指数が非常に高い日です。日焼け対策を念入りに",
    });
  } else if (today && today.uvIndexMax >= 6) {
    advice.push({
      icon: "🧴",
      text: "UV指数が高めです。日焼け対策をおすすめします",
    });
  }

  const maxWindMs = Math.max(
    observation.windGustsMs,
    today?.windGustsMaxMs ?? 0,
  );
  if (maxWindMs >= STRONG_WIND_MS) {
    advice.push({
      icon: "💨",
      text: "強い風が吹いています。飛ばされやすい物に注意してください",
    });
  }

  if (today && Math.abs(today.tempMaxC - today.tempMinC) >= LARGE_TEMP_SWING_C) {
    advice.push({
      icon: "🧥",
      text: "朝晩の寒暖差が大きい一日です。羽織るものがあると安心です",
    });
  }

  if (airQuality && airQuality.europeanAqi > AQI_CAUTION_THRESHOLD) {
    advice.push({
      icon: "😷",
      text: `大気質が「${europeanAqiLabel(airQuality.europeanAqi)}」です。外出時はマスクの着用を検討してください`,
    });
  }

  if (advice.length === 0) {
    advice.push({
      icon: "🌤",
      text: "特に注意すべき点はなさそうです。過ごしやすい一日を",
    });
  }

  return advice;
}
