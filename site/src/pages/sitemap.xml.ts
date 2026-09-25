import type { APIRoute } from 'astro';
import { languages, localizePath, type Lang } from '../i18n/ui';
import { CATEGORY_HAS_EN, getBuildingPosts, getCategoryPosts, getTagIndex, type AnyPost, type CategoryKey } from '../lib/content';
import { listPages, listPath } from '../lib/lists';

// 自前のsitemap生成。記事・一覧はページ生成と同じデータ層(lib/content, lib/lists)から作るので、
// ページを足せば自動で載る。日本語(タグ)URLも encodeURI で安全に出力する。
// 日本語/英語の対訳ページは xhtml:link(hreflang) で相互に結ぶ。

/** 記事以外の固定ページ。生成する言語も書く(ページ側の getStaticPaths と揃える)。 */
const STATIC_PAGES: { path: string; langs: readonly Lang[] }[] = [
  { path: '/', langs: languages },
  { path: '/about/', langs: languages },
  { path: '/database/', langs: languages },
  { path: '/near/', langs: languages },
  { path: '/stamps/', langs: languages },
  { path: '/rankings/', langs: ['ja'] },
];

export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://example.com')).toString().replace(/\/$/, '');

  type Alt = { hreflang: string; href: string };
  type Entry = { loc: string; lastmod?: string; alternates?: Alt[] };
  const urls: Entry[] = [];

  // ja/en 両方に存在するページの hreflang セット（x-default は日本語）
  const pair = (jaPath: string, enPath: string): Alt[] => [
    { hreflang: 'ja', href: `${base}${jaPath}` },
    { hreflang: 'en', href: `${base}${enPath}` },
    { hreflang: 'x-default', href: `${base}${jaPath}` },
  ];
  /** 日本語パス・英語パス(無ければ null)から、両言語ぶんのエントリを足す。 */
  const add = (jaPath: string | null, enPath: string | null, lastmod?: string) => {
    const alternates = jaPath && enPath ? pair(jaPath, enPath) : undefined;
    if (jaPath) urls.push({ loc: `${base}${jaPath}`, lastmod, alternates });
    if (enPath) urls.push({ loc: `${base}${enPath}`, lastmod, alternates });
  };

  for (const { path, langs } of STATIC_PAGES) {
    add(langs.includes('ja') ? path : null, langs.includes('en') ? localizePath('en', path) : null);
  }

  // 一覧(1ページ目は日英で対訳、2ページ目以降は各言語単独)
  for (const { list, lang, page } of await listPages()) {
    if (page === 1) {
      if (lang === 'ja') add(listPath('ja', list.key), list.langs.includes('en') ? listPath('en', list.key) : null);
      else if (!list.langs.includes('ja')) add(null, listPath('en', list.key));
    } else {
      urls.push({ loc: `${base}${listPath(lang, list.key, page)}` });
    }
  }

  // 記事。日本語版を基準に、英語版があれば対訳で結ぶ。
  const addPosts = (posts: AnyPost[]) => {
    for (const p of posts) {
      add(encodeURI(p.href), p.altHref ? encodeURI(p.altHref) : null, p.publishedAt.toISOString().slice(0, 10));
    }
  };
  for (const key of Object.keys(CATEGORY_HAS_EN) as CategoryKey[]) addPosts(await getCategoryPosts(key, 'ja'));
  addPosts(await getBuildingPosts('ja'));

  // タグ(言語ごとにタグ名が違うので対訳は結ばない)
  for (const lang of languages) {
    for (const tag of (await getTagIndex(lang)).keys()) {
      urls.push({ loc: `${base}${localizePath(lang, `/tags/${encodeURI(tag)}/`)}` });
    }
  }

  const xmlns =
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ` +
    `xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `${xmlns}\n` +
    urls
      .map((u) => {
        const alts = (u.alternates ?? [])
          .map((a) => `\n    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`)
          .join('');
        return (
          `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}${alts}` +
          `${alts ? '\n  ' : ''}</url>`
        );
      })
      .join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
