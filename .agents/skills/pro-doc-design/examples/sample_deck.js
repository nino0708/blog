// deck_kit の図解パターンを一通り使ったサンプル（A4横・6ページ・控えめな動き付き）
//   cd <pptxgenjs が入った作業フォルダ> && node <skill>/examples/sample_deck.js out.pptx
const path = require("path");
const kit = require(path.join(__dirname, "..", "scripts", "deck_kit.js"));

(async () => {
  const out = process.argv[2] || "sample_deck.pptx";
  const d = kit.createDeck({ size: "A4", palette: "navy", footer: "チーム勉強会の進め方（サンプル）", title: "チーム勉強会の進め方" });
  const { C, M, CW, W } = d;

  // 1. 表紙
  d.cover({ title: "チーム勉強会の進め方", subtitle: "続けるための仕組みと、参加の目安", presenter: "【所属】【氏名】" });

  // 2. 概要：チップ＋区分つきの表（業務一覧の型）
  {
    const s = d.content("概要", "勉強会は「定例」と「単発」の2種類");
    d.chips(s, [["対象", "開発チーム全員", 4.0], ["頻度", "週1回＋必要なとき", 4.4]]);
    const no = (t, col) => ({ text: t, options: { bold: true, color: col, align: "center", fontSize: 15 } });
    const name = (t) => ({ text: t, options: { bold: true, fontSize: 14 } });
    const freq = (t) => ({ text: t, options: { align: "center", color: C.text2 } });
    d.table(s, [
      [d.head("区分"), d.head("No."), d.head("内容"), d.head("説明"), d.head("タイミング")],
      [d.cat("定例", "決まって開く", C.accent1, 3), no("①", C.accent1), name("輪読会"), "同じ本を1章ずつ読み、要点を発表する", freq("毎週")],
      [no("②", C.accent1), name("ふりかえり"), "その週に詰まったことと、解決方法を共有する", freq("毎週")],
      [no("③", C.accent1), name("月例デモ"), "作ったものを5分で見せ合う\n→ 進め方はP.4", freq("毎月")],
      [d.cat("単発", "必要なとき", C.accent2, 2), no("④", C.accent2), name("技術調査会"), "新しいツールを試し、使えるかを判断する", freq("依頼があるとき")],
      [no("⑤", C.accent2), name("障害の共有会"), "起きた障害の原因と再発防止策を説明する", freq("障害のあと")],
    ], { x: M, y: 1.95, w: CW, colW: [1.4, 0.55, 2.1, 4.64, 2.0], rowH: [0.42, 0.85, 0.85, 0.95, 0.85, 0.85], objectName: "overview table" });
  }

  // 3. 時間の帯＋大きな数字＋番号リスト
  {
    const s = d.content("概要", "勉強会の日の流れ（例）");
    d.timelineBar(s, { start: 13, end: 17, blocks: [
      [13, 13.5, "準備", "fixed"], [13.5, 15, "発表と質疑", "vary"], [15, 15.25, "休憩", "rest"],
      [15.25, 16.5, "ハンズオン", "vary"], [16.5, 17, "まとめ", "fixed"],
    ] });
    d.stat(s, { x: M, y: 3.6, w: 3.4, h: 3.95, value: "約7割", caption: "4時間のうち2.75時間が\n手を動かす時間" });
    const rx = M + 3.65, rw = W - M - rx;
    d.panel(s, rx, 3.6, rw, 3.95, C.background2, "list panel");
    d.txt(s, "手を動かす時間に入る主なこと", { x: rx + 0.3, y: 3.8, w: rw - 0.6, h: 0.45, fontSize: 17, bold: true, color: C.accent1, valign: "middle", objectName: "list head" });
    ["発表者のコードを全員で動かす", "質問をその場で検索して確かめる", "次回までの宿題を決める"].forEach((t, i) => {
      const y = 4.45 + i * 0.72;
      d.badge(s, rx + 0.3, y + 0.06, 0.4, String(i + 1), C.text1, "list num " + i);
      d.txt(s, t, { x: rx + 0.85, y, w: rw - 1.15, h: 0.52, fontSize: 15, valign: "middle", objectName: "list item " + i });
    });
  }

  // 4. 判断フロー＋ステップ（クリックで1行ずつ表示）
  {
    const s = d.content("進め方", "質問の種類ごとに、相談先を決めておく");
    d.flowRows(s, [
      ["技術の質問", "調べればわかる", C.accent1, "自分で調べ、参考にした公式ドキュメントのリンクを添えて共有する"],
      ["技術の質問", "調べてもわからない", C.accent2, "詳しいメンバーに聞き、答えをチームの資料に追記する"],
      ["進め方の質問", "ルールが関わる", C.accent6, "リーダーに確認してから、決まったことを全員に伝える"],
    ], { y: 1.3, rowH: 0.82, gap: 0.12, build: true });
    d.txt(s, "③ 月例デモの準備", { x: M, y: 4.45, w: 6, h: 0.45, fontSize: 18, bold: true, valign: "middle", objectName: "demo head" });
    d.steps(s, ["テーマを決める", "デモの台本を\n書く", "リハーサル", "発表する", "感想を集める"], { y: 5.15, h: 1.05, hot: 1, note: "一番時間がかかる" });
  }

  // 5. 注目メッセージ＋チェック表
  {
    const s = d.content("基準", "参加前にできていると安心な「最低ライン」");
    d.callout(s, { y: 1.15, label: "気づき", runs: [
      { text: "準備なしで参加すると、質問の意味がわからず置いていかれやすい。", options: { breakLine: true } },
      { text: "最低限の準備だけで、", options: {} }, { text: "参加の満足度が大きく変わる", options: { color: C.accent1, bold: true } }, { text: "。", options: {} },
    ] });
    const box = { text: "□", options: { align: "center", fontSize: 18, color: C.text2 } };
    const skill = (t) => ({ text: t, options: { bold: true, fontSize: 14 } });
    d.table(s, [
      [d.head("区分"), d.head("チェック"), d.head("項目"), d.head("目安（これができればOK）")],
      [d.cat("必須", null, C.accent4, 2), box, skill("開発環境の準備"), "サンプルコードを手元で動かせる"],
      [box, skill("事前資料の確認"), "当日のテーマを3行で説明できる"],
      [d.cat("あると良い", null, C.accent2, 2), box, skill("質問の準備"), "聞きたいことを1つ書いて持ってくる"],
      [box, skill("ふりかえりメモ"), "前回の学びを1行で言える"],
    ], { x: M, y: 2.45, w: CW, colW: [1.3, 0.9, 3.2, 5.29], rowH: [0.42, 0.95, 0.95, 0.95, 0.95], objectName: "check table" });
  }

  // 6. カード＋ロードマップ＋締め（クリックで順に表示）
  {
    const s = d.content("まとめ", "続けるコツと、はじめ方");
    d.txt(s, "続けるコツ", { x: M, y: 1.1, w: 5, h: 0.4, fontSize: 16, bold: true, valign: "middle", objectName: "tips head" });
    await d.cards(s, [
      ["FaClock", "短く区切る", "1回は2時間以内。\n長いテーマは分ける"],
      ["FaUsers", "全員が話す", "発表しない人も\n質問を1つ出す"],
      ["FaBook", "記録を残す", "決まったことを\n共有資料に追記する"],
      ["FaSmile", "気軽に休む", "忙しい週は\n無理せず休む"],
    ], { y: 1.55 });
    d.txt(s, [{ text: "はじめ方", options: { bold: true, fontSize: 16 } }, { text: "　小さく始めて、続けながら整える", options: { fontSize: 13, color: C.text2 } }],
      { x: M, y: 3.45, w: CW, h: 0.4, valign: "middle", objectName: "road head" });
    d.roadmap(s, [
      ["STEP 1", "テーマを集める", "全員から1つずつ\n出してもらう", null],
      ["STEP 2", "試しに1回やる", "まずは30分だけ\n開いてみる", "※無理に全員集めない"],
      ["STEP 3", "定例にする", "曜日と時間を固定する", "→ P.2の「定例」"],
      ["STEP 4", "ふりかえる", "3か月ごとに\n続け方を見直す", null],
    ], { y: 3.95, build: true });
    d.closing(s, "まずは来週、30分だけやってみましょう", "【所属】【氏名】", 6.4);
  }

  await d.save(out, { motion: true });
  console.log("wrote", out);
})();
