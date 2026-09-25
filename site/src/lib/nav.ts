// サイトのメニュー構成。ヘッダー(PC・スマホ)・フッター・トップページがここを唯一の出典にする。
// 日英で同じ構成にし、英語版が無いページだけ langs で外す。
import { useT, localizePath, type Lang } from '../i18n/ui';
import { BRIDGES, CATEGORIES } from './category';

export interface NavItem {
  href: string;
  label: string;
  /** メニューやトップのタイルで使う短い説明 */
  desc?: string;
}

const item = (lang: Lang, path: string, label: string, desc?: string): NavItem => ({
  href: localizePath(lang, path),
  label,
  desc,
});

/** 記事を読む: カテゴリ別の一覧 */
export function readItems(lang: Lang): NavItem[] {
  const t = useT(lang);
  return [
    item(lang, '/buildings/', t('nav.home'), t('nav.desc.buildings')),
    item(lang, '/bridges/', BRIDGES.label[lang], t('nav.desc.bridges')),
    item(lang, '/expressways/', CATEGORIES.expressways.label[lang], t('nav.desc.expressways')),
    item(lang, '/railways/', CATEGORIES.railways.label[lang], t('nav.desc.railways')),
    // 観光は日本語のみ(英語版コレクション未整備)
    ...(lang === 'ja' ? [item(lang, '/tourism/', CATEGORIES.tourism.label.ja, t('nav.desc.tourism'))] : []),
  ];
}

/** 調べる・使う: データを引く道具 */
export function toolItems(lang: Lang): NavItem[] {
  const t = useT(lang);
  return [
    item(lang, '/near/', t('nav.near'), t('nav.desc.near')),
    item(lang, '/database/', t('nav.database'), t('nav.desc.database')),
    // ランキングは日本語のみ
    ...(lang === 'ja' ? [item(lang, '/rankings/', t('nav.rankings'), t('nav.desc.rankings'))] : []),
    item(lang, '/stamps/', t('nav.stamps'), t('nav.desc.stamps')),
  ];
}

/** サイトについて */
export function aboutItems(lang: Lang): NavItem[] {
  const t = useT(lang);
  return [item(lang, '/about/', t('nav.about'))];
}
