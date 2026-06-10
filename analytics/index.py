"""Built Japan(builtjapan.com) アクセス分析 Lambda = 「分析部」のデータエンジン。

CloudFrontアクセスログ(S3)を集計し、週次レポート(Markdown)を GitHub(nino0708/blog)の
reports/ に出力する。事業計画部(クラウドルーティン towers-action-plan)がこのレポートを
読んで方針を決める、という連携の起点。

外部依存ゼロ: S3はboto3(ランタイム同梱)、GitHubはurllib。
"""
import base64
import gzip
import io
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone

cfg = {
    "log_bucket": os.environ.get("LOG_BUCKET", "tokyo-building-blog-logs-982081059698"),
    "log_prefix": os.environ.get("LOG_PREFIX", "cf/"),
    "days": int(os.environ.get("WINDOW_DAYS", "7")),
    "owner": os.environ.get("GITHUB_OWNER", "nino0708"),
    "repo": os.environ.get("GITHUB_REPO", "blog"),
    "branch": os.environ.get("GITHUB_BRANCH", "main"),
    "report_dir": os.environ.get("REPORT_DIR", "reports"),
    "github_token": os.environ.get("GITHUB_TOKEN"),
    "site_host": os.environ.get("SITE_HOST", "builtjapan.com"),
}

# ボット/クローラを示す User-Agent。人間のアクセス推定から除外する。
_BOT_RE = re.compile(
    r"bot|crawl|spider|slurp|bing|google|yandex|baidu|duckduck|facebookexternal|"
    r"headless|curl|wget|python-|libwww|httpclient|monitor|uptime|ahrefs|semrush|"
    r"pingdom|datadog|lighthouse|preview|fetch",
    re.I,
)
# 集計から外す静的アセット。
_ASSET_RE = re.compile(r"\.(css|js|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|map|xml|txt|json)$", re.I)


def _resolve_secret():
    arn = os.environ.get("GITHUB_TOKEN_SECRET_ARN")
    if arn and not cfg["github_token"]:
        import boto3
        cfg["github_token"] = boto3.client("secretsmanager").get_secret_value(SecretId=arn)["SecretString"]


def _recent_log_keys(s3):
    """直近 days 日分のCloudFrontログキーを集める。キー名は cf/<dist>.YYYY-MM-DD-HH.<hash>.gz。"""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=cfg["days"])).date()
    keys = []
    token = None
    date_re = re.compile(r"\.(\d{4}-\d{2}-\d{2})-\d{2}\.")
    while True:
        kw = {"Bucket": cfg["log_bucket"], "Prefix": cfg["log_prefix"], "MaxKeys": 1000}
        if token:
            kw["ContinuationToken"] = token
        resp = s3.list_objects_v2(**kw)
        for o in resp.get("Contents", []):
            m = date_re.search(o["Key"])
            if not m:
                continue
            d = datetime.strptime(m.group(1), "%Y-%m-%d").date()
            if d >= cutoff:
                keys.append(o["Key"])
        if resp.get("IsTruncated"):
            token = resp.get("NextContinuationToken")
        else:
            break
    return keys


def _aggregate(s3, keys):
    fields = None
    requests_total = 0
    page_hits = 0          # HTMLページの200だけ(人間)
    bot_hits = 0
    ips = set()
    pages = Counter()
    referrers = Counter()
    lang = Counter()       # ja / en
    daily = Counter()

    for key in keys:
        body = s3.get_object(Bucket=cfg["log_bucket"], Key=key)["Body"].read()
        try:
            text = gzip.GzipFile(fileobj=io.BytesIO(body)).read().decode("utf-8", "replace")
        except OSError:
            continue
        for line in text.splitlines():
            if line.startswith("#Fields:"):
                fields = line[len("#Fields:"):].split()
                continue
            if line.startswith("#") or not line.strip():
                continue
            if not fields:
                continue
            parts = line.split("\t")
            if len(parts) < len(fields):
                continue
            row = dict(zip(fields, parts))
            requests_total += 1

            uri = row.get("cs-uri-stem", "")
            status = row.get("sc-status", "")
            ua = urllib.parse.unquote(row.get("cs(User-Agent)", ""))
            ref = urllib.parse.unquote(row.get("cs(Referer)", ""))
            ip = row.get("c-ip", "")
            date = row.get("date", "")

            is_bot = bool(_BOT_RE.search(ua)) or ua in ("-", "")
            # ページ判定: 静的アセットを除外し、ディレクトリ的URL(末尾/ または拡張子なし)
            is_page = not _ASSET_RE.search(uri) and (uri.endswith("/") or "." not in uri.rsplit("/", 1)[-1])

            if is_page and status == "200":
                if is_bot:
                    bot_hits += 1
                else:
                    page_hits += 1
                    if ip:
                        ips.add(ip)
                    pages[uri] += 1
                    daily[date] += 1
                    lang["en" if uri.startswith("/en/") or uri == "/en" else "ja"] += 1
                    if ref and ref != "-":
                        host = re.sub(r"^https?://", "", ref).split("/")[0]
                        if cfg["site_host"] not in host:  # 自サイト内遷移は除外
                            referrers[host] += 1

    return {
        "requests_total": requests_total,
        "page_hits": page_hits,
        "bot_hits": bot_hits,
        "unique_ips": len(ips),
        "pages": pages.most_common(10),
        "referrers": referrers.most_common(10),
        "lang": dict(lang),
        "daily": dict(sorted(daily.items())),
        "files": len(keys),
    }


def _render(a, start, end):
    L = [f"# Built Japan アクセス分析（{start}〜{end}）", ""]
    L.append("> 分析部(Lambda)がCloudFrontアクセスログを自動集計。事業計画部はこれを基に方針を決定する。")
    L.append("")
    if a["files"] == 0:
        L.append("⚠️ 対象期間のアクセスログがまだありません（計測開始直後、または無アクセス）。")
        L.append("ログが蓄積される翌週以降に数値が出ます。")
        return "\n".join(L) + "\n"
    L.append("## サマリ")
    L.append(f"- 推定訪問（ユニークIP・人間UA）: **{a['unique_ips']}**")
    L.append(f"- ページビュー（人間・HTML 200）: **{a['page_hits']}**")
    L.append(f"- ボット/クローラのページ取得: {a['bot_hits']}（Google等のクロール量の目安）")
    L.append(f"- 総リクエスト（画像等含む）: {a['requests_total']}")
    jp = a["lang"].get("ja", 0)
    en = a["lang"].get("en", 0)
    L.append(f"- 日本語 {jp} / 英語 {en} ページビュー")
    L.append("")
    L.append("## 人気ページ Top10")
    if a["pages"]:
        for p, c in a["pages"]:
            L.append(f"- {c}　{p}")
    else:
        L.append("- （データなし）")
    L.append("")
    L.append("## 参照元 Top（外部のみ）")
    if a["referrers"]:
        for r, c in a["referrers"]:
            L.append(f"- {c}　{r}")
    else:
        L.append("- 外部参照元なし（検索・SNS流入がまだ無い状態）")
    L.append("")
    L.append("## 日別ページビュー")
    for d, c in a["daily"].items():
        L.append(f"- {d}: {c}")
    L.append("")
    return "\n".join(L) + "\n"


def _gh_headers():
    return {
        "Authorization": f"Bearer {cfg['github_token']}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "tbb-analytics",
    }


def _get_sha(path):
    url = f"https://api.github.com/repos/{cfg['owner']}/{cfg['repo']}/contents/{path}?ref={cfg['branch']}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=_gh_headers()), timeout=30) as r:
            return json.loads(r.read())["sha"]
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def _commit(path, content, message):
    url = f"https://api.github.com/repos/{cfg['owner']}/{cfg['repo']}/contents/{path}"
    payload = {
        "message": message,
        "branch": cfg["branch"],
        "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
    }
    sha = _get_sha(path)
    if sha:
        payload["sha"] = sha
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), method="PUT", headers=_gh_headers())
    with urllib.request.urlopen(req, timeout=30) as r:
        r.read()


def handler(event=None, context=None):
    import boto3
    _resolve_secret()
    s3 = boto3.client("s3")

    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=cfg["days"])).strftime("%Y-%m-%d")
    end = now.strftime("%Y-%m-%d")

    keys = _recent_log_keys(s3)
    agg = _aggregate(s3, keys)
    report = _render(agg, start, end)

    iso = now.isocalendar()
    dated = f"{cfg['report_dir']}/analytics-{iso.year}-W{iso.week:02d}.md"
    latest = f"{cfg['report_dir']}/analytics-latest.md"
    msg = f"分析部: アクセスレポート {start}〜{end}（訪問{agg['unique_ips']}/PV{agg['page_hits']}）"
    _commit(dated, report, msg)
    _commit(latest, report, msg)

    return {"status": "ok", "start": start, "end": end,
            "unique_ips": agg["unique_ips"], "page_hits": agg["page_hits"],
            "bot_hits": agg["bot_hits"], "log_files": agg["files"]}


if __name__ == "__main__":
    print(handler())
