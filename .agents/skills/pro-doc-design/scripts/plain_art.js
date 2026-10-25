/**
 * plain_art.js — style: "plain" の背景（緑1色の濃淡だけ。円弧と薄い面で控えめに飾る）。
 *   coverArt({ wIn, hIn })  表紙・締めの帯：濃い緑のグラデーション＋同系色の同心円弧
 *   pageArt({ wIn, hIn })   本文：白地＋右下のごく薄い円弧（地は白に保ち、淡い緑の面を見分けやすくする）
 * API は cloud_art.js と同じ（motif は無視する）。
 */
const path = require("path");
const { createRequire } = require("module");
const cwdRequire = createRequire(path.join(process.cwd(), "noop.js"));
const sharp = (() => { try { return cwdRequire("sharp"); } catch (e) { return require("sharp"); } })();
const PX = 2338;

const arcs = (cx, cy, radii, stroke, op, w = 3) => radii.map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${w}" opacity="${op}"/>`).join("");

function coverSvg({ wIn = 11.69, hIn = 8.27 } = {}) {
  const W = PX, H = Math.round(PX * hIn / wIn);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B2B21"/><stop offset="1" stop-color="#1A5A45"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="${W - 260}" cy="${H * 0.3}" r="520" fill="#4C8573" opacity="0.18"/>
  <circle cx="${W - 120}" cy="${H * 0.78}" r="300" fill="#A9CBBE" opacity="0.10"/>
  ${arcs(W - 260, H * 0.3, [260, 400, 540, 680, 820], "#A9CBBE", 0.22)}
  <line x1="0" y1="${H - 140}" x2="${W}" y2="${H - 140}" stroke="#A9CBBE" stroke-width="2" opacity="0.25"/>
</svg>`;
}
function pageSvg({ wIn = 11.69, hIn = 8.27 } = {}) {
  const W = PX, H = Math.round(PX * hIn / wIn);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  ${arcs(W - 60, H - 60, [300, 420, 540], "#DCE7E2", 0.9, 3)}
</svg>`;
}
const toData = async (svg) => "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
module.exports = { coverArt: (o) => toData(coverSvg(o)), pageArt: (o) => toData(pageSvg(o)), coverSvg, pageSvg };
