"""decisions.py の境界値テスト。`python -m unittest mcp_server.test_decisions` で実行する。"""

import unittest

from mcp_server.decisions import decide_laundry, decide_umbrella


def hourly(*probs):
    return [
        {"time": f"2026-10-09T{12 + i:02d}:00", "precipitationProbabilityPercent": p}
        for i, p in enumerate(probs)
    ]


class UmbrellaTest(unittest.TestCase):
    def test_threshold_boundary(self):
        self.assertEqual(decide_umbrella(hourly(49), 0)["answer"], "no")
        self.assertEqual(decide_umbrella(hourly(50), 0)["answer"], "yes")
        self.assertEqual(decide_umbrella(hourly(51), 0)["answer"], "yes")

    def test_uses_max_within_window_only(self):
        probs = [10, 20, 30, 10, 10, 10, 90]  # 7番目(窓の外)だけ高い
        self.assertEqual(decide_umbrella(hourly(*probs), 0, hours=6)["answer"], "no")
        self.assertEqual(decide_umbrella(hourly(*probs), 0, hours=7)["answer"], "yes")

    def test_reports_forecast_probability_and_peak(self):
        r = decide_umbrella(hourly(10, 70, 40), 0)
        self.assertEqual(r["rain_probability_percent"], 70)
        self.assertEqual(r["evidence"]["peak_time"], "2026-10-09T13:00")

    def test_raining_now_is_yes_even_with_low_probability(self):
        r = decide_umbrella(hourly(0, 0), 0.5)
        self.assertEqual(r["answer"], "yes")
        self.assertEqual(r["rain_probability_percent"], 0)  # 確率は予報値のまま、観測で上書きしない

    def test_no_data_is_unknown(self):
        self.assertEqual(decide_umbrella([], 0)["answer"], "unknown")
        self.assertEqual(decide_umbrella(hourly(None, None), 0)["answer"], "unknown")

    def test_invalid_hours(self):
        for bad in (0, 25, -1):
            with self.assertRaises(ValueError):
                decide_umbrella(hourly(10), 0, hours=bad)

    def test_basis_states_probability_is_from_forecast(self):
        self.assertIn("予報", decide_umbrella(hourly(10), 0)["basis"])


class LaundryTest(unittest.TestCase):
    def test_threshold_boundary(self):
        self.assertEqual(decide_laundry(hourly(29), 0, 60)["answer"], "yes")
        self.assertEqual(decide_laundry(hourly(30), 0, 60)["answer"], "no")

    def test_humidity_boundary(self):
        self.assertEqual(decide_laundry(hourly(0), 0, 85)["answer"], "yes")
        self.assertEqual(decide_laundry(hourly(0), 0, 86)["answer"], "no")

    def test_missing_humidity_is_ignored(self):
        self.assertEqual(decide_laundry(hourly(0), 0, None)["answer"], "yes")

    def test_raining_now_blocks(self):
        self.assertEqual(decide_laundry(hourly(0), 0.1, 50)["answer"], "no")

    def test_no_forecast_is_unknown(self):
        self.assertEqual(decide_laundry([], 0, 50)["answer"], "unknown")


if __name__ == "__main__":
    unittest.main()
