"""docs/diagrams/ の構成図(SVG)を作る。`python tools/make_diagrams.py` で作り直す。部品は tools/svgkit.py。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from svgkit import Diagram  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "docs" / "diagrams"


def architecture() -> Diagram:
    d = Diagram(1500, 760, "WeatherGeoBridge の構成",
                "ブラウザは Next.js のサーバー側(API キーを持つ)を通して、Cloudflare Worker を呼ぶ。Worker は Open-Meteo から取得・正規化し、KV にキャッシュし、"
                "定期ジョブで差分を調べて Web Push を送る。MCP サーバー(Python)は、同じ Worker の公開 API を呼び、傘・洗濯の判断を返す。")
    d.text(40, 44, "WeatherGeoBridge — 構成", cls="hd")
    d.text(40, 66, "青=主な流れ / 灰の破線=補助。キーはサーバー側だけ。判断はルールベースの純粋関数", cls="note")

    d.group(40, 100, 250, 560, "CLIENTS", color="gray")
    br = d.card(150, 220, "browser", "ブラウザ", "ダッシュボード・アトラス\n(地図 + 時間スライダー)")
    ai = d.card(150, 460, "terminal", "AI(MCP クライアント)", "get_weather・get_forecast\ndecide_umbrella・decide_laundry")

    d.group(480, 100, 560, 560, "SERVERS", color="teal")
    nx = d.card(640, 220, "server", "Next.js(Vercel)", "API ルート(サーバー側)\nX-API-Key を付けて中継")
    mcp = d.card(640, 460, "gear", "mcp_server/", "Python・stateless\nルールベースの判断")
    wk = d.card(900, 340, "cloud", "Cloudflare Worker", "Hono + TypeScript\n正規化・キャッシュ・通知")
    d.text(500, 640, "キャッシュ: 使える 10 分(fetchedAt で判定)と、KV の保存 7 日を分ける", cls="note")

    d.group(1100, 100, 370, 560, "DATA — 外部とストレージ", color="blue")
    om = d.card(1285, 220, "globe", "Open-Meteo", "天気・予報・大気質")
    kv = d.card(1285, 400, "db", "Workers KV", "WEATHER_CACHE\nPUSH_SUBSCRIPTIONS")
    push = d.card(1285, 560, "cloud", "Web Push", "VAPID・購読者ごとの地点")

    d.arrow([br.right, nx.left], "HTTPS", at=0)
    d.arrow([nx.right, (780, 220), (780, 340), wk.left], "X-API-Key", at=2, dx=-20, dy=-10)
    d.arrow([ai.right, mcp.left], "MCP", at=0)
    d.arrow([mcp.right, (780, 460), (780, 340)], "Worker の公開 API", at=0, dy=-10)
    d.arrow([wk.right, (1000, 340), (1000, 220), om.left], "取得", at=2, dx=0, dy=-10)
    d.arrow([(1000, 340), (1000, 400), kv.left], "キャッシュ", at=1, dx=-30, dy=-10)
    d.arrow([(1000, 400), (1000, 560), push.left], "差分があれば", kind="secondary", at=1, dx=-45, dy=0)
    return d


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "architecture.svg").write_text(architecture().svg(), encoding="utf-8")
    print("wrote", OUT / "architecture.svg")


if __name__ == "__main__":
    main()
