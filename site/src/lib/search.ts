// サイト内検索のインデックス。ビルド時に /search-index.json と /en/search-index.json として書き出し、
// ブラウザ側(src/scripts/search.ts)が読み込んで検索する。サーバーは不要。
//
// 収録するもの: その言語の全記事(建物・高速道路・交通網・観光)と、記事がまだ無い図鑑の建物(準備中)。
// もう一方の言語の名前・開発会社・設計者・タグ・市区も検索語に含め、日本語名でも英語名でも引けるようにする。
import { useT, localizePath, type Lang } from '../i18n/ui';
import { CATEGORIES } from './category';
import { getBuildingRows, type BType } from './buildings';
import { getAllPosts, getBuildingPosts, getCategoryPosts, type CategoryKey } from './content';

export type SearchKind = BType | CategoryKey;

export interface SearchItem {
  /** 表示名 */
  t: string;
  /** リンク先 */
  u: string;
  /** 種別(ラベルは SearchIndex.kinds) */
  k: SearchKind;
  /** エリア */
  a?: string;
  /** 竣工年 */
  y?: number;
  /** 高さ(m) */
  m?: number;
  /** 要約(短く切ったもの) */
  s?: string;
  /** 画像URL */
  i?: string;
  /** 記事がまだ無い(図鑑にだけ載っている)建物 */
  p?: 1;
  /** 表示しない検索語(別言語の名前・開発会社・設計者・タグ・市区) */
  q?: string;
}

export interface SearchIndex {
  lang: Lang;
  kinds: Record<SearchKind, string>;
  items: SearchItem[];
}

const clip = (s: string | undefined, n = 90) => (s && s.length > n ? `${s.slice(0, n)}…` : s);
const words = (...xs: (string | string[] | undefined)[]) =>
  [...new Set(xs.flat().filter((x): x is string => Boolean(x)))].join(' ');

export async function buildSearchIndex(lang: Lang): Promise<SearchIndex> {
  const t = useT(lang);
  const other: Lang = lang === 'ja' ? 'en' : 'ja';
  const kinds = {
    office: t('type.office'),
    residence: t('type.residence'),
    bridge: t('type.bridge'),
    tower: t('type.tower'),
    expressways: CATEGORIES.expressways.label[lang],
    railways: CATEGORIES.railways.label[lang],
    tourism: CATEGORIES.tourism.label[lang],
  } satisfies Record<SearchKind, string>;

  // もう一方の言語の名前(日本語名で英語ページを、英語名で日本語ページを引けるように)
  const otherTitle = new Map((await getAllPosts(other)).map((p) => [`${p.kind}:${p.slug}`, p.title]));
  const otherRows = new Map((await getBuildingRows(other)).map((r) => [r.slug, r]));
  const otherBuildings = new Map((await getBuildingPosts(other)).map((p) => [p.slug, p]));

  const items: SearchItem[] = [];
  const buildingPosts = new Map((await getBuildingPosts(lang)).map((p) => [p.slug, p]));

  // 建物: 図鑑の全建物(記事の無い建物も含む)を基準に、記事があれば記事へ、無ければ図鑑の該当行へ。
  for (const r of await getBuildingRows(lang)) {
    const post = buildingPosts.get(r.slug);
    const o = otherRows.get(r.slug);
    const op = otherBuildings.get(r.slug);
    items.push({
      t: post?.title ?? r.title,
      u: post?.href ?? `${localizePath(lang, '/database/')}?q=${encodeURIComponent(r.title)}`,
      k: r.buildingType,
      a: post?.area ?? r.area,
      y: r.completedYear,
      m: r.heightM,
      s: clip(post?.summary),
      i: post?.heroImage,
      ...(post ? {} : { p: 1 as const }),
      q: words(
        o?.title, o?.area, r.city, r.pref, post?.facts.title,
        post?.developer, post?.architect, post?.tags,
        op?.developer, op?.architect, op?.tags,
      ),
    });
  }

  // 高速道路・交通網・観光
  for (const key of Object.keys(CATEGORIES) as CategoryKey[]) {
    for (const p of await getCategoryPosts(key, lang)) {
      items.push({
        t: p.title,
        u: p.href,
        k: key,
        a: p.area,
        s: clip(p.summary),
        i: p.heroImage,
        q: words(otherTitle.get(`${key}:${p.slug}`), p.tags, p.facts.title),
      });
    }
  }

  return { lang, kinds, items };
}
