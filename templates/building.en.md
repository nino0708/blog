---
# === 言語依存テキストのみ。数値の事実は同一slugのJP版から自動で補完される ===
# slug は必ずJP版(site/src/content/buildings/<slug>.md)と一致させること。
title: "＜English building name＞"
area: "＜Area. e.g. Minato City＞"
summary: "＜One or two sentence summary for the list card＞"
developer: "＜Developer in English＞"   # 不要なら行ごと削除
architect: "＜Architect in English＞"   # 不要なら行ごと削除
tags: ["＜Area＞", "Skyscraper", "Redevelopment"]
---

<!--
Body rules (same standard as the generator prompt):
- Output the body only. Start from an H2 "## ". No H1, no front matter.
- 2–3 headings (##). The final one must be "## Summary".
- Use only the facts present in the JP version. Do not invent numbers or proper nouns.
- For residence, keep an architecture/streetscape angle. No price forecasts or investment advice.
- Calm tone, between a city-walk essay and an architecture explainer.
Delete this HTML comment before saving.
-->

## ＜A hook heading＞

＜Intro using only the confirmed facts (area / year / floors / height) carried from the JP version.＞

## ＜A context heading＞

＜The main body: why it was built there, how it changed the cityscape.＞

## Summary

＜Recap the year / floors / height once and close with the building's significance, ending with an invitation to walk the city.＞
