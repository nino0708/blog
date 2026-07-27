// 拡張カテゴリ(高速道路・鉄道・観光)の表示設定。
// ページ側(一覧・記事詳細・sitemap)がここを唯一の出典として参照する。
import { getCollection } from 'astro:content';
import type { Lang } from '../i18n/ui';

export type CategoryKey = 'expressways' | 'railways' | 'tourism';

/** 1ページあたりの記事数。トップの新着一覧(1ページ10件)に合わせる。 */
export const PER_PAGE = 10;

interface CategoryMeta {
  /** バッジ・見出しに出すカテゴリ名 */
  label: Record<Lang, string>;
  /** 一覧ページのリード文 */
  description: Record<Lang, string>;
  /** 楽天ブックス検索のキーワード(日本語サービスのためJP固定) */
  booksKeyword: string;
  /** 英語版コンテンツコレクションの有無。tourism は日本語のみ。 */
  hasEn: boolean;
}

export const CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  expressways: {
    label: { ja: '高速道路', en: 'Expressways' },
    description: {
      ja: '首都高のジャンクションやトンネル、湾岸の長大橋など、東京・関東の高速道路を紹介していきます。',
      en: 'Junctions, tunnels and long-span bridges of the expressway network that threads through Tokyo and the Kanto region.',
    },
    booksKeyword: '東京 高速道路 土木',
    hasEn: true,
  },
  railways: {
    label: { ja: '鉄道', en: 'Railways' },
    description: {
      ja: '山手線や地下鉄、ターミナル駅など、東京・関東の鉄道の路線と駅を紹介していきます。',
      en: 'Lines and stations across Tokyo and the Kanto region — from the Yamanote loop to the subways and the great terminals.',
    },
    booksKeyword: '東京 鉄道 建築',
    hasEn: true,
  },
  tourism: {
    label: { ja: '観光', en: 'Tourism' },
    description: {
      ja: '展望台や街歩きのスポットなど、建物を楽しむための観光情報を紹介していきます。',
      en: 'Observation decks and walkable neighbourhoods — how to actually go and see the architecture.',
    },
    booksKeyword: '東京 観光 建築',
    hasEn: false,
  },
};

/** 記事詳細ページのパス（言語込み） */
export function categoryPath(lang: Lang, key: CategoryKey, slug = ''): string {
  const prefix = lang === 'en' ? '/en' : '';
  return `${prefix}/${key}/${slug}${slug ? '/' : ''}`;
}

// カテゴリに「タグ」で合流させる建物記事のタグ名。
// 東京タワーや橋のような観光名所は buildings コレクションに置いたまま(高さランキング・地図・英語版・階数を保つ)、
// このタグを付けると観光の一覧にも顔を出す。リンク先は /buildings/<slug>/ のまま。
const BUILDING_TAG_BY_CATEGORY: Partial<Record<CategoryKey, string>> = {
  tourism: '観光',
};

/** カテゴリ一覧に出す1件分。href は詳細ページへの実リンク（合流した建物は /buildings/ を指す）。 */
export interface CategoryPost {
  slug: string;
  data: { title: string; summary?: string; area?: string; publishedAt: Date };
  heroImage?: string;
  href: string;
}

/**
 * カテゴリ一覧に並べる記事を返す（新着順）。
 * カテゴリ本体のコレクションに加え、BUILDING_TAG_BY_CATEGORY で指定したタグを持つ建物記事も合流させる。
 */
export async function getCategoryPosts(key: CategoryKey): Promise<CategoryPost[]> {
  const own: CategoryPost[] = (await getCollection(key)).map((p) => ({
    slug: p.slug,
    data: p.data,
    heroImage: p.data.heroImage,
    href: `/${key}/${p.slug}/`,
  }));

  const tag = BUILDING_TAG_BY_CATEGORY[key];
  const tagged: CategoryPost[] = tag
    ? (await getCollection('buildings'))
        .filter((b) => (b.data.tags ?? []).includes(tag))
        .map((b) => ({
          slug: b.slug,
          data: b.data,
          heroImage: b.data.heroImage,
          href: `/buildings/${b.slug}/`,
        }))
    : [];

  return [...own, ...tagged].sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf()
  );
}
