# Built Japan 画像ヘルスチェック

- 実行: 2026-07-21 07:55 JST
- 対象: 公開済み記事 164 ページ（https://builtjapan.com）
- 正常表示: 150 / 164（91.5%）
- **要対応: 14 件**（画像なし 12 / 壊れ 2 / ページ異常 0）

## 画像なし（heroImage未設定 → グレーのプレースホルダ）

| 記事 | 詳細 |
|---|---|
| [bayz-tower-and-garden（JA）](https://builtjapan.com/buildings/bayz-tower-and-garden/) | ヒーロー画像なし（プレースホルダ表示） |
| [osaki-thinkpark-tower（JA）](https://builtjapan.com/buildings/osaki-thinkpark-tower/) | ヒーロー画像なし（プレースホルダ表示） |
| [shinonome-canal-court-codan（JA）](https://builtjapan.com/buildings/shinonome-canal-court-codan/) | ヒーロー画像なし（プレースホルダ表示） |
| [sunshine-city-world-import-mart（JA）](https://builtjapan.com/buildings/sunshine-city-world-import-mart/) | ヒーロー画像なし（プレースホルダ表示） |
| [the-parkhouse-harumi-towers（JA）](https://builtjapan.com/buildings/the-parkhouse-harumi-towers/) | ヒーロー画像なし（プレースホルダ表示） |
| [the-parkhouse-nishishinjuku-tower60（JA）](https://builtjapan.com/buildings/the-parkhouse-nishishinjuku-tower60/) | ヒーロー画像なし（プレースホルダ表示） |
| [bayz-tower-and-garden（EN）](https://builtjapan.com/en/buildings/bayz-tower-and-garden/) | ヒーロー画像なし（プレースホルダ表示） |
| [osaki-thinkpark-tower（EN）](https://builtjapan.com/en/buildings/osaki-thinkpark-tower/) | ヒーロー画像なし（プレースホルダ表示） |
| [shinonome-canal-court-codan（EN）](https://builtjapan.com/en/buildings/shinonome-canal-court-codan/) | ヒーロー画像なし（プレースホルダ表示） |
| [sunshine-city-world-import-mart（EN）](https://builtjapan.com/en/buildings/sunshine-city-world-import-mart/) | ヒーロー画像なし（プレースホルダ表示） |
| [the-parkhouse-harumi-towers（EN）](https://builtjapan.com/en/buildings/the-parkhouse-harumi-towers/) | ヒーロー画像なし（プレースホルダ表示） |
| [the-parkhouse-nishishinjuku-tower60（EN）](https://builtjapan.com/en/buildings/the-parkhouse-nishishinjuku-tower60/) | ヒーロー画像なし（プレースホルダ表示） |

## 画像が壊れている（srcはあるが取得できない）

| 記事 | 詳細 |
|---|---|
| [brillia-tower-ikebukuro（JA）](https://builtjapan.com/buildings/brillia-tower-ikebukuro/) | HTTP 400<br>`https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Toshima_Ecomusee_Town_01.jpg/1000px-Toshima_Ecomusee_Town_01.jpg` |
| [brillia-tower-ikebukuro（EN）](https://builtjapan.com/en/buildings/brillia-tower-ikebukuro/) | HTTP 400<br>`https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Toshima_Ecomusee_Town_01.jpg/1000px-Toshima_Ecomusee_Town_01.jpg` |

## 直し方

- **画像なし**: `site/src/content/buildings/<slug>.md` の `heroImage` を設定する。外観の全体写真を使う（内観・ロビー・横丁は不可）。
- **壊れ**: Wikimediaのthumb幅が原寸を超えると400になる。`/thumb/.../<N>px-` の N を下げるか、thumbでない原寸URLに差し替える。
- 直したら blog リポジトリに push し、CodeBuild を手動 start-build して反映する。
