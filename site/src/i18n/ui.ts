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
  'nav.latest': '新着',
  'nav.home': 'ビル・マンション',
  'nav.database': '図鑑',
  'nav.about': 'このブログについて',
  'breadcrumb.home': 'ホーム',
  'buildings.lead': '東京の大型オフィスビルとタワーマンションの記事をまとめた一覧です。新着順に並んでいます。',
  'type.office': 'オフィスビル',
  'type.residence': 'マンション',
  'type.bridge': '橋',
  'type.tower': 'タワー・構造物',
  'type.office.short': 'オフィス',
  'type.residence.short': 'マンション',
  'type.bridge.short': '橋',
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
  'db.col.city': '市区',
  'db.filter.cityAll': 'すべての市区',
  'nav.near': '建物マップ',
  'nearby.title': 'この建物の近くにある建物',
  'nearby.lead': '直線距離が近い順。そのまま次の一棟へ歩けます。',
  'nearby.walkAbout': '徒歩約',
  'nearby.min': '分',
  'nearby.stub': '準備中',
  'nearby.more': '地図でこの周辺を見る →',
  'near.title': '建物マップ',
  'near.lead': '収録している建物をすべて地図に出しています。住所や建物名を入れると、そこを起点に近い順へ並べ替えられます。',
  'near.placeholder': '住所・駅名・建物名（例: 東京駅 / 虎ノ門ヒルズ / 東京都港区六本木6-10-1）',
  'near.search': 'さがす',
  'near.useGeo': '現在地から',
  'near.radius': '範囲',
  'near.radius.all': '制限なし',
  'near.origin': '起点',
  'near.result': '件見つかりました',
  'near.empty': 'この範囲には収録済みの建物がありませんでした。範囲を広げてみてください。',
  'near.searching': 'さがしています…',
  'near.notFound': '場所を特定できませんでした。駅名（例: 東京駅）、収録済みの建物名、または都道府県から始まる住所で入れてみてください。',
  'near.allShown': '収録している{n}棟をすべて表示しています。地図のピンをタップすると記事に飛べます。',
  'near.geoDenied': '現在地を取得できませんでした。ブラウザの位置情報の許可を確認してください。',
  'near.geoUnsupported': 'このブラウザは現在地の取得に対応していません。',
  'near.hintTitle': '使い方',
  'near.hint': '最初は収録している建物をすべて表示します。入力欄は収録済みの建物名のほか、駅名・地名・住所に対応しています（国土地理院の住所検索を利用）。住所は都道府県から入れると確実です。現在地ボタンを押すと、いまいる場所の周りに絞り込めます。',
  'near.mapAttribution': '地図: 国土地理院 淡色地図',
  'near.walkTime': '徒歩の時間は分速80mで概算したものです。直線距離をもとにしているため、実際の経路とは異なります。',
  'near.openInMaps': '経路を調べる',
  'nav.stamps': 'スタンプ帳',
  'stamp.col': 'スタンプ',
  'stamp.push': 'スタンプを押す',
  'stamp.pushed': 'スタンプ済み',
  'stamp.push.short': '押す',
  'stamp.pushed.short': '済',
  'stamp.article.title': 'この建物、行きましたか？',
  'stamp.article.hint': '自己申告制のスタンプラリーです。記録はこの端末のブラウザにだけ保存され、サーバーには送信されません。',
  'stamp.visitedOn': '訪問日: ',
  'stamp.book.title': 'スタンプ帳',
  'stamp.book.lead': '実際に行った建物にスタンプを押して、東京の高層建築をどれだけ回れているかを記録できます。自己申告制・ログイン不要。記録はこの端末にだけ残ります。',
  'stamp.rate': '踏破率',
  'stamp.collected': '集めたスタンプ',
  'stamp.unit': '棟',
  'stamp.remaining': '残り',
  'stamp.filter.visited': '訪問済みのみ',
  'stamp.empty': 'まだスタンプがありません。建物図鑑や記事ページから「スタンプを押す」で記録を始めましょう。',
  'stamp.list.title': '押したスタンプ',
  'stamp.byArea': 'エリア別',
  'stamp.byType': '種別別',
  'stamp.goDatabase': '建物図鑑からまとめて押す →',
  'stamp.goBook': 'スタンプ帳を見る →',
  'stamp.share': 'Xでシェア',
  'stamp.backup.title': '記録の書き出し・読み込み',
  'stamp.backup.desc': '記録はこの端末のブラウザにだけ保存されます。機種変更やブラウザを変えるときは、コードを書き出して新しい端末で読み込んでください。',
  'stamp.backup.copy': 'コードをコピー',
  'stamp.backup.copied': 'コピーしました',
  'stamp.backup.placeholder': 'コードを貼り付け',
  'stamp.backup.import': '読み込む',
  'stamp.backup.imported': '件のスタンプを追加しました',
  'stamp.backup.failed': 'コードを読み取れませんでした。',
  'stamp.reset': 'すべての記録を消す',
  'stamp.reset.confirm': 'この端末のスタンプ記録をすべて消します。よろしいですか？',
  'stamp.note.label': '備考（この日のメモ）',
  'stamp.note.placeholder': '誰と行った・どこから眺めた・気づいたこと など',
  'stamp.note.left': '文字まで',
  'stamp.photo.label': '現地の写真',
  'stamp.photo.add': '写真を追加',
  'stamp.photo.remove': 'この写真を削除',
  'stamp.photo.saving': '保存しています…',
  'stamp.photo.hint': '備考と写真はこの端末の中だけに保存されます（どこにもアップロードされません）。写真は長辺1280pxに縮小して保存します。',
  'stamp.edit': 'メモ・写真',
  'stamp.editor.title': 'メモと写真',
  'stamp.close': '閉じる',
  'stamp.badge.note': 'メモ',
  'stamp.backup.file': '写真ごと書き出す',
  'stamp.backup.fileImport': 'ファイルから読み込む',
  'stamp.backup.fileNote': '※ コピー用コードには写真が入りません（容量が大きいため）。写真も移すときは「写真ごと書き出す」でファイルを保存し、新しい端末で読み込んでください。',
  'stamp.backup.fileImported': '件を追加しました（写真 {p} 枚）',
  'stamp.rank.none': 'まだ0棟',
  'stamp.rank.novice': 'ビル巡り見習い',
  'stamp.rank.explorer': '街歩き人',
  'stamp.rank.hunter': 'タワーハンター',
  'stamp.rank.master': '高層マスター',
  'stamp.rank.legend': '踏破レジェンド',
  'stamp.rank.complete': '完全踏破',
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
  'home.hero.credit': '写真',
  'home.hero.credit.suffix': '（パブリックドメイン）',
  'home.cta.database': '建物図鑑を見る',
  'home.cta.rankings': '高さランキング',
  'home.stat.buildings': '棟を収録',
  'home.stat.articles': '本の記事',
  'home.stat.bilingual': '日本語 / English',
  'home.section.feed': '新着記事',
  'home.section.feed.desc': 'ビル・マンションも高速道路も鉄道も、カテゴリを問わず新しい順に10本。',
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
  'nav.latest': 'Latest',
  'nav.home': 'Buildings',
  'nav.database': 'Database',
  'nav.about': 'About',
  'breadcrumb.home': 'Home',
  'buildings.lead': 'Every article on Tokyo’s office towers and high-rise residences, newest first.',
  'type.office': 'Office tower',
  'type.residence': 'Residential tower',
  'type.bridge': 'Bridge',
  'type.tower': 'Tower / structure',
  'type.office.short': 'Office',
  'type.residence.short': 'Residence',
  'type.bridge.short': 'Bridge',
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
  'db.col.city': 'Ward / City',
  'db.filter.cityAll': 'All wards',
  'nav.near': 'Map',
  'nearby.title': 'Buildings near this one',
  'nearby.lead': 'Closest first, as the crow flies — walk straight on to the next tower.',
  'nearby.walkAbout': 'about ',
  'nearby.min': ' min walk',
  'nearby.stub': 'Coming soon',
  'nearby.more': 'See this area on the map →',
  'near.title': 'Building map',
  'near.lead': 'Every building we cover is on the map. Enter an address or a building name to re-sort them by distance from that point.',
  'near.placeholder': 'Station, building or address (Japanese input works best)',
  'near.search': 'Search',
  'near.useGeo': 'Use my location',
  'near.radius': 'Radius',
  'near.radius.all': 'No limit',
  'near.origin': 'From',
  'near.result': 'found',
  'near.empty': 'No buildings on record within this radius. Try widening it.',
  'near.searching': 'Searching…',
  'near.notFound': 'Could not pin down that place. Try a station name, the name of a building we cover, or a Japanese address starting with the prefecture.',
  'near.allShown': 'Showing all {n} buildings we cover. Tap a pin to open its article.',
  'near.geoDenied': 'Could not get your location. Check your browser’s location permission.',
  'near.geoUnsupported': 'This browser does not support location lookup.',
  'near.hintTitle': 'How to use',
  'near.hint': 'The map starts with every building we cover. The search box takes building names, station and place names, and Japanese addresses (via the Geospatial Information Authority of Japan); addresses work best starting with the prefecture. The location button narrows it to what is around you right now.',
  'near.mapAttribution': 'Map: GSI Japan (pale)',
  'near.walkTime': 'Walking times assume 80 m per minute and are based on straight-line distance, so the real route will differ.',
  'near.openInMaps': 'Get directions',
  'nav.stamps': 'Stamps',
  'stamp.col': 'Stamp',
  'stamp.push': 'Add stamp',
  'stamp.pushed': 'Stamped',
  'stamp.push.short': 'Add',
  'stamp.pushed.short': '✓',
  'stamp.article.title': 'Been here?',
  'stamp.article.hint': 'A self-reported stamp rally. Your record is stored only in this browser and never sent to a server.',
  'stamp.visitedOn': 'Visited: ',
  'stamp.book.title': 'Stamp Book',
  'stamp.book.lead': 'Stamp the buildings you have actually visited and track how much of Tokyo’s skyline you have covered. Self-reported, no sign-in — the record stays on this device.',
  'stamp.rate': 'Completion',
  'stamp.collected': 'Stamps collected',
  'stamp.unit': 'buildings',
  'stamp.remaining': 'To go',
  'stamp.filter.visited': 'Visited only',
  'stamp.empty': 'No stamps yet. Start from the building database or any article page with “Add stamp”.',
  'stamp.list.title': 'Your stamps',
  'stamp.byArea': 'By area',
  'stamp.byType': 'By type',
  'stamp.goDatabase': 'Stamp from the database →',
  'stamp.goBook': 'Open your stamp book →',
  'stamp.share': 'Share on X',
  'stamp.backup.title': 'Back up & restore',
  'stamp.backup.desc': 'Your record lives only in this browser. When you change device or browser, copy the code below and load it on the new one.',
  'stamp.backup.copy': 'Copy code',
  'stamp.backup.copied': 'Copied',
  'stamp.backup.placeholder': 'Paste your code',
  'stamp.backup.import': 'Load',
  'stamp.backup.imported': 'stamps added',
  'stamp.backup.failed': 'Could not read that code.',
  'stamp.reset': 'Clear all stamps',
  'stamp.reset.confirm': 'This clears every stamp stored on this device. Continue?',
  'stamp.note.label': 'Notes from your visit',
  'stamp.note.placeholder': 'Who you went with, where you saw it from, what you noticed…',
  'stamp.note.left': 'characters left',
  'stamp.photo.label': 'Your photos',
  'stamp.photo.add': 'Add photo',
  'stamp.photo.remove': 'Delete this photo',
  'stamp.photo.saving': 'Saving…',
  'stamp.photo.hint': 'Notes and photos stay on this device only — nothing is uploaded. Photos are resized to 1280px on the long edge before saving.',
  'stamp.edit': 'Notes & photos',
  'stamp.editor.title': 'Notes and photos',
  'stamp.close': 'Close',
  'stamp.badge.note': 'Note',
  'stamp.backup.file': 'Export with photos',
  'stamp.backup.fileImport': 'Import from file',
  'stamp.backup.fileNote': '* The copy-paste code does not include photos (too large). To move photos too, use “Export with photos” and load the file on the new device.',
  'stamp.backup.fileImported': 'stamps added ({p} photos)',
  'stamp.rank.none': 'No stamps yet',
  'stamp.rank.novice': 'Novice',
  'stamp.rank.explorer': 'Explorer',
  'stamp.rank.hunter': 'Tower Hunter',
  'stamp.rank.master': 'Skyline Master',
  'stamp.rank.legend': 'Legend',
  'stamp.rank.complete': 'Completionist',
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
  'home.hero.credit': 'Photo',
  'home.hero.credit.suffix': ' (public domain)',
  'home.cta.database': 'Browse the database',
  'home.cta.rankings': 'Height rankings',
  'home.stat.buildings': 'buildings',
  'home.stat.articles': 'articles',
  'home.stat.bilingual': 'Japanese / English',
  'home.section.feed': 'Latest articles',
  'home.section.feed.desc': 'The ten most recent articles — buildings, expressways and railways alike.',
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

export function buildingTypeLabel(lang: Lang, type: 'office' | 'residence' | 'bridge', short = false): string {
  const t = useT(lang);
  return t(`type.${type}${short ? '.short' : ''}`);
}

/** 建物の数値事実(言語非依存)を、言語ごとのラベル付き [ラベル, 値] 配列に整形する。 */
export interface BuildingFacts {
  buildingType: 'office' | 'residence' | 'bridge';
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
