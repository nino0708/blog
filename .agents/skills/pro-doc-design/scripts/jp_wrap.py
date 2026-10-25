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
        out = subprocess.run(["fc-match", "-f", "%{file}|%{index}", pattern],
                             capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None
    path, _, index = out.partition("|")
    if not path:
        return None
    # .ttc（Noto Sans CJK など複数フォント入りのファイル）は番号で指定する
    font = TTFont(path, lazy=True, fontNumber=int(index or 0)) if path.lower().endswith(".ttc") else TTFont(path, lazy=True)
    return font.getBestCmap(), font["hmtx"], font["head"].unitsPerEm


AUTOSPACE = 0.25  # 和文と英数字の間に PowerPoint / LibreOffice が自動で入れる空き（em）


def _is_cjk(ch: str) -> bool:
    return ord(ch) > 0x2E7F


LATIN = ""  # 英数字だけ別の書体を使うとき（--latin）


def _advance(ch: str, family: str, bold: bool) -> float:
    """1文字の幅（em）。英数字は LATIN の書体で測る。"""
    fam = LATIN if (LATIN and ch.isascii()) else family
    f = _font(fam, bold)
    if f is None:
        return 1.0 if _is_cjk(ch) else 0.55
    cmap, hmtx, upm = f
    glyph = cmap.get(ord(ch))
    return (hmtx[glyph][0] if glyph else upm) / upm


def text_width(text: str, size_pt: float, family: str, bold: bool) -> float:
    """テキストの幅（インチ）。和文と英数字の境目の自動の空きも足す。
    フォントが無ければ全角=1em・半角=0.55emで概算。"""
    em = size_pt / 72.0
    total = sum(_advance(ch, family, bold) for ch in text)
    for a, b in zip(text, text[1:]):
        if (_is_cjk(a) and b.isascii() and b.isalnum()) or (a.isascii() and a.isalnum() and _is_cjk(b)):
            total += AUTOSPACE
    return total * em


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
    ap.add_argument("--width", type=float, default=0, help="テキスト枠の内側の幅（インチ）")
    ap.add_argument("--size", type=float, required=True, help="フォントサイズ（pt）")
    ap.add_argument("--font", default="BIZ UDPGothic")
    ap.add_argument("--bold", action="store_true")
    ap.add_argument("--latin", default="", help="英数字の書体（和文と別にしているとき）")
    ap.add_argument("--measure", action="store_true", help="改行せず、1行の幅（インチ）だけを出力する（蛍光ペンの位置決め用）")
    a = ap.parse_args()
    global LATIN
    LATIN = a.latin
    if a.measure:
        sys.stdout.write("%.4f" % text_width(sys.stdin.read().rstrip("\n"), a.size, a.font, a.bold))
        return
    sys.stdout.write(wrap(sys.stdin.read().rstrip("\n"), a.width, a.size, a.font, a.bold))


if __name__ == "__main__":
    main()
