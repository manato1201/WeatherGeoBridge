# WeatherGeoBridge

天気情報の取得・通知・閲覧を提供する Web アプリを核に、自前ホストの地図(PMTiles + MapLibre GL JS)と統合し、他のプロジェクトから使える **API / MCP** としても提供します。設計は [WeatherGeoBridge_DESIGN.md](WeatherGeoBridge_DESIGN.md)。

![構成図](docs/diagrams/architecture.svg)

```text
worker/       天気の取得・正規化・キャッシュ・通知・REST API(Cloudflare Workers・TypeScript)
mcp_server/   MCP サーバー(Python・stateless。Worker の公開 API を呼ぶだけ)
web/          Next.js(ダッシュボード・天気アトラス。Vercel)
```

## 状態

| 項目 | 内容 |
|---|---|
| 公開 | トップ・天気アトラス・ダッシュボード・REST API・MCP([詳細](docs/reference/setup-and-operations.md)) |
| テスト | `python -m unittest mcp_server.test_decisions`・`python -m pytest tests/test_docs.py`(文書の検査) |
| 未確認 | Worker(TypeScript)・Next.js は、この文書の検査では**実行していません** |
| 学習資料 | 講義 3 回あり。**保守・拡張の詳しい資料は未作成**(簡易版のみ) |
| 既知の問題 | [docs/learn/index.md](docs/learn/index.md)(MCP が `api_key` を引数で受ける 等) |

## ドキュメント

| 読みたいもの | 場所 |
|---|---|
| 全体の地図 | [docs/index.md](docs/index.md) |
| **基礎から学ぶ**(講義 3 回) | [docs/lecture/](docs/lecture/index.md) |
| コードの地図・既知の問題 | [docs/learn/index.md](docs/learn/index.md) |
| 公開 URL・API・MCP・セットアップ・運用の**詳細**(旧 README) | [docs/reference/setup-and-operations.md](docs/reference/setup-and-operations.md) |
| 設計書 | [WeatherGeoBridge_DESIGN.md](WeatherGeoBridge_DESIGN.md) |

## 限界(正直に)

- 天気は**予報であって保証ではありません**(データ元: Open-Meteo)。判断(傘・洗濯)は、降水確率のしきい値のルールで、確からしさではありません。
- Phase 6(VRChat / Unity との実世界の同期)は、設計のみで実装していません。
