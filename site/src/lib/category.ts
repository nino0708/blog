// 拡張カテゴリ(高速道路・鉄道・観光)の表示設定。
// ページ側(一覧・記事詳細・sitemap)がここを唯一の出典として参照する。
import type { Lang } from '../i18n/ui';

export type CategoryKey = 'expressways' | 'railways' | 'tourism';

interface CategoryMeta {
  /** バッジ・見出しに出すカテゴリ名 */
  label: Record<Lang, string>;
  /** 一覧ページのリード文 */
  description: Record<Lang, string>;
  /** 楽天ブックス検索のキーワード(日本語サービスのためJP固定) */
  booksKeyword: string;
  /** 英語版コンテンツコレクションの有無。tourism は日本語のみ。 */
  hasEn: boolean;
}

export const CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  expressways: {
    label: { ja: '高速道路', en: 'Expressways' },
    description: {
      ja: '首都高のジャンクションやトンネル、湾岸の長大橋など、東京・関東の高速道路を紹介していきます。',
      en: 'Junctions, tunnels and long-span bridges of the expressway network that threads through Tokyo and the Kanto region.',
    },
    booksKeyword: '東京 高速道路 土木',
    hasEn: true,
  },
  railways: {
    label: { ja: '鉄道', en: 'Railways' },
    description: {
      ja: '山手線や地下鉄、ターミナル駅など、東京・関東の鉄道の路線と駅を紹介していきます。',
      en: 'Lines and stations across Tokyo and the Kanto region — from the Yamanote loop to the subways and the great terminals.',
    },
    booksKeyword: '東京 鉄道 建築',
    hasEn: true,
  },
  tourism: {
    label: { ja: '観光', en: 'Tourism' },
    description: {
      ja: '展望台や街歩きのスポットなど、建物を楽しむための観光情報を紹介していきます。',
      en: 'Observation decks and walkable neighbourhoods — how to actually go and see the architecture.',
    },
    booksKeyword: '東京 観光 建築',
    hasEn: false,
  },
};

/** 記事詳細ページのパス（言語込み） */
export function categoryPath(lang: Lang, key: CategoryKey, slug = ''): string {
  const prefix = lang === 'en' ? '/en' : '';
  return `${prefix}/${key}/${slug}${slug ? '/' : ''}`;
}
