# 地図データ配置手順(Phase3)

このディレクトリにはPMTilesファイルの実体を置く。`armd-01.sakura.ne.jp`は利用規約上
直接参照しないため、必ず自前で生成したファイルをここに配置すること
(WeatherGeoBridge_DESIGN.md Phase0/Phase3のアンチパターン)。

## 生成手順(概要)

1. OpenStreetMapの日本データを取得する(例: Geofabrikの`japan-latest.osm.pbf`)。
2. `tippecanoe`または`planetiler`でベクトルタイル化し、`.pmtiles`形式で出力する。
3. 生成したファイルをこのディレクトリに `japan.pmtiles` という名前で配置する
   (`style.json`の`sources.japan.url`がこのファイル名を参照している)。
4. 月次目安で再生成する場合は `japan-<date>.pmtiles` のような日付サフィックス付きで配置し、
   `style.json`の参照先を切り替える。切り戻しに備え旧ファイルは即削除しない。

## style.jsonのlayers追加について

現在の`style.json`は`japan`ソースを宣言しているのみで、具体的な描画レイヤー
(道路・建物・水域等)は未定義のプレースホルダーである。生成したpmtilesファイルの
ソースレイヤー名(tippecanoe/planetilerの設定に依存)に合わせて、`layers`配列に
`"source": "japan", "source-layer": "<実際のレイヤー名>"` を指定したレイヤーを
追加すること。
