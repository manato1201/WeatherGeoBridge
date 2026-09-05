"""WeatherGeoBridge 概念モデル(WeatherGeoBridge_DESIGN.md Phase0準拠)。

Phase2〜6は全てこのモジュールのスキーマを共通で参照する。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True)
class WeatherObservation:
    lat: float
    lon: float
    observed_at: str  # ISO8601
    temperature_c: float
    precipitation_mm: float
    weather_code: int  # WMO weather interpretation code (Open-Meteo準拠)
    wind_speed_ms: float
    source: Literal["open-meteo"] = "open-meteo"

    def to_dict(self) -> dict:
        return {
            "lat": self.lat,
            "lon": self.lon,
            "observedAt": self.observed_at,
            "temperatureC": self.temperature_c,
            "precipitationMm": self.precipitation_mm,
            "weatherCode": self.weather_code,
            "windSpeedMs": self.wind_speed_ms,
            "source": self.source,
        }


@dataclass(frozen=True)
class ForecastDay:
    date: str
    temp_max_c: float
    temp_min_c: float
    precipitation_mm: float
    weather_code: int

    def to_dict(self) -> dict:
        return {
            "date": self.date,
            "tempMaxC": self.temp_max_c,
            "tempMinC": self.temp_min_c,
            "precipitationMm": self.precipitation_mm,
            "weatherCode": self.weather_code,
        }


@dataclass(frozen=True)
class Forecast:
    lat: float
    lon: float
    daily: list[ForecastDay] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "lat": self.lat,
            "lon": self.lon,
            "daily": [d.to_dict() for d in self.daily],
        }


@dataclass(frozen=True)
class LocationContext:
    lat: float
    lon: float
    accuracy_meters: float | None = None
    source: Literal["browser_gps", "manual_pin", "game_avatar_position"] = "manual_pin"

    def to_dict(self) -> dict:
        return {
            "lat": self.lat,
            "lon": self.lon,
            "accuracyMeters": self.accuracy_meters,
            "source": self.source,
        }
