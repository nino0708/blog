#!/usr/bin/env python3
"""画像ヘルスチェックで見つかった欠損を、記事md側で直す = 「画像監視者」の修復担当。

analytics/image_health.py が出す reports/image-health-latest.json を読み、
missing(画像なし) と broken(URLが死んでいる) を直しにいく。

backfill_images.py との違い（あちらはビルド毎の自己修復で、ここが穴だった）:
  - backfill は heroImage が既にある記事を一切触らない → 死んだURLを直せない
  - backfill は書き込む前にURLが実際に生きているか確かめない → 死んだURLを入れうる
  ここでは両方を埋める。書き込む前に必ずURLを検証する。

諦めのルール:
  同じ記事を永久に叩き続けないよう、試行回数を reports/image-repair-state.json に持つ。
  3回試してダメなら「諦め」として記録し、以降はスキップして人に上げる。

英名ガード・外観フィルタ等の画像選定ロジックは commons.py をそのまま使う（二重管理しない）。
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
from commons import fetch_commons_image  # noqa: E402

ROOT = os.path.join(BASE_DIR, "..")
CONTENT_JA = os.path.join(ROOT, "site", "src", "content", "buildings")
CONTENT_EN = os.path.join(ROOT, "site", "src", "content", "buildings-en")
REPORT_DIR = os.path.join(ROOT, os.environ.get("REPORT_DIR", "reports"))
HEALTH_JSON = os.path.join(REPORT_DIR, "image-health-latest.json")
STATE_JSON = os.path.join(REPORT_DIR, "image-repair-state.json")

MAX_ATTEMPTS = int(os.environ.get("MAX_ATTEMPTS", "3"))
UA = "BuiltJapanImageRepair/1.0 (+https://builtjapan.com/)"


def _read(path):
    return open(path, encoding="utf-8").read()


def _frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    return m.group(1) if m else ""


def _field(fm, key):
    m = re.search(rf'^{key}:\s*"?(.*?)"?\s*$', fm, re.M)
    return m.group(1).strip() if m else None


def url_alive(url):
    """画像URLが実際に画像として取れるか。429は待って粘る（叩きすぎを異常と誤認しない）。"""
    for attempt in range(4):
        try:
            req = urllib.request.Request(url)
            req.add_header("User-Agent", UA)
            req.add_header("Range", "bytes=0-1023")
            with urllib.request.urlopen(req, timeout=20) as res:
                ctype = (res.headers.get("Content-Type") or "").split(";")[0]
                return res.status in (200, 206) and ctype.startswith("image/")
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:
                time.sleep(2 ** attempt * 3)
                continue
            return False
        except Exception:
            if attempt < 3:
                time.sleep(2 ** attempt)
                continue
            return False
    return False


THUMB_RE = re.compile(r"^(?P<pre>.+/thumb/.+/)(?P<w>\d+)px-(?P<name>.+)$")


def shrink_candidates(url):
    """死んだWikimediaのthumb URLから、生きていそうな代替を作る。

    thumbの指定幅が原寸を超えると400になるので、幅を落とす → それでもダメなら原寸に落とす。
    """
    m = THUMB_RE.match(url)
    if not m:
        return []
    out = []
    current = int(m.group("w"))
    for w in (1280, 1024, 800, 640, 480):
        if w < current:
            out.append(f"{m.group('pre')}{w}px-{m.group('name')}")
    # /thumb/ を外すと原寸ファイルのURLになる（末尾のNNNpx-ファイル名も落とす）
    original = re.sub(r"/thumb/", "/", m.group("pre")).rstrip("/")
    out.append(original)
    return out


def _insert_hero(text, img):
    """backfill_images.py と同じ位置・同じ形で heroImage 一式を差し込む。"""
    credit = " / ".join(x for x in (img.get("author"), img.get("license")) if x)
    block = (
        f'heroImage: "{img["url"]}"\n'
        f'heroImageCredit: "{credit}"\n'
        f'heroImageLink: "{img.get("source", "")}"\n'
    )
    if re.search(r"^summary:.*$", text, re.M):
        return re.sub(r"^(summary:.*\n)", r"\1" + block, text, count=1, flags=re.M)
    if re.search(r"^verified:.*$", text, re.M):
        return re.sub(r"^(verified:.*\n)", block + r"\1", text, count=1, flags=re.M)
    return text


def _replace_hero_url(text, new_url):
    return re.sub(r'^heroImage:\s*".*?"\s*$', f'heroImage: "{new_url}"', text,
                  count=1, flags=re.M)


def _en_title(slug):
    p = os.path.join(CONTENT_EN, f"{slug}.md")
    if not os.path.exists(p):
        return None
    return _field(_frontmatter(_read(p)), "title")


def find_new_image(slug, text):
    """commons.py の選定ロジックで新しい候補を取り、生きているものだけ返す。"""
    ja = _field(_frontmatter(text), "title")
    en = _en_title(slug)
    if not en:
        return None, "英名が無いため見送り（誤マッチ防止）"
    try:
        img = fetch_commons_image({"title": ja, "title_en": en})
    except Exception as e:
        return None, f"Commons検索に失敗: {type(e).__name__}"
    if not img or not img.get("url"):
        return None, "確信できる外観画像が見つからない"
    if not url_alive(img["url"]):
        return None, "候補は見つかったがURLが死んでいる"
    return img, None


def repair_broken(slug, path, text, bad_url):
    """死んだURLを、まず幅違い・原寸で救い、ダメなら別画像に差し替える。"""
    for cand in shrink_candidates(bad_url):
        if url_alive(cand):
            open(path, "w", encoding="utf-8").write(_replace_hero_url(text, cand))
            return True, f"URLの幅を調整して復旧: {cand}"
    img, err = find_new_image(slug, text)
    if not img:
        return False, err
    open(path, "w", encoding="utf-8").write(_replace_hero_url(text, img["url"]))
    return True, f"別の外観写真に差し替え: {img.get('fileTitle')}"


def repair_missing(slug, path, text):
    img, err = find_new_image(slug, text)
    if not img:
        return False, err
    open(path, "w", encoding="utf-8").write(_insert_hero(text, img))
    return True, f"画像を補完: {img.get('fileTitle')}"


def load_targets():
    """ヘルスチェックの結果から、直すべき記事をslug単位にまとめる（ja/enの重複を畳む）。"""
    if not os.path.exists(HEALTH_JSON):
        print(f"repair: ヘルスチェック結果が無い: {HEALTH_JSON}", file=sys.stderr)
        return {}
    pages = json.load(open(HEALTH_JSON, encoding="utf-8"))["pages"]
    targets = {}
    for p in pages:
        if p["state"] not in ("missing", "broken"):
            continue
        # EN記事はJAのheroImageを継承するので、直す先は常にJAのmd
        targets.setdefault(p["slug"], {"state": p["state"], "src": p.get("src")})
    return targets


def main():
    # image_health.py が GitHub Actions 経由で実行した場合のフラグ
    # ワークフロー内で repair まで完了しているので、ここでは結果を読み出すだけでよい
    workflow_flag = os.path.join(REPORT_DIR, ".workflow-ran")
    if os.path.exists(workflow_flag):
        os.remove(workflow_flag)
        state = json.load(open(STATE_JSON, encoding="utf-8")) if os.path.exists(STATE_JSON) else {}
        gave_up = [(s, v.get("reason", "")) for s, v in state.items() if v.get("gaveUp")]
        fixed_count = sum(1 for v in state.values() if not v.get("gaveUp"))
        print(f"\nrepair: ワークフロー実行済み — 修復 {fixed_count} 件 / 諦め {len(gave_up)} 件")
        if gave_up:
            print("\n=== 人の判断が必要（3回試して直らなかった） ===")
            for slug, why in gave_up:
                print(f"- {slug}: {why}")
        return 2 if gave_up else 0

    targets = load_targets()
    state = json.load(open(STATE_JSON, encoding="utf-8")) if os.path.exists(STATE_JSON) else {}

    fixed, gave_up, skipped = [], [], []
    for slug, t in sorted(targets.items()):
        rec = state.get(slug, {"attempts": 0})
        if rec.get("gaveUp"):
            skipped.append(slug)
            continue

        path = os.path.join(CONTENT_JA, f"{slug}.md")
        if not os.path.exists(path):
            rec["attempts"] = MAX_ATTEMPTS
            rec["gaveUp"] = True
            rec["reason"] = "記事mdが見つからない"
            state[slug] = rec
            gave_up.append((slug, rec["reason"]))
            continue

        text = _read(path)
        if t["state"] == "broken":
            ok, note = repair_broken(slug, path, text, t["src"])
        else:
            ok, note = repair_missing(slug, path, text)

        rec["attempts"] = rec.get("attempts", 0) + 1
        if ok:
            state.pop(slug, None)  # 直ったので試行履歴は畳む
            fixed.append((slug, note))
            print(f"repair: {slug} — {note}")
            continue

        rec["reason"] = note
        if rec["attempts"] >= MAX_ATTEMPTS:
            rec["gaveUp"] = True
            gave_up.append((slug, note))
        state[slug] = rec
        print(f"repair: {slug} — 失敗({rec['attempts']}/{MAX_ATTEMPTS}) {note}")

    os.makedirs(REPORT_DIR, exist_ok=True)
    json.dump(state, open(STATE_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"\nrepair: 完了 — 修復 {len(fixed)} 件 / 諦め {len(gave_up)} 件 "
          f"/ 諦め済みスキップ {len(skipped)} 件")
    if gave_up:
        print("\n=== 人の判断が必要（3回試して直らなかった） ===")
        for slug, why in gave_up:
            print(f"- {slug}: {why}")
    # 通知が必要か（＝今回新たに諦めた記事があるか）を呼び出し側に伝える
    return 2 if gave_up else 0


if __name__ == "__main__":
    raise SystemExit(main())
