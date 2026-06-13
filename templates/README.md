# 新規記事の作り方（テンプレ運用）

**重要: 新規記事でフロントエンド（`site/src/`配下のレイアウト・コンポーネント・i18n等）は触らない。**
記事はAstroのコンテンツコレクションが自動で拾う。やることはマークダウン2ファイルを置くだけ。

## ネタの選び方

何を書くか迷ったら `templates/article-ideas.json`（100件のネタ帳）から `status: "todo"` を1件選ぶ。
マンション/オフィス/首都高/鉄道/塔・橋を category で分類済み。slug の目安も入っている。
**ネタ帳に数値は無い**ので、執筆時に必ずWeb等で事実を裏取りすること。書き終えたら status を `done` に更新。

## 手順

1. **slugを決める**（英小文字・ハイフン区切り。例: `toranomon-hills-mori-tower`）。
   既存と重複しないこと → `ls site/src/content/buildings/`

2. **日本語記事を作る**
   ```bash
   cp templates/building.ja.md site/src/content/buildings/<slug>.md
   ```
   front matter の事実を埋める。**不明な数値・固有名詞は行ごと削除**（創作しない）。
   本文は H2×2〜3個＋「## まとめ」、900〜1200字。HTMLコメントは消す。
   **地図**: 記事末にはGoogleマップが自動挿入される（コンポーネント側／フロントは触らない）。
   `lat`/`lng` を入れればその座標にピンが立ち、入れなければ建物名でジオコーディングされる。
   座標は緯度経度を知っている時だけ入れ、曖昧なら lat/lng 行ごと削除すればよい（創作しない）。

3. **英語記事を作る**（同じslug）
   ```bash
   cp templates/building.en.md site/src/content/buildings-en/<slug>.md
   ```
   数値はJP版から自動補完されるので、英語は言語依存テキストだけ埋める。

4. **ローカル確認**
   ```bash
   cd site && npm run dev   # http://localhost:4321 で一覧に出ているか / ja・en 両方
   npm run build            # スキーマ違反があればここで落ちる
   ```

5. **デプロイ**（自動ビルドは `nino0708/blog` リポジトリのpushで走る）
   `claude code/tokyo-building-blog/` と デプロイ実体 `/Users/itsukinino/blog` の**両方**に
   同じ2ファイルを置いてから push → CodeBuild が S3/CloudFront へ反映。

## やってはいけない

- フロントの再生成・レイアウト書き換え（記事追加には不要・トークンの無駄）
- front matter に無い数値の創作（ファクトチェックで落ちる／信頼性を損なう）
- heroImage を確信なく入れる（眺望写真・別建物の誤用に注意。怪しければ画像なし=行ごと削除）
- slug をJP/ENで食い違わせる（英語版が数値を補完できなくなる）

## 自動投稿（Lambda）との違い

毎日6:30の自動投稿は `generator/data/buildings.json` の seed を元にLambdaが生成する別経路。
手動でテンプレから書く場合は seed への追加は不要（自動投稿に載せたい建物だけ seed に足す）。
