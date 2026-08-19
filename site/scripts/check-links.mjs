// ビルド済み dist/ の内部リンクが実ファイルに解決できるか検証する。
// 記事の内部リンクは人手（ルーティン）で書かれるため、綴り違い・存在しないパスが 404 として GSC に出る。
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const DIST = path.resolve(process.argv[2] ?? "dist");
const SITE_HOST = "builtjapan.com";

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

function resolves(urlPath) {
  const clean = decodeURIComponent(urlPath.split("#")[0].split("?")[0]);
  const rel = clean.replace(/^\//, "");
  const candidates = [
    path.join(DIST, rel),
    path.join(DIST, rel, "index.html"),
    path.join(DIST, rel + ".html"),
    path.join(DIST, rel.replace(/\/$/, "") + ".html"),
  ];
  return candidates.some((c) => existsSync(c));
}

if (!existsSync(DIST)) {
  console.error(`dist が見つからない: ${DIST}（先に npm run build）`);
  process.exit(2);
}

const files = await walk(DIST);
const broken = new Map(); // url -> Set(参照元)
let checked = 0;

for (const f of files) {
  const html = await readFile(f, "utf8");
  const from = "/" + path.relative(DIST, f).replace(/index\.html$/, "");
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    let u = m[1];
    if (u.startsWith(`https://${SITE_HOST}`)) u = u.slice(`https://${SITE_HOST}`.length) || "/";
    if (!u.startsWith("/")) continue; // 外部・アンカー・mailto は対象外
    checked++;
    if (resolves(u)) continue;
    if (!broken.has(u)) broken.set(u, new Set());
    broken.get(u).add(from);
  }
}

console.log(`HTML ${files.length}件 / 内部リンク ${checked}件を検査`);
if (broken.size === 0) {
  console.log("壊れた内部リンク: 0件");
  process.exit(0);
}
console.error(`\n壊れた内部リンク: ${broken.size}件`);
for (const [u, froms] of [...broken].sort()) {
  console.error(`  ${u}`);
  for (const f of [...froms].sort()) console.error(`      <- ${f}`);
}
process.exit(1);
