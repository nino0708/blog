/**
 * plain_art.js — style: "plain" の背景（緑1色の濃淡だけ。雲＝クラウド、回路の線＝IT を控えめに入れる）。
 *   coverArt({ wIn, hIn })  表紙・締めの帯：濃い緑のグラデーション＋同系色の雲・回路・ドット
 *   pageArt({ wIn, hIn })   本文：白地＋右下にごく薄い雲と回路（文字のある所には描かない）
 * API は cloud_art.js と同じ（motif は無視する）。
 */
const path = require("path");
const { createRequire } = require("module");
const cwdRequire = createRequire(path.join(process.cwd(), "noop.js"));
const sharp = (() => { try { return cwdRequire("sharp"); } catch (e) { return require("sharp"); } })();
const PX = 2338;

// 円を重ねた雲の形（左下 cx,cy を基準に s 倍）
function cloud(cx, cy, s) {
  return `M ${cx - 150 * s} ${cy} a ${70 * s} ${70 * s} 0 0 1 ${40 * s} ${-118 * s} a ${95 * s} ${95 * s} 0 0 1 ${170 * s} ${-60 * s} a ${115 * s} ${115 * s} 0 0 1 ${190 * s} ${40 * s} a ${80 * s} ${80 * s} 0 0 1 ${95 * s} ${138 * s} Z`;
}
const dots = (x0, y0, x1, y1, step, r) => {
  const out = [];
  for (let x = x0; x < x1; x += step) for (let y = y0; y < y1; y += step) out.push(`<circle cx="${x}" cy="${y}" r="${r}"/>`);
  return out.join("");
};
const nodes = (pts, r, fill, op) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${op}"/>`).join("");

function coverSvg({ wIn = 11.69, hIn = 8.27 } = {}) {
  const W = PX, H = Math.round(PX * hIn / wIn);
  const cy = Math.round(H * 0.5);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B2B21"/><stop offset="1" stop-color="#1A5A45"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g fill="#A9CBBE" opacity="0.10">${dots(1300, 120, W, H - 120, 56, 2.4)}</g>
  <!-- 回路の線（IT） -->
  <g fill="none" stroke="#A9CBBE" stroke-width="3" opacity="0.28">
    <path d="M 0 ${H - 260} H 620 L 700 ${H - 340} H 1240 L 1340 ${H - 440} H 1520"/>
    <path d="M 0 ${H - 170} H 880 L 960 ${H - 250} H 1500 L 1600 ${H - 350} H 1700"/>
    <path d="M ${W} 240 H 2120 L 2040 320 H 1880"/>
    <path d="M ${W} ${H - 120} H 2080 L 1990 ${H - 210} H 1840"/>
  </g>
  ${nodes([[1520, H - 440], [1700, H - 350], [700, H - 340], [960, H - 250], [1880, 320], [1840, H - 210]], 9, "#A9CBBE", 0.5)}
  <!-- 雲（クラウド）：奥は線だけ、手前は淡い面 -->
  <path d="${cloud(1560, cy - 230, 1.3)}" fill="none" stroke="#A9CBBE" stroke-width="4" opacity="0.30"/>
  <path d="${cloud(1720, cy + 140, 1.6)}" fill="#A9CBBE" opacity="0.14"/>
  <path d="${cloud(1720, cy + 140, 1.6)}" fill="none" stroke="#A9CBBE" stroke-width="3" opacity="0.35"/>
  <!-- 雲の中のネットワーク -->
  <g stroke="#A9CBBE" stroke-width="4" fill="none" opacity="0.45">
    <path d="M 1580 ${cy + 40} L 1710 ${cy - 40} L 1860 ${cy + 30} L 1990 ${cy - 40} M 1710 ${cy - 40} L 1770 ${cy + 90} L 1860 ${cy + 30}"/>
  </g>
  ${nodes([[1580, cy + 40], [1710, cy - 40], [1860, cy + 30], [1990, cy - 40], [1770, cy + 90]], 13, "#A9CBBE", 0.65)}
</svg>`;
}

function pageSvg({ wIn = 11.69, hIn = 8.27 } = {}) {
  const W = PX, H = Math.round(PX * hIn / wIn);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <g fill="#C9D9D2" opacity="0.55">${dots(W - 520, H - 300, W - 40, H - 40, 40, 2)}</g>
  <path d="${cloud(W - 230, H - 70, 1.0)}" fill="#EEF4F1" stroke="#D3E1DB" stroke-width="3"/>
  <g fill="none" stroke="#D3E1DB" stroke-width="3">
    <path d="M ${W} ${H - 300} H ${W - 120} L ${W - 180} ${H - 240} H ${W - 330}"/>
    <path d="M ${W - 560} ${H} V ${H - 60} L ${W - 500} ${H - 120} H ${W - 400}"/>
  </g>
  ${nodes([[W - 330, H - 240], [W - 400, H - 120]], 7, "#C3D6CE", 1)}
</svg>`;
}

const toData = async (svg) => "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
module.exports = { coverArt: (o) => toData(coverSvg(o)), pageArt: (o) => toData(pageSvg(o)), coverSvg, pageSvg };
