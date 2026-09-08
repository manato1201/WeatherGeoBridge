# 地図データ配置(Phase3、実配置済み)

`style.json`は実際に配置したPMTilesファイルを参照している。`armd-01.sakura.ne.jp`は
利用規約上直接参照しないため(WeatherGeoBridge_DESIGN.md Phase0/Phase3のアンチパターン)、
自前で用意したデータを自前のCloudflare R2バケットから配信している。

## 配置内容

- データソース: [Protomaps](https://protomaps.com/)が毎日ビルドして公開している
  OpenStreetMap由来のベースマップ(`build.protomaps.com`)から、`pmtiles extract`
  (Range Request方式)で日本のバウンディングボックス(`122,20,154,46`)のみを
  抜き出したもの。planet全体はダウンロードしていない。
- ズームレベル: 0〜11(Wrangler CLIの単発アップロード上限300MiB以内に収めるため、
  当初のzoom12版・414MBから絞り込んだ)。アプリ内の地図は400px高のカードで
  ワンポイントの地点確認用途のため、z11でも実用上十分な detail が確認できる。
- ホスティング: Cloudflare R2バケット `weathergeobridge-map-tiles` の公開URL
  (`https://pub-b3aa2a3d1ce1437cbe647e4e80e0c193.r2.dev/japan.pmtiles`)。
  R2は標準でHTTP Range Requestに対応しており、PMTilesクライアント(`pmtiles`
  npmパッケージ)が必要な範囲だけを部分取得する。
- スタイル: `scripts/generate-map-style.mjs`が`@protomaps/basemaps`の`BLACK`
  フレーバーをアプリのダークパレット(`app/globals.css`のトークンと同じ値)で
  上書きして`style.json`を生成している。パレットを変更した場合は
  `node scripts/generate-map-style.mjs`を再実行すること。
- ラベル用フォント・アイコン: Protomaps公式が公開している
  `https://protomaps.github.io/basemaps-assets/` の glyphs/sprite をそのまま参照。

## CORS設定(必須)

R2の公開バケットURLは既定ではCORSヘッダーを一切返さない。`curl`はCORSを
強制しないため一見動いているように見えるが、ブラウザから`fetch`する
MapLibre/pmtilesクライアントはCORSヘッダーが無いとレスポンスを読めず、
地図が「PMTilesが未配置です」というフォールバック表示のまま止まる
(実際にこの不具合が発生し、報告された)。

`worker/r2-cors.json`(リポジトリに保存済み)を使って一度だけ設定する:

```
npx wrangler r2 bucket cors set weathergeobridge-map-tiles --file r2-cors.json --force
```

`npx wrangler r2 bucket cors list weathergeobridge-map-tiles` で確認できる。
バケットを作り直した場合は再設定が必要。

## 再生成・更新手順

1. 元データを更新したい場合、`pmtiles`公式CLI(GitHub Releases)で
   `pmtiles extract <protomapsの最新ビルドURL> japan.pmtiles --bbox=122,20,154,46 --maxzoom=11`
   を実行する。
2. `npx wrangler r2 object put weathergeobridge-map-tiles/japan.pmtiles --file japan.pmtiles --remote`
   でR2へアップロードする(Wrangler CLIは単発アップロードが300MiB上限のため、
   それを超える場合はmaxzoomをさらに下げるか、S3互換APIでのマルチパート
   アップロードを検討する)。
3. パレットを変更した場合は `node scripts/generate-map-style.mjs` を再実行して
   `style.json` を再生成する。
