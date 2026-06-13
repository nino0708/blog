// 多言語(日本語/英語)のUI文言と、言語別のパス変換・事実フォーマットをまとめる。
// 記事の「数値の事実」は言語非依存なので、英語ページでも日本語seed由来の数値をそのまま使い、
// ラベル(用途/竣工/高さ…)だけをここで言語ごとに出し分ける。

export const languages = ['ja', 'en'] as const;
export type Lang = (typeof languages)[number];
export const defaultLang: Lang = 'ja';

export const ogLocale: Record<Lang, string> = { ja: 'ja_JP', en: 'en_US' };

type Dict = Record<string, string>;

const ja: Dict = {
  'site.name': 'Built Japan',
  'site.tagline': '趣味で運営する東京の高層建築情報ブログ',
  'site.description':
    '東京の大型オフィスビル・タワーマンションを巡る建築情報ブログ。竣工年・高さ・再開発の背景を公開情報をもとに記録します。',
  'lang.other': 'English',
  'nav.home': 'ビル・マンション',
  'nav.database': '図鑑',
  'nav.about': 'このブログについて',
  'type.office': 'オフィスビル',
  'type.residence': 'マンション',
  'type.tower': 'タワー・構造物',
  'type.office.short': 'オフィス',
  'type.residence.short': 'マンション',
  'type.tower.short': 'タワー',
  'db.title': '建物図鑑',
  'db.lead': '東京を中心とした高層建築を一棟ずつ集めた「引ける」データベース。名前・エリアで検索し、種別や高さで並べ替えできます。記事のある建物はクリックで詳細へ。',
  'db.search.placeholder': '建物名・エリアで検索',
  'db.filter.label': '種別で絞り込み',
  'db.filter.all': 'すべて',
  'db.sort.label': '並べ替え',
  'db.sort.height': '高さ順',
  'db.sort.year': '竣工年順',
  'db.sort.name': '名前順',
  'db.col.name': '建物名',
  'db.col.area': 'エリア',
  'db.col.type': '種別',
  'db.col.year': '竣工',
  'db.col.height': '高さ',
  'db.col.status': '記事',
  'db.readArticle': '記事を読む →',
  'db.stub': '準備中',
  'db.empty': '該当する建物が見つかりませんでした。',
  'badge.unverified': '未検証（事実確認中）',
  'badge.unverified.short': '未検証',
  'spec.use': '用途',
  'spec.area': 'エリア',
  'spec.completed': '竣工',
  'spec.floors': '階数',
  'spec.height': '高さ',
  'spec.totalArea': '延床面積',
  'spec.developer': '開発',
  'spec.architect': '設計',
  'breadcrumb.list': '記事一覧',
  'sources.title': '参考・出典',
  'photo.by': '写真',
  'home.title': '東京の空をつくる、巨大建築の記録。',
  'home.desc':
    '港区・千代田区・中央区を中心に、東京の大型オフィスビルとタワーマンションを一棟ずつ巡って紹介する趣味のブログです。竣工年・高さ・開発の背景を、公開情報をもとに記録しています。',
  'home.eyebrow': 'TOKYO HIGH-RISE ARCHITECTURE',
  'home.cta.database': '建物図鑑を見る',
  'home.cta.rankings': '高さランキング',
  'home.stat.buildings': '棟を収録',
  'home.stat.articles': '本の記事',
  'home.stat.bilingual': '日本語 / English',
  'home.section.latest': '新着の建物',
  'home.section.latest.desc': '最近とりあげた一棟。竣工年・高さ・開発の背景までまとめています。',
  'home.sort.label': '並べ替え',
  'home.sort.latest': '新着順',
  'home.sort.name': '名前順',
  'home.sort.oldest': '竣工が古い順',
  'home.sort.newest': '竣工が新しい順',
  'home.sort.height': '高い順',
  'about.title': 'このブログについて',
  'footer.disclaimer':
    '掲載情報は公開情報をもとにした個人の記録であり、正確性・最新性を保証するものではありません。物件・居住者のプライバシーに配慮し、内部情報や個人を特定する情報は扱いません。',
  'affiliate.title': '関連リンク',
  'affiliate.aria': '関連リンク（広告）',
  'affiliate.disclosure':
    '※ 以下のリンクには広告（アフィリエイト）が含まれます。リンク先での購入・予約により当サイトが収益を得る場合があります。',
  'affiliate.hotel': '周辺のホテルを探す',
  'affiliate.books': '東京の建築・再開発の関連書籍',
  'affiliate.search': 'を調べる',
  'related.title': '関連記事',
  'map.title': '地図でみる',
  'map.open': 'Googleマップで開く',
  'a11y.skip': '本文へスキップ',
  'footer.explore': 'コンテンツ',
  'footer.categories': 'カテゴリ',
  'footer.follow': 'フォロー',
  'footer.x': 'X（旧Twitter）',
};

const en: Dict = {
  'site.name': 'Built Japan',
  'site.tagline': "A hobby blog on Tokyo's high-rise architecture",
  'site.description':
    "A blog exploring Tokyo's major office towers and high-rise residences — recording completion years, heights and the story behind each redevelopment, based on public information.",
  'lang.other': '日本語',
  'nav.home': 'Buildings',
  'nav.database': 'Database',
  'nav.about': 'About',
  'type.office': 'Office tower',
  'type.residence': 'Residential tower',
  'type.tower': 'Tower / structure',
  'type.office.short': 'Office',
  'type.residence.short': 'Residence',
  'type.tower.short': 'Tower',
  'db.title': 'Building Database',
  'db.lead': 'A searchable encyclopedia of Tokyo’s high-rise architecture, building by building. Search by name or area, sort by type or height. Buildings with an article link to its detail page.',
  'db.search.placeholder': 'Search by name or area',
  'db.filter.label': 'Filter by type',
  'db.filter.all': 'All',
  'db.sort.label': 'Sort',
  'db.sort.height': 'By height',
  'db.sort.year': 'By year',
  'db.sort.name': 'By name',
  'db.col.name': 'Building',
  'db.col.area': 'Area',
  'db.col.type': 'Type',
  'db.col.year': 'Completed',
  'db.col.height': 'Height',
  'db.col.status': 'Article',
  'db.readArticle': 'Read →',
  'db.stub': 'Coming soon',
  'db.empty': 'No buildings match your search.',
  'badge.unverified': 'Unverified (fact-checking)',
  'badge.unverified.short': 'Unverified',
  'spec.use': 'Use',
  'spec.area': 'Area',
  'spec.completed': 'Completed',
  'spec.floors': 'Floors',
  'spec.height': 'Height',
  'spec.totalArea': 'Total floor area',
  'spec.developer': 'Developer',
  'spec.architect': 'Architect',
  'breadcrumb.list': 'Articles',
  'sources.title': 'References',
  'photo.by': 'Photo',
  'home.title': 'A record of the giant buildings shaping Tokyo’s skyline.',
  'home.desc':
    "A hobby blog touring Tokyo's major office towers and high-rise residences one by one — mostly in Minato, Chiyoda and Chuo wards. Completion years, heights and the background of each development, recorded from public sources.",
  'home.eyebrow': 'TOKYO HIGH-RISE ARCHITECTURE',
  'home.cta.database': 'Browse the database',
  'home.cta.rankings': 'Height rankings',
  'home.stat.buildings': 'buildings',
  'home.stat.articles': 'articles',
  'home.stat.bilingual': 'Japanese / English',
  'home.section.latest': 'Latest buildings',
  'home.section.latest.desc': 'The buildings we covered most recently — completion year, height and the story behind each development.',
  'home.sort.label': 'Sort',
  'home.sort.latest': 'Newest posts',
  'home.sort.name': 'By name',
  'home.sort.oldest': 'Oldest built',
  'home.sort.newest': 'Newest built',
  'home.sort.height': 'By height',
  'about.title': 'About this blog',
  'footer.disclaimer':
    "This site is a personal record based on public information; accuracy and timeliness are not guaranteed. Out of respect for residents' privacy, no internal or personally identifying information is published.",
  'affiliate.title': 'Related links',
  'affiliate.aria': 'Related links (advertising)',
  'affiliate.disclosure':
    '* The links below include advertising (affiliate links). We may earn a commission from purchases or bookings made through them.',
  'affiliate.hotel': 'Find hotels nearby',
  'affiliate.books': 'Books on Tokyo architecture & redevelopment',
  'affiliate.search': '— search',
  'related.title': 'Related articles',
  'map.title': 'Map',
  'map.open': 'Open in Google Maps',
  'a11y.skip': 'Skip to content',
  'footer.explore': 'Explore',
  'footer.categories': 'Categories',
  'footer.follow': 'Follow',
  'footer.x': 'X (Twitter)',
};

const dicts: Record<Lang, Dict> = { ja, en };

/** 指定言語の文言取得関数を返す。未定義キーは日本語にフォールバック。 */
export function useT(lang: Lang) {
  return (key: string): string => dicts[lang][key] ?? dicts[defaultLang][key] ?? key;
}

/** 言語に応じてパスを付け替える。ja はルート、en は /en 配下。先頭は必ず "/"。 */
export function localizePath(lang: Lang, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return lang === 'ja' ? p : `/en${p === '/' ? '/' : p}`;
}

/** /en/... のパスから言語プレフィックスを外して日本語側パスに戻す。 */
export function stripLangPrefix(path: string): string {
  if (path === '/en' || path === '/en/') return '/';
  return path.startsWith('/en/') ? path.slice(3) : path;
}

export function buildingTypeLabel(lang: Lang, type: 'office' | 'residence', short = false): string {
  const t = useT(lang);
  return t(`type.${type}${short ? '.short' : ''}`);
}

/** 建物の数値事実(言語非依存)を、言語ごとのラベル付き [ラベル, 値] 配列に整形する。 */
export interface BuildingFacts {
  buildingType: 'office' | 'residence';
  area: string;
  completedYear?: number;
  floorsAbove?: number;
  floorsBelow?: number;
  heightM?: number;
  totalFloorAreaM2?: number;
  developer?: string;
  architect?: string;
}

export function buildSpecs(lang: Lang, d: BuildingFacts): [string, string][] {
  const t = useT(lang);
  const num = (n: number) => n.toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US');

  const completed = d.completedYear
    ? lang === 'ja'
      ? `${d.completedYear}年`
      : `${d.completedYear}`
    : null;

  const floors = d.floorsAbove
    ? lang === 'ja'
      ? `地上${d.floorsAbove}階${d.floorsBelow ? `／地下${d.floorsBelow}階` : ''}`
      : `${d.floorsAbove} above ground${d.floorsBelow ? `, ${d.floorsBelow} below` : ''}`
    : null;

  const height = d.heightM ? (lang === 'ja' ? `${d.heightM}m` : `${d.heightM} m`) : null;

  const totalArea = d.totalFloorAreaM2
    ? lang === 'ja'
      ? `約${num(d.totalFloorAreaM2)}㎡`
      : `approx. ${num(d.totalFloorAreaM2)} m²`
    : null;

  const rows: [string, string | null][] = [
    [t('spec.use'), buildingTypeLabel(lang, d.buildingType)],
    [t('spec.area'), d.area],
    [t('spec.completed'), completed],
    [t('spec.floors'), floors],
    [t('spec.height'), height],
    [t('spec.totalArea'), totalArea],
    [t('spec.developer'), d.developer ?? null],
    [t('spec.architect'), d.architect ?? null],
  ];
  return rows.filter((r): r is [string, string] => Boolean(r[1]));
}

/** カード等で使う短いメタ表記（エリア・竣工年・高さ）。 */
export function buildCardMeta(lang: Lang, d: { area: string; completedYear?: number; heightM?: number }): string {
  const bits = [
    d.area,
    d.completedYear ? (lang === 'ja' ? `${d.completedYear}年竣工` : `Built ${d.completedYear}`) : null,
    d.heightM ? (lang === 'ja' ? `高さ${d.heightM}m` : `${d.heightM} m`) : null,
  ].filter(Boolean);
  return bits.join(lang === 'ja' ? ' ・ ' : ' · ');
}
