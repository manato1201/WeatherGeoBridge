"""Open-Meteo レスポンス → WeatherObservation/Forecast 変換層(Phase1)。"""

from __future__ import annotations

from core.models import Forecast, ForecastDay, WeatherObservation


def normalize(raw: dict, lat: float, lon: float) -> WeatherObservation:
    cur = raw["current"]
    return WeatherObservation(
        lat=lat,
        lon=lon,
        observed_at=cur["time"],
        temperature_c=cur["temperature_2m"],
        precipitation_mm=cur["precipitation"],
        weather_code=cur["weather_code"],
        wind_speed_ms=cur["wind_speed_10m"],
        source="open-meteo",
    )


def normalize_forecast(raw: dict, lat: float, lon: float) -> Forecast:
    daily = raw["daily"]
    days = [
        ForecastDay(
            date=daily["time"][i],
            temp_max_c=daily["temperature_2m_max"][i],
            temp_min_c=daily["temperature_2m_min"][i],
            precipitation_mm=daily["precipitation_sum"][i],
            weather_code=daily["weather_code"][i],
        )
        for i in range(len(daily["time"]))
    ]
    return Forecast(lat=lat, lon=lon, daily=days)
