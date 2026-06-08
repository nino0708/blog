// 建物データ（事実）から、記事「本文のみ」を書かせるプロンプトを組み立てる。
// 重要: 事実は与えたものだけを使い、数値・固有名詞を創作させない。

// 与えた事実だけを許可リスト化（生成・検証で共用）
function factsAllowList(b) {
  const typeLabel = b.buildingType === 'office' ? 'オフィスビル' : 'マンション';
  return [
    ['名称', b.title],
    ['用途', typeLabel],
    ['エリア', b.area],
    ['所在地', b.address],
    ['竣工年', b.completedYear ? `${b.completedYear}年` : null],
    ['地上階数', b.floorsAbove ? `${b.floorsAbove}階` : null],
    ['高さ', b.heightM ? `${b.heightM}m` : null],
    ['延床面積', b.totalFloorAreaM2 ? `${b.totalFloorAreaM2}㎡` : null],
    ['開発', b.developer],
    ['設計', b.architect],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');
}

export function buildPrompt(b) {
  const isResidence = b.buildingType === 'residence';
  return `あなたは東京の高層建築を巡る趣味のブログの書き手です。
（注: この文章は後で別のチェッカーにファクトチェックされます。確定事実に無い数値・固有名詞・断定を書くと不合格になります）
以下の建物について、紹介記事の「本文」を書いてください。

【確定している事実（これ以外の数値・固有名詞は創作しないこと）】
${factsAllowList(b)}

【厳守ルール】
- 上に無い具体的な数値（戸数・賃料・坪単価・正確な高さ等）や、確認できない固有名詞（テナント名・入居企業名・著名な居住者など）は書かない。不明な点は触れない。
- 裏付けのない推測・一般化を書かない。例:「スタートアップが入居しやすい」「〜な層が集まる」「〜で賑わう」など、確定事実に無い属性や利用者像を勝手に補わない。
- ${isResidence ? 'マンションは「建築・街並み」としての視点に徹し、居住者の個人情報・相場予想・投資助言は書かない。' : 'オフィスビルとして、街への影響や再開発の文脈を中心に書く。'}
- 事実の断定が難しい箇所は「〜とされる」「〜と言われる」など控えめな表現にする。推測表現は記事全体で2回までに抑える。

【書式】
- Markdown形式。本文のみを出力（記事タイトルのH1「# 」やfront matterは書かない。本文はH2「## 」見出しから始める）。
- 見出し（##）を2〜3個、最後は必ず「## まとめ」。
- 全体で900〜1200字に必ず収める（1200字を超えない）。冗長な言い換えや感想の繰り返しを避け、簡潔に。
- 落ち着いた、街歩きエッセイと建築解説の中間のトーン。

本文だけを出力してください。`;
}

// 再生成時に、前回の指摘を踏まえて直させるための追記。
export function buildFixSuffix(issues) {
  return `\n\n【前回のファクトチェックでの指摘（必ず修正すること）】\n${issues
    .map((s) => `- ${s}`)
    .join('\n')}\n上記の問題を取り除き、確定事実だけに基づいて書き直してください。`;
}

// ---- 英語版 ----
// 英語記事も「事実は与えたものだけ」を厳守する。固有名詞は seed の *_en を出典にする。
function factsAllowListEn(b) {
  const typeLabel = b.buildingType === 'office' ? 'office building' : 'residential building';
  return [
    ['Name', b.title_en || b.title],
    ['Use', typeLabel],
    ['Area', b.area_en || b.area],
    ['Completed', b.completedYear ? `${b.completedYear}` : null],
    ['Floors above ground', b.floorsAbove ? `${b.floorsAbove}` : null],
    ['Floors below ground', b.floorsBelow ? `${b.floorsBelow}` : null],
    ['Height', b.heightM ? `${b.heightM} m` : null],
    ['Total floor area', b.totalFloorAreaM2 ? `${b.totalFloorAreaM2} m²` : null],
    ['Developer', b.developer_en || b.developer],
    ['Architect', b.architect_en || b.architect],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');
}

export function buildEnPrompt(b) {
  const isResidence = b.buildingType === 'residence';
  return `You are the writer of a hobby blog touring Tokyo's high-rise architecture, writing for an international audience (including tourists).
(Note: this text will later be fact-checked by a separate checker. Stating numbers, proper nouns or assertions not in the confirmed facts will fail the check.)
Write the "body" of an introductory article about the following building.

[Confirmed facts (do NOT invent any number or proper noun beyond these)]
${factsAllowListEn(b)}

[Strict rules]
- Do not write specific figures not listed above (number of units, rent, price per tsubo, exact height, etc.) or proper nouns you cannot confirm (tenant names, resident companies, famous residents, etc.). Do not mention things you are unsure of.
- Do not write unfounded speculation or generalizations (e.g. "popular with startups", "attracts a certain crowd", "always bustling"). Do not invent attributes or types of users not in the confirmed facts.
- ${isResidence ? 'For residences, stay strictly on "architecture and streetscape"; do not write residents\' personal information, price forecasts or investment advice.' : 'As an office building, focus on its impact on the city and the context of redevelopment.'}
- Where a fact is hard to assert, use hedged expressions ("is said to", "reportedly"). Limit such hedges to about twice across the whole article.

[Format]
- Markdown. Output the body only (no H1 title, no front matter; start from an H2 "## " heading).
- Use 2-3 headings (##); the final one must be "## Summary".
- Keep the whole article to roughly 500-750 words. Avoid redundant restatement; be concise.
- A calm tone, midway between a city-walk essay and architectural commentary. Natural, fluent English (not a literal translation).

Output the body only.`;
}

export function buildEnVerifyPrompt(b, body) {
  return `You are a strict fact-checker. Check whether the following blog body contains assertive factual claims that cannot be backed up by the "confirmed facts" alone.

[Confirmed facts (the only verified information)]
${factsAllowListEn(b)}

[Rules]
- Flag the following "assertions beyond the confirmed facts":
  - Specific numbers, years, areas, unit counts, rankings (e.g. "tallest in Japan", "largest in Tokyo")
  - Proper nouns not in the confirmed facts (tenant names, resident companies, personal names, awards, etc.)
  - Assertive historical claims ("the first to...", "in year X, Y happened") not in the confirmed facts
- Do not flag general/common geographic descriptions, or clearly hedged expressions ("is said to", "reportedly").
- When in doubt, flag it (judge strictly).

[Output] Output ONLY this JSON (no surrounding text or markdown):
{"ok": true, "issues": []}
or
{"ok": false, "issues": ["the problematic statement and why", "..."]}
ok is true only when there are zero issues.

[Body to verify]
${body}`;
}

export function buildEnFixSuffix(issues) {
  return `\n\n[Issues raised in the previous fact-check (must be fixed)]\n${issues
    .map((s) => `- ${s}`)
    .join('\n')}\nRemove the above problems and rewrite based only on the confirmed facts.`;
}

// 生成済み本文を「確定事実」に照らして検証するプロンプト。
// 事実を超える断定（数値・年・固有名詞・序数/最上級など）を検出させる。
export function buildVerifyPrompt(b, body) {
  return `あなたは厳格なファクトチェッカーです。以下のブログ本文に、「確定している事実」だけでは裏付けられない断定的な事実主張が含まれていないか確認してください。

【確定している事実（これだけが裏付け済み）】
${factsAllowList(b)}

【判定ルール】
- 次のような「確定事実に無い断定」を問題として検出する:
  - 具体的な数値・年・面積・戸数・順位（例「日本一高い」「都内一の規模」）
  - 確定事実に無い固有名詞（テナント名・入居企業・人名・受賞名など）
  - 断定的な歴史的事実（「〜が初めて」「〜年に〜が起きた」等で確定事実に無いもの）
- 一般的・常識的な地理の説明や、「〜とされる」「〜と言われる」等の明確にぼかした表現は問題としない。
- 迷ったら問題として挙げる（厳しめに判定）。

【出力】次のJSONのみを出力（前後に説明文やマークダウンを付けない）:
{"ok": true, "issues": []}
または
{"ok": false, "issues": ["問題のある記述と理由", "..."]}
okは問題が1件も無いときだけ true。

【検証対象の本文】
${body}`;
}
