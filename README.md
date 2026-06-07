# Tokyo Towers Journal

東京の大型オフィスビル・タワーマンションを巡る趣味の建築情報ブログ。
**Astro（静的サイト）+ S3/CloudFront 配信 + 記事自動生成（Lambda）+ AWSネイティブCI/CD（CodeBuild）** で構成。

## アーキテクチャ

```
①コンテンツ自動生成
  EventBridge(毎日6:30 JST) ─▶ Lambda(generator)
                         ├─ seed(buildings.json)の「事実」を読む(verified:trueのみ)
                         ├─ Claude APIで紹介文(本文)だけ生成 ※事実は創作させない
                         ├─ ファクトチェック(別LLM) 合格時のみ
                         ├─ GitHub(nino0708/blog)に Markdown をコミット
                         └─ CodeBuild を StartBuild で起動
                                     │
②ビルド & デプロイ                   ▼
  CodeBuild ─ Astro build ─▶ S3 sync ─▶ CloudFront invalidation
                                     │
③配信                                ▼
  非公開S3(OAC) ◀─ CloudFront(+ACM/独自ドメイン) ◀─ 閲覧者(HTTPS)
```

ポイント:
- **事実とAIの分離**: 竣工年・高さ等の事実は `generator/data/buildings.json` が唯一の出典。Claudeは文章化のみで、数値や固有名詞を創作しない（実在建物の誤情報・ハルシネーション対策）。`verified:false` の記事には「未検証」バッジが付く。
- **二重のファクトチェック**: 自動公開は `verified:true`（人が出典で裏取り済み）の建物だけ。さらに生成後にLLM検証パスが「確定事実を超える断定（数値・年・順位・固有名詞）」を検出し、NGなら1回再生成→なお不合格なら**公開しない**。誤った記事が自動公開されない設計。
- **毎日 朝6:30 JST 公開**: EventBridgeが毎日1棟ずつ生成・公開（要 `verified:true` のストック）。
- **SEO**: 各ページに canonical / OGP / Twitterカード / JSON-LD構造化データ、自前 `sitemap.xml`、`robots.txt` を出力。
- **アフィリエイト**: 記事下に文脈リンク（楽天トラベル/楽天ブックス/Amazon）。ステマ規制対応のPR表記つき。IDは環境変数で注入（公開リポジトリに直書きしない）。
- **CodeCommitは不使用**: AWS CodeCommitは新規顧客の受付を終了しているため、ソースはGitHub、ビルド/デプロイをCodeBuildで回す現実的なAWSネイティブ構成。
- **OAC + CloudFront Function**: S3は完全非公開。`/path/` → `/path/index.html` の書き換えはCloudFront Functionで行う。

## ディレクトリ

```
tokyo-building-blog/
├── site/                 # Astro フロントエンド
│   ├── src/content/buildings/   # 記事Markdown（Lambdaがここに追記）
│   ├── src/pages/        # 一覧 / 記事 / タグ / about / 404
│   └── src/components, layouts, styles
├── generator/            # 記事生成Lambda
│   ├── data/buildings.json   # 建物seed（事実の出典）★ここを育てる
│   ├── index.mjs         # ハンドラ（seed→Claude→GitHubコミット）
│   └── prompts.mjs
├── infra/
│   ├── 01-hosting.yaml   # S3 + CloudFront + (任意)ACM/独自ドメイン
│   └── 02-pipeline.yaml  # CodeBuild + Lambda + EventBridge
└── buildspec.yml         # CodeBuildのビルド定義
```

## ローカル開発

```bash
cd site
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ を生成（13ページ確認済み）
```

記事をローカルで1本生成して確認:

```bash
cd generator
npm install
ANTHROPIC_API_KEY=sk-ant-... node index.mjs --local
# → site/src/content/buildings/<slug>.md を書き出す（GitHubコミットなし）
```

## デプロイ手順（初回）

### 1. シークレットを登録
```bash
aws secretsmanager create-secret --name tbb/anthropic-key --secret-string 'sk-ant-...'
aws secretsmanager create-secret --name tbb/github-token  --secret-string 'ghp_...'  # repo権限のPAT
```

### 2. 配信インフラ（独自ドメインを使うなら us-east-1 で）
```bash
aws cloudformation deploy --template-file infra/01-hosting.yaml \
  --stack-name tbb-hosting --region us-east-1 \
  --parameter-overrides DomainName=towers.example.com HostedZoneId=ZXXXX \
  --capabilities CAPABILITY_IAM
# DomainName/HostedZoneId を省くと CloudFront既定ドメイン(HTTP→HTTPS)で起動
```
出力の `SiteBucketName` / `DistributionId` を控える。

### 3. Lambda(generator)をパッケージしてS3へ
```bash
cd generator && npm install --omit=dev
zip -r ../generator.zip . -x "*.git*"
aws s3 cp ../generator.zip s3://<任意のデプロイ用バケット>/tokyo-building-blog/generator.zip
```

### 4. CI/CD + 自動生成スタック
```bash
aws cloudformation deploy --template-file infra/02-pipeline.yaml \
  --stack-name tbb-pipeline \
  --parameter-overrides \
    SiteBucketName=<手順2の出力> DistributionId=<手順2の出力> \
    GitHubOwner=itsukinino GitHubRepo=portfolio GitHubBranch=main \
    AnthropicSecretArn=<手順1> GitHubTokenSecretArn=<手順1> \
    LambdaCodeS3Bucket=<手順3のバケット> \
  --capabilities CAPABILITY_IAM
```

### 5. CodeBuildのGitHub連携（1回だけ）
CodeBuildのGitHub webhonkにはアカウント単位の認証が必要:
```bash
aws codebuild import-source-credentials --server-type GITHUB \
  --auth-type PERSONAL_ACCESS_TOKEN --token ghp_...
```

これで「週次でLambdaが記事生成→GitHubコミット→CodeBuildがビルド→S3/CloudFrontへ反映」が回る。

## 運用

- **記事を増やす**: `generator/data/buildings.json` に建物を追記するだけ。slugが未生成の建物を毎回1棟ずつ記事化する。
- **事実確認**: `verified:false` の記事は「未検証」バッジ表示。出典で裏取りしたら seed と記事front matterを `true` に。
- **手動生成**: Lambdaコンソールでテスト実行、またはローカル `--local`。
- **スケジュール変更**: `02-pipeline.yaml` の `ScheduleExpression`（UTC cron）。

## 注意・免責

- 実在の建物・**マンション**を扱うため、居住者の個人情報・内部セキュリティ情報・相場/投資助言は扱わない方針（`about` と footer に明記）。
- 生成記事は下書き。公開前提なら `verified` 運用で人の確認を挟むこと。

## コスト感（趣味運用・目安）

S3/CloudFrontは低トラフィックなら月数十円〜。Lambdaは週1実行で実質無料枠。
主コストはClaude APIの記事生成（1記事あたり数円〜十数円程度）。CodeBuildも月数ビルドなら無料枠内に収まりやすい。
