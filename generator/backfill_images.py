#!/usr/bin/env python3
"""heroImage が無い建物記事に、Wikimedia Commons の外観写真を自動補完する。

なぜ必要か:
  日々の記事生成(クラウドルーティン)が heroImage を付けずに公開することがあり、
  トップの新着カードが「画像なし」のフォールバック表示になっていた。
  デプロイ直前(buildspec)にこのスクリプトを通すことで、ビルドのたびに自己修復する。

安全方針(誤画像 < 画像なし):
  - 取り違え防止に英名(buildings-en/<slug>.md の title)を「名前ガード」として使う。
    英名が無ければ補完しない(日本語名だけだと別ビルに誤マッチするため)。
  - commons.fetch_commons_image が外観でない写真を除外し、説明語の少ない=全景を優先する。
  - 確信できる候補が無ければ何もしない(画像なしのまま)。
  - 既に heroImage がある記事(手動キュレーション含む)は一切触らない。

書き込みはCodeBuildのチェックアウト上のみ(コミットはしない)。毎ビルド再生成される。
"""
import os
import re
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
from commons import fetch_commons_image  # noqa: E402

CONTENT_JA = os.path.join(BASE_DIR, "..", "site", "src", "content", "buildings")
CONTENT_EN = os.path.join(BASE_DIR, "..", "site", "src", "content", "buildings-en")


def _frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    return m.group(1) if m else ""


def _field(fm, key):
    m = re.search(rf'^{key}:\s*"?(.*?)"?\s*$', fm, re.M)
    return m.group(1).strip() if m else None


def _used_titles():
    """既存記事の heroImageLink から、使用済みの正規化ファイルタイトルを集める(重複回避)。"""
    used = set()
    for fn in os.listdir(CONTENT_JA):
        if not fn.endswith(".md"):
            continue
        fm = _frontmatter(open(os.path.join(CONTENT_JA, fn), encoding="utf-8").read())
        link = _field(fm, "heroImageLink") or ""
        m = re.search(r"/wiki/File:(.+)$", link)
        if m:
            name = re.sub(r"\.[a-z0-9]+$", "", m.group(1).replace("_", " "), flags=re.I)
            used.add(name.lower())
    return used


def _en_title(slug):
    p = os.path.join(CONTENT_EN, f"{slug}.md")
    if not os.path.exists(p):
        return None
    return _field(_frontmatter(open(p, encoding="utf-8").read()), "title")


def _insert_hero(text, img):
    credit = " / ".join(x for x in (img.get("author"), img.get("license")) if x)
    block = (
        f'heroImage: "{img["url"]}"\n'
        f'heroImageCredit: "{credit}"\n'
        f'heroImageLink: "{img.get("source", "")}"\n'
    )
    # summary 行の直後に入れる(既存記事の並びに合わせる)。無ければ verified の前。
    if re.search(r"^summary:.*$", text, re.M):
        return re.sub(r"^(summary:.*\n)", r"\1" + block, text, count=1, flags=re.M)
    if re.search(r"^verified:.*$", text, re.M):
        return re.sub(r"^(verified:.*\n)", block + r"\1", text, count=1, flags=re.M)
    return text


def main():
    if not os.path.isdir(CONTENT_JA):
        print(f"backfill: 建物ディレクトリが無い: {CONTENT_JA}")
        return 0
    used = _used_titles()
    filled = skipped = 0
    for fn in sorted(os.listdir(CONTENT_JA)):
        if not fn.endswith(".md"):
            continue
        path = os.path.join(CONTENT_JA, fn)
        text = open(path, encoding="utf-8").read()
        fm = _frontmatter(text)
        if re.search(r"^heroImage:", fm, re.M):
            continue  # 既に画像あり(手動含む)→ 触らない
        slug = fn[:-3]
        ja = _field(fm, "title")
        en = _en_title(slug)
        if not en:
            print(f"backfill: 英名が無いため見送り(誤マッチ防止): {slug}")
            skipped += 1
            continue
        try:
            img = fetch_commons_image({"title": ja, "title_en": en}, used_titles=used)
        except Exception as e:
            print(f"backfill: 取得失敗({slug}): {e}")
            skipped += 1
            continue
        if not img or not img.get("url"):
            print(f"backfill: 確信できる外観画像なし(画像なしのまま): {slug}")
            skipped += 1
            continue
        with open(path, "w", encoding="utf-8") as f:
            f.write(_insert_hero(text, img))
        used.add((img.get("fileTitle") or "").lower())
        filled += 1
        print(f"backfill: 補完 {slug} <- {img.get('fileTitle')} [{img.get('license')}]")
    print(f"backfill: 完了 (補完 {filled} 件 / 見送り {skipped} 件)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
