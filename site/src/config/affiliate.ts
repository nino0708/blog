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

// 楽天トラベルのエリア（キーワード）検索URL
export function rakutenTravelSearch(keyword: string): string {
  return wrapRakuten(`https://search.travel.rakuten.co.jp/ds/yado/?f_query=${encodeURIComponent(keyword)}`);
}

// Amazon 検索URL（アソシエイトタグ付与）
export function amazonSearch(keyword: string): string {
  const base = `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}`;
  return AMAZON_ASSOCIATE_TAG ? `${base}&tag=${AMAZON_ASSOCIATE_TAG}` : base;
}
