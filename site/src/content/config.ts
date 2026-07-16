import { defineCollection, z } from 'astro:content';

// 建物記事のスキーマ。
// 事実フィールド（竣工年・階数・高さ等）は Lambda がseedデータから埋める。
// Claudeは本文の文章化のみを担当し、事実は創作させない方針。
const buildings = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    // office: オフィスビル / residence: マンション
    buildingType: z.enum(['office', 'residence']),
    area: z.string(), // 例: 港区
    address: z.string().optional(),
    // 任意の緯度経度。あれば記事末の地図をピン精度で表示し、無ければ建物名でジオコーディングする。
    lat: z.number().optional(),
    lng: z.number().optional(),
    completedYear: z.number().int().optional(),
    floorsAbove: z.number().int().optional(),
    floorsBelow: z.number().int().optional(),
    heightM: z.number().optional(),
    totalFloorAreaM2: z.number().optional(),
    developer: z.string().optional(),
    architect: z.string().optional(),
    tags: z.array(z.string()).default([]),
    publishedAt: z.coerce.date(),
    heroImage: z.string().optional(),
    heroImageCredit: z.string().optional(), // 「作者 / ライセンス」
    heroImageLink: z.string().optional(), // Wikimedia Commonsのファイルページ
    summary: z.string().optional(),
    // 事実確認の状態。false の記事には「未検証」バッジを出す。
    verified: z.boolean().default(false),
    sources: z.array(z.string()).default([]),
  }),
});

// 英語版記事。数値の事実(竣工年・高さ等)は日本語版(buildings)を唯一の出典とし、
// ここでは言語依存のテキスト(タイトル・要約・エリア名・本文・タグ・開発/設計の英語表記)だけを持つ。
// slug は日本語版と一致させ、ページ側で同一 slug の buildings エントリと突き合わせて数値を補う。
// コレクション名は src/content/ 直下のディレクトリ名と一致させる必要がある（= 'buildings-en'）。
const buildingsEn = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    area: z.string(), // 例: Minato City
    summary: z.string().optional(),
    developer: z.string().optional(),
    architect: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

// 今後の拡張カテゴリ(高速道路の路線・鉄道の路線・観光)。
// ビルとはフィールドが異なるため、汎用的な共通スキーマを使う。記事を追加するとカテゴリページが自動で一覧化する。
const genericCategorySchema = z.object({
  title: z.string(),
  area: z.string().optional(), // エリア/区間/沿線など
  summary: z.string().optional(),
  tags: z.array(z.string()).default([]),
  publishedAt: z.coerce.date(),
  heroImage: z.string().optional(),
  heroImageCredit: z.string().optional(),
  heroImageLink: z.string().optional(),
  verified: z.boolean().default(false),
  sources: z.array(z.string()).default([]),
});

const expressways = defineCollection({ type: 'content', schema: genericCategorySchema });
const railways = defineCollection({ type: 'content', schema: genericCategorySchema });
const tourism = defineCollection({ type: 'content', schema: genericCategorySchema });

const expresswaysEnSchema = z.object({
  title: z.string(),
  area: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
const expresswaysEn = defineCollection({ type: 'content', schema: expresswaysEnSchema });

const railwaysEnSchema = z.object({
  title: z.string(),
  area: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
const railwaysEn = defineCollection({ type: 'content', schema: railwaysEnSchema });

export const collections = {
  buildings,
  'buildings-en': buildingsEn,
  expressways,
  'expressways-en': expresswaysEn,
  railways,
  'railways-en': railwaysEn,
  tourism,
};
