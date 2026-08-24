// 記事の area 文字列から「都道府県 → 区・市」の2段エリアを割り出す。
// 一覧ページのエリア絞り込みが唯一の出典としてここを参照する。
//
// 記事の area は「港区」「大阪市阿倍野区」のような地名だけでなく、
// 「東京〜新大阪」「渋谷〜池袋〜和光市」のような区間表記もある。
// 区間は複数のエリアにまたがるので、当てはまるエリア全部に属させる（1記事が複数チップに出る）。
// 判定できないものは推測せず「その他」に入れ、ビルド時に警告を出す。
import type { Lang } from '../i18n/ui';

/** どのエリアにも寄せられなかった記事の行き先 */
export const OTHER_KEY = 'その他';

/** 都道府県キー(例: '東京都')と、市区キー(例: '東京都/港区')の両方をこの形の文字列で扱う */
export type AreaKey = string;

export const cityKey = (pref: string, city: string): AreaKey => `${pref}/${city}`;

const PREFS = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

// 政令指定都市。エリアは2段(都道府県→市区)しか持たないので、
// 「横浜市西区」も「横浜市」の1チップにまとめる（区ごとに散らすと1〜2件のチップが並んで使えない）。
const DESIGNATED: Record<string, string> = {
  '札幌市': '北海道', '仙台市': '宮城県', 'さいたま市': '埼玉県', '千葉市': '千葉県',
  '横浜市': '神奈川県', '川崎市': '神奈川県', '相模原市': '神奈川県', '新潟市': '新潟県',
  '静岡市': '静岡県', '浜松市': '静岡県', '名古屋市': '愛知県', '京都市': '京都府',
  '大阪市': '大阪府', '堺市': '大阪府', '神戸市': '兵庫県', '岡山市': '岡山県',
  '広島市': '広島県', '北九州市': '福岡県', '福岡市': '福岡県', '熊本市': '熊本県',
};

/** 市区町村 → 都道府県。東京23区と、記事に出てくる市を持つ。 */
const CITIES: Record<string, string> = {
  // 東京23区
  '千代田区': '東京都', '中央区': '東京都', '港区': '東京都', '新宿区': '東京都',
  '文京区': '東京都', '台東区': '東京都', '墨田区': '東京都', '江東区': '東京都',
  '品川区': '東京都', '目黒区': '東京都', '大田区': '東京都', '世田谷区': '東京都',
  '渋谷区': '東京都', '中野区': '東京都', '杉並区': '東京都', '豊島区': '東京都',
  '北区': '東京都', '荒川区': '東京都', '板橋区': '東京都', '練馬区': '東京都',
  '足立区': '東京都', '葛飾区': '東京都', '江戸川区': '東京都',
  // 東京都下
  '八王子市': '東京都', '立川市': '東京都', '武蔵野市': '東京都', '三鷹市': '東京都',
  '府中市': '東京都', '調布市': '東京都', '町田市': '東京都', '西東京市': '東京都',
  '多摩市': '東京都',
  // 関東ほか
  '和光市': '埼玉県', '川口市': '埼玉県', '所沢市': '埼玉県',
  '成田市': '千葉県', '市川市': '千葉県', '船橋市': '千葉県', '木更津市': '千葉県', '浦安市': '千葉県',
  'つくば市': '茨城県',
  '藤沢市': '神奈川県', '鎌倉市': '神奈川県',
  // 関西・その他
  '泉佐野市': '大阪府', '東大阪市': '大阪府', '吹田市': '大阪府',
  '淡路市': '兵庫県', '西宮市': '兵庫県', '尼崎市': '兵庫県',
  '倉敷市': '岡山県', '坂出市': '香川県', '金沢市': '石川県', '敦賀市': '福井県',
};

/** 区間表記に出てくる駅名・地名。「渋谷〜池袋」のような表記を区まで寄せるために持つ。 */
const ALIASES: Record<string, [string, string?]> = {
  '渋谷': ['東京都', '渋谷区'],
  '池袋': ['東京都', '豊島区'],
  '新宿': ['東京都', '新宿区'],
  '秋葉原': ['東京都', '千代田区'],
  '丸の内': ['東京都', '千代田区'],
  '大手町': ['東京都', '千代田区'],
  '日暮里': ['東京都', '荒川区'],
  '上野': ['東京都', '台東区'],
  '浅草': ['東京都', '台東区'],
  '品川': ['東京都', '港区'],
  '新橋': ['東京都', '港区'],
  '浜松町': ['東京都', '港区'],
  '芝浦ふ頭': ['東京都', '港区'],
  '台場': ['東京都', '港区'],
  '豊洲': ['東京都', '江東区'],
  '新木場': ['東京都', '江東区'],
  '若洲': ['東京都', '江東区'],
  '中央防波堤': ['東京都', '江東区'],
  '有明': ['東京都', '江東区'],
  '大崎': ['東京都', '品川区'],
  '荻窪': ['東京都', '杉並区'],
  '見沼代親水公園': ['東京都', '足立区'],
  '羽田空港': ['東京都', '大田区'],
  '高尾': ['東京都', '八王子市'],
  '成田空港': ['千葉県', '成田市'],
  'つくば': ['茨城県', 'つくば市'],
  '新大阪': ['大阪府', '大阪市'],
  '名古屋': ['愛知県', '名古屋市'],
  '横浜': ['神奈川県', '横浜市'],
  '川崎': ['神奈川県', '川崎市'],
  '神戸': ['兵庫県', '神戸市'],
  '金沢': ['石川県', '金沢市'],
  '敦賀': ['福井県', '敦賀市'],
  '都心': ['東京都', undefined],
  '首都圏': ['東京都', undefined],
};

/** 略称(「東京」「神奈川」)。正式名を先に潰してから当てるので「東京都」の中の「京都」を拾わない。 */
const PREF_SHORT: Record<string, string> = Object.fromEntries(
  PREFS.filter((p) => p !== '北海道').map((p) => [p.replace(/[都府県]$/, ''), p])
);

// 伏せ字。地名に現れない文字なら何でもよい
const MASK = '\u0000';
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const byLengthDesc = (a: string, b: string) => b.length - a.length;

/**
 * エリア文字列から属するエリアキーを返す（都道府県キーと市区キーの両方を含む）。
 * 当たった部分は伏せ字にしてから次の規則に進むので、「大阪市阿倍野区」を「大阪」で二重に拾わない。
 */
export function resolveAreas(text: string): AreaKey[] {
  if (!text) return [];
  const found = new Set<AreaKey>();
  const prefs = new Set<string>();
  let rest = text;

  const take = (pref: string, city?: string) => {
    found.add(pref);
    prefs.add(pref);
    if (city) found.add(cityKey(pref, city));
  };

  // 政令指定都市（続く区名も一緒に伏せて、区だけが別のエリアとして拾われないようにする）
  for (const name of Object.keys(DESIGNATED).sort(byLengthDesc)) {
    const re = new RegExp(escapeRe(name) + '[\\u4e00-\\u9fff\\u3040-\\u30ff]{1,4}区|' + escapeRe(name), 'g');
    if (!re.test(rest)) continue;
    rest = rest.replace(new RegExp(re.source, 'g'), MASK);
    take(DESIGNATED[name], name);
  }

  // 市区町村テーブル（「品川区」を先に潰してから別名の「品川」を当てる）
  for (const name of Object.keys(CITIES).sort(byLengthDesc)) {
    if (!rest.includes(name)) continue;
    rest = rest.split(name).join(MASK);
    take(CITIES[name], name);
  }

  // 駅名・地名の別名
  for (const name of Object.keys(ALIASES).sort(byLengthDesc)) {
    if (!rest.includes(name)) continue;
    rest = rest.split(name).join(MASK);
    const [pref, city] = ALIASES[name];
    take(pref, city);
  }

  // 都道府県（正式名 → 略称）
  for (const p of [...PREFS].sort(byLengthDesc)) {
    if (!rest.includes(p)) continue;
    rest = rest.split(p).join(MASK);
    take(p);
  }
  for (const short of Object.keys(PREF_SHORT).sort(byLengthDesc)) {
    if (!rest.includes(short)) continue;
    rest = rest.split(short).join(MASK);
    take(PREF_SHORT[short]);
  }

  // テーブルに無い市区町村。県が1つに定まっているときだけ、その県の市区として拾う。
  if (prefs.size === 1) {
    const pref = [...prefs][0];
    const m = rest.match(/[一-鿿぀-ヿ]{1,5}[市区町村]/g);
    for (const name of m ?? []) take(pref, name);
  }

  return [...found];
}

/** 記事1本分のエリアキー。座標から逆ジオコーディング済みの市区(図鑑レジストリ)があればそれを優先する。 */
export function areasFor(area?: string, geo?: { pref?: string; city?: string }): AreaKey[] {
  const keys = new Set(resolveAreas(area ?? ''));
  if (geo?.pref && geo.pref !== '?') {
    // レジストリの市区は「横浜市西区」のような表記なので、記事の area と同じ規則を通してから足す。
    const city = geo.city && geo.city !== '?' ? geo.city : '';
    for (const k of resolveAreas(`${geo.pref}${city}`)) keys.add(k);
  }
  if (!keys.size) {
    // 判定できないものは推測せず「その他」へ。新記事で漏れたらビルドログで気づけるようにする。
    console.warn(`[area] エリアを判定できませんでした: "${area ?? ''}"`);
    return [OTHER_KEY];
  }
  return [...keys];
}

// ---- 表示ラベル ----

const PREF_EN: Record<string, string> = {
  '北海道': 'Hokkaido', '青森県': 'Aomori', '岩手県': 'Iwate', '宮城県': 'Miyagi',
  '秋田県': 'Akita', '山形県': 'Yamagata', '福島県': 'Fukushima', '茨城県': 'Ibaraki',
  '栃木県': 'Tochigi', '群馬県': 'Gunma', '埼玉県': 'Saitama', '千葉県': 'Chiba',
  '東京都': 'Tokyo', '神奈川県': 'Kanagawa', '新潟県': 'Niigata', '富山県': 'Toyama',
  '石川県': 'Ishikawa', '福井県': 'Fukui', '山梨県': 'Yamanashi', '長野県': 'Nagano',
  '岐阜県': 'Gifu', '静岡県': 'Shizuoka', '愛知県': 'Aichi', '三重県': 'Mie',
  '滋賀県': 'Shiga', '京都府': 'Kyoto', '大阪府': 'Osaka', '兵庫県': 'Hyogo',
  '奈良県': 'Nara', '和歌山県': 'Wakayama', '鳥取県': 'Tottori', '島根県': 'Shimane',
  '岡山県': 'Okayama', '広島県': 'Hiroshima', '山口県': 'Yamaguchi', '徳島県': 'Tokushima',
  '香川県': 'Kagawa', '愛媛県': 'Ehime', '高知県': 'Kochi', '福岡県': 'Fukuoka',
  '佐賀県': 'Saga', '長崎県': 'Nagasaki', '熊本県': 'Kumamoto', '大分県': 'Oita',
  '宮崎県': 'Miyazaki', '鹿児島県': 'Kagoshima', '沖縄県': 'Okinawa',
  [OTHER_KEY]: 'Other',
};

/** 英語版の区名。buildings-en の area 表記(「Minato City」)に合わせる。 */
const CITY_EN: Record<string, string> = {
  '千代田区': 'Chiyoda City', '中央区': 'Chuo City', '港区': 'Minato City',
  '新宿区': 'Shinjuku City', '文京区': 'Bunkyo City', '台東区': 'Taito City',
  '墨田区': 'Sumida City', '江東区': 'Koto City', '品川区': 'Shinagawa City',
  '目黒区': 'Meguro City', '大田区': 'Ota City', '世田谷区': 'Setagaya City',
  '渋谷区': 'Shibuya City', '中野区': 'Nakano City', '杉並区': 'Suginami City',
  '豊島区': 'Toshima City', '北区': 'Kita City', '荒川区': 'Arakawa City',
  '板橋区': 'Itabashi City', '練馬区': 'Nerima City', '足立区': 'Adachi City',
  '葛飾区': 'Katsushika City', '江戸川区': 'Edogawa City',
  '八王子市': 'Hachioji', '横浜市': 'Yokohama', '川崎市': 'Kawasaki',
  '大阪市': 'Osaka City', '名古屋市': 'Nagoya', '神戸市': 'Kobe', '成田市': 'Narita',
  'つくば市': 'Tsukuba', '金沢市': 'Kanazawa', '敦賀市': 'Tsuruga',
};

/** チップに出す表示名。英語で名前を持たないエリアは日本語のまま出す（作り話をしない）。 */
export function areaLabel(key: AreaKey, lang: Lang): string {
  const [pref, city] = key.split('/');
  if (!city) return lang === 'en' ? (PREF_EN[pref] ?? pref) : pref;
  if (lang !== 'en') return city;
  const known = CITY_EN[city];
  if (known) return known;
  // 「横浜市西区」のように政令市＋区で書かれたものは、市の英語名＋区名で崩さずに出す。
  for (const [ja, en] of Object.entries(CITY_EN)) {
    if (city.startsWith(ja) && city !== ja) return `${en} ${city.slice(ja.length)}`;
  }
  return city;
}

// ---- チップ用の集計 ----

export interface AreaFacet {
  key: AreaKey;
  label: string;
  count: number;
}

export interface PrefFacet extends AreaFacet {
  cities: AreaFacet[];
}

/**
 * 記事ごとのエリアキーから、都道府県チップ(＋その中の市区チップ)を件数付きで組み立てる。
 * 件数の多い順に並べ、0件のチップは作らない。
 */
export function buildAreaFacets(itemAreas: AreaKey[][], lang: Lang): PrefFacet[] {
  const prefCount = new Map<string, number>();
  const cityCount = new Map<string, number>();

  for (const keys of itemAreas) {
    for (const key of new Set(keys)) {
      const counter = key.includes('/') ? cityCount : prefCount;
      counter.set(key, (counter.get(key) ?? 0) + 1);
    }
  }

  const desc = (a: AreaFacet, b: AreaFacet) => b.count - a.count || a.key.localeCompare(b.key);

  return [...prefCount.entries()]
    .map(([key, count]) => ({
      key,
      label: areaLabel(key, lang),
      count,
      cities: [...cityCount.entries()]
        .filter(([ck]) => ck.startsWith(`${key}/`))
        .map(([ck, cc]) => ({ key: ck, label: areaLabel(ck, lang), count: cc }))
        .sort(desc),
    }))
    .sort((a, b) => (a.key === OTHER_KEY ? 1 : b.key === OTHER_KEY ? -1 : 0) || desc(a, b));
}
