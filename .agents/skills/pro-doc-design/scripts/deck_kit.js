/**
 * deck_kit.js — プロ品質のスライドを pptxgenjs で速く・ぶれずに作るための部品集。
 *
 * 使い方（作業フォルダに pptxgenjs がインストールされている前提）:
 *   const kit = require("<skill>/scripts/deck_kit.js");
 *   const d = kit.createDeck({ size: "A4", palette: "navy", footer: "資料名" });
 *   const s = d.content("セクション名", "スライドの結論を1文で");
 *   d.txt(s, "本文", { x: d.M, y: 1.2, w: 5, h: 1, fontSize: 14, wrap: true });
 *   await d.save("out.pptx", { motion: true });
 *
 * 方針:
 * - 色は必ず d.C（テーマ色）で指定する。直書きの16進数は罫線などテーマで表せない所だけ。
 * - 文字は d.txt に wrap: true を付けると、文節単位で改行位置を決める（jp_wrap.py）。
 * - objectName を必ず付ける。build: 番号 を付けると、その順にクリックで表示される（add_motion.py）。
 */
const path = require("path");
const { execFileSync } = require("child_process");
const { createRequire } = require("module");

const cwdRequire = createRequire(path.join(process.cwd(), "noop.js"));
function load(name) {
  try { return cwdRequire(name); } catch (e) { return require(name); }
}
const pptxgen = load("pptxgenjs");

const SCRIPTS = __dirname;
const SIZES = {
  A4: { w: 11.69, h: 8.27, title: 24 },        // A4横：配布・印刷向け
  "16:9": { w: 13.333, h: 7.5, title: 28 },    // 16:9：投影・画面共有向け
};

// 各パレット：dk1=文字の基本色, dk2=補助文字, lt2=面の色, accent1=強調(1色だけ目立たせる),
// accent2=第2系統, accent3/4=良い/注意（文字ラベルと併用し、色だけで区別しない）
const PALETTES = {
  navy:  { dk1: "232F3E", lt1: "FFFFFF", dk2: "4A5868", lt2: "F1F4F8", accent1: "EC7211", accent2: "146EB4", accent3: "1D8102", accent4: "C7361B", accent5: "8C6BB1", accent6: "6B7785", hlink: "146EB4", folHlink: "6B7785" },
  teal:  { dk1: "1E2B30", lt1: "FFFFFF", dk2: "4B5B63", lt2: "EEF4F4", accent1: "0E8C8E", accent2: "E0782A", accent3: "2E7D32", accent4: "C2410C", accent5: "5B6BBF", accent6: "6F7F87", hlink: "0E8C8E", folHlink: "6F7F87" },
  wine:  { dk1: "2A1F24", lt1: "FFFFFF", dk2: "5A4A50", lt2: "F6F1F2", accent1: "A3243B", accent2: "2F5D8A", accent3: "2E7D32", accent4: "B4540A", accent5: "7A5195", accent6: "7C6E73", hlink: "2F5D8A", folHlink: "7C6E73" },
  mono:  { dk1: "1F1F1F", lt1: "FFFFFF", dk2: "555555", lt2: "F2F2F2", accent1: "D9480F", accent2: "3B5BA5", accent3: "2B8A3E", accent4: "C92A2A", accent5: "6741D9", accent6: "777777", hlink: "3B5BA5", folHlink: "777777" },
};

function createDeck(opts = {}) {
  const size = SIZES[opts.size || "A4"];
  const paletteName = opts.palette || "navy";
  const colors = { ...PALETTES[paletteName], ...(opts.colors || {}) };
  const font = opts.font || "BIZ UDPGothic";          // 和文（テーマの ea / Jpan）
  const latinFont = opts.latinFont || font;            // 英数字（テーマの latin）。例：Noto Sans JP ＋ Inter
  const titleSize = opts.titleSize || size.title;
  const pres = new pptxgen();
  pres.defineLayout({ name: "DECK", width: size.w, height: size.h });
  pres.layout = "DECK";
  pres.theme = { headFontFace: latinFont, bodyFontFace: latinFont };
  if (opts.title) pres.title = opts.title;

  const C = pres.SchemeColor;
  const W = size.w, H = size.h, M = opts.margin ?? 0.5, CW = W - 2 * M;
  const LANG = "ja-JP";
  const BORDER = opts.border || "D5DBE3";
  const TOP = 1.15;                // タイトル下の本文開始位置
  const BOTTOM = H - 0.72;         // 本文の下端（フッターの上）

  pres.defineSlideMaster({
    title: "DARK_TITLE",
    background: { color: C.text1 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.8, y: H * 0.31, w: W - 1.6, h: 1.0, fontSize: 44, bold: true, color: C.background1, align: "left", valign: "middle", margin: 0 }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "CONTENT",
    background: { color: C.background1 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: M, y: 0.35, w: CW, h: 0.6, fontSize: titleSize, bold: true, color: C.text1, align: "left", valign: "middle", margin: 0 }, text: "" } },
      ...(opts.footer ? [{ text: { text: opts.footer, options: { x: M, y: H - 0.42, w: 6, h: 0.3, fontSize: 9, color: C.accent6, margin: 0, lang: LANG } } }] : []),
    ],
    slideNumber: { x: W - M - 0.6, y: H - 0.42, w: 0.6, h: 0.3, fontSize: 9, color: C.accent6, align: "right", margin: 0 },
  });

  // ---------- 文字 ----------
  const wrapCache = new Map();
  function wrapJa(text, widthIn, pt, bold = false) {
    const key = [text, widthIn, pt, bold].join("|");
    if (wrapCache.has(key)) return wrapCache.get(key);
    let out = text;
    try {
      const args = [path.join(SCRIPTS, "jp_wrap.py"), "--width", String(widthIn), "--size", String(pt), "--font", font];
      if (bold) args.push("--bold");
      if (latinFont !== font) args.push("--latin", latinFont);
      out = execFileSync("python3", args, { input: text, encoding: "utf8" });
    } catch (e) { /* 失敗時は元のまま */ }
    wrapCache.set(key, out);
    return out;
  }
  const named = (name, build) => (build ? `b${build}|${name}` : name);

  /** テキストボックス。wrap: true で文節改行（文字列のときのみ）。build: n で段階表示。 */
  function txt(slide, text, o) {
    const { wrap, build, objectName, ...rest } = o;
    let t = text;
    if (wrap && typeof text === "string") t = wrapJa(text, o.w - 0.02, o.fontSize || 14, !!o.bold);
    slide.addText(t, { isTextBox: true, margin: 0, lang: LANG, valign: "top", color: C.text1, objectName: named(objectName || "text", build), ...rest });
  }
  /** 角丸の面。fill はテーマ色。line を渡すと枠線。 */
  function panel(slide, x, y, w, h, fill, name, line, build) {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: line || { type: "none" }, objectName: named(name, build) });
  }
  function rect(slide, x, y, w, h, fill, name, build) {
    slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { type: "none" }, objectName: named(name, build) });
  }
  /** 水平の矢印線 */
  function arrow(slide, x1, y, x2, color, name, build) {
    slide.addShape(pres.shapes.LINE, { x: x1, y, w: x2 - x1, h: 0.001, line: { color: color || C.accent6, width: 2, endArrowType: "triangle" }, objectName: named(name || "arrow", build) });
  }
  /** 丸数字バッジ */
  function badge(slide, x, y, d, label, fill, name, fontSize = 13, build) {
    slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, objectName: named(name, build) });
    txt(slide, label, { x, y, w: d, h: d, fontSize, bold: true, color: C.background1, align: "center", valign: "middle", objectName: name + " text", build });
  }
  /** react-icons のアイコンを色付きの円に入れる（react-icons / sharp が無ければ円だけ） */
  async function icon(slide, iconName, x, y, d, fill, name, build) {
    slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, objectName: named(name + " circle", build) });
    try {
      const React = load("react"), RDS = load("react-dom/server"), sharp = load("sharp"), fa = load("react-icons/fa");
      const svg = RDS.renderToStaticMarkup(React.createElement(fa[iconName], { color: "#FFFFFF", size: 256 }));
      const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
      const s = d * 0.55;
      slide.addImage({ data: "image/png;base64," + buf.toString("base64"), x: x + (d - s) / 2, y: y + (d - s) / 2, w: s, h: s, objectName: named(name + " icon", build) });
    } catch (e) { /* アイコン無しでも成立させる */ }
  }

  // ---------- 表 ----------
  const cellBorder = { type: "solid", pt: 0.75, color: BORDER };
  function table(slide, rows, o) {
    const { build, objectName, ...rest } = o;
    slide.addTable(rows, { fontSize: 13, color: C.text1, valign: "middle", border: cellBorder, margin: [0.05, 0.1, 0.05, 0.1], lang: LANG, objectName: named(objectName || "table", build), ...rest });
  }
  const head = (text, extra = {}) => ({ text, options: { bold: true, color: C.background1, fill: { color: C.text1 }, align: "center", ...extra } });
  /** 縦に結合した区分セル（例：定例業務／非定例業務） */
  const cat = (title, sub, color, span) => ({
    text: sub ? [{ text: title, options: { fontSize: 16, bold: true, breakLine: true } }, { text: sub, options: { fontSize: 11 } }] : title,
    options: { rowspan: span, fill: { color }, color: C.background1, align: "center", bold: !sub, fontSize: 16 },
  });

  // ---------- スライド ----------
  function cover({ title, subtitle, presenter, section = "表紙" }) {
    pres.addSection({ title: section });
    const s = pres.addSlide({ masterName: "DARK_TITLE", sectionTitle: section });
    s.addText(title, { placeholder: "title", lang: LANG });
    if (subtitle) txt(s, subtitle, { x: 0.8, y: H * 0.31 + 1.2, w: W - 3.2, h: 0.5, fontSize: 22, color: C.accent1, bold: true, objectName: "subtitle" });
    if (presenter) txt(s, presenter, { x: 0.8, y: H - 1.5, w: 6, h: 0.4, fontSize: 16, color: C.background2, objectName: "presenter" });
    return s;
  }
  const sections = new Set();
  /** 本文スライド。title は「結論を1文で」。lead は省略可（タイトルの言い換えなら書かない）。 */
  function content(section, title, lead) {
    if (!sections.has(section)) { pres.addSection({ title: section }); sections.add(section); }
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
    s.addText(title, { placeholder: "title", lang: LANG });
    if (lead) txt(s, lead, { x: M, y: 1.0, w: CW, h: 0.45, fontSize: 13, color: C.text2, valign: "middle", objectName: "lead", wrap: true });
    return s;
  }
  function closing(slide, text, sub, y) {
    const yy = y ?? BOTTOM - 0.95;
    panel(slide, M, yy, CW, 0.95, C.text1, "closing");
    txt(slide, sub ? [{ text, options: { bold: true, color: C.accent1 } }, { text: "　" + sub, options: { color: C.background1 } }] : text,
      { x: M + 0.4, y: yy, w: CW - 0.8, h: 0.95, fontSize: 17, valign: "middle", bold: !sub, color: C.accent1, objectName: "closing text" });
  }

  // ---------- 図解パターン ----------
  /** 見出しチップを横に並べる（例：担当業務／担当案件）。items: [[ラベル, 値, 幅], ...] */
  function chips(slide, items, y = TOP) {
    let cx = M;
    items.forEach(([k, v, w], i) => {
      panel(slide, cx, y, w, 0.55, C.background2, "chip " + i);
      txt(slide, [{ text: k + "　", options: { color: C.accent1 } }, { text: v, options: {} }],
        { x: cx + 0.25, y, w: w - 0.4, h: 0.55, fontSize: 15, bold: true, valign: "middle", objectName: "chip text " + i });
      cx += w + 0.25;
    });
  }
  /** 時間の長さに比例した帯（1日の流れ・期間）。blocks: [[開始, 終了, ラベル, "fixed"|"vary"|"rest"], ...] 単位は時 */
  function timelineBar(slide, { start, end, blocks, y = 1.95, h = 1.25 }) {
    const per = CW / (end - start);
    const style = { fixed: [C.text1, C.background1], vary: [C.accent1, C.background1], rest: [C.background2, C.text2] };
    blocks.forEach(([a, b, label, kind], i) => {
      const x = M + (a - start) * per, w = (b - a) * per - 0.04;
      rect(slide, x, y, w, h, style[kind][0], "block " + i);
      txt(slide, label, { x, y, w, h, fontSize: w < 1 ? 12 : kind === "vary" ? 17 : 15, bold: true, color: style[kind][1], align: "center", valign: "middle", objectName: "block text " + i });
    });
    const ticks = [...new Set(blocks.flatMap(([a, b]) => [a, b]))].sort((p, q) => p - q);
    ticks.forEach((t, i) => {
      const x = M + (t - start) * per, w = 0.6;
      const label = Math.floor(t) + ":" + String(Math.round((t % 1) * 60)).padStart(2, "0");
      const first = i === 0, last = i === ticks.length - 1;
      txt(slide, label, { x: first ? x : last ? x - w : x - w / 2, y: y - 0.38, w, h: 0.3, fontSize: 12, bold: true, color: C.text2, align: first ? "left" : last ? "right" : "center", valign: "middle", objectName: "tick " + i });
    });
  }
  /** 分類→対応 の行（判断フロー）。rows: [[見出し, 補足, 色, 対応の文], ...]
   *  paren: false で補足を括弧なしの太字にする（例：見出し「STEP 1」＋補足「1問だけ選ぶ」） */
  function flowRows(slide, rows, { x = M, y, w = CW, labelW = 2.8, rowH = 0.72, gap = 0.08, build = false, paren = true } = {}) {
    rows.forEach(([t, sub, col, act], i) => {
      const yy = y + i * (rowH + gap), b = build ? i + 1 : undefined;
      panel(slide, x, yy, labelW, rowH, col, "kind " + i, undefined, b);
      txt(slide, [{ text: t, options: { bold: true, fontSize: 14, breakLine: !!sub } }, ...(sub ? [{ text: paren ? "（" + sub + "）" : sub, options: { fontSize: paren ? 12 : 14, bold: !paren } }] : [])],
        { x, y: yy, w: labelW, h: rowH, color: C.background1, align: "center", valign: "middle", objectName: "kind text " + i, build: b });
      arrow(slide, x + labelW + 0.08, yy + rowH / 2, x + labelW + 0.45, C.accent6, "kind arrow " + i, b);
      const ax = x + labelW + 0.52, aw = w - labelW - 0.52;
      panel(slide, ax, yy, aw, rowH, C.background1, "act " + i, { color: BORDER, width: 0.75 }, b);
      txt(slide, act, { x: ax + 0.2, y: yy, w: aw - 0.4, h: rowH, fontSize: 14, valign: "middle", lineSpacingMultiple: 1.1, objectName: "act text " + i, wrap: true, build: b });
    });
  }
  /** 横並びのステップ（手順）。hot: 強調する番号(0始まり)、note: 強調の補足 */
  function steps(slide, labels, { x = M + 0.3, y, w = CW - 0.6, h = 0.9, gap = 0.32, hot = -1, note, build = false } = {}) {
    const bw = (w - gap * (labels.length - 1)) / labels.length;
    labels.forEach((t, i) => {
      const xx = x + i * (bw + gap), isHot = i === hot, b = build ? i + 1 : undefined;
      panel(slide, xx, y, bw, h, isHot ? C.accent1 : C.background1, "step " + i, isHot ? undefined : { color: BORDER, width: 1 }, b);
      txt(slide, [{ text: "STEP " + (i + 1), options: { fontSize: 10, bold: true, color: isHot ? C.background1 : C.accent2, breakLine: true } },
                  { text: t, options: { fontSize: 14, bold: true, color: isHot ? C.background1 : C.text1 } }],
        { x: xx + 0.05, y, w: bw - 0.1, h, align: "center", valign: "middle", objectName: "step text " + i, build: b });
      if (i < labels.length - 1) arrow(slide, xx + bw + 0.05, y + h / 2, xx + bw + gap - 0.05, C.accent6, "step arrow " + i, b);
      if (isHot && note) txt(slide, "▲ " + note, { x: xx - 0.2, y: y + h + 0.12, w: bw + 0.4, h: 0.35, fontSize: 13, bold: true, color: C.accent4, align: "center", valign: "middle", objectName: "step note", build: b });
    });
  }
  /** アイコン付きカードを横に並べる。items: [[アイコン名, 見出し, 説明], ...] */
  async function cards(slide, items, { y, h = 1.6, gap = 0.25, build = false } = {}) {
    const cw = (CW - gap * (items.length - 1)) / items.length;
    for (let i = 0; i < items.length; i++) {
      const [ic, t, d] = items[i], x = M + i * (cw + gap), b = build ? i + 1 : undefined;
      panel(slide, x, y, cw, h, C.background2, "card " + i, undefined, b);
      await icon(slide, ic, x + 0.2, y + 0.2, 0.5, C.accent1, "card icon " + i, b);
      txt(slide, t, { x: x + 0.8, y: y + 0.2, w: cw - 0.95, h: 0.5, fontSize: 15, bold: true, valign: "middle", objectName: "card title " + i, build: b });
      txt(slide, d, { x: x + 0.2, y: y + 0.8, w: cw - 0.35, h: h - 0.95, fontSize: 13, color: C.text2, lineSpacingMultiple: 1.1, objectName: "card body " + i, wrap: true, build: b });
    }
  }
  /** 大きな数字で1つの事実を見せる */
  function stat(slide, { x, y, w, h, value, caption }) {
    panel(slide, x, y, w, h, C.background2, "stat panel");
    txt(slide, [{ text: value, options: { fontSize: 54, bold: true, color: C.accent1, breakLine: true } },
                { text: caption, options: { fontSize: 14 } }],
      { x: x + 0.2, y, w: w - 0.4, h, align: "center", valign: "middle", lineSpacingMultiple: 1.2, objectName: "stat text" });
  }
  /** 濃い帯の注目メッセージ（気づき・結論）。label は左のチップ */
  function callout(slide, { y, h = 1.05, label, runs }) {
    panel(slide, M, y, CW, h, C.text1, "callout");
    let tx = M + 0.4;
    if (label) {
      panel(slide, M + 0.25, y + (h - 0.45) / 2, 1.0, 0.45, C.accent1, "callout chip");
      txt(slide, label, { x: M + 0.25, y: y + (h - 0.45) / 2, w: 1.0, h: 0.45, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle", objectName: "callout chip text" });
      tx = M + 1.5;
    }
    txt(slide, runs, { x: tx, y, w: W - M - 0.2 - tx, h, fontSize: 14, color: C.background1, valign: "middle", lineSpacingMultiple: 1.25, objectName: "callout text" });
  }
  /** ステップのカード（ロードマップ）。items: [[ラベル, 見出し, 本文, 補足], ...] */
  function roadmap(slide, items, { y, h = 2.1, gap = 0.3, build = false } = {}) {
    const fills = [C.accent6, C.accent2, C.text2, C.text1];
    const rw = (CW - gap * (items.length - 1)) / items.length, hh = 0.8;
    items.forEach(([lab, t, body, note], i) => {
      const x = M + i * (rw + gap), b = build ? i + 1 : undefined;
      panel(slide, x, y, rw, h, C.background2, "road card " + i, undefined, b);
      rect(slide, x, y, rw, hh, fills[i % fills.length], "road band " + i, b);
      txt(slide, [{ text: lab, options: { fontSize: 11, bold: true, color: C.background2, breakLine: true } }, { text: t, options: { fontSize: 16, bold: true, color: C.background1 } }],
        { x: x + 0.2, y, w: rw - 0.3, h: hh, valign: "middle", objectName: "road title " + i, build: b });
      const runs = [{ text: body, options: { fontSize: 13, breakLine: !!note } }];
      if (note) runs.push({ text: note, options: { fontSize: 12, bold: true, color: C.accent2 } });
      txt(slide, runs, { x: x + 0.2, y: y + hh + 0.15, w: rw - 0.3, h: h - hh - 0.3, lineSpacingMultiple: 1.15, objectName: "road body " + i, build: b });
      if (i < items.length - 1) slide.addShape(pres.shapes.RIGHT_ARROW, { x: x + rw + 0.05, y: y + h / 2 - 0.13, w: gap - 0.1, h: 0.26, fill: { color: C.accent1 }, line: { type: "none" }, objectName: named("road arrow " + i, b) });
    });
  }

  // ---------- 保存 ----------
  /** 書き出し → テーマに色と日本語フォントを書き込む → （任意）動きを付ける */
  async function save(file, { motion = false, chain = false } = {}) {
    await pres.writeFile({ fileName: file });
    execFileSync("python3", [path.join(SCRIPTS, "finalize_pptx.py"), file, "--font", font, "--latin", latinFont, "--colors", JSON.stringify(colors), "--name", paletteName], { stdio: "inherit" });
    if (motion) {
      const args = [path.join(SCRIPTS, "add_motion.py"), file, file];
      if (chain) args.push("--chain");
      execFileSync("python3", args, { stdio: "inherit" });
    }
    return file;
  }

  return {
    pres, C, W, H, M, CW, TOP, BOTTOM, BORDER, LANG, colors, font, latinFont, named,
    txt, panel, rect, arrow, badge, icon, table, head, cat, wrapJa,
    cover, content, closing, chips, timelineBar, flowRows, steps, cards, stat, callout, roadmap, save,
  };
}

module.exports = { createDeck, PALETTES, SIZES };
