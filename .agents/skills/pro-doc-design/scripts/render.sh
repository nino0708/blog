#!/bin/bash
# 仕上げチェック：検証 → PDF化 → ページ画像化 → フォント確認 → 重複チェック
#   bash render.sh deck.pptx            # deck.pdf と deck-<n>.jpg を同じフォルダに作る
#   DPI=120 bash render.sh deck.pptx
set -euo pipefail
DECK="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
DIR="$(dirname "$DECK")"; BASE="$(basename "$DECK" .pptx)"
HERE="$(cd "$(dirname "$0")" && pwd)"
DPI="${DPI:-90}"

# pptx スキルの検証・変換ツールがあれば使う（サンドボックスでは素の soffice が止まることがある）
PPTX_SKILL="$(find "$HOME/.claude/skills" -path '*pptx/scripts/office' -type d 2>/dev/null | head -1 || true)"
if [ -n "$PPTX_SKILL" ] && [ -f "$PPTX_SKILL/validate.py" ]; then
  python3 "$PPTX_SKILL/validate.py" "$DECK" | tail -3
fi

# PDF を作る（変換用に ASCII 名でコピーしてから）
TMP="$(mktemp -d)"; cp "$DECK" "$TMP/deck.pptx"
if [ -n "$PPTX_SKILL" ] && [ -f "$PPTX_SKILL/soffice.py" ]; then
  timeout 180 python3 "$PPTX_SKILL/soffice.py" --headless --convert-to pdf --outdir "$TMP" "$TMP/deck.pptx" >/dev/null 2>&1 || true
else
  timeout 180 soffice --headless --convert-to pdf --outdir "$TMP" "$TMP/deck.pptx" >/dev/null 2>&1 || true
fi
[ -f "$TMP/deck.pdf" ] || { echo "PDF変換に失敗。LibreOffice Impress が入っているか確認（bash setup.sh）"; exit 1; }
mv "$TMP/deck.pdf" "$DIR/$BASE.pdf"; rm -rf "$TMP"

rm -f "$DIR/$BASE"-*.jpg
pdftoppm -jpeg -r "$DPI" "$DIR/$BASE.pdf" "$DIR/$BASE"
pdfinfo "$DIR/$BASE.pdf" | grep -E "Pages|Page size"
echo "埋め込みフォント: $(pdffonts "$DIR/$BASE.pdf" | awk 'NR>2{print $1}' | sed 's/^[A-Z]*+//' | sort -u | tr '\n' ' ')"
echo "  → 指定した日本語フォント以外（IPA・WenQuanYi・DejaVu など）が出ていたら、改行位置が実物とずれる"
python3 "$HERE/redundancy_check.py" "$DECK" || true
ls -1 "$DIR/$BASE"-*.jpg
