# Built Japan 画像ヘルスチェック

- 実行: 2026-07-31 08:13 JST
- 対象: 公開済み記事 196 ページ（https://builtjapan.com）
- 正常表示: 186 / 196（94.9%）
- **要対応: 10 件**（画像なし 10 / 壊れ 0 / ページ異常 0）

## 画像なし（heroImage未設定 → グレーのプレースホルダ）

| 記事 | 詳細 |
|---|---|
| [bayz-tower-and-garden（JA）](https://builtjapan.com/buildings/bayz-tower-and-garden/) | ヒーロー画像なし（プレースホルダ表示） |
| [eitaibashi（JA）](https://builtjapan.com/buildings/eitaibashi/) | ヒーロー画像なし（プレースホルダ表示） |
| [hareza-ikebukuro（JA）](https://builtjapan.com/buildings/hareza-ikebukuro/) | ヒーロー画像なし（プレースホルダ表示） |
| [shinonome-canal-court-codan（JA）](https://builtjapan.com/buildings/shinonome-canal-court-codan/) | ヒーロー画像なし（プレースホルダ表示） |
| [the-parkhouse-harumi-towers（JA）](https://builtjapan.com/buildings/the-parkhouse-harumi-towers/) | ヒーロー画像なし（プレースホルダ表示） |
| [bayz-tower-and-garden（EN）](https://builtjapan.com/en/buildings/bayz-tower-and-garden/) | ヒーロー画像なし（プレースホルダ表示） |
| [eitaibashi（EN）](https://builtjapan.com/en/buildings/eitaibashi/) | ヒーロー画像なし（プレースホルダ表示） |
| [hareza-ikebukuro（EN）](https://builtjapan.com/en/buildings/hareza-ikebukuro/) | ヒーロー画像なし（プレースホルダ表示） |
| [shinonome-canal-court-codan（EN）](https://builtjapan.com/en/buildings/shinonome-canal-court-codan/) | ヒーロー画像なし（プレースホルダ表示） |
| [the-parkhouse-harumi-towers（EN）](https://builtjapan.com/en/buildings/the-parkhouse-harumi-towers/) | ヒーロー画像なし（プレースホルダ表示） |

## 直し方

- **画像なし**: `site/src/content/buildings/<slug>.md` の `heroImage` を設定する。外観の全体写真を使う（内観・ロビー・横丁は不可）。
- **壊れ**: Wikimediaのthumb幅が原寸を超えると400になる。`/thumb/.../<N>px-` の N を下げるか、thumbでない原寸URLに差し替える。
- 直したら blog リポジトリに push し、CodeBuild を手動 start-build して反映する。
