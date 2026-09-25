"""公開中の記事写真に人(とくに顔)が写っていないかを調べる = 画像監視部の「写り込みチェック」。

本番サイト(builtjapan.com)の記事ページを sitemap から巡回し、実際に表示されているヒーロー画像を
1枚ずつダウンロードして、顔検出(OpenCV YuNet)と人物検出(OpenCV HOG)にかける。
自動補完(backfill_images.py)で選ばれた写真はリポジトリに残らないため、公開後のHTMLを見るのがポイント。

出力:
  reports/people-check-latest.md   … 人が写っていそうな記事の一覧(人が目で最終判断する)
  reports/people-check/<slug>.jpg  … 疑わしい写真の縮小版(検出した位置に赤枠)

使ってはいけない写真は generator/data/hero-image-block.json に登録する。
依存: opencv-python-headless, numpy(GitHub Actions の people-check ワークフローで入れる)。
Wikimedia に到達できない環境(Claude Code セッション等)では動かない。
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

import cv2
import numpy as np

SITE = os.environ.get("SITE_ORIGIN", "https://builtjapan.com")
REPORT_DIR = os.environ.get("REPORT_DIR", "reports")
MODEL = os.environ.get("YUNET_MODEL", "face_detection_yunet.onnx")
UA = "BuiltJapanPeopleCheck/1.0 (+https://builtjapan.com/)"
JST = timezone(timedelta(hours=9))
# Wikimedia はレート制限が厳しいので1枚ずつ間を空ける
DELAY = float(os.environ.get("IMAGE_DELAY", "1.0"))
# 顔の確信度のしきい値(0〜1)。高いほど見逃しが増え、低いほど誤検知が増える
FACE_SCORE = float(os.environ.get("FACE_SCORE", "0.6"))
# 人物(歩行者)検出の確信度のしきい値。低いほど誤検知(柱や窓)が増える
PERSON_SCORE = float(os.environ.get("PERSON_SCORE", "0.5"))


def get(url, timeout=30):
    for attempt in range(4):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:
                time.sleep(10 * (attempt + 1))
                continue
            raise


def article_pages():
    """sitemap から日本語の記事ページ(英語版は同じ写真なので省く)を集める。"""
    xml = get(f"{SITE}/sitemap.xml").decode("utf-8")
    locs = re.findall(r"<loc>([^<]+)</loc>", xml)
    out = []
    for u in locs:
        path = urllib.parse.urlparse(u).path
        m = re.match(r"^/(buildings|expressways|railways|tourism)/([^/]+)/$", path)
        if m and m.group(2) != "page":
            out.append((m.group(1), urllib.parse.unquote(m.group(2)), u))
    return out


def hero_src(html):
    """記事冒頭のヒーロー画像(figure.hero-figure の img)の URL。"""
    m = re.search(r'<figure class="hero-figure"[^>]*>\s*<img[^>]*src="([^"]+)"', html)
    return m.group(1).replace("&amp;", "&") if m else None


def smaller(url, width=960):
    """Wikimedia の thumb URL なら幅を落として取得量を減らす(原寸は重い)。"""
    m = re.match(r"(https://upload\.wikimedia\.org/wikipedia/commons/thumb/.+/)(\d+)px-(.+)$", url)
    return f"{m.group(1)}{width}px-{m.group(3)}" if m and int(m.group(2)) > width else url


def detect(img, face_net, hog):
    """顔と人物の位置を返す。通行人は小さく写るので、画像を拡大してから検出する。"""
    h, w = img.shape[:2]
    boxes = []
    # 顔: 横1600pxまで拡大して検出(小さな顔を拾うため)
    fs = max(1.0, 1600 / w)
    big = cv2.resize(img, (int(w * fs), int(h * fs))) if fs > 1 else img
    face_net.setInputSize((big.shape[1], big.shape[0]))
    _, faces = face_net.detect(big)
    for f in faces if faces is not None else []:
        if f[-1] >= FACE_SCORE:
            boxes.append(("face", [int(v / fs) for v in f[:4]], float(f[-1])))
    # 人物(全身・歩行者): HOG の検出窓は 64x128px なので、2000px に拡大して小さな人も拾う
    ps = 2000 / w
    img2 = cv2.resize(img, (2000, int(h * ps)))
    rects, weights = hog.detectMultiScale(img2, winStride=(8, 8), padding=(8, 8), scale=1.06)
    for (x, y, rw, rh), wt in zip(rects, np.ravel(weights) if len(rects) else []):
        if wt >= PERSON_SCORE:
            boxes.append(("person", [int(x / ps), int(y / ps), int(rw / ps), int(rh / ps)], float(wt)))
    return boxes


def save_thumb(img, boxes, path):
    out = img.copy()
    for kind, (x, y, bw, bh), _ in boxes:
        color = (40, 40, 230) if kind == "face" else (40, 160, 240)
        cv2.rectangle(out, (x, y), (x + bw, y + bh), color, max(2, img.shape[1] // 300))
    h, w = out.shape[:2]
    out = cv2.resize(out, (640, int(h * 640 / w)))
    cv2.imwrite(path, out, [cv2.IMWRITE_JPEG_QUALITY, 78])


def main():
    face_net = cv2.FaceDetectorYN.create(MODEL, "", (320, 320), FACE_SCORE, 0.3, 5000)
    hog = cv2.HOGDescriptor()
    hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

    thumbs = os.path.join(REPORT_DIR, "people-check")
    os.makedirs(thumbs, exist_ok=True)
    for f in os.listdir(thumbs):
        os.remove(os.path.join(thumbs, f))

    pages = article_pages()
    print(f"people-check: 記事 {len(pages)} 本を確認")
    flagged, checked, no_image, errors = [], 0, [], []
    for kind, slug, url in pages:
        try:
            src = hero_src(get(url).decode("utf-8"))
            if not src:
                no_image.append(slug)
                continue
            data = get(smaller(src))
            img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
            if img is None:
                errors.append((slug, "画像を読めない"))
                continue
            checked += 1
            boxes = detect(img, face_net, hog)
            if boxes:
                save_thumb(img, boxes, os.path.join(thumbs, f"{slug}.jpg"))
                faces = sum(1 for b in boxes if b[0] == "face")
                people = sum(1 for b in boxes if b[0] == "person")
                flagged.append({"kind": kind, "slug": slug, "url": url, "src": src, "faces": faces, "people": people})
                print(f"  ! {slug}: 顔 {faces} / 人物 {people}")
        except Exception as e:  # 1本の失敗で全体を止めない
            errors.append((slug, f"{type(e).__name__}: {e}"))
        time.sleep(DELAY)

    now = datetime.now(JST).strftime("%Y-%m-%d %H:%M")
    flagged.sort(key=lambda x: (-x["faces"], -x["people"]))
    L = [f"# 写真の写り込みチェック（{now} JST）", ""]
    L.append(f"- 確認した写真: {checked} 枚（写真なしの記事 {len(no_image)} 本 / 取得失敗 {len(errors)} 本）")
    L.append(f"- 人が写っていそうな写真: **{len(flagged)} 枚**（顔を検出 {sum(1 for x in flagged if x['faces'])} 枚）")
    L.append("")
    L.append("> 機械の検出なので誤検知(窓や看板を人と判定)も見逃しもある。縮小版(赤枠=検出位置)を人が見て判断し、")
    L.append("> 使えない写真は generator/data/hero-image-block.json に登録する。")
    L.append("")
    if flagged:
        L.append("| 記事 | 顔 | 人物 | 縮小版 |")
        L.append("|---|---|---|---|")
        for x in flagged:
            L.append(f"| [{x['slug']}]({x['url']}) | {x['faces']} | {x['people']} | people-check/{x['slug']}.jpg |")
    if errors:
        L += ["", "## 取得失敗", ""] + [f"- {s}: {e}" for s, e in errors]
    with open(os.path.join(REPORT_DIR, "people-check-latest.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    with open(os.path.join(REPORT_DIR, "people-check-latest.json"), "w", encoding="utf-8") as f:
        json.dump({"at": now, "checked": checked, "flagged": flagged, "errors": errors}, f, ensure_ascii=False, indent=1)
    print(f"people-check: 完了 確認 {checked} / 疑い {len(flagged)} / 失敗 {len(errors)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
