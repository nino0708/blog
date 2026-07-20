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

// JPエリア名(area フィールド値)から楽天トラベル主要街区ページへのマッピング。
// 楽天の「/yado/tokyo/{slug}.html」は主要観光・ビジネス街区単位の静的ディレクトリ。
// 23区単位のURLは存在しないが、主要街区単位のページは存在しホテル一覧が常時表示される。
// 未マッピングエリアは東京23区一覧（常時2700件超・0件化しない）にフォールバック。
const AREA_RAKUTEN: Record<string, { slug: string; neighborhood: string; neighborhoodEn: string }> = {
  '豊島区': { slug: 'ikebukuro',  neighborhood: '池袋',         neighborhoodEn: 'Ikebukuro'            },
  '新宿区': { slug: 'shinjuku',   neighborhood: '新宿',         neighborhoodEn: 'Shinjuku'             },
  '渋谷区': { slug: 'shibuya',    neighborhood: '渋谷',         neighborhoodEn: 'Shibuya'              },
  '台東区': { slug: 'asakusa',    neighborhood: '浅草・上野',    neighborhoodEn: 'Asakusa / Ueno'      },
  '品川区': { slug: 'shinagawa',  neighborhood: '品川',         neighborhoodEn: 'Shinagawa'            },
  '墨田区': { slug: 'asakusa',    neighborhood: '浅草・錦糸町',  neighborhoodEn: 'Asakusa / Kinshicho'  },
};

const TOKYO_HOTELS_URL = 'https://travel.rakuten.co.jp/yado/tokyo/tokyo.html';

// 楽天トラベルのホテル一覧URL。エリアが既知なら街区ページへ、不明なら東京23区一覧へ。
export function rakutenTravelArea(area?: string): string {
  const info = area ? AREA_RAKUTEN[area] : null;
  const url = info
    ? `https://travel.rakuten.co.jp/yado/tokyo/${info.slug}.html`
    : TOKYO_HOTELS_URL;
  return wrapRakuten(url);
}

// CTA ラベル文字列。エリアが既知なら街区名を含め、不明なら「東京」表記にフォールバック。
export function rakutenTravelLabel(area: string | undefined, lang: 'ja' | 'en'): string {
  const info = area ? AREA_RAKUTEN[area] : null;
  if (!info) return lang === 'ja' ? '東京のホテルを探す' : 'Find hotels in Tokyo';
  return lang === 'ja'
    ? `${info.neighborhood}のホテルを探す`
    : `Find hotels near ${info.neighborhoodEn}`;
}

// Amazon 検索URL（アソシエイトタグ付与）
export function amazonSearch(keyword: string): string {
  const base = `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}`;
  return AMAZON_ASSOCIATE_TAG ? `${base}&tag=${AMAZON_ASSOCIATE_TAG}` : base;
}
