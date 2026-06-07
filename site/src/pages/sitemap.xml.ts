import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// 自前のsitemap生成。日本語(タグ)URLも encodeURI で安全に出力する。
export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://example.com')).toString().replace(/\/$/, '');
  const posts = await getCollection('buildings');
  const tags = [...new Set(posts.flatMap((p) => p.data.tags))];

  const urls: { loc: string; lastmod?: string }[] = [
    { loc: `${base}/` },
    { loc: `${base}/about/` },
    ...posts.map((p) => ({
      loc: `${base}/buildings/${encodeURI(p.slug)}/`,
      lastmod: p.data.publishedAt.toISOString().slice(0, 10),
    })),
    ...tags.map((t) => ({ loc: `${base}/tags/${encodeURI(t)}/` })),
  ];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`
      )
      .join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
