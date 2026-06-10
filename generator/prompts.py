"""建物データ(事実)から記事『本文のみ』を生成/検証するプロンプト群。

重要: 事実は与えたものだけを使い、数値・固有名詞を創作させない。
(Node版 prompts.mjs からの移植。文面は同一)
"""


def _facts_allow_list(b):
    type_label = "オフィスビル" if b.get("buildingType") == "office" else "マンション"
    rows = [
        ("名称", b.get("title")),
        ("用途", type_label),
        ("エリア", b.get("area")),
        ("所在地", b.get("address")),
        ("竣工年", f"{b['completedYear']}年" if b.get("completedYear") else None),
        ("地上階数", f"{b['floorsAbove']}階" if b.get("floorsAbove") else None),
        ("高さ", f"{b['heightM']}m" if b.get("heightM") else None),
        ("延床面積", f"{b['totalFloorAreaM2']}㎡" if b.get("totalFloorAreaM2") else None),
        ("開発", b.get("developer")),
        ("設計", b.get("architect")),
    ]
    return "\n".join(f"- {k}: {v}" for k, v in rows if v)


def build_prompt(b):
    is_residence = b.get("buildingType") == "residence"
    residence_rule = (
        "マンションは「建築・街並み」としての視点に徹し、居住者の個人情報・相場予想・投資助言は書かない。"
        if is_residence
        else "オフィスビルとして、街への影響や再開発の文脈を中心に書く。"
    )
    return f"""あなたは東京の高層建築を巡る趣味のブログの書き手です。
（注: この文章は後で別のチェッカーにファクトチェックされます。確定事実に無い数値・固有名詞・断定を書くと不合格になります）
以下の建物について、紹介記事の「本文」を書いてください。

【確定している事実（これ以外の数値・固有名詞は創作しないこと）】
{_facts_allow_list(b)}

【厳守ルール】
- 上に無い具体的な数値（戸数・賃料・坪単価・正確な高さ等）や、確認できない固有名詞（テナント名・入居企業名・著名な居住者など）は書かない。不明な点は触れない。
- 裏付けのない推測・一般化を書かない。例:「スタートアップが入居しやすい」「〜な層が集まる」「〜で賑わう」など、確定事実に無い属性や利用者像を勝手に補わない。
- {residence_rule}
- 事実の断定が難しい箇所は「〜とされる」「〜と言われる」など控えめな表現にする。推測表現は記事全体で2回までに抑える。

【書式】
- Markdown形式。本文のみを出力（記事タイトルのH1「# 」やfront matterは書かない。本文はH2「## 」見出しから始める）。
- 見出し（##）を2〜3個、最後は必ず「## まとめ」。
- 全体で900〜1200字に必ず収める（1200字を超えない）。冗長な言い換えや感想の繰り返しを避け、簡潔に。
- 落ち着いた、街歩きエッセイと建築解説の中間のトーン。

本文だけを出力してください。"""


def build_fix_suffix(issues):
    bullets = "\n".join(f"- {s}" for s in issues)
    return (
        f"\n\n【前回のファクトチェックでの指摘（必ず修正すること）】\n{bullets}\n"
        "上記の問題を取り除き、確定事実だけに基づいて書き直してください。"
    )


def build_verify_prompt(b, body):
    return f"""あなたは厳格なファクトチェッカーです。以下のブログ本文に、「確定している事実」だけでは裏付けられない断定的な事実主張が含まれていないか確認してください。

【確定している事実（これだけが裏付け済み）】
{_facts_allow_list(b)}

【判定ルール】
- 次のような「確定事実に無い断定」を問題として検出する:
  - 具体的な数値・年・面積・戸数・順位（例「日本一高い」「都内一の規模」）
  - 確定事実に無い固有名詞（テナント名・入居企業・人名・受賞名など）
  - 断定的な歴史的事実（「〜が初めて」「〜年に〜が起きた」等で確定事実に無いもの）
- 一般的・常識的な地理の説明や、「〜とされる」「〜と言われる」等の明確にぼかした表現は問題としない。
- 迷ったら問題として挙げる（厳しめに判定）。

【出力】次のJSONのみを出力（前後に説明文やマークダウンを付けない）:
{{"ok": true, "issues": []}}
または
{{"ok": false, "issues": ["問題のある記述と理由", "..."]}}
okは問題が1件も無いときだけ true。

【検証対象の本文】
{body}"""


# ---- 英語版 ----
def _facts_allow_list_en(b):
    type_label = "office building" if b.get("buildingType") == "office" else "residential building"
    rows = [
        ("Name", b.get("title_en") or b.get("title")),
        ("Use", type_label),
        ("Area", b.get("area_en") or b.get("area")),
        ("Completed", f"{b['completedYear']}" if b.get("completedYear") else None),
        ("Floors above ground", f"{b['floorsAbove']}" if b.get("floorsAbove") else None),
        ("Floors below ground", f"{b['floorsBelow']}" if b.get("floorsBelow") else None),
        ("Height", f"{b['heightM']} m" if b.get("heightM") else None),
        ("Total floor area", f"{b['totalFloorAreaM2']} m²" if b.get("totalFloorAreaM2") else None),
        ("Developer", b.get("developer_en") or b.get("developer")),
        ("Architect", b.get("architect_en") or b.get("architect")),
    ]
    return "\n".join(f"- {k}: {v}" for k, v in rows if v)


def build_en_prompt(b):
    is_residence = b.get("buildingType") == "residence"
    residence_rule = (
        'For residences, stay strictly on "architecture and streetscape"; do not write residents\' '
        "personal information, price forecasts or investment advice."
        if is_residence
        else "As an office building, focus on its impact on the city and the context of redevelopment."
    )
    return f"""You are the writer of a hobby blog touring Tokyo's high-rise architecture, writing for an international audience (including tourists).
(Note: this text will later be fact-checked by a separate checker. Stating numbers, proper nouns or assertions not in the confirmed facts will fail the check.)
Write the "body" of an introductory article about the following building.

[Confirmed facts (do NOT invent any number or proper noun beyond these)]
{_facts_allow_list_en(b)}

[Strict rules]
- Do not write specific figures not listed above (number of units, rent, price per tsubo, exact height, etc.) or proper nouns you cannot confirm (tenant names, resident companies, famous residents, etc.). Do not mention things you are unsure of.
- Do not write unfounded speculation or generalizations (e.g. "popular with startups", "attracts a certain crowd", "always bustling"). Do not invent attributes or types of users not in the confirmed facts.
- {residence_rule}
- Where a fact is hard to assert, use hedged expressions ("is said to", "reportedly"). Limit such hedges to about twice across the whole article.

[Format]
- Markdown. Output the body only (no H1 title, no front matter; start from an H2 "## " heading).
- Use 2-3 headings (##); the final one must be "## Summary".
- Keep the whole article to roughly 500-750 words. Avoid redundant restatement; be concise.
- A calm tone, midway between a city-walk essay and architectural commentary. Natural, fluent English (not a literal translation).

Output the body only."""


def build_en_verify_prompt(b, body):
    return f"""You are a strict fact-checker. Check whether the following blog body contains assertive factual claims that cannot be backed up by the "confirmed facts" alone.

[Confirmed facts (the only verified information)]
{_facts_allow_list_en(b)}

[Rules]
- Flag the following "assertions beyond the confirmed facts":
  - Specific numbers, years, areas, unit counts, rankings (e.g. "tallest in Japan", "largest in Tokyo")
  - Proper nouns not in the confirmed facts (tenant names, resident companies, personal names, awards, etc.)
  - Assertive historical claims ("the first to...", "in year X, Y happened") not in the confirmed facts
- Do not flag general/common geographic descriptions, or clearly hedged expressions ("is said to", "reportedly").
- When in doubt, flag it (judge strictly).

[Output] Output ONLY this JSON (no surrounding text or markdown):
{{"ok": true, "issues": []}}
or
{{"ok": false, "issues": ["the problematic statement and why", "..."]}}
ok is true only when there are zero issues.

[Body to verify]
{body}"""


def build_en_fix_suffix(issues):
    bullets = "\n".join(f"- {s}" for s in issues)
    return (
        f"\n\n[Issues raised in the previous fact-check (must be fixed)]\n{bullets}\n"
        "Remove the above problems and rewrite based only on the confirmed facts."
    )
