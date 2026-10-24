// style: "cloud" の見本（A4横・5ページ）。濃紺の帯＋淡い青の面＋白いカード（references/style-cloud.md）
//   cd <pptxgenjs と sharp が入った作業フォルダ> && node <skill>/examples/sample_cloud.js out.pptx
const path = require("path");
const kit = require(path.join(__dirname, "..", "scripts", "deck_kit.js"));

(async () => {
  const out = process.argv[2] || "sample_cloud.pptx";
  const d = kit.createDeck({ size: "A4", style: "cloud", footer: "チーム勉強会のふりかえり（サンプル）", title: "チーム勉強会のふりかえり" });
  const { C, M, CW, W, TOP, BOTTOM, MUTED, CYAN } = d;
  const ORANGE_BG = C.accent5; // 主役のカードの淡いオレンジ

  // 1. 表紙：英字の小見出し → 大きなタイトル（2行）→ 数字を1つだけオレンジで目立たせた副題
  await d.cloudCover({
    eyebrow: "TEAM ｜ STUDY REPORT", title: ["チーム勉強会", "ふりかえり"], motif: "chat",
    subtitle: [
      { text: "半年続けた勉強会で", options: { fontSize: 20, color: MUTED, breakLine: true } },
      { text: "参加者が ", options: { fontSize: 24, bold: true, color: C.background1 } },
      { text: "2倍", options: { fontSize: 40, bold: true, color: C.accent1 } },
      { text: " になった理由", options: { fontSize: 24, bold: true, color: C.background1 } },
    ],
    presenter: "【所属】【氏名】",
  });

  // 2. 目次：帯のタイトルと同じ名前を並べる。部ごとに色を変える
  {
    const s = await d.page("はじめに", "02 ｜ CONTENTS", "目次", "「結果 → 工夫 → 次の一歩」の順に紹介する");
    d.toc(s, [
      ["結果", C.accent3, [["03", "数字で見る", "参加者・回数・満足度の変化"]]],
      ["工夫", C.accent2, [["04", "続けるための工夫", "効いた3つの仕組み"]]],
      ["まとめ", C.accent1, [["05", "次の一歩", "来期にやること"]]],
    ], { rowH: 1.05, gap: 0.12, groupGap: 0.3 });
  }

  // 3. 主役の数字を左上に大きく（Z字の起点）。右に補助の数字、下に分析（濃紺）
  {
    const s = await d.page("結果", "03 ｜ DATA", "数字で見る", "参加者は半年で2倍。とくに新しく入った人が増えた");
    const hw = 6.75, hh = 3.4;
    d.card(s, M, TOP, hw, hh, C.background1, "hero card");
    d.pill(s, M + 0.35, TOP + 0.3, 1.4, "最大の変化", ORANGE_BG, C.accent1, "hero pill", 12);
    d.txt(s, [{ text: "2", options: { fontSize: 88, bold: true, color: C.accent1 } }, { text: "倍", options: { fontSize: 40, bold: true, color: C.accent1 } }],
      { x: M + 0.3, y: TOP + 0.65, w: 2.6, h: 1.5, valign: "middle", objectName: "hero num" });
    d.txt(s, [{ text: "1回あたりの参加者", options: { fontSize: 17, color: C.text2, breakLine: true } }, { text: "8人 → 16人", options: { fontSize: 26, bold: true } }],
      { x: M + 3.0, y: TOP + 0.8, w: hw - 3.2, h: 1.2, valign: "middle", lineSpacingMultiple: 1.2, objectName: "hero caption" });
    d.txt(s, "※ 4月と9月の平均で比べた", { x: M + 0.35, y: TOP + hh - 0.6, w: hw - 0.7, h: 0.35, fontSize: 12, color: C.text2, valign: "middle", objectName: "hero note" });
    const sx = M + hw + 0.25, sw = W - M - sx;
    d.card(s, sx, TOP, sw, hh, C.background1, "basic card");
    d.txt(s, "基本の数字", { x: sx + 0.3, y: TOP + 0.2, w: sw - 0.6, h: 0.4, fontSize: 14, bold: true, valign: "middle", objectName: "basic head" });
    [["開いた回数", "24", "回"], ["発表した人", "11", "人"], ["満足度（5段階）", "4.3", ""]].forEach(([k, v, u], i) => {
      const y = TOP + 0.85 + i * 0.8;
      d.txt(s, k, { x: sx + 0.3, y, w: 1.9, h: 0.5, fontSize: 12, color: C.text2, valign: "middle", objectName: "basic k " + i });
      d.txt(s, [{ text: v, options: { fontSize: 24, bold: true } }, { text: u ? " " + u : "", options: { fontSize: 12, bold: true, color: C.text2 } }],
        { x: sx + 1.9, y, w: sw - 2.15, h: 0.5, align: "right", valign: "middle", objectName: "basic v " + i });
    });
    const cy = TOP + hh + 0.25, ch = BOTTOM - cy;
    d.card(s, M, cy, CW, ch, C.text1, "insight card");
    d.txt(s, "分析", { x: M + 0.35, y: cy + 0.25, w: 2, h: 0.35, fontSize: 13, bold: true, color: CYAN, charSpacing: 2, valign: "middle", objectName: "insight label" });
    d.txt(s, "「15分だけ」「聞くだけOK」の回を始めた月から、新しく入った人が増えた。\n→ 工夫の中身はP.4",
      { x: M + 0.35, y: cy + 0.7, w: CW - 0.7, h: ch - 0.9, fontSize: 15, color: C.background1, lineSpacingMultiple: 1.3, objectName: "insight text" });
  }

  // 4. 比べる型：左は控えめ（灰色）、右が主役（白＋オレンジの見出し）。下に手順
  {
    const s = await d.page("工夫", "04 ｜ IDEAS", "続けるための工夫", "参加のハードルを下げる3つの仕組みが効いた");
    const lw = 4.2, rx = M + 4.45, rw = CW - 4.45, h = 3.5;
    d.card(s, M, TOP + 0.3, lw, h - 0.3, "E3EAF2", "before card", { flat: true });
    d.txt(s, "以前のやり方", { x: M + 0.3, y: TOP + 0.45, w: lw - 0.6, h: 0.45, fontSize: 16, bold: true, color: C.text2, valign: "middle", objectName: "before head" });
    ["1回1時間・発表は必須", "資料を準備しないと参加しにくい", "日程が毎回ばらばら"].forEach((t, i) => {
      d.txt(s, "－  " + t, { x: M + 0.3, y: TOP + 1.05 + i * 0.5, w: lw - 0.5, h: 0.42, fontSize: 14, color: C.text2, valign: "middle", objectName: "before item " + i });
    });
    d.card(s, rx, TOP, rw, h, C.background1, "after card");
    d.card(s, rx, TOP, rw, 0.75, C.accent1, "after band", { flat: true });
    d.txt(s, "いまのやり方", { x: rx + 0.35, y: TOP, w: rw - 0.7, h: 0.75, fontSize: 20, bold: true, color: C.background1, valign: "middle", objectName: "after head" });
    ["15分だけの回をつくった", "聞くだけの参加もOKにした", "毎週同じ曜日・同じ時間に固定した"].forEach((t, i) => {
      const y = TOP + 0.95 + i * 0.55;
      d.badge(s, rx + 0.35, y + 0.06, 0.34, String(i + 1), C.accent1, "after num " + i, 12);
      d.txt(s, t, { x: rx + 0.85, y, w: rw - 1.15, h: 0.46, fontSize: 16, valign: "middle", objectName: "after item " + i });
    });
    d.txt(s, "1回の進め方", { x: M, y: TOP + h + 0.25, w: 4, h: 0.35, fontSize: 14, bold: true, valign: "middle", objectName: "flow head" });
    d.steps(s, ["テーマを1つ決める", "15分で話す", "質問を3つ集める", "次回のテーマを決める"], { x: M, w: CW, y: TOP + h + 0.7, h: 0.85, hot: 1, note: "ここを短くしたのが一番効いた" });
  }

  // 5. まとめ：番号つきカード＋表紙のイラストを切り抜いた締めの帯
  {
    const s = await d.page("まとめ", "05 ｜ NEXT STEP", "次の一歩", "来期は「続ける」から「広げる」へ");
    const items = [["他チームに開く", "月1回は他チームも\n参加できる回にする"], ["録画を残す", "来られなかった人も\nあとから見られる"], ["発表者を交代制に", "1人に負担を集めない"]];
    const gap = 0.25, w = (CW - gap * 2) / 3, h = 2.3;
    items.forEach(([t, desc], i) => {
      const x = M + i * (w + gap), last = i === items.length - 1;
      d.card(s, x, TOP, w, h, last ? C.text1 : C.background1, "next " + i);
      d.txt(s, String(i + 1).padStart(2, "0"), { x: x + 0.3, y: TOP + 0.2, w: w - 0.6, h: 0.7, fontSize: 36, bold: true, color: C.accent1, valign: "middle", objectName: "next num " + i });
      d.txt(s, t, { x: x + 0.3, y: TOP + 0.95, w: w - 0.5, h: 0.45, fontSize: 17, bold: true, color: last ? C.background1 : C.text1, valign: "middle", objectName: "next title " + i });
      d.txt(s, desc, { x: x + 0.3, y: TOP + 1.45, w: w - 0.55, h: 0.75, fontSize: 13, color: last ? MUTED : C.text2, lineSpacingMultiple: 1.2, wrap: true, objectName: "next desc " + i });
    });
    const by = TOP + h + 0.3;
    await d.closingArt(s, { y: by, h: BOTTOM - by, motif: "chat", text: "まずは次回、15分だけ", accent: "のぞいてみてください", sub: "【所属】【氏名】" });
  }

  await d.save(out, { motion: false });
  console.log("wrote", out);
})();
