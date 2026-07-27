// 建物図鑑・スタンプラリーが共有する「全建物リスト」の組み立て。
// レジストリ(記事の無いスタブ含む)と公開記事をslugでマージするので、
// 毎日の記事追加がそのまま図鑑にもスタンプラリーの母数にも反映される。
import { getCollection } from 'astro:content';
import registryData from '../data/buildings-registry.json';
import type { Lang } from '../i18n/ui';

export type BType = 'office' | 'residence' | 'tower' | 'bridge';

export interface BuildingRow {
  slug: string;
  title: string;
  area: string;
  buildingType: BType;
  completedYear?: number;
  heightM?: number;
  floorsAbove?: number;
  verified: boolean;
  hasArticle: boolean;
}

export async function getBuildingRows(lang: Lang): Promise<BuildingRow[]> {
  const articles = await getCollection('buildings');
  const enArticles = await getCollection('buildings-en');
  const enMap = new Map(enArticles.map((p) => [p.slug, p.data]));

  // slug でユニーク化。まずレジストリ、次に記事front matterで上書き（数値は記事優先）。
  const merged = new Map<string, any>();
  for (const r of (registryData as any).buildings) {
    merged.set(r.slug, { ...r, hasArticle: false });
  }
  for (const a of articles) {
    const base = merged.get(a.slug) ?? {};
    merged.set(a.slug, {
      ...base,
      slug: a.slug,
      title: a.data.title,
      title_en: base.title_en,
      area: a.data.area ?? base.area,
      area_en: base.area_en,
      buildingType: a.data.buildingType ?? base.buildingType ?? 'office',
      completedYear: a.data.completedYear ?? base.completedYear,
      heightM: a.data.heightM ?? base.heightM,
      floorsAbove: a.data.floorsAbove ?? base.floorsAbove,
      verified: a.data.verified ?? base.verified ?? false,
      hasArticle: true,
    });
  }

  // 表示用に言語へ寄せる（英語が無ければ日本語名にフォールバック＝正直に）。
  const localized = (b: any): { title: string; area: string } => {
    if (lang === 'en') {
      const en = b.hasArticle ? enMap.get(b.slug) : null;
      return {
        title: en?.title ?? b.title_en ?? b.title,
        area: en?.area ?? b.area_en ?? b.area,
      };
    }
    return { title: b.title, area: b.area };
  };

  const rows: BuildingRow[] = [...merged.values()].map((b) => {
    const l = localized(b);
    return {
      slug: b.slug,
      title: l.title,
      area: l.area ?? '',
      buildingType: (b.buildingType ?? 'office') as BType,
      completedYear: b.completedYear,
      heightM: b.heightM,
      floorsAbove: b.floorsAbove,
      verified: Boolean(b.verified),
      hasArticle: Boolean(b.hasArticle),
    };
  });

  // 既定順: 高さ降順（無い建物は末尾）→竣工年降順→名前。
  rows.sort((a, b) => {
    const ha = a.heightM ?? -1, hb = b.heightM ?? -1;
    if (hb !== ha) return hb - ha;
    const ya = a.completedYear ?? -1, yb = b.completedYear ?? -1;
    if (yb !== ya) return yb - ya;
    return a.title.localeCompare(b.title, lang === 'ja' ? 'ja' : 'en');
  });

  return rows;
}
