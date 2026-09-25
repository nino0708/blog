# Built Japan（builtjapan.com）

日本の高層建築・橋・高速道路・交通網を1件ずつ記録する日英バイリンガルの静的サイト。
Astro（`site/`）で静的HTMLを作り、CodeBuild が S3 + CloudFront に公開する。記事は毎朝 Lambda（`generator/`）が自動で追加する。

## いちばん大事なルール

1. **日本語と英語は常に同期する。** 日本語版のページ・部品・文言・機能を変えたり足したりしたら、同じ変更を英語版にも同じ構成で入れる。
   - ページは `site/src/pages/[...lang]/` に1ファイルだけ置き、日英を同じコードで生成する（`/xxx/` と `/en/xxx/`）。
   - UI文言は `site/src/i18n/ui.ts` の `ja` と `en` の両方に同じキーで足す。片方だけに足さない。
   - 英語版をまだ作れないページは、`langPaths(['ja'])` のように理由をコメントに書いて日本語だけ生成する（現在: ランキング、観光）。
2. **数値の事実を創作しない。** 竣工年・高さ・階数・座標などは `generator/data/buildings.json`（seed）と記事の front matter、`site/src/data/buildings-registry.json` にある値だけを使う。
3. **URLを変えない。** 検索エンジンからの流入を守るため、既存ページのパスは変えない。どうしても変えるときは旧URLに転送ページを置く（例: `site/src/pages/[...lang]/page/[page].astro`）。
4. **記事ファイルの形を変えない。** `site/src/content/**` の Markdown は generator が毎日書き込む。front matter のスキーマ（`site/src/content/config.ts`）を変えるときは `generator/` 側も合わせる。

## フォルダ構成（site/src）

| 場所 | 役割 |
|---|---|
| `content/` | 記事 Markdown。`buildings` と `buildings-en` のように日英でコレクションが分かれ、slug が同じものが対訳 |
| `content/config.ts` | 記事の front matter のスキーマ |
| `data/buildings-registry.json` | 全建物マスター（記事が無い「準備中」の建物も含む。座標・市区つき） |
| `lib/content.ts` | **記事データの唯一の入口。** 日英どちらでも同じ形（`BuildingPost` / `CategoryPost`）で返す。ページはコレクションを直接読まずにここを使う |
| `lib/lists.ts` | 記事一覧ページ（ビル・橋・高速道路・交通網・観光）の定義。一覧を増やすときはここに1件足す |
| `lib/buildings.ts` | 図鑑・地図・スタンプ用の「全建物」行（レジストリ ∪ 記事）と距離計算 |
| `lib/category.ts` | カテゴリの表示名・説明文 |
| `lib/area.ts` | エリア（都道府県・市区）の正規化と絞り込みチップ |
| `i18n/ui.ts` | UI文言の辞書、`localizePath`、`langPaths` などの日英ヘルパー |
| `pages/[...lang]/` | 全ページ（日英を1ファイルで生成） |
| `pages/sitemap.xml.ts` | sitemap。記事・一覧はデータ層から自動で載る。固定ページを足したら `STATIC_PAGES` にも足す |
| `components/` | 表示部品。`ListView`（一覧）、`BuildingArticle` / `CategoryArticle`（記事詳細）など |
| `styles/global.css` | サイト全体のスタイル |

### ページの書き方

```astro
---
import { langPaths, localizePath, type Lang } from '../../i18n/ui';

// function 宣言で書く(export const のアロー関数だと Astro のコンパイラが次の行まで巻き上げて壊れる)
export function getStaticPaths() {
  return langPaths();
}

const { lang } = Astro.props as { lang: Lang };
---
```

- リンクは `localizePath(lang, '/database/')` のように言語つきで作る。`/en/...` を手書きしない。
- 対訳ページへのリンク（hreflang）は `BaseLayout` の `altPath` に渡す。

## コマンド

```bash
cd site
npm ci
npm run dev            # http://localhost:4321
npm run build          # dist/ を生成（本番と同じく SITE_URL=https://builtjapan.com を付けると絶対URLが本番になる）
npm run check:links    # dist の内部リンク切れを検査（本番ビルドでは1件でもあると公開が止まる）
```

変更したら必ず `npm run build` と `npm run check:links` を通す。PR では GitHub Actions（`.github/workflows/site-check.yml`）が同じ2つを実行する。

## そのほか

- 記事本文の内部リンクは執筆時に手書きされる。カテゴリ違い（例: 高速道路の記事を `/buildings/` で書く）でリンク切れになりやすい。
- アクセス解析の週次レポートは `reports/analytics-*.md`（分析用 Lambda は `analytics/index.py`）。
