// 記事データの唯一の入口。ページ・部品・sitemap・検索インデックスは、コレクションを直接読まずにここを通す。
//
// 日英の関係:
// - 数値の事実(竣工年・高さ・座標・公開日・写真・検証状態・出典)は日本語コレクションだけが持つ(= facts)。
// - 英語コレクションは言語依存のテキスト(タイトル・要約・エリア名・本文・タグ・開発/設計の英語表記)だけを持つ。
// - 英語版は、同じ slug の日本語版がある記事だけを出す(事実を引けないため)。
// どちらの言語でも同じ形(LocalizedPost)で返すので、ページ側は lang を渡すだけで日英を同じコードで描ける。
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';
import { areasFor, type AreaKey } from './area';
import { registryGeoBySlug } from './buildings';

export type CategoryKey = 'expressways' | 'railways' | 'tourism';
export type BuildingType = CollectionEntry<'buildings'>['data']['buildingType'];

/** 言語ごとのURL接頭辞。日本語はルート、英語は /en。 */
export const langPrefix = (lang: Lang) => (lang === 'en' ? '/en' : '');

/** 共通部分: 一覧のカード・新着・検索・sitemap が使う情報。 */
interface PostBase {
  slug: string;
  lang: Lang;
  /** この言語での記事URL */
  href: string;
  /** もう一方の言語の記事URL。対訳が無ければ null */
  altHref: string | null;
  title: string;
  summary?: string;
  area?: string;
  tags: string[];
  publishedAt: Date;
  heroImage?: string;
  heroImageCredit?: string;
  heroImageLink?: string;
  verified: boolean;
  sources: string[];
  /** エリア絞り込み用のキー。英語版も日本語版の area から割り出す(表示名だけを英語にする)。 */
  areas: AreaKey[];
}

export interface BuildingPost extends PostBase {
  kind: 'building';
  area: string;
  developer?: string;
  architect?: string;
  /** 数値の事実(日本語版の front matter) */
  facts: CollectionEntry<'buildings'>['data'];
  /** 本文を描くためのエントリ(この言語のもの) */
  entry: CollectionEntry<'buildings'> | CollectionEntry<'buildings-en'>;
}

export interface CategoryPost extends PostBase {
  kind: CategoryKey;
  facts: CollectionEntry<CategoryKey>['data'];
  entry: CollectionEntry<CategoryKey> | CollectionEntry<`${CategoryKey}-en`>;
}

export type AnyPost = BuildingPost | CategoryPost;

const newestFirst = (a: PostBase, b: PostBase) => b.publishedAt.valueOf() - a.publishedAt.valueOf();

// ---- 建物(ビル・マンション・橋・タワー) ----

const buildingCache = new Map<Lang, Promise<BuildingPost[]>>();

/** 建物記事を新着順で返す。英語は英語版がある建物だけ。 */
export function getBuildingPosts(lang: Lang): Promise<BuildingPost[]> {
  if (!buildingCache.has(lang)) buildingCache.set(lang, loadBuildings(lang));
  return buildingCache.get(lang)!;
}

async function loadBuildings(lang: Lang): Promise<BuildingPost[]> {
  const ja = await getCollection('buildings');
  const en = await getCollection('buildings-en');
  const jaBySlug = new Map(ja.map((p) => [p.slug, p]));
  const enBySlug = new Map(en.map((p) => [p.slug, p]));
  const geo = registryGeoBySlug();

  const pairs = lang === 'ja'
    ? ja.map((j) => ({ j, local: j as BuildingPost['entry'] }))
    : en.filter((e) => jaBySlug.has(e.slug)).map((e) => ({ j: jaBySlug.get(e.slug)!, local: e as BuildingPost['entry'] }));

  return pairs
    .map(({ j, local }) => {
      const f = j.data;
      const text = local.data as CollectionEntry<'buildings-en'>['data'];
      const hasEn = enBySlug.has(j.slug);
      return {
        kind: 'building' as const,
        slug: j.slug,
        lang,
        href: `${langPrefix(lang)}/buildings/${j.slug}/`,
        altHref: lang === 'ja' ? (hasEn ? `/en/buildings/${j.slug}/` : null) : `/buildings/${j.slug}/`,
        title: text.title,
        summary: text.summary,
        area: text.area,
        tags: text.tags,
        developer: text.developer ?? f.developer,
        architect: text.architect ?? f.architect,
        publishedAt: f.publishedAt,
        heroImage: f.heroImage,
        heroImageCredit: f.heroImageCredit,
        heroImageLink: f.heroImageLink,
        verified: f.verified,
        sources: f.sources,
        areas: areasFor(f.area, geo.get(j.slug)),
        facts: f,
        entry: local,
      };
    })
    .sort(newestFirst);
}

// 橋は buildings コレクションに置いたまま(高さ・座標・図鑑・スタンプ・英語版を保つ)、一覧だけ /bridges/ に分ける。
// 交通インフラ(羽田空港D滑走路など)は「交通」タグで交通網の一覧へ回し、橋の一覧からは外す。

/** 建物記事を交通網の一覧へ合流させるタグ。 */
export const TRANSPORT_TAG = '交通';
/** 建物記事を観光の一覧へ合流させるタグ。 */
export const TOURISM_TAG = '観光';

const isBridge = (p: BuildingPost) => p.facts.buildingType === 'bridge';

/** ビル・マンションの一覧に出す記事(橋を除く)。 */
export async function getTowerPosts(lang: Lang): Promise<BuildingPost[]> {
  return (await getBuildingPosts(lang)).filter((p) => !isBridge(p));
}

/** 橋の一覧に出す記事(交通網へ回した構造物を除く)。 */
export async function getBridgePosts(lang: Lang): Promise<BuildingPost[]> {
  return (await getBuildingPosts(lang)).filter((p) => isBridge(p) && !p.facts.tags.includes(TRANSPORT_TAG));
}

// ---- 拡張カテゴリ(高速道路・交通網・観光) ----

/** 英語版コレクションがあるカテゴリ。観光は日本語のみ。 */
export const CATEGORY_HAS_EN: Record<CategoryKey, boolean> = {
  expressways: true,
  railways: true,
  tourism: false,
};

const categoryCache = new Map<string, Promise<CategoryPost[]>>();

/** カテゴリ本体の記事を新着順で返す(タグで合流する建物は含まない)。 */
export function getCategoryPosts(key: CategoryKey, lang: Lang): Promise<CategoryPost[]> {
  const cacheKey = `${key}:${lang}`;
  if (!categoryCache.has(cacheKey)) categoryCache.set(cacheKey, loadCategory(key, lang));
  return categoryCache.get(cacheKey)!;
}

async function loadCategory(key: CategoryKey, lang: Lang): Promise<CategoryPost[]> {
  if (lang === 'en' && !CATEGORY_HAS_EN[key]) return [];
  const ja = await getCollection(key);
  const en = CATEGORY_HAS_EN[key] ? await getCollection(`${key}-en` as 'railways-en') : [];
  const jaBySlug = new Map(ja.map((p) => [p.slug, p]));
  const enSlugs = new Set(en.map((p) => p.slug));

  const pairs = lang === 'ja'
    ? ja.map((j) => ({ j, local: j as CategoryPost['entry'] }))
    : en.filter((e) => jaBySlug.has(e.slug)).map((e) => ({ j: jaBySlug.get(e.slug)!, local: e as CategoryPost['entry'] }));

  return pairs
    .map(({ j, local }) => {
      const f = j.data;
      const text = local.data as CollectionEntry<'railways-en'>['data'];
      return {
        kind: key,
        slug: j.slug,
        lang,
        href: `${langPrefix(lang)}/${key}/${j.slug}/`,
        altHref: lang === 'ja' ? (enSlugs.has(j.slug) ? `/en/${key}/${j.slug}/` : null) : `/${key}/${j.slug}/`,
        title: text.title,
        summary: text.summary,
        area: text.area,
        tags: text.tags,
        publishedAt: f.publishedAt,
        heroImage: f.heroImage,
        heroImageCredit: f.heroImageCredit,
        heroImageLink: f.heroImageLink,
        verified: f.verified,
        sources: f.sources,
        areas: areasFor(f.area),
        facts: f,
        entry: local,
      };
    })
    .sort(newestFirst);
}

/** カテゴリにタグで合流させる建物記事のタグ。 */
const BUILDING_TAG_BY_CATEGORY: Partial<Record<CategoryKey, string>> = {
  tourism: TOURISM_TAG,
  railways: TRANSPORT_TAG,
};

/**
 * カテゴリ一覧に並べる記事(新着順)。カテゴリ本体に加え、合流タグを持つ建物記事も混ぜる。
 * 合流した建物のリンク先は /buildings/<slug>/ のまま。
 */
export async function getCategoryListing(key: CategoryKey, lang: Lang): Promise<AnyPost[]> {
  const own = await getCategoryPosts(key, lang);
  const tag = BUILDING_TAG_BY_CATEGORY[key];
  // 合流の判定は日本語版のタグ(= facts.tags)で行う。英語版のタグは翻訳なので一致しない。
  const tagged = tag && (lang === 'ja' || CATEGORY_HAS_EN[key])
    ? (await getBuildingPosts(lang)).filter((p) => p.facts.tags.includes(tag))
    : [];
  return [...own, ...tagged].sort(newestFirst);
}

// ---- カテゴリ横断 ----

/** 全カテゴリの記事を新着順に(トップの「新着」用)。合流タグの重複は起きない(各コレクションの実体だけを集める)。 */
export async function getAllPosts(lang: Lang): Promise<AnyPost[]> {
  const keys = Object.keys(CATEGORY_HAS_EN) as CategoryKey[];
  const lists = await Promise.all([getBuildingPosts(lang), ...keys.map((k) => getCategoryPosts(k, lang))]);
  return lists.flat().sort(newestFirst);
}

/** タグページの元になる建物記事(タグ→記事、新着順)。タグはこの言語のもの。 */
export async function getTagIndex(lang: Lang): Promise<Map<string, BuildingPost[]>> {
  const index = new Map<string, BuildingPost[]>();
  for (const p of await getBuildingPosts(lang)) {
    for (const tag of p.tags) {
      if (!index.has(tag)) index.set(tag, []);
      index.get(tag)!.push(p);
    }
  }
  return index;
}

/** 1ページあたりの記事数。 */
export const PER_PAGE = 10;

/** 一覧の総ページ数。 */
export const pageCount = (n: number) => Math.max(1, Math.ceil(n / PER_PAGE));
