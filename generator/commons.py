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

# どの被写体でも主題写真になり得ないもの(図版・寄り・別物)。
_REJECT_ALWAYS = [
    re.compile(r"panoramio", re.I),
    re.compile(r"\bdetail", re.I),       # Details of ...(細部の寄り)
    re.compile(r"\bmap\b", re.I),
    re.compile(r"\bsign", re.I),          # sign / signage / signboard
    re.compile(r"nameboard", re.I),
    re.compile(r"restaurant", re.I),
    re.compile(r"yokocho", re.I),         # 〜横丁(館内の飲食街)
    re.compile(r"food court", re.I),
    re.compile(r"\bcafe", re.I),
    re.compile(r"\bshop", re.I),          # shop / shopping
    re.compile(r"\bmall\b", re.I),
    re.compile(r"から撮影"),
    re.compile(r"より撮影"),
    re.compile(r"看板"),
    re.compile(r"地図"),
    re.compile(r"横丁"),
    re.compile(r"路線図"),
    re.compile(r"bus stop", re.I),        # 施設の一部であって主題ではない
    re.compile(r"\bexit\b", re.I),        # 〜出口(路線そのものではない)
]

# ファイル名の先頭に付いてよい説明語。これ以外の語で始まるファイルは、
# 主題が「ついで」に写っているだけ(例: "Ebisu Garden Place near the Yamanote line")と見なす。
_ALLOWED_LEADING = {
    "aerial", "view", "of", "the", "a", "an", "photo", "image", "panorama",
    "file", "japan", "tokyo", "new", "old",
}

# 眺望(その建物「から」の景色であって建物自体が写らない)。
_REJECT_VIEW_FROM = [
    re.compile(r"view from", re.I),
    re.compile(r"seen from", re.I),
    re.compile(r"from the top", re.I),
    re.compile(r"cityscape", re.I),
    re.compile(r"skyline", re.I),
    re.compile(r"から望む"),
    re.compile(r"からの眺望"),
    re.compile(r"の眺め"),
]

# 上空から。ビルでは全景にならないが、ジャンクションや路線では最良の1枚になり得る。
_REJECT_AERIAL = [
    re.compile(r"from the air", re.I),
    re.compile(r"aerial", re.I),
    re.compile(r"空撮"),
]

# 屋内・構内。ビルでは外観でないので除外するが、駅記事ではホームや改札が主題になり得る。
_REJECT_INDOOR = [
    re.compile(r"rooftop", re.I),
    re.compile(r"roof top", re.I),
    re.compile(r"interior", re.I),
    re.compile(r"indoor", re.I),
    re.compile(r"lobby", re.I),
    re.compile(r"atrium", re.I),
    re.compile(r"concourse", re.I),
    re.compile(r"escalator", re.I),
    re.compile(r"elevator", re.I),
    re.compile(r"platform", re.I),
    re.compile(r"stairs", re.I),
    re.compile(r"staircase", re.I),
    re.compile(r"entrance", re.I),
    re.compile(r"arcade", re.I),          # アーケード/商業フロア内
    re.compile(r"\bhall\b", re.I),
    re.compile(r"passing near", re.I),    # 上空通過の航空機等
    re.compile(r"back alley", re.I),
    re.compile(r"屋上"),
    re.compile(r"館内"),
    re.compile(r"室内"),
    re.compile(r"ロビー"),
    re.compile(r"吹き抜け"),
    re.compile(r"夜景"),
]

# 被写体ごとの除外セット。
# building : 外観の全景が欲しいので、眺望・空撮・屋内をすべて弾く(従来どおり)。
# expressway: ジャンクションやトンネルは空撮・俯瞰が本命なので aerial を許す。
# railway  : 路線は空撮、駅はホーム・改札も主題になるため aerial と屋内を許す。
_REJECT_BY_SUBJECT = {
    "building": _REJECT_ALWAYS + _REJECT_VIEW_FROM + _REJECT_AERIAL + _REJECT_INDOOR,
    "expressway": _REJECT_ALWAYS + _REJECT_VIEW_FROM + _REJECT_INDOOR,
    "railway": _REJECT_ALWAYS + _REJECT_VIEW_FROM,
    "tourism": _REJECT_ALWAYS + _REJECT_VIEW_FROM + _REJECT_AERIAL + _REJECT_INDOOR,
}
_REJECT_PATTERNS = _REJECT_BY_SUBJECT["building"]  # 後方互換(既存の参照用)

# 建物名以外の説明語(externalに付く修飾)。スコアリングで「説明語が少ない=全景」を優先するため、
# タイトル中のこれら以外の英単語数で減点する。
_GENERIC_WORDS = {
    "the", "and", "of", "at", "in", "on", "tokyo", "japan", "building", "tower", "from",
    # 道路・鉄道の一般語。名称に含まれがちで、これを減点すると全景写真が不利になる。
    "line", "station", "route", "expressway", "highway", "junction", "railway", "bridge", "tunnel",
}


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
        "iiprop": "url|extmetadata|mime|size",  # size=縦横比の判定に使う
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


def _extra_word_count(norm_title, name_tokens):
    """ファイル名から、建物名・一般語を除いた「余分な説明語」の数を数える。
    少ないほど素直な建物ポートレート(例: 'Shibuya Stream-1b')、多いほど
    施設名や状況の付いた写真(例: 'Shibuya Stream Excel Hotel Tokyu')。
    """
    name_set = set(name_tokens)
    words = re.split(r"[\s_()（）,，.。/:：・·-]+", norm_title.lower())
    extra = 0
    for w in words:
        w = w.strip()
        if len(w) < 3 or not re.search(r"[a-z]", w):
            continue
        if w in name_set or w in _GENERIC_WORDS:
            continue
        extra += 1
    return extra


def _leads_with_subject(norm_title, name_tokens):
    """ファイル名が主題そのものから始まっているかを判定する。

    「Ebisu Garden Place near the Yamanote line」のように、主題名が後ろに出てくる
    ファイルは、主題が背景に写っているだけのことが多い。名前トークンの全一致だけでは
    これを弾けないため、先頭の語も見る。'Aerial view of X' のような説明語で始まる
    ケースは許す。
    """
    if not name_tokens:
        return True  # 日本語名のみ等、判定材料が無いときは検索の関連度に委ねる
    name_set = set(name_tokens)
    for w in re.split(r"[\s_()（）,，.。/:：・·-]+", norm_title.lower()):
        w = w.strip()
        if len(w) < 3 or not re.search(r"[a-z]", w):
            continue  # 連番や記号は読み飛ばす
        if w in _ALLOWED_LEADING:
            continue
        return w in name_set
    return True


def fetch_commons_image(building, used_titles=None, subject="building"):
    """building: dict({title, title_en}) または建物名の文字列(後方互換)。
    used_titles: すでに使用済みの正規化ファイルタイトルの set(重複回避)。
    subject: 被写体の種類('building' / 'expressway' / 'railway' / 'tourism')。
             除外ルールが変わる(例: 高速道路や鉄道では空撮を許す)。

    候補を集め、(1)主題でない写真を除外し、(2)説明語の少ない=全景らしい順に並べて
    最良の1枚を返す。確信できる候補が無ければ None(誤画像より「画像なし」が安全)。
    """
    used = used_titles if isinstance(used_titles, set) else set()
    reject = _REJECT_BY_SUBJECT.get(subject, _REJECT_BY_SUBJECT["building"])
    is_str = isinstance(building, str)
    en_name = building if is_str else building.get("title_en")
    ja_name = building if is_str else building.get("title")
    # 英語名はCommonsのファイル名(ローマ字/英語)と一致しやすいので優先して検索。
    queries = [q for q in (en_name, ja_name) if q]
    # 必須照合トークン(英語名優先)。日本語名しか無い場合は空になり、
    # その時は検索の関連度順 + 外観フィルタを信頼してフォールバックする。
    required = _name_tokens(en_name or ja_name) or _name_tokens(ja_name)

    candidates = []
    seen_norm = set()
    for qi, q in enumerate(queries):
        for page in _search_files(q):
            ii_list = page.get("imageinfo") or []
            if not ii_list:
                continue
            ii = ii_list[0]
            # 写真のみ。PNG/SVG は路線図・ロゴ等の図版であることが多いため除外する
            # (例: 銀座線で「路線図のPNG」が選ばれた)。
            mime = ii.get("mime")
            if mime != "image/jpeg":
                continue

            # 極端な縦横比はヒーロー画像・サムネイルで破綻する
            # (例: 山手線でパノラマ合成のラインスキャン写真 1280x193 が選ばれた)。
            w, h = ii.get("width") or 0, ii.get("height") or 0
            if w and h and not (0.4 <= w / h <= 2.5):
                continue

            title = page.get("title") or ""
            norm = _normalize_title(title)
            key = norm.lower()
            if key in used or key in seen_norm:  # 既出/重複は除外
                continue
            if any(p.search(title) for p in reject):  # 主題でない写真を除外
                continue

            low_title = title.lower()
            if required:
                # ASCII名トークンがある場合は全一致を必須にして取り違えを防ぐ。
                if not all(t in low_title for t in required):
                    continue
            # required が空(日本語名のみ)の場合は検索関連度に委ねる。
            if not _leads_with_subject(norm, required):
                continue  # 主題が背景に写っているだけのファイル

            seen_norm.add(key)
            rank = qi * 100 + page.get("index", 999)
            candidates.append((_extra_word_count(norm, required), rank, page, ii))

    if not candidates:
        return None
    # 説明語が少ない順 → 検索上位順。素直な建物全景を優先する。
    candidates.sort(key=lambda c: (c[0], c[1]))
    _, _, page, ii = candidates[0]
    meta = ii.get("extmetadata") or {}
    return {
        "url": ii.get("thumburl") or ii.get("url"),
        "author": _strip_html((meta.get("Artist") or {}).get("value")) or "不明",
        "license": _strip_html((meta.get("LicenseShortName") or {}).get("value")) or "",
        "source": ii.get("descriptionurl") or page.get("canonicalurl") or "",
        "fileTitle": _normalize_title(page.get("title") or ""),
    }
