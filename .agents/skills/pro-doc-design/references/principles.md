# 資料デザインの原則（リサーチまとめ）

2026年10月時点のウェブ調査をもとに、プロ（コンサルタント、プレゼンデザイナー、研究者、教育機関）の考え方を
自分の言葉で要約したもの。数値の目安は出典によって幅があるため、「目安」として扱う。

## 1. 構成（何を・どの順で言うか）

| 原則 | 中身 | 出典 |
|---|---|---|
| ピラミッド構造 | 結論を最初に置き、その下に理由をまとめ、さらに根拠を置く。マッキンゼー出身のバーバラ・ミントが体系化 | SlideModel, Piktochart |
| アクションタイトル | タイトルは話題名ではなく「結論の文」。タイトルだけを順に読めば全体の主張がわかる（ページめくりテスト） | ChatSlide, Deckary |
| ゴーストデッキ | デザインの前に、全ページのタイトル（＋図の簡単なスケッチ）だけで資料を組み、論理の穴を先に見つける | Piktochart, thinkinsights |
| SCQA | 導入は「状況 → 問題 → 問い → 答え」。ピラミッドの頂点への入り方 | SlideModel |
| MECE・1ページ1メッセージ | 分類はモレなくダブりなく。1ページに言うことは1つ | ChatSlide |
| 非冗長性・Less is More | 同じ内容を重複させず、必要最小限の情報にする（山口周『外資系コンサルのスライド作成術』の講座内容） | セミナー情報 |
| 主張＋根拠（Assertion-Evidence） | タイトルに主張の文、本文は箇条書きではなく図・写真・グラフ。理解と記憶が有意に良かったという研究がある（反対意見もあり） | Penn State（Alley）, Farkas |
| 社内プレゼンは短く | キーメッセージは短い1文、社内プレゼンは5〜9枚程度という考え方（前田鎌利氏の書籍の紹介・レビュー） | 紀伊國屋書店, ダイヤモンド・オンライン |

## 2. 見た目（どう見せるか）

| 原則 | 中身 | 出典 |
|---|---|---|
| 4原則 | 近接（関係するものは近く）・整列（意図した位置にそろえる）・反復（色や形を繰り返して統一）・コントラスト（違いははっきり）。Robin Williams『ノンデザイナーズ・デザインブック』 | ＠IT, Qiita ほか |
| 3秒ルール（Glance Test） | 1枚の要点が約3秒で伝わるか。看板のように一目でわかるスライドにする。経験則で、実験結果ではない | Duarte |
| 余計なものを削る（一貫性の原理） | 関係のない言葉・絵・音を除いたほうが学習効果が高い。強調の合図（矢印・吹き出し）は効果あり。分割して見せると理解しやすい（Mayer のマルチメディア学習の原理） | Dartmouth, OSU ほか |
| 文字と話の重複を避ける | 図＋話し言葉に、同じ文章を画面に重ねると理解が下がる（冗長性の原理）。発表用スライドに原稿を書かない理由 | 同上 |
| 装飾を減らす | 内容と関係のないロゴやイラストはノイズになる | 広島大学の資料 |

## 3. 文字

- 和文はゴシック体、欧文はサンセリフ体を合わせると投影でも読みやすい。テーマのフォント設定で一括指定する。
- 文字サイズの目安（投影）：タイトル32〜44pt、本文18〜24pt、最低でも本文18pt。配布用は小さくてよい。
- 行間は文字サイズの1.2〜1.5倍。メイリオは行間が広く出やすいので、行間は数値で指定する。
- 太字は本物の太字（ウェイト）がある書体を使う。擬似太字は強調にならない。
- Meiryo UI は字間が詰まっていて情報量の多い資料向き。游ゴシックは字面が小さめで読みやすい。
- このスキルの既定は BIZ UDPゴシック：Windows 10以降に標準で入っており、オープンソース版があるため、作成環境でも同じ字幅で改行を確認できる。

出典：MiriCanvas、Document Studio、kakenhi.com、SMBCビジネスクラブ ほか

## 4. 色

- 色は「ベース・メイン・アクセント」の3色前後に絞る（4色とする解説もある）。装飾を足すより色数とフォントを減らすほうが近道。
- カラーユニバーサルデザイン：東京大学などが作った推奨配色セットがある。赤と黒が同じに見える人がいるため、赤は橙に替える例がある。色だけで区別せず、シミュレータで確認する。
- 文字と背景のコントラストは、WCAGの本文基準 4.5:1 が目安。

出典：MarkeZine、Gamma、DIME、東京大学プレスリリース、鳥取県・山梨県のガイド、日本心理学会

## 5. 図解とデータ

- 図解の型の使い分け：比較→表・マトリクス・ベン図、手順・時間→フロー・ステップ、階層→ピラミッド・ツリー、循環→サイクル。
  ほとんどの図解は「四角と矢印」の発展形。
- データの見せ方（Knaflic『Storytelling with Data』）：文脈を決め → 合う図を選び → 余計なものを削り → 見てほしい所に注意を向ける。
  枠線・目盛り線を消し、強調したい系列だけ色を付ける。
- Tufte のデータインク比：消しても情報が減らない要素は削る。ただし削りすぎて読めなくなる批判もある。
- 同じ尺度・同じ形の小さなグラフを並べる（スモールマルチプル）と比較しやすい。

出典：ITmedia、Microsoft（SmartArt の選び方）、Kellogg Insight、freshspectrum、Towards Data Science

## 6. 投影用と配布用

- 投影用は話し手が補足する前提でキーワード中心。配布用は読むだけで意味が通る文にしてよい。
- 配布用ではアニメーションが機能しないので、段階的に重ねて見せる図は最終状態で完結させる。
- 投影用を完成させてから複製して配布用にすると、二重管理を避けられる。

出典：医学書院、北海道大学、名古屋大学、tsigeto.info

## 7. Excel

- 文字は左揃え・数値は右揃え。単位は専用の列か見出しに書き、桁区切りを付ける。
- 罫線は最小限。格子罫線はどの表も同じに見える。シートの枠線を非表示にするとすっきりする。
- 派手な背景色やフォントの混在は見づらさの原因。白黒印刷なら色より太字で強調。
- 財務モデルの標準（FAST）：シートを入力・計算・出力に分ける、全シートで列の構成をそろえる、同じ計算を二度しない、結合セルを避ける。
- 入力セルは青字・数式は黒字という色分けは広く使われる慣行（今回の検索では一次資料を確認できず）。

出典：窓の杜、マネーフォワード、eFinancialModels、FAST Standard 解説

## 8. 動き（アニメーション）

- 効果は控えめに（フェード・ワイプ程度）、デッキ全体で1種類に統一、時間は短く。回転・バウンドは避ける。
- 動きは内容を支えるためだけに使う。箇条や図を1つずつ見せて、情報を一度に浴びせない。
- 変形（Morph）は共通の要素があるページ間で効く。変化が多すぎると予想外の動きになる。
- 根拠は主に制作会社の経験則。研究面では、分割して見せる（segmenting）・合図を出す（signaling）が支持されている。

出典：SlideGenius、InfoDiagram、Plus AI、Mayer の原理の解説

## 出典URL（調査時に参照）
- 構成：https://slidemodel.com/mckinsey-presentation-structure/ ／ https://piktochart.com/blog/mckinsey-style-presentation ／ https://www.chatslide.ai/guides/mckinsey-consulting-style-slides ／ https://deckary.com/blog/mckinsey-style-slides ／ https://thinkinsights.net/consulting/storyboard
- コンサルの作法：https://www.seminar-info.jp/entry/seminars/view_print/3/2971 ／ https://www.softbank.jp/business/content/blog/202401/presentation-techniques ／ https://www.kinokuniya.co.jp/f/dsg-01-9784478115152
- Assertion-Evidence：https://writing.engr.psu.edu/research.html ／ https://faculty.washington.edu/farkas/dfpubs/Farkas-Assessment%20Of%20Alleys%20Slide%20Design.pdf
- Glance Test：https://www.duarte.com/resources/guides-tools/the-glance-test/
- Mayer の原理：https://services.dartmouth.edu/TDClient/1806/Portal/KB/PrintArticle?ID=171655 ／ https://u.osu.edu/multimedialearning/?p=11
- 4原則：https://atmarkit.itmedia.co.jp/ait/articles/1502/13/news014.html ／ https://qiita.com/SawakoMasuda/items/222f8ee825f83b06fc6a
- 基本ルール：https://markezine.jp/article/detail/31592 ／ https://gamma.app/ja/insights/beyond-bullet-points-smarter-slide-design-in-gamma ／ https://dime.jp/genre/2076448/ ／ https://aidi.hiroshima-u.ac.jp/consortium/wp-content/uploads/2024/05/academic_presen-2_1.pdf
- フォント：https://www.miricanvas.com/learn/ja/powerpoint-stylish-fonts ／ https://studio.virtual-planner.com/powerpoint-font/ ／ https://kakenhi.com/archives/presentation/english-fonts-pairing ／ https://infolounge.smbcc-businessclub.jp/articles/1627
- 色覚・配色：https://www.u-tokyo.ac.jp/focus/ja/press/p01_210430.html ／ https://www.pref.tottori.lg.jp/243945.htm ／ https://psych.or.jp/publication/world_pdf/68/68-27-28.pdf
- データ表現：https://insight.kellogg.northwestern.edu/article/do-people-understand-your-data-visualizations ／ https://freshspectrum.com/data-ink-ratio/ ／ https://explainthedata.substack.com/p/youre-probably-deleting-too-much
- 図解：https://www.itmedia.co.jp/bizid/articles/0912/01/news039_2.html ／ https://support.microsoft.com/ja-JP/Office/graphics-visuals/choose-a-smartart-graphic
- 投影と配布：https://www.igaku-shoin.co.jp/application/files/3017/0718/6190/3553_03.pdf ／ https://eprints.lib.hokudai.ac.jp/repo/huscap/all/59537/academicskil06.pdf
- Excel：https://forest.watch.impress.co.jp/docs/serial/exceltips/1218115.html ／ https://biz.moneyforward.com/work-efficiency/basic/20114/ ／ https://www.efinancialmodels.com/formatting-and-design-matters/ ／ https://practicepro.accountingcpd.net/FAST_Standard%3A_The_4_Basic_Principles
- 動き：https://blog.infodiagram.com/2021/12/powerpoint-animation-secrets-ppt.html ／ https://plusai.com/blog/the-best-powerpoint-transitions-with-example-gifs ／ https://thebricks.com/resources/how-to-morph-in-powerpoint
- 改行：https://github.com/google/budoux ／ https://developers-jp.googleblog.com/2023/09/
