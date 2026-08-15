// カテゴリ横断の記事一覧（トップの「新着」用）。
// buildings と拡張カテゴリ(高速道路・鉄道・観光)を publishedAt で1本に混ぜる。
// 観光タグ付きの建物記事は buildings 側で既に出るため、ここでは各コレクションの実体だけを集めて重複を避ける。
import { getCollection } from 'astro:content';
import { CATEGORIES, type CategoryKey } from './category';
import { buildingTypeLabel, type Lang } from '../i18n/ui';

export interface LatestPost {
  href: string;
  title: string;
  summary?: string;
  area?: string;
  heroImage?: string;
  publishedAt: Date;
  /** カードのバッジ表記。建物は用途(オフィス/マンション)、それ以外はカテゴリ名。 */
  badge: string;
  /** バッジの色分けクラス。建物は buildingType、それ以外は 'category'。 */
  badgeClass: string;
  buildingType?: 'office' | 'residence' | 'bridge';
  completedYear?: number;
  heightM?: number;
  verified: boolean;
}

const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

/** 全カテゴリの記事を新着順に返す。英語版は日本語版と対になる記事だけ（数値・公開日・画像は日本語版から借りる）。 */
export async function getAllPosts(lang: Lang): Promise<LatestPost[]> {
  const jaBuildings = await getCollection('buildings');
  const out: LatestPost[] = [];

  if (lang === 'ja') {
    for (const p of jaBuildings) {
      out.push({
        href: `/buildings/${p.slug}/`,
        title: p.data.title,
        summary: p.data.summary,
        area: p.data.area,
        heroImage: p.data.heroImage,
        publishedAt: p.data.publishedAt,
        badge: buildingTypeLabel(lang, p.data.buildingType, true),
        badgeClass: p.data.buildingType,
        buildingType: p.data.buildingType,
        completedYear: p.data.completedYear,
        heightM: p.data.heightM,
        verified: p.data.verified,
      });
    }
  } else {
    const jaBySlug = new Map(jaBuildings.map((p) => [p.slug, p]));
    for (const en of await getCollection('buildings-en')) {
      const ja = jaBySlug.get(en.slug);
      if (!ja) continue;
      out.push({
        href: `/en/buildings/${en.slug}/`,
        title: en.data.title,
        summary: en.data.summary,
        area: en.data.area,
        heroImage: ja.data.heroImage,
        publishedAt: ja.data.publishedAt,
        badge: buildingTypeLabel(lang, ja.data.buildingType, true),
        badgeClass: ja.data.buildingType,
        buildingType: ja.data.buildingType,
        completedYear: ja.data.completedYear,
        heightM: ja.data.heightM,
        verified: ja.data.verified,
      });
    }
  }

  for (const key of CATEGORY_KEYS) {
    const meta = CATEGORIES[key];
    const jaPosts = await getCollection(key);

    if (lang === 'ja') {
      for (const p of jaPosts) {
        out.push({
          href: `/${key}/${p.slug}/`,
          title: p.data.title,
          summary: p.data.summary,
          area: p.data.area,
          heroImage: p.data.heroImage,
          publishedAt: p.data.publishedAt,
          badge: meta.label.ja,
          badgeClass: 'category',
          verified: p.data.verified,
        });
      }
      continue;
    }

    if (!meta.hasEn) continue;
    const jaBySlug = new Map(jaPosts.map((p) => [p.slug, p]));
    for (const en of await getCollection(`${key}-en` as 'railways-en')) {
      const ja = jaBySlug.get(en.slug);
      if (!ja) continue;
      out.push({
        href: `/en/${key}/${en.slug}/`,
        title: en.data.title,
        summary: en.data.summary,
        area: en.data.area,
        heroImage: ja.data.heroImage,
        publishedAt: ja.data.publishedAt,
        badge: meta.label.en,
        badgeClass: 'category',
        verified: ja.data.verified,
      });
    }
  }

  return out.sort((a, b) => b.publishedAt.valueOf() - a.publishedAt.valueOf());
}

/** 直近 limit 本。カテゴリは問わない。 */
export async function getLatestPosts(lang: Lang, limit = 10): Promise<LatestPost[]> {
  return (await getAllPosts(lang)).slice(0, limit);
}
