#!/usr/bin/env python3
"""X(旧Twitter)の投稿文が上限に収まるかを数える。

X の数え方: 日本語(かな・漢字・全角記号)と絵文字は1文字=2、半角英数字・空白・改行は1文字=1、
URL は長さに関係なく1本=23。上限は280。余裕を見て 260 以下を合格にする。

使い方: 投稿文を「===」だけの行で区切って標準入力に渡す。
  python3 templates/x_post_len.py < posts.txt
1本でも 260 を超えると終了コード1を返す。
"""
import re
import sys

LIMIT = 260
URL_RE = re.compile(r"https?://\S+")


def xlen(text: str) -> int:
    urls = URL_RE.findall(text)
    body = URL_RE.sub("", text)
    n = 23 * len(urls)
    for ch in body:
        o = ord(ch)
        n += 1 if (o <= 4351 or 8192 <= o <= 8205 or 8208 <= o <= 8223 or 8242 <= o <= 8247) else 2
    return n


def main() -> int:
    posts = [p.strip() for p in re.split(r"^===\s*$", sys.stdin.read(), flags=re.M) if p.strip()]
    ng = 0
    for i, p in enumerate(posts, 1):
        n = xlen(p)
        ok = n <= LIMIT
        ng += not ok
        print(f"{i:2d}  {n:3d}  {'OK' if ok else 'NG 書き直し'}  {p.splitlines()[0][:50]}")
    return 1 if ng else 0


if __name__ == "__main__":
    sys.exit(main())
