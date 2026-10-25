#!/bin/bash
# 資料作成に必要な道具をそろえる（Linux のクラウド環境向け。足りないものだけ入れる）
#   bash setup.sh [作業フォルダ]   ← pptxgenjs などを作業フォルダに入れる
set -u
WORK="${1:-$PWD}"
need_apt=()
fc-list | grep -qi "BIZ UDPGothic" || need_apt+=(fonts-morisawa-bizud-gothic)   # Windows標準と同じBIZ UDゴシック
[ -f /usr/lib/libreoffice/program/libsdlo.so ] || need_apt+=(libreoffice-impress) # PDF化に必要
command -v pdftoppm >/dev/null || need_apt+=(poppler-utils)                       # ページ画像化
[ -f /usr/lib/libreoffice/program/libsclo.so ] || need_apt+=(libreoffice-calc)   # Excelの再計算・PDF化
fc-list | grep -qi "Noto Sans CJK JP" || need_apt+=(fonts-noto-cjk)          # style: "plain" / "cloud" の和文（Noto Sans JP）
fc-list | grep -qi "Inter" || need_apt+=(fonts-inter)                              # style: "plain" / "cloud" の英数字
if [ ${#need_apt[@]} -gt 0 ]; then
  echo "apt: ${need_apt[*]}"
  (apt-get update -qq >/dev/null 2>&1; DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends "${need_apt[@]}" >/dev/null 2>&1) \
    || echo "apt での導入に失敗。環境のネットワーク設定を確認してください"
  fc-cache -f >/dev/null 2>&1
fi
# Linux の Noto は "Noto Sans CJK JP" という名前なので、Windows / Google Fonts の "Noto Sans JP" で引けるようにする
FC="$HOME/.config/fontconfig/fonts.conf"
if [ -f "$FC" ] && ! grep -qs "Noto Sans JP" "$FC"; then
  echo "注意: $FC に Noto Sans JP → Noto Sans CJK JP の別名を足してください（既存の設定は上書きしない）"
elif [ ! -f "$FC" ]; then
  mkdir -p "$(dirname "$FC")"
  cat > "$FC" <<'XML'
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <alias binding="same"><family>Noto Sans JP</family><prefer><family>Noto Sans CJK JP</family></prefer></alias>
</fontconfig>
XML
  fc-cache -f >/dev/null 2>&1
fi
python3 -c "import budoux, fontTools, lxml, openpyxl" 2>/dev/null || pip install -q budoux fonttools lxml defusedxml openpyxl "markitdown[pptx]" 2>&1 | tail -1
if ! (cd "$WORK" && node -e "require('pptxgenjs')" 2>/dev/null); then
  (cd "$WORK" && { [ -f package.json ] || npm init -y >/dev/null; } && npm install -s pptxgenjs react react-dom react-icons sharp >/dev/null 2>&1) \
    && echo "npm: pptxgenjs ほかを $WORK に導入" || echo "npm での導入に失敗"
fi
echo "フォント: $(fc-match 'BIZ UDPGothic') ／ $(fc-match 'Noto Sans JP') ／ $(fc-match 'Inter')"
