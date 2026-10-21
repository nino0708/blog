#!/usr/bin/env python3
"""資料の「くどさ」チェック：同じ言い回しが複数のスライドに出ていないかを調べる。

プロの資料の原則「非冗長性（同じ内容を重複させない）」の機械チェック。
各スライドの本文から、指定文字数以上の同じ文字列が2枚以上に出ていれば報告する。
報告されたものは「1か所にまとめ、ほかは番号や『→P.4』で参照する」のが基本の直し方。

  python3 redundancy_check.py deck.pptx              # 8文字以上の重複を表示
  python3 redundancy_check.py deck.pptx --min 6      # もっと細かく
  python3 redundancy_check.py deck.pptx --ignore "AWS案件,顧客"   # 固有名詞など、重複してよい語

対象は .pptx のスライド本文（レイアウトのフッターは除外）。.xlsx/.docx は対象外。
"""
import argparse
import re
import zipfile
from collections import defaultdict
from difflib import SequenceMatcher
from itertools import combinations


def slide_texts(path):
    with zipfile.ZipFile(path) as z:
        names = sorted((n for n in z.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)),
                       key=lambda n: int(re.search(r"(\d+)", n).group(1)))
        out = []
        for n in names:
            xml = z.read(n).decode("utf-8")
            runs = re.findall(r"<a:t>([^<]*)</a:t>", xml)
            out.append("".join(runs))
        return out


def find_repeats(texts, min_len, ignore):
    """スライド2枚ずつを比べ、min_len 文字以上の共通部分を集める。"""
    clean = [re.sub(r"\s+", "", t) for t in texts]
    found = defaultdict(set)
    for i, j in combinations(range(len(clean)), 2):
        sm = SequenceMatcher(None, clean[i], clean[j], autojunk=False)
        for blk in sm.get_matching_blocks():
            if blk.size >= min_len:
                text = clean[i][blk.a:blk.a + blk.size]
                if not any(w and w in text for w in ignore):
                    found[text] |= {i + 1, j + 1}
    # ほかの報告に含まれる短いものは省く
    for text, slides in list(found.items()):
        for other, oslides in found.items():
            if text != other and text in other:
                slides |= oslides
    items = [{"text": t, "slides": s} for t, s in found.items()
             if not any(t != o and t in o and s <= found[o] for o in found)]
    return sorted(items, key=lambda m: (-len(m["slides"]), -len(m["text"])))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pptx")
    ap.add_argument("--min", type=int, default=8, help="重複とみなす最小文字数（既定8）")
    ap.add_argument("--ignore", default="", help="重複してよい語（カンマ区切り）")
    a = ap.parse_args()
    ignore = [w for w in a.ignore.split(",") if w]
    reps = find_repeats(slide_texts(a.pptx), a.min, ignore)
    if not reps:
        print(f"OK: {a.min}文字以上の重複はありません")
        return
    print(f"要確認: {len(reps)}件の重複（同じ内容は1か所にまとめ、ほかは参照にする）")
    for r in reps[:40]:
        pages = ", ".join(f"P{n}" for n in sorted(r["slides"]))
        print(f"  [{pages}] {r['text']}")


if __name__ == "__main__":
    main()
