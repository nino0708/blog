#!/usr/bin/env node
// 今日のX投稿用に「今日の建物クイズ」の文面を標準出力に印字する。
// astro:content は使わず、記事の frontmatter を直接読む(このスクリプトはビルドの外で動かすため)。
// 抽選ロジックは src/lib/quiz.ts / public/quiz.js と同じ(重複実装)。数値は記事の frontmatter からそのまま転記する。
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const siteRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const buildingsDir = path.join(siteRoot, 'src/content/buildings');

function scalarField(frontmatter, key) {
  const m = frontmatter.match(new RegExp(`^${key}:\\s*"?([^"\\n]+?)"?\\s*$`, 'm'));
  return m ? m[1].trim() : undefined;
}

function readBuilding(file) {
  const raw = readFileSync(path.join(buildingsDir, file), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const body = fm[1];
  const title = scalarField(body, 'title');
  const area = scalarField(body, 'area');
  const heightM = Number(scalarField(body, 'heightM'));
  const completedYear = Number(scalarField(body, 'completedYear'));
  const floorsAboveRaw = scalarField(body, 'floorsAbove');
  const floorsAbove = floorsAboveRaw !== undefined ? Number(floorsAboveRaw) : null;
  if (!title || !area || !Number.isFinite(heightM) || !Number.isFinite(completedYear)) return null;
  return { slug: file.replace(/\.md$/, ''), title, area, heightM, completedYear, floorsAbove };
}

function todayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function dayIndexFromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

const candidates = readdirSync(buildingsDir)
  .filter((f) => f.endsWith('.md'))
  .map(readBuilding)
  .filter(Boolean)
  .sort((a, b) => a.slug.localeCompare(b.slug));

if (!candidates.length) {
  console.error('クイズにできる記事が見つかりませんでした。');
  process.exit(1);
}

const dateArg = process.argv[2];
const dateKey = dateArg || todayKey(new Date());
const dayIndex = dayIndexFromDateKey(dateKey);
const b = candidates[((dayIndex % candidates.length) + candidates.length) % candidates.length];

const fields = b.floorsAbove !== null ? ['height', 'year', 'floors'] : ['height', 'year'];
const field = fields[((dayIndex % fields.length) + fields.length) % fields.length];

const QUESTION = {
  height: '高さは何mでしょう？',
  year: '竣工は何年でしょう？',
  floors: '地上は何階建てでしょう？',
};

const hints = [b.area];
if (field !== 'year') hints.push(`竣工${b.completedYear}年`);
if (field !== 'height') hints.push(`高さ${b.heightM}m`);
if (field !== 'floors' && b.floorsAbove !== null) hints.push(`地上${b.floorsAbove}階`);

const url = `https://builtjapan.com/buildings/${b.slug}/`;

const tweet = [
  '【今日の建物クイズ】',
  `${b.title}(${hints.join(' ・ ')})`,
  QUESTION[field],
  '',
  `答えはこの記事で → ${url}`,
  '',
  '#BuiltJapan #東京 #建築クイズ',
].join('\n');

console.log(tweet);
