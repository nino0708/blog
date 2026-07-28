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
  /** 位置。出典は registry の coordSource/coordRef に記録（未取得の建物は undefined） */
  lat?: number;
  lng?: number;
  /** 座標を逆ジオコーディングして得た行政区画。地域での絞り込みに使う */
  pref?: string;
  city?: string;
}

/** 2点間の距離(m)。地球を球とみなす近似で、数km程度の徒歩圏なら十分な精度。 */
export function distanceM(
  aLat: number, aLng: number, bLat: number, bLng: number,
): number {
  const R = 6371000;
  const p1 = (aLat * Math.PI) / 180;
  const p2 = (bLat * Math.PI) / 180;
  const dp = ((bLat - aLat) * Math.PI) / 180;
  const dl = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface NearbyRow extends BuildingRow {
  lat: number;
  lng: number;
  /** 起点からの距離(m) */
  distanceM: number;
}

/** 起点から近い順に建物を返す。座標未取得の建物は対象外（推測しない）。 */
export function nearestTo(
  rows: BuildingRow[],
  originLat: number,
  originLng: number,
  { limit = 6, radiusM = Infinity, excludeSlug = '' } = {},
): NearbyRow[] {
  return rows
    .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number' && r.slug !== excludeSlug)
    .map((r) => ({ ...r, lat: r.lat!, lng: r.lng!, distanceM: distanceM(originLat, originLng, r.lat!, r.lng!) }))
    .filter((r) => r.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit);
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
      lat: a.data.lat ?? base.lat,
      lng: a.data.lng ?? base.lng,
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
      lat: typeof b.lat === 'number' ? b.lat : undefined,
      lng: typeof b.lng === 'number' ? b.lng : undefined,
      pref: b.pref,
      city: b.city,
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
