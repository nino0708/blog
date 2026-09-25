// 拡張カテゴリ(高速道路・交通網・観光)と橋の一覧の表示用メタ情報。
// 記事データの取得は ./content.ts が担う。ここは見出し・説明文などの表示用メタ情報だけ。
import type { Lang } from '../i18n/ui';
import type { CategoryKey } from './content';

export type { CategoryKey };

interface CategoryMeta {
  /** バッジ・見出しに出すカテゴリ名 */
  label: Record<Lang, string>;
  /** 一覧ページのリード文 */
  description: Record<Lang, string>;
  /** 楽天ブックス検索のキーワード(日本語サービスのためJP固定) */
  booksKeyword: string;
}

export const CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  expressways: {
    label: { ja: '高速道路', en: 'Expressways' },
    description: {
      ja: '首都高のジャンクションやトンネル、湾岸の長大橋など、東京・関東の高速道路を紹介していきます。',
      en: 'Junctions, tunnels and long-span bridges of the expressway network that threads through Tokyo and the Kanto region.',
    },
    booksKeyword: '東京 高速道路 土木',
  },
  railways: {
    label: { ja: '交通網', en: 'Transport' },
    description: {
      ja: '山手線や地下鉄、ターミナル駅、空港まで。東京・関東の人とモノを動かす交通インフラを紹介していきます。',
      en: 'Lines, stations, terminals and airports — the transport infrastructure that moves people and goods across Tokyo and the Kanto region.',
    },
    booksKeyword: '東京 鉄道 建築',
  },
  tourism: {
    label: { ja: '観光', en: 'Tourism' },
    description: {
      ja: '展望台や街歩きのスポットなど、建物を楽しむための観光情報を紹介していきます。',
      en: 'Observation decks and walkable neighbourhoods — how to actually go and see the architecture.',
    },
    booksKeyword: '東京 観光 建築',
  },
};

/** 橋の一覧ページの見出し・リード文。CATEGORIES と同じ形にして呼び出し側を揃える。 */
export const BRIDGES = {
  label: { ja: '橋', en: 'Bridges' } as Record<Lang, string>,
  description: {
    ja: '隅田川の震災復興橋梁から東京ゲートブリッジ、明石海峡大橋まで。街をつなぐ橋を一橋ずつ記録します。',
    en: 'From the reconstruction bridges of the Sumida River to the Tokyo Gate Bridge and the Akashi Kaikyo Bridge — the crossings that stitch the city together.',
  } as Record<Lang, string>,
};
