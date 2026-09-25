// 記事一覧ページ(/buildings/ /bridges/ /expressways/ /railways/ /tourism/ と各 page/N/)の定義。
// 一覧を増やすときはここに1件足すだけで、ページ・sitemap・ナビの候補に載る。
import { useT, languages, type Lang } from '../i18n/ui';
import { BRIDGES, CATEGORIES } from './category';
import {
  getBridgePosts, getCategoryListing, getTowerPosts,
  pageCount, type AnyPost, type CategoryKey,
} from './content';

export type ListKey = 'buildings' | 'bridges' | CategoryKey;

export interface ListDef {
  key: ListKey;
  label: (lang: Lang) => string;
  description: (lang: Lang) => string;
  /** 生成する言語 */
  langs: readonly Lang[];
  /** カードの種類。building = 建物カード(数値つき)、category = カテゴリカード */
  view: 'building' | 'category';
  /** 一覧に並べる記事(新着順・全件) */
  posts: (lang: Lang) => Promise<AnyPost[]>;
}

const category = (key: CategoryKey): ListDef => ({
  key,
  label: (lang) => CATEGORIES[key].label[lang],
  description: (lang) => CATEGORIES[key].description[lang],
  // 観光は本体に英語版が無いが、英語版のある建物が合流するので英語の一覧も作る。
  langs: languages,
  view: 'category',
  posts: (lang) => getCategoryListing(key, lang),
});

export const LISTS: Record<ListKey, ListDef> = {
  buildings: {
    key: 'buildings',
    label: (lang) => useT(lang)('nav.home'),
    description: (lang) => useT(lang)('buildings.lead'),
    langs: languages,
    view: 'building',
    posts: getTowerPosts,
  },
  bridges: {
    key: 'bridges',
    label: (lang) => BRIDGES.label[lang],
    description: (lang) => BRIDGES.description[lang],
    langs: languages,
    view: 'building',
    posts: getBridgePosts,
  },
  expressways: category('expressways'),
  railways: category('railways'),
  tourism: category('tourism'),
};

/** 一覧のURL(1ページ目は basePath、2ページ目以降は basePath + page/N/)。 */
export const listPath = (lang: Lang, key: ListKey, page = 1) =>
  `${lang === 'en' ? '/en' : ''}/${key}/${page > 1 ? `page/${page}/` : ''}`;

/** 全一覧 × 言語 × ページの組。getStaticPaths と sitemap が使う。 */
export async function listPages() {
  const out: { list: ListDef; lang: Lang; page: number; totalPages: number; posts: AnyPost[] }[] = [];
  for (const list of Object.values(LISTS)) {
    for (const lang of list.langs) {
      const posts = await list.posts(lang);
      const totalPages = pageCount(posts.length);
      for (let page = 1; page <= totalPages; page++) out.push({ list, lang, page, totalPages, posts });
    }
  }
  return out;
}
