// Wikimedia Commons から建物の画像(CCライセンス)を1枚取得する。
// 著作権配慮: 出典・作者・ライセンスを必ず一緒に持ち帰り、記事に明記する。
//
// 重要(誤情報対策): 建物名に合致しない画像・別の建物・「〜から撮影/view from」等の眺望、
// すでに他記事で使った画像は採用しない。確信が持てなければ null を返し「画像なし」で公開する。
// 画像の取り違えは事実誤認なので、ここを厳しめに倒す。

function stripHtml(s) {
  return (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// 眺望・別物を示す語。これらを含むファイルは（建物の肖像ではないので）除外する。
const REJECT_PATTERNS = [
  /view from/i, /seen from/i, /from the top/i, /cityscape/i, /skyline/i,
  /panoramio/i, /から撮影/, /より撮影/, /から望む/, /からの眺望/, /夜景/, /の眺め/,
];

// 建物名から「意味のあるトークン」を取り出す（英語名優先）。
function nameTokens(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[()（）,，.。/:：-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !['the', 'and'].includes(t));
}

function normalizeTitle(fileTitle) {
  return fileTitle.replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '').trim();
}

async function searchFiles(query) {
  const api = 'https://commons.wikimedia.org/w/api.php';
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrnamespace: '6', // File:
    gsrsearch: query,
    gsrlimit: '10',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime',
    iiurlwidth: '1200',
  });
  const res = await fetch(`${api}?${params}`, {
    headers: { 'User-Agent': 'TokyoTowersJournal/1.0 (hobby blog; contact itsuki9978miya@gmail.com)' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return [];
  // generator=search の並び順(index)を尊重する（辞書順で先頭を拾わない）。
  return Object.values(pages).sort((a, b) => (a.index ?? 999) - (b.index ?? 999));
}

// building: { title, title_en } または建物名の文字列(後方互換)。
// opts.usedTitles: すでに使用済みの正規化ファイルタイトルの Set（重複回避）。
export async function fetchCommonsImage(building, opts = {}) {
  const used = opts.usedTitles instanceof Set ? opts.usedTitles : new Set();
  const isStr = typeof building === 'string';
  const enName = isStr ? building : building.title_en;
  const jaName = isStr ? building : building.title;
  // 英語名はCommonsのファイル名(ローマ字/英語)と一致しやすいので優先して検索。
  const queries = [enName, jaName].filter(Boolean);
  // 名前トークンは英語名から作る（無ければ日本語名）。全トークンの一致を必須にする。
  const required = nameTokens(enName || jaName);

  for (const q of queries) {
    const pages = await searchFiles(q);
    for (const page of pages) {
      const ii = page.imageinfo?.[0];
      if (!ii) continue;
      if (ii.mime && !/^image\/(jpeg|png)$/.test(ii.mime)) continue;

      const title = page.title || '';
      const norm = normalizeTitle(title);
      if (used.has(norm.toLowerCase())) continue; // 既出画像は使わない
      if (REJECT_PATTERNS.some((re) => re.test(title))) continue; // 眺望・別物を除外

      // 建物名の意味トークンがすべてファイル名に含まれることを必須にする。
      const lowTitle = title.toLowerCase();
      if (required.length === 0) continue;
      const allPresent = required.every((t) => lowTitle.includes(t));
      if (!allPresent) continue;

      const meta = ii.extmetadata || {};
      return {
        url: ii.thumburl || ii.url,
        author: stripHtml(meta.Artist?.value) || '不明',
        license: stripHtml(meta.LicenseShortName?.value) || '',
        source: ii.descriptionurl || page.canonicalurl || '',
        fileTitle: norm,
      };
    }
  }
  return null; // 確信できる固有の画像が無ければ画像なし（誤画像より安全）
}
