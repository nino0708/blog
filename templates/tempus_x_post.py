#!/usr/bin/env python3
"""Built Japan の X 投稿文を Tempus に登録する(編集部 手順7-8)。

Tempus は tasks[].notes(詳細欄)と clips(X投稿ボタンが付くコピー用の投稿文)だけを読む。
body / lang / scheduled_for など知らない欄は黙って捨てられ、詳細とXボタンが空のタスクになる
(実例: 2026-10-03 分)。送る形はこのスクリプトだけが組み立てるので、手で curl を書かない。

入力: JSON 配列のファイル。1件 = 1投稿。日英それぞれ5件ずつ、計10件。
  [{"n": 1, "lang": "ja", "name": "フジテレビ本社ビル", "slug": "fuji-tv-headquarters",
    "text": "投稿文の全文(URL込み)"}, ...]
  n は 1〜5(5 番目がクイズ枠)。同じ n の ja と en は同じ記事。

使い方:
  python3 templates/tempus_x_post.py posts.json --dry-run   # 検査して送る中身を表示するだけ
  TEMPUS_AGENT_KEY=... python3 templates/tempus_x_post.py posts.json

検査(1つでも NG なら送らずに終了コード1):
  - 10件そろっている(n=1〜5 × ja/en)
  - 各投稿が 260 カウント以下(templates/x_post_len.py と同じ数え方)
  - 本文に記事の正しい URL(日本語 /buildings/<slug>/、英語 /en/buildings/<slug>/)が入っている
送信後、inserted.tasks と inserted.clips が10件ずつでなければ終了コード1。
"""
import argparse
import datetime
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from x_post_len import LIMIT, xlen  # noqa: E402

ENDPOINT = "https://nucqcatwhwdjsphetops.supabase.co/functions/v1/agent-ingest"
AGENT = "編集部"
LANG_LABEL = {"ja": "JA", "en": "EN"}


def canonical(lang: str, slug: str) -> str:
    prefix = "/en" if lang == "en" else ""
    return f"https://builtjapan.com{prefix}/buildings/{slug}/"


def validate(posts: list) -> list:
    errors = []
    keys = sorted((p.get("n"), p.get("lang")) for p in posts)
    want = sorted((n, lang) for n in range(1, 6) for lang in ("ja", "en"))
    if keys != want:
        errors.append(f"n=1〜5 × ja/en の10件が必要です(今: {keys})")
    for p in posts:
        tag = f"{p.get('n')}-{p.get('lang')}"
        for field in ("name", "slug", "text"):
            if not str(p.get(field, "")).strip():
                errors.append(f"{tag}: {field} が空です")
        text, slug, lang = p.get("text", ""), p.get("slug", ""), p.get("lang", "")
        n = xlen(text)
        if n > LIMIT:
            errors.append(f"{tag}: {n} カウント(上限 {LIMIT})。短く書き直す")
        url = canonical(lang, slug)
        if url not in text:
            errors.append(f"{tag}: 本文に {url} がありません")
    return errors


def build_payload(posts: list, today: str) -> dict:
    tasks, clips = [], []
    for p in sorted(posts, key=lambda p: (p["n"], p["lang"] != "ja")):
        n, lang, text = p["n"], p["lang"], p["text"].strip()
        label = LANG_LABEL[lang]
        task_key = f"bj-x-{today}-{n}-{lang}"
        tasks.append({
            "title": f"Built Japan X投稿({label}) {p['name']}",
            "notes": text,
            "estimateMin": 5,
            "importance": "mid",
            "dedupeKey": task_key,
        })
        clips.append({
            "label": f"Built Japan 投稿{n}({label})",
            "text": text,
            "url": canonical(lang, p["slug"]),
            "taskDedupeKey": task_key,
            "dedupeKey": f"bj-x-clip-{today}-{n}-{lang}",
        })
    return {"agent": AGENT, "tasks": tasks, "clips": clips}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("posts", help="投稿文の JSON ファイル")
    ap.add_argument("--dry-run", action="store_true", help="検査して送る中身を表示するだけ")
    ap.add_argument("--date", help="dedupeKey に使う日付(既定: 今日の JST)")
    args = ap.parse_args()

    posts = json.loads(Path(args.posts).read_text(encoding="utf-8"))
    for p in posts:
        print(f"{p.get('n')}-{p.get('lang')}  {xlen(p.get('text', '')):3d}  {p.get('name')}")
    errors = validate(posts)
    if errors:
        print("\nNG(送っていません):", *errors, sep="\n  ")
        return 1

    jst = datetime.timezone(datetime.timedelta(hours=9))
    today = args.date or datetime.datetime.now(jst).strftime("%Y-%m-%d")
    payload = build_payload(posts, today)
    if args.dry_run:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    key = os.environ.get("TEMPUS_AGENT_KEY")
    if not key:
        print("TEMPUS_AGENT_KEY が未設定です")
        return 1
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"x-tempus-agent-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            status, body = res.status, res.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        status, body = e.code, e.read().decode("utf-8")
    print(f"\nHTTP {status}\n{body}")
    if status != 200:
        return 1
    res = json.loads(body)
    inserted = res.get("inserted", {})
    want = len(posts)
    if inserted.get("tasks") != want or inserted.get("clips") != want:
        print(f"NG: tasks/clips が {want} 件ずつ登録されていません(skipped は同じ日付で登録済みの印)")
        return 1
    if res.get("warnings"):
        print("warnings あり。報告に書くこと")
    print(f"OK: tasks {want} 件・clips {want} 件を登録")
    return 0


if __name__ == "__main__":
    sys.exit(main())
