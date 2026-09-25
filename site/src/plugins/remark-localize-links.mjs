// 英語記事(src/content/*-en/)の本文にある内部リンクを英語ページへ張り替える。
//
// 背景: 英語記事は日本語記事を元に書かれるため、本文の「Related: [..](/buildings/x/)」が
// 日本語ページを指したままになっていた(英語の読者が突然日本語ページへ飛ばされる)。
// 対策: 英語版が存在するページなら /en/ 付きへ張り替える。英語版が無いページは日本語のまま残す。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const contentDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../content');

/** 英語版があるパス(先頭・末尾スラッシュつき)。記事は *-en コレクションのファイルから、固定ページは一覧で持つ。 */
function englishPaths() {
  const set = new Set(['/', '/buildings/', '/bridges/', '/expressways/', '/railways/', '/tourism/', '/database/', '/near/', '/stamps/', '/about/', '/search/', '/rankings/']);
  for (const dir of fs.readdirSync(contentDir)) {
    if (!dir.endsWith('-en')) continue;
    const base = dir.slice(0, -3); // buildings-en → buildings
    for (const f of fs.readdirSync(path.join(contentDir, dir))) {
      if (f.endsWith('.md') || f.endsWith('.mdx')) set.add(`/${base}/${f.replace(/\.mdx?$/, '')}/`);
    }
  }
  return set;
}

let cached;

function walk(node, visit) {
  visit(node);
  if (node.children) for (const c of node.children) walk(c, visit);
}

export default function remarkLocalizeLinks() {
  return (tree, file) => {
    const p = (file.path ?? file.history?.[0] ?? '').replaceAll('\\', '/');
    if (!/\/content\/[^/]+-en\//.test(p)) return;
    cached ??= englishPaths();
    walk(tree, (node) => {
      if (node.type !== 'link' || typeof node.url !== 'string') return;
      const m = node.url.match(/^(\/[^?#]*)(.*)$/);
      if (!m || m[1].startsWith('/en/') || m[1] === '/en') return;
      const pathname = m[1].endsWith('/') ? m[1] : `${m[1]}/`;
      if (cached.has(pathname)) node.url = `/en${pathname}${m[2]}`;
    });
  };
}
