// Wikimedia Commons から建物の画像(CCライセンス)を1枚取得する。
// 著作権配慮: 出典・作者・ライセンスを必ず一緒に持ち帰り、記事に明記する。

function stripHtml(s) {
  return (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// query(建物名)で画像を検索し、{url, author, license, source} を返す。無ければ null。
export async function fetchCommonsImage(query) {
  const api = 'https://commons.wikimedia.org/w/api.php';
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrnamespace: '6', // File:
    gsrsearch: query,
    gsrlimit: '5',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime',
    iiurlwidth: '1200',
  });
  const res = await fetch(`${api}?${params}`, {
    headers: { 'User-Agent': 'TokyoTowersJournal/1.0 (hobby blog; contact itsuki9978miya@gmail.com)' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  // 画像(jpg/png)のみ。最初にヒットした有効なものを採用。
  for (const page of Object.values(pages)) {
    const ii = page.imageinfo?.[0];
    if (!ii) continue;
    if (ii.mime && !/^image\/(jpeg|png)$/.test(ii.mime)) continue;
    const meta = ii.extmetadata || {};
    return {
      url: ii.thumburl || ii.url,
      author: stripHtml(meta.Artist?.value) || '不明',
      license: stripHtml(meta.LicenseShortName?.value) || '',
      source: ii.descriptionurl || page.canonicalurl || '',
    };
  }
  return null;
}
