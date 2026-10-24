/**
 * cloud_art.js — style: "cloud" の背景イラスト（オリジナル・SVG → PNG）。
 *   coverArt({ wIn, hIn, motif })  表紙：濃紺のグラデーション＋光＋ドットの格子＋回路の線＋雲＋モチーフ
 *   pageArt({ wIn, hIn, bandIn })  本文：淡い青の面＋上部の濃紺の帯（回路と小さな雲）＋右下の薄い回路
 * motif: "chat"（会話の吹き出し：AI・相談・対話）／"ops"（監視画面とチェック：運用・業務）／"none"
 * 戻り値は pptxgenjs の data 形式（"image/png;base64,..."）。sharp が必要。
 */
const path = require("path");
const { createRequire } = require("module");
const cwdRequire = createRequire(path.join(process.cwd(), "noop.js"));
const sharp = (() => { try { return cwdRequire("sharp"); } catch (e) { return require("sharp"); } })();

const PX = 2338; // 横幅のピクセル数（A4横で200dpi相当）

// 円を重ねた雲の形（左下 cx,cy を基準に s 倍）
function cloud(cx, cy, s) {
  return `M ${cx - 150 * s} ${cy} a ${70 * s} ${70 * s} 0 0 1 ${40 * s} ${-118 * s} a ${95 * s} ${95 * s} 0 0 1 ${170 * s} ${-60 * s} a ${115 * s} ${115 * s} 0 0 1 ${190 * s} ${40 * s} a ${80 * s} ${80 * s} 0 0 1 ${95 * s} ${138 * s} Z`;
}
const dots = (W, H, step, r, y0 = 0) => {
  const out = [];
  for (let x = step * 0.7; x < W; x += step) for (let y = y0 + step * 0.7; y < H; y += step) out.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r}"/>`);
  return out.join("");
};

function motifSvg(motif) {
  if (motif === "chat") {
    return `<rect x="1440" y="300" width="300" height="150" rx="34" fill="#EC7211"/>
    <path d="M 1500 446 L 1480 510 L 1560 446 Z" fill="#EC7211"/>
    <g fill="#FFFFFF"><circle cx="1530" cy="375" r="16"/><circle cx="1590" cy="375" r="16"/><circle cx="1650" cy="375" r="16"/></g>
    <rect x="1820" y="400" width="360" height="160" rx="34" fill="#2EC4E6"/>
    <path d="M 2120 556 L 2150 620 L 2060 556 Z" fill="#2EC4E6"/>
    <g fill="#0B1626" opacity="0.8"><rect x="1870" y="450" width="240" height="18" rx="9"/><rect x="1870" y="492" width="170" height="18" rx="9"/></g>`;
  }
  if (motif === "ops") {
    // 監視画面（折れ線＋状態の行）と、完了のチェック、通知のベル
    return `<g>
      <rect x="1400" y="250" width="560" height="360" rx="30" fill="#0F2036" stroke="#2EC4E6" stroke-width="4" opacity="0.96"/>
      <rect x="1400" y="250" width="560" height="64" rx="30" fill="#1D3557"/><rect x="1400" y="290" width="560" height="24" fill="#1D3557"/>
      <g fill="#8FB8DE"><circle cx="1442" cy="282" r="10"/><circle cx="1476" cy="282" r="10"/><circle cx="1510" cy="282" r="10"/></g>
      <polyline points="1440,520 1520,470 1590,500 1670,410 1750,440 1830,370 1910,395" fill="none" stroke="#2EC4E6" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>
      <g fill="#2EC4E6"><circle cx="1670" cy="410" r="11"/><circle cx="1830" cy="370" r="11"/></g>
      <g fill="#3B5878"><rect x="1440" y="550" width="200" height="16" rx="8"/><rect x="1660" y="550" width="120" height="16" rx="8"/></g>
    </g>
    <circle cx="1975" cy="610" r="88" fill="#EC7211"/>
    <path d="M 1932 612 L 1964 644 L 2022 582" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
    <g transform="translate(2120 300)">
      <rect x="-80" y="-70" width="160" height="150" rx="40" fill="#2EC4E6"/>
      <path d="M -36 30 V -6 a 36 36 0 0 1 72 0 V 30 Z" fill="#0B1626" opacity="0.8"/>
      <rect x="-46" y="28" width="92" height="12" rx="6" fill="#0B1626" opacity="0.8"/><circle cx="0" cy="52" r="9" fill="#0B1626" opacity="0.8"/>
    </g>`;
  }
  return "";
}

function coverSvg({ wIn = 11.69, hIn = 8.27, motif = "chat" } = {}) {
  const W = PX, H = Math.round(PX * hIn / wIn);
  const circuits = [
    `M 0 ${H - 274} H 520 L 600 ${H - 354} H 1120 L 1240 ${H - 474} H 1480`,
    `M 0 ${H - 174} H 760 L 840 ${H - 254} H 1360 L 1500 ${H - 394} H 1640`,
    `M 980 ${H} V ${H - 154} L 1060 ${H - 234} H 1560 L 1680 ${H - 354}`,
    `M ${W} 260 H 2120 L 2040 340 H 1880`,
    `M ${W} ${H - 94} H 2060 L 1960 ${H - 194} H 1820`,
  ];
  const nodes = [[1480, H - 474], [1640, H - 394], [1680, H - 354], [1880, 340], [1820, H - 194], [600, H - 354], [840, H - 254], [1060, H - 234]];
  const cy = Math.min(900, H - 300);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B1626"/><stop offset="0.55" stop-color="#15263F"/><stop offset="1" stop-color="#1D3557"/></linearGradient>
    <radialGradient id="glowO" cx="0.78" cy="0.38" r="0.42"><stop offset="0" stop-color="#EC7211" stop-opacity="0.35"/><stop offset="1" stop-color="#EC7211" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowC" cx="0.92" cy="0.85" r="0.45"><stop offset="0" stop-color="#2EC4E6" stop-opacity="0.28"/><stop offset="1" stop-color="#2EC4E6" stop-opacity="0"/></radialGradient>
    <linearGradient id="cloudFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#CFE6F5"/></linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0B1626" stop-opacity="0.85"/><stop offset="0.5" stop-color="#0B1626" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glowO)"/>
  <rect width="${W}" height="${H}" fill="url(#glowC)"/>
  <g fill="#8FB8DE" opacity="0.13">${dots(W, H, 56, 2.2)}</g>
  <g fill="none" stroke="#2EC4E6" stroke-width="3" opacity="0.45">${circuits.map((d) => `<path d="${d}"/>`).join("")}</g>
  <g fill="#2EC4E6">${nodes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join("")}</g>
  <path d="${cloud(1560, cy - 300, 1.35)}" fill="none" stroke="#8FB8DE" stroke-width="4" opacity="0.35"/>
  <path d="${cloud(1850, cy + 180, 0.9)}" fill="#FFFFFF" opacity="0.10"/>
  <path d="${cloud(1700, cy, 1.5)}" fill="url(#cloudFill)" opacity="0.96"/>
  <g stroke="#1D3557" stroke-width="5" fill="none" opacity="0.55">
    <path d="M 1570 ${cy - 100} L 1690 ${cy - 180} L 1830 ${cy - 110} L 1950 ${cy - 180} M 1690 ${cy - 180} L 1750 ${cy - 60} L 1830 ${cy - 110}"/>
  </g>
  <g fill="#146EB4"><circle cx="1570" cy="${cy - 100}" r="14"/><circle cx="1690" cy="${cy - 180}" r="16"/><circle cx="1830" cy="${cy - 110}" r="14"/><circle cx="1950" cy="${cy - 180}" r="14"/><circle cx="1750" cy="${cy - 60}" r="12"/></g>
  ${motifSvg(motif)}
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
</svg>`;
}

function pageSvg({ wIn = 11.69, hIn = 8.27, bandIn = 1.31 } = {}) {
  const W = PX, H = Math.round(PX * hIn / wIn), B = Math.round(PX * bandIn / wIn);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="page" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#E9F1FA"/><stop offset="1" stop-color="#F5F8FC"/></linearGradient>
    <linearGradient id="band" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#0B1626"/><stop offset="0.6" stop-color="#15263F"/><stop offset="1" stop-color="#1D3557"/></linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.5" r="0.5"><stop offset="0" stop-color="#EC7211" stop-opacity="0.28"/><stop offset="1" stop-color="#EC7211" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#page)"/>
  <g fill="#9DB6D3" opacity="0.22">${dots(W, H, 52, 2, B)}</g>
  <g fill="none" stroke="#9DC6E8" stroke-width="3" opacity="0.55">
    <path d="M ${W} ${H - 234} H 2100 L 2010 ${H - 144} H 1760"/><path d="M ${W} ${H - 154} H 2180 L 2080 ${H - 54} H 1900 L 1850 ${H}"/>
  </g>
  <g fill="#9DC6E8" opacity="0.7"><circle cx="1760" cy="${H - 144}" r="8"/><circle cx="1900" cy="${H - 54}" r="8"/></g>
  <path d="${cloud(2080, H - 254, 1.1)}" fill="none" stroke="#C3D7EC" stroke-width="4" opacity="0.6"/>
  <rect width="${W}" height="${B}" fill="url(#band)"/>
  <rect width="${W}" height="${B}" fill="url(#glow)"/>
  <g fill="none" stroke="#2EC4E6" stroke-width="3" opacity="0.5">
    <path d="M 1500 ${B} V ${B - 42} L 1560 ${B - 102} H 1780 L 1840 ${B - 162} H ${W}"/><path d="M 1700 ${B} L 1760 ${B - 62} H 1960 L 2020 ${B - 122}"/>
  </g>
  <g fill="#2EC4E6"><circle cx="1560" cy="${B - 102}" r="8"/><circle cx="2020" cy="${B - 122}" r="8"/><circle cx="1960" cy="${B - 62}" r="7"/></g>
  <path d="${cloud(2160, B - 52, 0.75)}" fill="#FFFFFF" opacity="0.14"/>
  <path d="${cloud(1980, B - 142, 0.45)}" fill="none" stroke="#8FB8DE" stroke-width="3" opacity="0.5"/>
</svg>`;
}

const toData = async (svg) => "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
module.exports = {
  coverArt: (o) => toData(coverSvg(o)),
  pageArt: (o) => toData(pageSvg(o)),
  coverSvg, pageSvg,
};
