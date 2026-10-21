# CLAUDE.md

このリポジトリ（Tokyo Towers Journal）の構成と開発手順は `README.md` を参照。

## 資料・デザイン作成のルール

- 資料、スライド、プレゼン、パワポ（.pptx）、エクセル（.xlsx）の見た目、配布資料、提案書、報告書、図解、デザインの作成・修正を頼まれたら、**最初に `pro-doc-design` スキルを読み込み、その手順に従う**（`.claude/skills/pro-doc-design/SKILL.md`）。
- 進め方は「ヒアリング → 構成案（ゴーストデッキ）の確認 → 生成 → 実フォントでの確認 → 書き出し」。構成・用途（発表／配布）・向きは、作る前に質問して決める。
- 先にスライドの構成を固め、その内容から PowerPoint（編集可能）・PDF（配布用）・Excel（数字の正本）を作る。HTMLを経由して変換する方法は使わない（理由は `references/workflow.md`）。
- ファイル形式ごとの細かい操作は `anthropic-skills:pptx` / `anthropic-skills:xlsx` / `anthropic-skills:pdf` を併用する。グラフは `dataviz` スキルにも従う。
- このリポジトリは公開されている。業務資料の中身（顧客名・取引関係・社内の情報）はコミットしない。作業ファイルは scratchpad に置く。
