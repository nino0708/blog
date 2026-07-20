import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { CATEGORIES } from '../lib/category';

// 自前のsitemap生成。日本語(タグ)URLも encodeURI で安全に出力する。
// 日本語/英語の対訳ページは xhtml:link(hreflang) で相互に結ぶ。
export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://example.com')).toString().replace(/\/$/, '');
  const posts = await getCollection('buildings');
  const enPosts = await getCollection('buildings-en');
  const enSlugs = new Set(enPosts.map((p) => p.slug));
  const jpSlugs = new Set(posts.map((p) => p.slug));
  const tags = [...new Set(posts.flatMap((p) => p.data.tags))];
  const enTags = [...new Set(enPosts.filter((p) => jpSlugs.has(p.slug)).flatMap((p) => p.data.tags))];

  type Alt = { hreflang: string; href: string };
  type Entry = { loc: string; lastmod?: string; alternates?: Alt[] };

  // ja/en 両方に存在するページの hreflang セット（x-default は日本語）
  const pair = (jaPath: string, enPath: string): Alt[] => [
    { hreflang: 'ja', href: `${base}${jaPath}` },
    { hreflang: 'en', href: `${base}${enPath}` },
    { hreflang: 'x-default', href: `${base}${jaPath}` },
  ];

  const urls: Entry[] = [
    { loc: `${base}/`, alternates: pair('/', '/en/') },
    { loc: `${base}/en/`, alternates: pair('/', '/en/') },
    { loc: `${base}/about/`, alternates: pair('/about/', '/en/about/') },
    { loc: `${base}/en/about/`, alternates: pair('/about/', '/en/about/') },
    { loc: `${base}/database/`, alternates: pair('/database/', '/en/database/') },
    { loc: `${base}/en/database/`, alternates: pair('/database/', '/en/database/') },
    { loc: `${base}/rankings/` },
    { loc: `${base}/expressways/`, alternates: pair('/expressways/', '/en/expressways/') },
    { loc: `${base}/en/expressways/`, alternates: pair('/expressways/', '/en/expressways/') },
    { loc: `${base}/railways/`, alternates: pair('/railways/', '/en/railways/') },
    { loc: `${base}/en/railways/`, alternates: pair('/railways/', '/en/railways/') },
    { loc: `${base}/tourism/` },
  ];

  // 拡張カテゴリ(高速道路・鉄道・観光)の記事。英語版があれば hreflang で相互に結ぶ。
  for (const key of ['expressways', 'railways', 'tourism'] as const) {
    const catPosts = await getCollection(key);
    const catEnSlugs = CATEGORIES[key].hasEn
      ? new Set((await getCollection(`${key}-en` as 'railways-en')).map((p) => p.slug))
      : new Set<string>();
    for (const p of catPosts) {
      const jaPath = `/${key}/${encodeURI(p.slug)}/`;
      const enPath = `/en/${key}/${encodeURI(p.slug)}/`;
      const lastmod = p.data.publishedAt.toISOString().slice(0, 10);
      const alternates = catEnSlugs.has(p.slug) ? pair(jaPath, enPath) : undefined;
      urls.push({ loc: `${base}${jaPath}`, lastmod, alternates });
      if (catEnSlugs.has(p.slug)) urls.push({ loc: `${base}${enPath}`, lastmod, alternates });
    }
  }

  for (const p of posts) {
    const jaPath = `/buildings/${encodeURI(p.slug)}/`;
    const enPath = `/en/buildings/${encodeURI(p.slug)}/`;
    const lastmod = p.data.publishedAt.toISOString().slice(0, 10);
    const alternates = enSlugs.has(p.slug) ? pair(jaPath, enPath) : undefined;
    urls.push({ loc: `${base}${jaPath}`, lastmod, alternates });
    if (enSlugs.has(p.slug)) urls.push({ loc: `${base}${enPath}`, lastmod, alternates });
  }

  for (const t of tags) urls.push({ loc: `${base}/tags/${encodeURI(t)}/` });
  for (const t of enTags) urls.push({ loc: `${base}/en/tags/${encodeURI(t)}/` });

  // 新着一覧のページング(2ページ目以降)。1ページ目はルート(/ , /en/)で既出。
  const PER_PAGE = 10;
  const jaPages = Math.ceil(posts.length / PER_PAGE);
  const enPages = Math.ceil(enPosts.filter((p) => jpSlugs.has(p.slug)).length / PER_PAGE);
  for (let p = 2; p <= jaPages; p++) urls.push({ loc: `${base}/page/${p}/` });
  for (let p = 2; p <= enPages; p++) urls.push({ loc: `${base}/en/page/${p}/` });

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
