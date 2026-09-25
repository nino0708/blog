// サイト内検索のインデックス(/search-index.json と /en/search-index.json)。中身は src/lib/search.ts。
import type { APIRoute } from 'astro';
import { langPaths, type Lang } from '../../i18n/ui';
import { buildSearchIndex } from '../../lib/search';

export function getStaticPaths() {
  return langPaths();
}

export const GET: APIRoute = async ({ props }) => {
  const index = await buildSearchIndex((props as { lang: Lang }).lang);
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
