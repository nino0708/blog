# レイアウトと図解パターン（deck_kit.js）

## 始め方
```bash
bash <skill>/scripts/setup.sh "$WORK"                 # 足りない道具を入れる（初回のみ）
cp <skill>/examples/sample_cloud.js "$WORK/build.js"    # 見本を複製して書き換える（白地なら sample_deck.js）
cd "$WORK" && node build.js out.pptx && bash <skill>/scripts/render.sh out.pptx
```
`build.js` 内の `require` は `deck_kit.js` の絶対パスに直す。

## 用紙と基準の位置
| サイズ | 幅×高さ | タイトル | 本文の開始 | 本文の下端 | 用途 |
|---|---|---|---|---|---|
| `A4` | 11.69×8.27 | 24pt | `d.TOP`=1.15 | `d.BOTTOM`=7.55 | 配布・印刷・PDF |
| `16:9` | 13.33×7.5 | 28pt | 1.15 | 6.78 | 投影・画面共有 |

外周の余白 `d.M`=0.5、本文の幅 `d.CW`。要素の間隔は 0.25〜0.3 でそろえる。
`style: "cloud"` では本文は `d.TOP`=2.1〜`d.BOTTOM`=7.5（帯＋POINT の下）。部品と色は `style-cloud.md`。

## 図解の型の選び方
| 伝えたいこと | 型 | deck_kit |
|---|---|---|
| 全体像・一覧（種類と中身） | 区分つきの表（番号＋縦並び） | `table` + `cat` + `head`、上に `chips` |
| 時間の配分・1日の流れ・期間 | 長さに比例した帯 | `timelineBar` |
| 1つの数字で言えること | 大きな数字 | `stat` |
| 条件ごとの対応・判断 | 分類→対応の行 | `flowRows` |
| 手順・工程 | 横並びステップ（重要な工程を強調） | `steps`（`hot` と `note`） |
| 並列の要素（3〜4個） | アイコン付きカード | `cards` |
| 気づき・結論の強調 | 濃い帯 | `callout` |
| 段階的な道のり | 色が濃くなっていくカード | `roadmap` |
| 基準・チェック項目 | チェック欄つきの表 | `table` + `cat`（□ の列） |
| 2つの軸で分類 | 2×2のマトリクス | `panel` を4つ＋軸ラベル（自作） |
| 数量の比較・推移 | グラフ | `pres` の `addChart`（`dataviz` スキルに従う） |

1ページの型は1つか2つまで。3つ以上を詰めると、どこを見ればよいか分からなくなる。

## 部品（deck_kit が返すもの）
- `d.cover({title, subtitle, presenter})`：表紙（濃い背景）。
- `d.content(section, title, lead?)`：本文ページ。`title` は結論の文。`lead` はタイトルの言い換えなら書かない。
- `d.txt(slide, text, {x,y,w,h,fontSize,bold,color,wrap,build,objectName})`：文字。`wrap: true` で文節改行。
- `d.panel(slide, x,y,w,h, fill, name, line?, build?)` / `d.rect(...)`：面。
- `d.badge(slide, x,y,d, "1", fill, name)`：丸数字。
- `await d.icon(slide, "FaRocket", x,y,d, fill, name)`：react-icons（Font Awesome）の白抜きアイコン。
- `d.table(slide, rows, {x,y,w,colW,rowH,objectName})`、`d.head("見出し")`、`d.cat("区分", "補足", 色, 行数)`。
- `d.closing(slide, "締めの一言", "【所属】【氏名】", y)`。
- パターン：`chips`、`timelineBar`、`flowRows`、`steps`、`cards`、`stat`、`callout`、`roadmap`（引数は deck_kit.js のコメント参照）。
- `await d.save(file, {motion, chain})`：保存＋テーマ（色・日本語フォント）＋動き。
- 色は `d.C.text1`（濃紺）、`d.C.text2`（補助）、`d.C.background1`（白）、`d.C.background2`（薄い面）、`d.C.accent1`（強調）〜`accent6`。

パレット：`navy`（既定・信頼感）、`teal`（落ち着き）、`wine`（上品）、`mono`（白黒＋朱）。会社の色があれば `colors: { accent1: "..." }` で上書き。

## 1行に入る文字数の目安（BIZ UDPゴシック）
全角1文字の幅 ≒ 文字サイズ(pt) ÷ 72 インチ。かな・英数字はこれより狭い。

| 文字サイズ | 全角の幅 | 1インチあたり | 幅4インチの枠 |
|---|---|---|---|
| 12pt | 0.167 | 約6.0字 | 約24字 |
| 13pt | 0.181 | 約5.5字 | 約22字 |
| 14pt | 0.194 | 約5.1字 | 約20字 |
| 16pt | 0.222 | 約4.5字 | 約18字 |
| 18pt | 0.250 | 約4.0字 | 約16字 |
| 24pt | 0.333 | 約3.0字 | 約12字 |

表のセルは左右に0.1インチずつ内側の余白がある。内側の幅で計算する。

## よくある失敗と直し方
| 症状 | 直し方 |
|---|---|
| 「最新\n化」のように単語の途中で折れる | `wrap: true`、または文節で `\n` を入れる。枠を広げる |
| 枠が大きく文字がスカスカ | 枠を中身に合わせて小さくし、空いた所に別の要素を置くか、文字を大きくする |
| 表の下に大きな空白 | 行の高さを上げる（0.7〜0.95）か、表の下に補足を置く |
| 同じ説明が複数ページに出る | 1か所にまとめ、ほかは「①」「→P.4」で参照する |
| タイトルの位置がページごとに違う | `d.content` を使う（位置はレイアウトで固定） |
| PowerPointで開くと日本語が別の書体になる | `d.save` を使う（テーマに日本語フォントを書き込む） |
