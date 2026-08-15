// 拡張カテゴリ(高速道路・交通網・観光)と、建物コレクションの出し分け(橋 / ビル・マンション)の設定。
// ページ側(一覧・記事詳細・sitemap)がここを唯一の出典として参照する。
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
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
    label: { ja: '交通網', en: 'Transport' },
    description: {
      ja: '山手線や地下鉄、ターミナル駅、空港まで。東京・関東の人とモノを動かす交通インフラを紹介していきます。',
      en: 'Lines, stations, terminals and airports — the transport infrastructure that moves people and goods across Tokyo and the Kanto region.',
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
  // 羽田空港D滑走路のような交通インフラは buildings コレクションに置いたまま
  // (高さ・座標・図鑑・英語版を保つ)、このタグで交通網の一覧にも出す。
  railways: '交通',
};

/** カテゴリ一覧に出す1件分。href は詳細ページへの実リンク（合流した建物は /buildings/ を指す）。 */
export interface CategoryPost {
  slug: string;
  data: { title: string; summary?: string; area?: string; publishedAt: Date };
  heroImage?: string;
  href: string;
}

/**
 * カテゴリ一覧に並べる記事を返す（英語版・新着順）。
 * 英語コレクションは公開日・画像を持たないため、同じ slug の日本語版から借りる。
 * タグで合流する建物記事も、英語版(buildings-en)がある分だけ合流させる。
 */
export async function getCategoryPostsEn(key: CategoryKey): Promise<CategoryPost[]> {
  const meta = CATEGORIES[key];
  const own: CategoryPost[] = [];
  if (meta.hasEn) {
    const jaBySlug = new Map((await getCollection(key)).map((p) => [p.slug, p]));
    for (const en of await getCollection(`${key}-en` as 'railways-en')) {
      const ja = jaBySlug.get(en.slug);
      if (!ja) continue;
      own.push({
        slug: en.slug,
        data: { ...en.data, publishedAt: ja.data.publishedAt },
        heroImage: ja.data.heroImage,
        href: `/en/${key}/${en.slug}/`,
      });
    }
  }

  const tag = BUILDING_TAG_BY_CATEGORY[key];
  const tagged: CategoryPost[] = [];
  if (tag) {
    const jaBySlug = new Map(
      (await getCollection('buildings')).filter((b) => b.data.tags.includes(tag)).map((b) => [b.slug, b])
    );
    for (const en of await getCollection('buildings-en')) {
      const ja = jaBySlug.get(en.slug);
      if (!ja) continue;
      tagged.push({
        slug: en.slug,
        data: { ...en.data, publishedAt: ja.data.publishedAt },
        heroImage: ja.data.heroImage,
        href: `/en/buildings/${en.slug}/`,
      });
    }
  }

  return [...own, ...tagged].sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf()
  );
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

// ---- 橋 / ビル・マンションの振り分け ----
// 橋は buildings コレクションに置いたまま(高さ・座標・図鑑・スタンプ・英語版を保つ)、
// 一覧の出し分けだけをここで行う。記事URLは /buildings/<slug>/ のまま変わらない。

/** 橋の一覧ページの見出し・リード文。CATEGORIES と同じ形にして呼び出し側を揃える。 */
export const BRIDGES = {
  label: { ja: '橋', en: 'Bridges' } as Record<Lang, string>,
  description: {
    ja: '隅田川の震災復興橋梁から東京ゲートブリッジ、明石海峡大橋まで。街をつなぐ橋を一橋ずつ記録します。',
    en: 'From the reconstruction bridges of the Sumida River to the Tokyo Gate Bridge and the Akashi Kaikyo Bridge — the crossings that stitch the city together.',
  } as Record<Lang, string>,
};

/** 交通網の一覧へ合流させる建物記事のタグ(橋の一覧からは外して重複を避ける)。 */
export const TRANSPORT_TAG = BUILDING_TAG_BY_CATEGORY.railways as string;

type BuildingEntry = CollectionEntry<'buildings'>;

const byNewest = (a: BuildingEntry, b: BuildingEntry) =>
  b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf();

/** 橋の記事(新着順)。交通網へ回した構造物(羽田空港D滑走路など)は除く。 */
export async function getBridgeEntries(): Promise<BuildingEntry[]> {
  return (await getCollection('buildings'))
    .filter((p) => p.data.buildingType === 'bridge' && !p.data.tags.includes(TRANSPORT_TAG))
    .sort(byNewest);
}

/** ビル・マンションの記事(新着順)。橋は専用ページへ分けたのでここには出さない。 */
export async function getBuildingEntries(): Promise<BuildingEntry[]> {
  return (await getCollection('buildings'))
    .filter((p) => p.data.buildingType !== 'bridge')
    .sort(byNewest);
}
