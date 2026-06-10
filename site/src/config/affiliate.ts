// アフィリエイト設定。
// 実IDは公開リポジトリに直書きせず、ビルド時に環境変数で注入する想定。
//   PUBLIC_RAKUTEN_AFFILIATE_ID  … 楽天アフィリエイトID（例 xxxxxxxx.xxxxxxxx.xxxxxxxx.xxxxxxxx）
//   PUBLIC_AMAZON_ASSOCIATE_TAG  … AmazonアソシエイトのトラッキングID（例 yourtag-22）
// 未設定でもリンクは「素のURL（成果は発生しない）」として動作する。

export const RAKUTEN_AFFILIATE_ID = import.meta.env.PUBLIC_RAKUTEN_AFFILIATE_ID ?? '';
export const AMAZON_ASSOCIATE_TAG = import.meta.env.PUBLIC_AMAZON_ASSOCIATE_TAG ?? '';

export const affiliateEnabled = Boolean(RAKUTEN_AFFILIATE_ID || AMAZON_ASSOCIATE_TAG);

// 楽天アフィリエイトのリンク転送フォーマットでラップする。
// ID未設定なら素のURLを返す。
export function wrapRakuten(targetUrl: string): string {
  if (!RAKUTEN_AFFILIATE_ID) return targetUrl;
  const enc = encodeURIComponent(targetUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${enc}&m=${enc}`;
}

// 楽天市場のキーワード検索URL
export function rakutenIchibaSearch(keyword: string): string {
  return wrapRakuten(`https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`);
}

// 楽天ブックスのキーワード検索URL
export function rakutenBooksSearch(keyword: string): string {
  return wrapRakuten(`https://books.rakuten.co.jp/search?sitem=${encodeURIComponent(keyword)}`);
}

// 東京23区名 → 楽天トラベルのエリアslug。該当ページ(/ds/yado/tokyo/<slug>)は実在し安定。
const WARD_SLUG: Record<string, string> = {
  '千代田区': 'chiyoda', '中央区': 'chuo', '港区': 'minato', '新宿区': 'shinjuku',
  '文京区': 'bunkyo', '台東区': 'taito', '墨田区': 'sumida', '江東区': 'koto',
  '品川区': 'shinagawa', '目黒区': 'meguro', '大田区': 'ota', '世田谷区': 'setagaya',
  '渋谷区': 'shibuya', '中野区': 'nakano', '杉並区': 'suginami', '豊島区': 'toshima',
  '北区': 'kita', '荒川区': 'arakawa', '板橋区': 'itabashi', '練馬区': 'nerima',
  '足立区': 'adachi', '葛飾区': 'katsushika', '江戸川区': 'edogawa',
};

// 楽天トラベルのエリア別宿泊一覧URL。区が判らなければ東京エリアにフォールバック。
// (旧 f_query 形式はリンク切れ(HTTP 400)だったため、実在するエリアパスに変更)
export function rakutenTravelArea(area: string): string {
  const slug = WARD_SLUG[(area ?? '').trim()];
  const base = slug
    ? `https://search.travel.rakuten.co.jp/ds/yado/tokyo/${slug}`
    : 'https://search.travel.rakuten.co.jp/ds/yado/tokyo';
  return wrapRakuten(base);
}

// Amazon 検索URL（アソシエイトタグ付与）
export function amazonSearch(keyword: string): string {
  const base = `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}`;
  return AMAZON_ASSOCIATE_TAG ? `${base}&tag=${AMAZON_ASSOCIATE_TAG}` : base;
}
