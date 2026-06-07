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

export const collections = { buildings };
