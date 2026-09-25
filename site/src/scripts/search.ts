// サイト内検索(ブラウザ側)。インデックスは src/lib/search.ts がビルド時に書き出した JSON。
// - ヘッダーの検索欄: 入力に合わせて候補を最大8件出す(↑↓で選択、Enterで移動)。
// - 検索ページ(/search/): 全件を種別で絞り込んで一覧表示し、URL(?q=&kind=)に状態を残す。
// インデックスは検索欄に初めて触れたときに1回だけ読み込む。

interface Item {
  t: string; u: string; k: string; a?: string; y?: number; m?: number;
  s?: string; i?: string; p?: 1; q?: string;
}
interface Index { lang: 'ja' | 'en'; kinds: Record<string, string>; items: Item[] }
interface Prepared { item: Item; title: string; rest: string }
interface Labels {
  empty: string; more: string; stub: string; count: string; all: string;
}

// ---- 表記ゆれの吸収: 全角半角・大文字小文字・カタカナ/ひらがな・空白や記号の有無 ----
const PUNCT = /[\s・･\-‐‑–—―()（）「」『』【】[\]/／,，.．、。'’"“”!！?？:：~〜]/g;
export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(PUNCT, '');
}

const cache = new Map<string, Promise<Prepared[] & { kinds?: Record<string, string> }>>();
function load(url: string) {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url)
        .then((r) => r.json() as Promise<Index>)
        .then((idx) => {
          const list = idx.items.map((item) => ({
            item,
            title: normalize(item.t),
            rest: normalize([item.a, item.q, item.s].filter(Boolean).join(' ')),
          })) as Prepared[] & { kinds?: Record<string, string> };
          list.kinds = idx.kinds;
          return list;
        }),
    );
  }
  return cache.get(url)!;
}

/** 空白区切りの全語を含む項目を、タイトル一致の強さ順に返す。 */
export function search(list: Prepared[], query: string): Item[] {
  const terms = query.split(/\s+/).map(normalize).filter(Boolean);
  if (!terms.length) return [];
  const scored: { item: Item; score: number }[] = [];
  for (const p of list) {
    let score = 0;
    let ok = true;
    for (const term of terms) {
      if (p.title.startsWith(term)) score += 100;
      else if (p.title.includes(term)) score += 60;
      else if (p.rest.includes(term)) score += 15;
      else { ok = false; break; }
    }
    if (!ok) continue;
    if (!p.item.p) score += 8; // 記事のあるものを先に
    if (p.title === terms.join('')) score += 50; // 完全一致
    score += Math.min(p.item.m ?? 0, 400) / 100; // 同点なら高い建物を先に
    scored.push({ item: p.item, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.item);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function metaLine(item: Item, kinds: Record<string, string>, lang: string) {
  const bits = [kinds[item.k], item.a];
  if (item.y) bits.push(lang === 'ja' ? `${item.y}年` : String(item.y));
  if (item.m) bits.push(`${item.m}m`);
  return bits.filter(Boolean).join(lang === 'ja' ? ' ・ ' : ' · ');
}

// ---- ヘッダー等の検索欄(候補つき) ----
function initBox(form: HTMLFormElement) {
  const input = form.querySelector<HTMLInputElement>('input[type="search"]')!;
  const listbox = form.querySelector<HTMLElement>('[role="listbox"]')!;
  const url = form.dataset.index!;
  const lang = form.dataset.lang ?? 'ja';
  const labels = JSON.parse(form.dataset.labels ?? '{}') as Labels;
  let active = -1;
  let results: Item[] = [];

  const close = () => {
    listbox.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    active = -1;
  };
  const highlight = () => {
    listbox.querySelectorAll<HTMLElement>('[role="option"]').forEach((el, i) => {
      el.setAttribute('aria-selected', String(i === active));
      if (i === active) input.setAttribute('aria-activedescendant', el.id);
    });
    if (active < 0) input.removeAttribute('aria-activedescendant');
  };

  const render = async () => {
    const q = input.value.trim();
    if (!q) return close();
    const list = await load(url);
    if (q !== input.value.trim()) return; // 入力が進んでいたら古い結果は捨てる
    results = search(list, q).slice(0, 8);
    const kinds = list.kinds ?? {};
    listbox.innerHTML = results.length
      ? results
          .map(
            (it, i) => `<a role="option" id="${form.id}-opt-${i}" class="ss-opt" href="${esc(it.u)}" aria-selected="false">
              <span class="ss-title">${esc(it.t)}${it.p ? ` <em class="ss-stub">${esc(labels.stub)}</em>` : ''}</span>
              <span class="ss-meta">${esc(metaLine(it, kinds, lang))}</span></a>`,
          )
          .join('') +
        `<a class="ss-more" href="${esc(form.action)}?q=${encodeURIComponent(q)}">${esc(labels.more)}</a>`
      : `<p class="ss-empty">${esc(labels.empty)}</p>`;
    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    active = -1;
    highlight();
  };

  input.addEventListener('focus', () => { void load(url); }, { once: true });
  input.addEventListener('input', () => { void render(); });
  input.addEventListener('keydown', (e) => {
    if (listbox.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = results.length;
      if (!n) return;
      active = e.key === 'ArrowDown' ? (active + 1) % n : (active - 1 + n) % n;
      highlight();
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      location.href = results[active].u;
    } else if (e.key === 'Escape') {
      close();
    }
  });
  document.addEventListener('click', (e) => {
    if (!form.contains(e.target as Node)) close();
  });
}

// ---- 検索ページ(全件・種別の絞り込み) ----
function initPage(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('form')!;
  const input = form.querySelector<HTMLInputElement>('input[type="search"]')!;
  const chipsEl = root.querySelector<HTMLElement>('[data-search-chips]')!;
  const out = root.querySelector<HTMLElement>('[data-search-results]')!;
  const countEl = root.querySelector<HTMLElement>('[data-search-count]')!;
  const url = root.dataset.index!;
  const lang = root.dataset.lang ?? 'ja';
  const labels = JSON.parse(root.dataset.labels ?? '{}') as Labels;
  const params = new URLSearchParams(location.search);
  input.value = params.get('q') ?? '';
  let kind = params.get('kind') ?? 'all';

  const run = async () => {
    const q = input.value.trim();
    const list = await load(url);
    const kinds = list.kinds ?? {};
    const hits = q ? search(list, q) : [];

    // 種別チップ(ヒットがある種別だけ、件数つき)
    const counts = new Map<string, number>();
    for (const h of hits) counts.set(h.k, (counts.get(h.k) ?? 0) + 1);
    if (kind !== 'all' && !counts.has(kind)) kind = 'all';
    chipsEl.innerHTML = hits.length
      ? [['all', labels.all, hits.length] as const, ...[...counts].map(([k, n]) => [k, kinds[k] ?? k, n] as const)]
          .map(([k, label, n]) => `<button type="button" class="chip${k === kind ? ' is-active' : ''}" data-kind="${esc(k)}" aria-pressed="${k === kind}">${esc(label)} <span>${n}</span></button>`)
          .join('')
      : '';

    const shown = kind === 'all' ? hits : hits.filter((h) => h.k === kind);
    countEl.textContent = q ? labels.count.replace('%n', String(shown.length)) : '';
    out.innerHTML = q && !shown.length
      ? `<p class="search-empty">${esc(labels.empty)}</p>`
      : shown
          .map(
            (it) => `<li><a class="search-hit" href="${esc(it.u)}">
              ${it.i ? `<img src="${esc(it.i)}" alt="" loading="lazy" />` : `<span class="search-hit-ph" aria-hidden="true">${esc((kinds[it.k] ?? '').slice(0, 1))}</span>`}
              <span class="search-hit-body">
                <span class="search-hit-title">${esc(it.t)}${it.p ? ` <em class="ss-stub">${esc(labels.stub)}</em>` : ''}</span>
                <span class="search-hit-meta">${esc(metaLine(it, kinds, lang))}</span>
                ${it.s ? `<span class="search-hit-sum">${esc(it.s)}</span>` : ''}
              </span></a></li>`,
          )
          .join('');

    // URL に状態を残す(共有・戻るで同じ結果になるように)
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (kind !== 'all') next.set('kind', kind);
    history.replaceState(null, '', `${location.pathname}${next.size ? `?${next}` : ''}`);
  };

  form.addEventListener('submit', (e) => { e.preventDefault(); void run(); });
  input.addEventListener('input', () => { void run(); });
  chipsEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-kind]');
    if (!b) return;
    kind = b.dataset.kind!;
    void run();
  });
  void run();
  input.focus();
}

document.querySelectorAll<HTMLFormElement>('form[data-search-box]').forEach(initBox);
document.querySelectorAll<HTMLElement>('[data-search-page]').forEach(initPage);
