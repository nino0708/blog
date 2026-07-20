// 記事本文(Markdown)中の楽天トラベルへの生リンクを、成果が発生するアフィリリンクに張り替える。
//
// 背景: 各記事の「○○周辺のホテルをお探しなら[楽天トラベル](https://travel.rakuten.co.jp/)」は
// アフィリラップされておらず、クリックされても成果ゼロ＝PRとして機能していなかった。さらに
// 飛び先が楽天トラベルのトップで、宿一覧が出ない。
//
// 対策: 本文リンクを (1)確実に宿が並ぶURLへ向け (2)affiliate.ts と同じ転送形式で
// アフィリIDでラップする。IDはビルド時 env(PUBLIC_RAKUTEN_AFFILIATE_ID)から取得し、リポジトリには
// 埋め込まない。ID未設定なら素のURL(成果なし)にフォールバックする。
// 区単位の静的URL(例: ikebukuro.html)は保持し、ルートへのリンクのみ東京23区一覧に転送する。

const RAKUTEN_AFFILIATE_ID = process.env.PUBLIC_RAKUTEN_AFFILIATE_ID ?? '';

// 確実に宿が並ぶ静的ディレクトリ「東京23区一覧」。空室検索SPAではないので0件化しない。
const TOKYO_HOTELS_URL = 'https://travel.rakuten.co.jp/yado/tokyo/tokyo.html';

// affiliate.ts の wrapRakuten と同一のリンク転送形式。
function wrapRakuten(targetUrl) {
  if (!RAKUTEN_AFFILIATE_ID) return targetUrl;
  const enc = encodeURIComponent(targetUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${enc}&m=${enc}`;
}

// 楽天トラベルのルートURLを東京23区一覧に置き換える。
// 区単位URL(例: /yado/tokyo/ikebukuro.html)はそのまま保持する。
function resolveDestination(url) {
  try {
    const u = new URL(url, 'https://travel.rakuten.co.jp');
    const p = u.pathname.replace(/\/+$/, '');
    return (p === '' || p === '/') ? TOKYO_HOTELS_URL : url;
  } catch (_) {
    return TOKYO_HOTELS_URL;
  }
}

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
      node.url = wrapRakuten(resolveDestination(node.url));
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
