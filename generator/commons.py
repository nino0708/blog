"""Wikimedia Commons から建物画像(CCライセンス)を1枚取得する。

著作権配慮: 出典・作者・ライセンスを必ず一緒に持ち帰り、記事に明記する。
誤情報対策: 建物名に合致しない画像・別の建物・「〜から撮影/view from」等の眺望、
すでに他記事で使った画像は採用しない。確信が持てなければ None を返し「画像なし」で公開する。
(Node版 commons.mjs からの移植)
"""
import json
import re
import urllib.parse
import urllib.request

_UA = "TokyoTowersJournal/1.0 (hobby blog; contact itsuki9978miya@gmail.com)"

# 眺望・別物を示す語。これらを含むファイルは(建物の肖像ではないので)除外する。
_REJECT_PATTERNS = [
    re.compile(r"view from", re.I),
    re.compile(r"seen from", re.I),
    re.compile(r"from the top", re.I),
    re.compile(r"cityscape", re.I),
    re.compile(r"skyline", re.I),
    re.compile(r"panoramio", re.I),
    re.compile(r"から撮影"),
    re.compile(r"より撮影"),
    re.compile(r"から望む"),
    re.compile(r"からの眺望"),
    re.compile(r"夜景"),
    re.compile(r"の眺め"),
]


def _strip_html(s):
    if not s:
        return ""
    return re.sub(r"\s+", " ", re.sub(r"<[^>]*>", "", s)).strip()


def _name_tokens(name):
    if not name:
        return []
    # 「（東棟）」「(East Tower)」「(TOKIA)」等の補足括弧は写真ファイル名に現れないので落とす。
    # これを必須照合に含めると、正しい外観写真まで全部弾いてしまう(画像なしの主因)。
    name = re.sub(r"[(（][^)）]*[)）]", " ", name)
    lowered = re.sub(r"[,，.。/:：・·-]", " ", name.lower())
    # Commonsのファイル名は英数字主体。ASCIIの意味トークンだけを必須照合に使う
    # (日本語トークンはファイル名に出ず全件不一致になり、結局「画像なし」になるため)。
    return [
        t for t in lowered.split()
        if len(t) >= 3 and t not in ("the", "and") and re.search(r"[a-z0-9]", t)
    ]


def _normalize_title(file_title):
    return re.sub(r"\.[a-z0-9]+$", "", re.sub(r"^File:", "", file_title, flags=re.I), flags=re.I).strip()


def _search_files(query):
    api = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrnamespace": "6",  # File:
        "gsrsearch": query,
        "gsrlimit": "10",
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|mime",
        "iiurlwidth": "1200",
    }
    url = f"{api}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            data = json.loads(res.read().decode("utf-8"))
    except Exception:
        return []
    pages = (data.get("query") or {}).get("pages")
    if not pages:
        return []
    # generator=search の並び順(index)を尊重する(辞書順で先頭を拾わない)。
    return sorted(pages.values(), key=lambda p: p.get("index", 999))


def fetch_commons_image(building, used_titles=None):
    """building: dict({title, title_en}) または建物名の文字列(後方互換)。
    used_titles: すでに使用済みの正規化ファイルタイトルの set(重複回避)。
    """
    used = used_titles if isinstance(used_titles, set) else set()
    is_str = isinstance(building, str)
    en_name = building if is_str else building.get("title_en")
    ja_name = building if is_str else building.get("title")
    # 英語名はCommonsのファイル名(ローマ字/英語)と一致しやすいので優先して検索。
    queries = [q for q in (en_name, ja_name) if q]
    # 名前トークンは英語名から作る(無ければ日本語名)。全トークンの一致を必須にする。
    required = _name_tokens(en_name or ja_name)

    for q in queries:
        for page in _search_files(q):
            ii_list = page.get("imageinfo") or []
            if not ii_list:
                continue
            ii = ii_list[0]
            mime = ii.get("mime")
            if mime and not re.match(r"^image/(jpeg|png)$", mime):
                continue

            title = page.get("title") or ""
            norm = _normalize_title(title)
            if norm.lower() in used:  # 既出画像は使わない
                continue
            if any(p.search(title) for p in _REJECT_PATTERNS):  # 眺望・別物を除外
                continue

            # 建物名の意味トークンがすべてファイル名に含まれることを必須にする。
            low_title = title.lower()
            if not required:
                continue
            if not all(t in low_title for t in required):
                continue

            meta = ii.get("extmetadata") or {}
            return {
                "url": ii.get("thumburl") or ii.get("url"),
                "author": _strip_html((meta.get("Artist") or {}).get("value")) or "不明",
                "license": _strip_html((meta.get("LicenseShortName") or {}).get("value")) or "",
                "source": ii.get("descriptionurl") or page.get("canonicalurl") or "",
                "fileTitle": norm,
            }
    return None  # 確信できる固有の画像が無ければ画像なし(誤画像より安全)
