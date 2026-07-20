"""Built Japan(builtjapan.com) 画像ヘルスチェック = 「画像監視者」。

公開済みの本番サイトを実際に読み取り、記事のヒーロー画像がちゃんと表示されているかを確認する。
ビルド前のsrcではなく公開後のHTMLを見るのがポイント（記事は出たのに画像だけ出ていない、を捕まえる）。

検出する2種類の欠損:
  missing — <img>自体が無い（heroImage未設定 → グレーのプレースホルダ表示になる）
  broken  — <img>はあるが画像URLが取得できない（例: Wikimediaのthumb幅が原寸超で400）

出力: reports/image-health-latest.md（+ 日付版）。外部依存ゼロ(urllibのみ)。
"""
import concurrent.futures
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

cfg = {
    "site": os.environ.get("SITE_ORIGIN", "https://builtjapan.com"),
    "workers": int(os.environ.get("WORKERS", "12")),
    "timeout": int(os.environ.get("HTTP_TIMEOUT", "20")),
    "report_dir": os.environ.get("REPORT_DIR", "reports"),
    # 画像ホスト(Wikimedia)はレート制限が厳しい。ここを緩めると429で誤検知する。
    "image_workers": int(os.environ.get("IMAGE_WORKERS", "3")),
    "image_delay": float(os.environ.get("IMAGE_DELAY", "0.3")),
}

UA = "BuiltJapanImageHealth/1.0 (+https://builtjapan.com/)"
JST = timezone(timedelta(hours=9))


def fetch(url, method="GET", headers=None):
    req = urllib.request.Request(url, method=method)
    req.add_header("User-Agent", UA)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=cfg["timeout"]) as res:
        return res.status, res.headers, res.read()


def article_urls():
    """sitemap.xmlから記事ページ(/buildings/)のURLを集める。ja/en両方。"""
    _, _, body = fetch(f"{cfg['site']}/sitemap.xml")
    locs = re.findall(r"<loc>([^<]+)</loc>", body.decode("utf-8"))
    return [u for u in locs if "/buildings/" in u]


HERO_RE = re.compile(
    r'<figure[^>]*class="[^"]*hero-figure[^"]*"[^>]*>(.*?)</figure>', re.S
)
IMG_SRC_RE = re.compile(r'<img[^>]*\ssrc="([^"]+)"')


def hero_src(html):
    """記事HTMLからヒーロー画像のsrcを取り出す。無ければNone。"""
    m = HERO_RE.search(html)
    if not m:
        return None
    s = IMG_SRC_RE.search(m.group(1))
    return s.group(1) if s else None


def image_ok(url, delay=None):
    """画像URLが実際に画像として取れるか。(ok, 理由)を返す。

    HEADを弾く/挙動が違うCDNがあるので、Rangeで先頭だけ取るGETで確かめる。
    429はこちらの叩きすぎであって画像の異常ではないので、待って粘り、
    それでも決着しなければ False(壊れ) ではなく None(判定不能) を返す。誤報を出さないため。
    """
    time.sleep(delay if delay is not None else cfg["image_delay"])
    for attempt in range(4):
        try:
            status, headers, body = fetch(url, headers={"Range": "bytes=0-1023"})
        except urllib.error.HTTPError as e:
            if e.code == 429:
                if attempt < 3:
                    time.sleep(2 ** attempt * 3)
                    continue
                return None, "レート制限で判定できず"
            return False, f"HTTP {e.code}"
        except Exception as e:
            if attempt < 3:
                time.sleep(2 ** attempt)
                continue
            return False, f"取得失敗 {type(e).__name__}"
        break

    ctype = (headers.get("Content-Type") or "").split(";")[0]
    if status not in (200, 206):
        return False, f"HTTP {status}"
    if not ctype.startswith("image/"):
        return False, f"画像でない Content-Type: {ctype or '不明'}"
    if not body:
        return False, "中身が空"
    return True, ctype


def scan_page(url):
    """記事ページを読み、ヒーロー画像のsrcを拾う（画像の検証はまだしない）。"""
    meta = {"slug": url.rstrip("/").split("/")[-1], "lang": "en" if "/en/" in url else "ja"}
    try:
        status, _, body = fetch(url)
    except urllib.error.HTTPError as e:
        return {"url": url, **meta, "state": "page_error", "detail": f"HTTP {e.code}"}
    except Exception as e:
        return {"url": url, **meta, "state": "page_error", "detail": f"取得失敗 {type(e).__name__}"}
    if status != 200:
        return {"url": url, **meta, "state": "page_error", "detail": f"HTTP {status}"}

    src = hero_src(body.decode("utf-8", "replace"))
    if not src:
        return {"url": url, **meta, "state": "missing", "detail": "ヒーロー画像なし（プレースホルダ表示）"}
    return {"url": url, **meta, "state": "ok", "src": src}


def verify_images(pages):
    """ページ群のsrcをユニーク化して検証し、結果をpagesに反映する。

    ja/enで同じ画像を使うので、ユニーク化するだけで画像ホストへの負荷が半減する。
    """
    srcs = sorted({p["src"] for p in pages if p.get("src")})
    with concurrent.futures.ThreadPoolExecutor(max_workers=cfg["image_workers"]) as ex:
        verdicts = dict(zip(srcs, ex.map(image_ok, srcs)))

    # レート制限で決着しなかった分だけ、並列をやめてゆっくり取り直す
    pending = [u for u, (ok, _) in verdicts.items() if ok is None]
    if pending:
        print(f"レート制限の {len(pending)} 件を再確認中...", file=sys.stderr)
        for u in pending:
            verdicts[u] = image_ok(u, delay=3.0)

    for p in pages:
        if not p.get("src"):
            continue
        ok, reason = verdicts[p["src"]]
        if ok is None:
            p["state"], p["detail"] = "unknown", reason
        elif not ok:
            p["state"], p["detail"] = "broken", reason


def render(results, urls_total):
    now = datetime.now(JST)
    by = {s: [r for r in results if r["state"] == s] for s in
          ("missing", "broken", "page_error", "unknown", "ok")}
    bad = by["missing"] + by["broken"] + by["page_error"]
    rate = len(by["ok"]) / len(results) * 100 if results else 0.0

    L = [
        "# Built Japan 画像ヘルスチェック",
        "",
        f"- 実行: {now:%Y-%m-%d %H:%M} JST",
        f"- 対象: 公開済み記事 {urls_total} ページ（{cfg['site']}）",
        f"- 正常表示: {len(by['ok'])} / {len(results)}（{rate:.1f}%）",
        f"- **要対応: {len(bad)} 件**"
        f"（画像なし {len(by['missing'])} / 壊れ {len(by['broken'])} / ページ異常 {len(by['page_error'])}）",
        "",
    ]
    if by["unknown"]:
        L += [f"- 判定不能: {len(by['unknown'])} 件（画像ホストのレート制限。異常とは限らない）", ""]
    if not bad:
        L += ["すべての記事でヒーロー画像が正常に表示されている。対応不要。", ""]
    labels = {
        "missing": "## 画像なし（heroImage未設定 → グレーのプレースホルダ）",
        "broken": "## 画像が壊れている（srcはあるが取得できない）",
        "page_error": "## ページ自体が取得できない",
        "unknown": "## 判定不能（レート制限・次回の実行で再確認）",
    }
    for state, title in labels.items():
        rows = by[state]
        if not rows:
            continue
        L += [title, "", "| 記事 | 詳細 |", "|---|---|"]
        for r in sorted(rows, key=lambda x: x["url"]):
            slug = r["url"].rstrip("/").split("/")[-1]
            lang = "EN" if "/en/" in r["url"] else "JA"
            detail = r["detail"]
            if r.get("src"):
                detail += f"<br>`{r['src']}`"
            L.append(f"| [{slug}（{lang}）]({r['url']}) | {detail} |")
        L.append("")
    L += [
        "## 直し方",
        "",
        "- **画像なし**: `site/src/content/buildings/<slug>.md` の `heroImage` を設定する。"
        "外観の全体写真を使う（内観・ロビー・横丁は不可）。",
        "- **壊れ**: Wikimediaのthumb幅が原寸を超えると400になる。"
        "`/thumb/.../<N>px-` の N を下げるか、thumbでない原寸URLに差し替える。",
        "- 直したら blog リポジトリに push し、CodeBuild を手動 start-build して反映する。",
        "",
    ]
    return "\n".join(L)


def main():
    urls = article_urls()
    print(f"記事 {len(urls)} ページを取得中...", file=sys.stderr)
    with concurrent.futures.ThreadPoolExecutor(max_workers=cfg["workers"]) as ex:
        results = list(ex.map(scan_page, urls))
    print("画像URLを検証中...", file=sys.stderr)
    verify_images(results)

    report = render(results, len(urls))
    os.makedirs(cfg["report_dir"], exist_ok=True)
    stamp = datetime.now(JST).strftime("%Y-%m-%d")
    for name in (f"image-health-{stamp}.md", "image-health-latest.md"):
        with open(os.path.join(cfg["report_dir"], name), "w", encoding="utf-8") as f:
            f.write(report)
    # 修復スクリプト(generator/repair_images.py)が読む機械可読版
    with open(os.path.join(cfg["report_dir"], "image-health-latest.json"), "w",
              encoding="utf-8") as f:
        json.dump({"checkedAt": datetime.now(JST).isoformat(), "pages": results},
                  f, ensure_ascii=False, indent=2)
    print(report)

    # 判定不能は異常ではないので落とさない
    return 1 if any(r["state"] in ("missing", "broken", "page_error") for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
