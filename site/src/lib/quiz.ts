// 「今日の建物クイズ」。日替わりの虫食いクイズを、記事のある建物の既存事実(高さ・竣工年・階数)だけから作る。
// 数値は創作しない。ビルド日ではなく「見た日」で日替わりにしたいので、選定はUTC日付からの決定論的な計算のみで行う
// (サーバー側の抽選や保存は不要)。同じロジックを scripts/daily-quiz.mjs 側でも再実装し、X投稿文の生成に使う。

export type QuizField = 'height' | 'year' | 'floors';

export interface QuizCandidate {
  slug: string;
  title: string;
  area: string;
  completedYear?: number;
  heightM?: number;
  floorsAbove?: number;
}

export interface DailyQuiz {
  slug: string;
  title: string;
  area: string;
  field: QuizField;
  answer: number;
  hints: string[];
}

/** UTC日付を「YYYY-MM-DD」文字列から、エポック日数(タイムゾーン非依存)に変換する。 */
export function dayIndexFromDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** 今日(ローカル日付)の「YYYY-MM-DD」キー。クライアント側で呼ぶ想定。 */
export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** クイズに使える候補(高さ・竣工年をどちらも持つ、記事のある建物)だけを残し、slug順で安定化する。 */
export function quizCandidates<T extends QuizCandidate>(rows: T[]): T[] {
  return rows
    .filter((r) => typeof r.heightM === 'number' && typeof r.completedYear === 'number')
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** 指定した日付キーの「今日の建物クイズ」を1件返す。候補が無ければ null。 */
export function pickDailyQuiz(candidates: QuizCandidate[], dateKey: string): DailyQuiz | null {
  if (!candidates.length) return null;
  const dayIndex = dayIndexFromDateKey(dateKey);
  const building = candidates[dayIndex % candidates.length];

  // 階数がある建物は3択、無ければ高さ/竣工年の2択で日替わりにする。
  const fields: QuizField[] = typeof building.floorsAbove === 'number'
    ? ['height', 'year', 'floors']
    : ['height', 'year'];
  const field = fields[dayIndex % fields.length];

  const hints: string[] = [building.area];
  if (field !== 'year') hints.push(`竣工${building.completedYear}年`);
  if (field !== 'height') hints.push(`高さ${building.heightM}m`);
  if (field !== 'floors' && typeof building.floorsAbove === 'number') hints.push(`地上${building.floorsAbove}階`);

  const answer =
    field === 'height' ? building.heightM! : field === 'year' ? building.completedYear! : building.floorsAbove!;

  return { slug: building.slug, title: building.title, area: building.area, field, answer, hints };
}

const QUESTION_JA: Record<QuizField, string> = {
  height: '高さは何mでしょう？',
  year: '竣工は何年でしょう？',
  floors: '地上は何階建てでしょう？',
};
const QUESTION_EN: Record<QuizField, string> = {
  height: 'How tall is it, in meters?',
  year: 'What year was it completed?',
  floors: 'How many floors above ground does it have?',
};

export function quizQuestion(lang: 'ja' | 'en', field: QuizField): string {
  return lang === 'ja' ? QUESTION_JA[field] : QUESTION_EN[field];
}
