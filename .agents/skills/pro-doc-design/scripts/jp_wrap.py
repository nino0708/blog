#!/usr/bin/env python3
"""日本語テキストを「文節」で改行し、指定幅に収まるように \\n を入れる。

PowerPoint / LibreOffice の自動改行は文字単位なので、「最新\\n化」「時\\n間」のような
不自然な位置で折り返す。このスクリプトは BudouX で文節に区切り、実際のフォントの
文字幅（fontTools）で1行に入るかを計算して、文節の切れ目で改行を入れる。

使い方:
  echo "顧客からの技術・運用の質問を調べて回答する" | \\
    python3 jp_wrap.py --width 4.3 --size 13            # 幅はインチ、サイズはpt
  python3 jp_wrap.py --width 4.3 --size 13 --bold --font "BIZ UDPGothic" < in.txt

- 入力に含まれる改行はそのまま残す（段落ごとに処理）。
- 1つの文節が幅を超えるときだけ、文字単位で折り返す。
- budoux / fontTools / フォントが見つからないときは入力をそのまま返す（警告は stderr）。
"""
import argparse
import functools
import subprocess
import sys

SAFETY = 0.97  # レンダラ差を吸収するため、幅の97%までしか使わない


@functools.lru_cache(maxsize=8)
def _font(family: str, bold: bool):
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        return None
    pattern = family + (":bold" if bold else "")
    try:
        path = subprocess.run(["fc-match", "-f", "%{file}", pattern],
                              capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None
    if not path:
        return None
    font = TTFont(path, lazy=True)
    return font.getBestCmap(), font["hmtx"], font["head"].unitsPerEm


def text_width(text: str, size_pt: float, family: str, bold: bool) -> float:
    """テキストの幅（インチ）。フォントが無ければ全角=1em・半角=0.55emで概算。"""
    f = _font(family, bold)
    em = size_pt / 72.0
    if f is None:
        return sum(em if ord(ch) > 0x2E7F else em * 0.55 for ch in text)
    cmap, hmtx, upm = f
    total = 0
    for ch in text:
        glyph = cmap.get(ord(ch))
        total += hmtx[glyph][0] if glyph else upm
    return total / upm * em


def _phrases(text: str):
    try:
        import budoux
    except ImportError:
        print("jp_wrap: budoux が無いので文字単位で処理します (pip install budoux)", file=sys.stderr)
        return list(text)
    return budoux.load_default_japanese_parser().parse(text)


def wrap(text: str, width_in: float, size_pt: float, family="BIZ UDPGothic", bold=False) -> str:
    limit = width_in * SAFETY
    out = []
    for para in text.split("\n"):
        line = ""
        for ph in _phrases(para):
            if text_width(line + ph, size_pt, family, bold) <= limit:
                line += ph
                continue
            if line:
                out.append(line)
                line = ""
            # 文節そのものが長すぎるときだけ文字単位で割る
            for ch in ph:
                if text_width(line + ch, size_pt, family, bold) <= limit or not line:
                    line += ch
                else:
                    out.append(line)
                    line = ch
        out.append(line)
    # 行頭に来てはいけない約物（。、）」など）は前の行へ戻す
    fixed = []
    for ln in out:
        while fixed and ln and ln[0] in "、。，．）」』】〕・ー！？":
            fixed[-1] += ln[0]
            ln = ln[1:]
        fixed.append(ln)
    return "\n".join(fixed)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--width", type=float, required=True, help="テキスト枠の内側の幅（インチ）")
    ap.add_argument("--size", type=float, required=True, help="フォントサイズ（pt）")
    ap.add_argument("--font", default="BIZ UDPGothic")
    ap.add_argument("--bold", action="store_true")
    a = ap.parse_args()
    sys.stdout.write(wrap(sys.stdin.read().rstrip("\n"), a.width, a.size, a.font, a.bold))


if __name__ == "__main__":
    main()
