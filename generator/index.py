"""東京の建物記事をseedデータ＋Claudeで生成し、GitHubにMarkdownをコミットするLambda。

Node版(index.mjs)からPythonへ移植。外部依存ゼロ(標準ライブラリのみ)。
- Anthropic / GitHub / Wikimedia Commons : urllib で直接HTTP
- Secrets Manager / CodeBuild : boto3 (Lambdaランタイム同梱)
"""
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

from prompts import (
    build_prompt, build_verify_prompt, build_fix_suffix,
    build_en_prompt, build_en_verify_prompt, build_en_fix_suffix,
)
from commons import fetch_commons_image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL = "--local" in sys.argv

cfg = {
    "owner": os.environ.get("GITHUB_OWNER"),
    "repo": os.environ.get("GITHUB_REPO"),
    "branch": os.environ.get("GITHUB_BRANCH", "main"),
    # リポジトリ(nino0708/blog)内の記事Markdown格納先
    "content_dir": os.environ.get("CONTENT_DIR", "site/src/content/buildings"),
    "content_dir_en": os.environ.get("CONTENT_DIR_EN", "site/src/content/buildings-en"),
    "model": os.environ.get("MODEL", "claude-sonnet-4-6"),
    "anthropic_key": os.environ.get("ANTHROPIC_API_KEY"),
    "github_token": os.environ.get("GITHUB_TOKEN"),
    "build_project": os.environ.get("BUILD_PROJECT_NAME"),
}


# Secrets Manager から鍵を解決(*_SECRET_ARN があれば優先。なければ環境変数の素の値)。
def resolve_secrets():
    a_arn = os.environ.get("ANTHROPIC_SECRET_ARN")
    g_arn = os.environ.get("GITHUB_TOKEN_SECRET_ARN")
    if not a_arn and not g_arn:
        return
    import boto3
    sm = boto3.client("secretsmanager")
    if a_arn:
        cfg["anthropic_key"] = sm.get_secret_value(SecretId=a_arn)["SecretString"]
    if g_arn:
        cfg["github_token"] = sm.get_secret_value(SecretId=g_arn)["SecretString"]


def load_seed():
    with open(os.path.join(BASE_DIR, "data", "buildings.json"), encoding="utf-8") as f:
        return json.load(f)["buildings"]


def yaml_string(s):
    # ダブルクオートで囲み、内部の " をエスケープ
    return '"' + str(s).replace('"', '\\"') + '"'


def _today():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def build_frontmatter(b, body):
    lines = ["---"]
    lines.append(f"title: {yaml_string(b['title'])}")
    lines.append(f"buildingType: {b['buildingType']}")
    lines.append(f"area: {yaml_string(b['area'])}")
    if b.get("address"):
        lines.append(f"address: {yaml_string(b['address'])}")
    if b.get("completedYear"):
        lines.append(f"completedYear: {b['completedYear']}")
    if b.get("floorsAbove"):
        lines.append(f"floorsAbove: {b['floorsAbove']}")
    if b.get("floorsBelow"):
        lines.append(f"floorsBelow: {b['floorsBelow']}")
    if b.get("heightM"):
        lines.append(f"heightM: {b['heightM']}")
    if b.get("totalFloorAreaM2"):
        lines.append(f"totalFloorAreaM2: {b['totalFloorAreaM2']}")
    if b.get("developer"):
        lines.append(f"developer: {yaml_string(b['developer'])}")
    if b.get("architect"):
        lines.append(f"architect: {yaml_string(b['architect'])}")
    tags = b.get("tags") or []
    lines.append(f"tags: [{', '.join(yaml_string(t) for t in tags)}]")
    lines.append(f"publishedAt: {_today()}")
    if b.get("summary"):
        lines.append(f"summary: {yaml_string(b['summary'])}")
    if b.get("heroImage"):
        lines.append(f"heroImage: {yaml_string(b['heroImage'])}")
    if b.get("heroImageCredit"):
        lines.append(f"heroImageCredit: {yaml_string(b['heroImageCredit'])}")
    if b.get("heroImageLink"):
        lines.append(f"heroImageLink: {yaml_string(b['heroImageLink'])}")
    lines.append(f"verified: {'true' if b.get('verified') else 'false'}")
    sources = b.get("sources") or []
    lines.append(f"sources: [{', '.join(yaml_string(s) for s in sources)}]")
    lines.append("---")
    lines.append("")
    if not b.get("verified"):
        lines.append("> この記事は事実確認中（未検証）です。数値は出典での裏取り後に確定します。")
        lines.append("")
    lines.append(body.strip())
    lines.append("")
    return "\n".join(lines)


# 英語版のfront matter。数値の事実はsite側でJP版から補うため、ここでは言語依存のテキストのみ。
def build_en_frontmatter(b, body):
    lines = ["---"]
    lines.append(f"title: {yaml_string(b.get('title_en') or b['title'])}")
    lines.append(f"area: {yaml_string(b.get('area_en') or b['area'])}")
    if b.get("summary_en") or b.get("summary"):
        lines.append(f"summary: {yaml_string(b.get('summary_en') or b['summary'])}")
    if b.get("developer_en") or b.get("developer"):
        lines.append(f"developer: {yaml_string(b.get('developer_en') or b['developer'])}")
    if b.get("architect_en") or b.get("architect"):
        lines.append(f"architect: {yaml_string(b.get('architect_en') or b['architect'])}")
    tags = b.get("tags_en") or b.get("tags") or []
    lines.append(f"tags: [{', '.join(yaml_string(t) for t in tags)}]")
    lines.append("---")
    lines.append("")
    if not b.get("verified"):
        lines.append("> This article is undergoing fact-checking (unverified). Figures will be finalized after confirmation against sources.")
        lines.append("")
    lines.append(body.strip())
    lines.append("")
    return "\n".join(lines)


# 既存記事のheroImage URLから、Commonsの正規化ファイルタイトルを復元して集める(重複回避用)。
def file_title_from_url(url):
    try:
        base = urllib.parse.unquote(url.split("/")[-1])
        base = re.sub(r"^\d+px-", "", base)
        base = re.sub(r"\.[a-z0-9]+$", "", base, flags=re.I)
        return base.replace("_", " ").strip().lower()
    except Exception:
        return ""


def collect_used_image_titles():
    used = set()
    d = os.path.join(BASE_DIR, "..", "site", "src", "content", "buildings")
    if not os.path.isdir(d):
        return used
    for name in os.listdir(d):
        if not name.endswith(".md"):
            continue
        with open(os.path.join(d, name), encoding="utf-8") as f:
            m = re.search(r'^heroImage:\s*"?([^"\n]+)"?', f.read(), re.M)
        if m:
            t = file_title_from_url(m.group(1))
            if t:
                used.add(t)
    return used


def _gh_headers():
    return {
        "Authorization": f"Bearer {cfg['github_token']}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "tokyo-building-blog-generator",
    }


def get_existing_slugs():
    url = (
        f"https://api.github.com/repos/{cfg['owner']}/{cfg['repo']}"
        f"/contents/{cfg['content_dir']}?ref={cfg['branch']}"
    )
    req = urllib.request.Request(url, headers=_gh_headers())
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return set()
        raise
    if not isinstance(data, list):
        return set()
    return {
        f["name"][:-3]
        for f in data
        if f.get("type") == "file" and f["name"].endswith(".md")
    }


def ask_text(prompt, max_tokens=2048):
    body = json.dumps({
        "model": cfg["model"],
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        method="POST",
        headers={
            "x-api-key": cfg["anthropic_key"],
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.loads(r.read().decode("utf-8"))
    for c in data.get("content", []):
        if c.get("type") == "text":
            return c["text"].strip()
    return ""


def _parse_verify(raw):
    try:
        snippet = raw[raw.index("{"): raw.rindex("}") + 1]
        parsed = json.loads(snippet)
        issues = parsed.get("issues")
        return {
            "ok": parsed.get("ok") is True,
            "issues": issues if isinstance(issues, list) else [],
        }
    except Exception:
        return None


# 本文を確定事実に照らして検証。{ok, issues} を返す。
def verify_body(b, body):
    parsed = _parse_verify(ask_text(build_verify_prompt(b, body), 1024))
    if parsed is None:
        # 検証結果がパースできない場合は「安全側」に倒して不合格扱い
        return {"ok": False, "issues": ["検証結果のパースに失敗（安全のため非公開）"]}
    return parsed


# 生成 → 検証 → NGなら指摘を反映して1回だけ再生成 → なお不合格なら None。
def generate_verified_body(b):
    body = ask_text(build_prompt(b))
    check = verify_body(b, body)
    if check["ok"]:
        return {"body": body, "attempts": 1}

    print(f"  ファクトチェック指摘(1回目): {' / '.join(check['issues'])}")
    body = ask_text(build_prompt(b) + build_fix_suffix(check["issues"]))
    check = verify_body(b, body)
    if check["ok"]:
        return {"body": body, "attempts": 2}

    print(f"  ファクトチェック指摘(2回目): {' / '.join(check['issues'])}")
    return {"body": None, "attempts": 2, "issues": check["issues"]}


# 英語本文を確定事実に照らして検証。{ok, issues} を返す。
def verify_en_body(b, body):
    parsed = _parse_verify(ask_text(build_en_verify_prompt(b, body), 1024))
    if parsed is None:
        return {"ok": False, "issues": ["Failed to parse verification result (withheld for safety)"]}
    return parsed


# 英語本文を生成 → 検証 → NGなら指摘を反映して1回だけ再生成 → なお不合格なら None。
def generate_verified_en_body(b):
    body = ask_text(build_en_prompt(b))
    check = verify_en_body(b, body)
    if check["ok"]:
        return {"body": body, "attempts": 1}

    print(f"  [EN] ファクトチェック指摘(1回目): {' / '.join(check['issues'])}")
    body = ask_text(build_en_prompt(b) + build_en_fix_suffix(check["issues"]))
    check = verify_en_body(b, body)
    if check["ok"]:
        return {"body": body, "attempts": 2}

    print(f"  [EN] ファクトチェック指摘(2回目): {' / '.join(check['issues'])}")
    return {"body": None, "attempts": 2, "issues": check["issues"]}


def commit_to_github(content_dir, slug, content):
    path = f"{content_dir}/{slug}.md"
    url = f"https://api.github.com/repos/{cfg['owner']}/{cfg['repo']}/contents/{path}"
    body = json.dumps({
        "message": f"記事自動生成: {slug}",
        "branch": cfg["branch"],
        "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
    }).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="PUT", headers=_gh_headers())
    with urllib.request.urlopen(req, timeout=30) as r:
        r.read()
    return path


# コミット後に CodeBuild を起動してビルド&デプロイさせる(Webhook不使用)。
def trigger_build():
    if not cfg["build_project"]:
        return
    import boto3
    cb = boto3.client("codebuild")
    cb.start_build(projectName=cfg["build_project"], sourceVersion=cfg["branch"])
    print(f"CodeBuild起動: {cfg['build_project']}")


def handler(event=None, context=None):
    resolve_secrets()
    seed = load_seed()

    if LOCAL:
        # ローカルでも content ディレクトリの既存slugを見て、次の未生成を選ぶ
        d = os.path.join(BASE_DIR, "..", "site", "src", "content", "buildings")
        existing = (
            {f[:-3] for f in os.listdir(d) if f.endswith(".md")}
            if os.path.isdir(d) else set()
        )
    else:
        existing = get_existing_slugs()

    # 自動公開は verified:true(事実が裏取り済み)の建物だけ。未検証は人の確認待ちで公開しない。
    # ローカル検証時は ALLOW_UNVERIFIED=1 で未検証も対象にできる。
    allow_unverified = LOCAL and os.environ.get("ALLOW_UNVERIFIED") == "1"
    next_b = next(
        (b for b in seed if b["slug"] not in existing and (b.get("verified") or allow_unverified)),
        None,
    )
    if not next_b:
        print("公開できる未処理の建物がありません（verified:true のストック切れか全件公開済み）。検証済みの建物をseedに追記してください。")
        return {"status": "no-op"}

    # デプロイ確認用のスモークテスト: 選定までで止め、API課金・公開はしない。
    if os.environ.get("DRY_RUN") == "1":
        print(f"DRY_RUN: 生成対象 {next_b['title']} ({next_b['slug']})")
        return {"status": "dry-run", "slug": next_b["slug"], "title": next_b["title"]}

    print(f"生成対象: {next_b['title']} ({next_b['slug']})")
    result = generate_verified_body(next_b)
    if not result["body"]:
        # ファクトチェックを通らなかった → 公開しない(間違った投稿を出さない)
        print(f"ファクトチェック不合格のため公開を見送り: {next_b['slug']}")
        return {"status": "rejected", "slug": next_b["slug"], "issues": result.get("issues")}
    print(f"ファクトチェック合格（試行{result['attempts']}回）")

    # 建物画像(Wikimedia Commons, CCライセンス)を取得。出典・作者・ライセンスを必ず付与。
    # 既出画像との重複を避けるため、ローカルでは既存記事のheroImageを集めて渡す。
    used_titles = collect_used_image_titles() if LOCAL else set()
    try:
        img = fetch_commons_image(next_b, used_titles=used_titles)
        if img and img.get("url"):
            next_b["heroImage"] = img["url"]
            next_b["heroImageCredit"] = " / ".join(x for x in (img.get("author"), img.get("license")) if x)
            next_b["heroImageLink"] = img.get("source")
            print(f"画像取得: {next_b['heroImageCredit']}")
        else:
            print("画像が見つからず（画像なしで公開）")
    except Exception as e:
        print(f"画像取得スキップ: {e}")

    content = build_frontmatter(next_b, result["body"])

    # 英語版も同じ事実から生成し、英語ファクトチェックに通ったときだけ公開する。
    # 不合格でも日本語版は公開する(英語は次回以降に再挑戦できる)。
    en_content = None
    en_result = generate_verified_en_body(next_b)
    if en_result["body"]:
        en_content = build_en_frontmatter(next_b, en_result["body"])
        print(f"英語版ファクトチェック合格（試行{en_result['attempts']}回）")
    else:
        print(f"英語版はファクトチェック不合格のため見送り（日本語版のみ公開）: {next_b['slug']}")

    if LOCAL:
        out_ja = os.path.join(BASE_DIR, "..", "site", "src", "content", "buildings", f"{next_b['slug']}.md")
        os.makedirs(os.path.dirname(out_ja), exist_ok=True)
        with open(out_ja, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"ローカル出力(JA): {out_ja}")
        if en_content:
            out_en = os.path.join(BASE_DIR, "..", "site", "src", "content", "buildings-en", f"{next_b['slug']}.md")
            os.makedirs(os.path.dirname(out_en), exist_ok=True)
            with open(out_en, "w", encoding="utf-8") as f:
                f.write(en_content)
            print(f"ローカル出力(EN): {out_en}")
        return {"status": "local", "slug": next_b["slug"], "en": bool(en_content)}

    path = commit_to_github(cfg["content_dir"], next_b["slug"], content)
    print(f"コミット完了(JA): {path}")
    if en_content:
        path_en = commit_to_github(cfg["content_dir_en"], next_b["slug"], en_content)
        print(f"コミット完了(EN): {path_en}")
    trigger_build()
    return {"status": "committed", "slug": next_b["slug"], "path": path, "en": bool(en_content)}


# ローカル実行 / Lambda外実行のエントリ
if __name__ == "__main__" and (LOCAL or os.environ.get("RUN_NOW")):
    try:
        print(handler())
    except Exception as e:
        print(e, file=sys.stderr)
        sys.exit(1)
