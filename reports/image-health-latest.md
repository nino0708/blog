# Built Japan 画像ヘルスチェック

- 実行: 2026-08-04 08:18 JST
- 対象: 公開済み記事 212 ページ（https://builtjapan.com）
- 正常表示: 196 / 212（92.5%）
- **要対応: 16 件**（画像なし 16 / 壊れ 0 / ページ異常 0）

## 画像なし（heroImage未設定 → グレーのプレースホルダ）

| 記事 | 詳細 |
|---|---|
| [bayz-tower-and-garden（JA）](https://builtjapan.com/buildings/bayz-tower-and-garden/) | ヒーロー画像なし（プレースホルダ表示） |
| [brillia-hamarikyu（JA）](https://builtjapan.com/buildings/brillia-hamarikyu/) | ヒーロー画像なし（プレースホルダ表示） |
| [eitaibashi（JA）](https://builtjapan.com/buildings/eitaibashi/) | ヒーロー画像なし（プレースホルダ表示） |
| [hareza-ikebukuro（JA）](https://builtjapan.com/buildings/hareza-ikebukuro/) | ヒーロー画像なし（プレースホルダ表示） |
| [park-city-musashikosugi-midsky（JA）](https://builtjapan.com/buildings/park-city-musashikosugi-midsky/) | ヒーロー画像なし（プレースホルダ表示） |
| [park-tower-grand-sky（JA）](https://builtjapan.com/buildings/park-tower-grand-sky/) | ヒーロー画像なし（プレースホルダ表示） |
| [shinonome-canal-court-codan（JA）](https://builtjapan.com/buildings/shinonome-canal-court-codan/) | ヒーロー画像なし（プレースホルダ表示） |
| [the-parkhouse-harumi-towers（JA）](https://builtjapan.com/buildings/the-parkhouse-harumi-towers/) | ヒーロー画像なし（プレースホルダ表示） |
| [bayz-tower-and-garden（EN）](https://builtjapan.com/en/buildings/bayz-tower-and-garden/) | ヒーロー画像なし（プレースホルダ表示） |
| [brillia-hamarikyu（EN）](https://builtjapan.com/en/buildings/brillia-hamarikyu/) | ヒーロー画像なし（プレースホルダ表示） |
| [eitaibashi（EN）](https://builtjapan.com/en/buildings/eitaibashi/) | ヒーロー画像なし（プレースホルダ表示） |
| [hareza-ikebukuro（EN）](https://builtjapan.com/en/buildings/hareza-ikebukuro/) | ヒーロー画像なし（プレースホルダ表示） |
| [park-city-musashikosugi-midsky（EN）](https://builtjapan.com/en/buildings/park-city-musashikosugi-midsky/) | ヒーロー画像なし（プレースホルダ表示） |
| [park-tower-grand-sky（EN）](https://builtjapan.com/en/buildings/park-tower-grand-sky/) | ヒーロー画像なし（プレースホルダ表示） |
| [shinonome-canal-court-codan（EN）](https://builtjapan.com/en/buildings/shinonome-canal-court-codan/) | ヒーロー画像なし（プレースホルダ表示） |
| [the-parkhouse-harumi-towers（EN）](https://builtjapan.com/en/buildings/the-parkhouse-harumi-towers/) | ヒーロー画像なし（プレースホルダ表示） |

## 直し方

- **画像なし**: `site/src/content/buildings/<slug>.md` の `heroImage` を設定する。外観の全体写真を使う（内観・ロビー・横丁は不可）。
- **壊れ**: Wikimediaのthumb幅が原寸を超えると400になる。`/thumb/.../<N>px-` の N を下げるか、thumbでない原寸URLに差し替える。
- 直したら blog リポジトリに push し、CodeBuild を手動 start-build して反映する。
