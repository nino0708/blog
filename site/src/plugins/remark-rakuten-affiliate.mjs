// 記事本文(Markdown)中の楽天トラベルへの生リンクを、成果が発生するアフィリリンクに張り替える。
//
// 背景: 各記事の「○○周辺のホテルをお探しなら[楽天トラベル](https://travel.rakuten.co.jp/)」は
// アフィリラップされておらず、クリックされても成果ゼロ＝PRとして機能していなかった。さらに
// 飛び先が楽天トラベルのトップで、宿一覧が出ない。
//
// 対策: 本文リンクを (1)確実に宿が並ぶ「東京23区一覧」へ向け (2)affiliate.ts と同じ転送形式で
// アフィリIDでラップする。IDはビルド時 env(PUBLIC_RAKUTEN_AFFILIATE_ID)から取得し、リポジトリには
// 埋め込まない。ID未設定なら素の一覧URL(成果なし)にフォールバックする。
// 区単位の静的URLは楽天トラベルに存在しない(広域エリアのみ)ため、東京23区一覧を終点にする。

const RAKUTEN_AFFILIATE_ID = process.env.PUBLIC_RAKUTEN_AFFILIATE_ID ?? '';

// 確実に宿が並ぶ静的ディレクトリ「東京23区一覧」。空室検索SPAではないので0件化しない。
const TOKYO_HOTELS_URL = 'https://travel.rakuten.co.jp/yado/tokyo/tokyo.html';

// affiliate.ts の wrapRakuten と同一のリンク転送形式。
function wrapRakuten(targetUrl) {
  if (!RAKUTEN_AFFILIATE_ID) return targetUrl;
  const enc = encodeURIComponent(targetUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${enc}&m=${enc}`;
}

const AFFILIATE_URL = wrapRakuten(TOKYO_HOTELS_URL);

// travel.rakuten.co.jp を指すリンクか(スキーム有無・www有無を許容)。
const isRakutenTravel = (url) =>
  typeof url === 'string' && /^(?:https?:)?\/\/(?:www\.)?travel\.rakuten\.co\.jp\b/i.test(url);

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, visit);
  }
}

export default function remarkRakutenAffiliate() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'link' || !isRakutenTravel(node.url)) return;
      node.url = AFFILIATE_URL;
      // mdast→hast へ渡す属性。広告リンクなので nofollow sponsored、別タブで開く。
      node.data = node.data || {};
      node.data.hProperties = {
        ...(node.data.hProperties || {}),
        rel: 'nofollow sponsored noopener',
        target: '_blank',
      };
    });
  };
}
