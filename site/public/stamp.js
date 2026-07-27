/*
 * Built Japan スタンプラリー（自己申告制）の共有ストア。
 * 記録はこの端末のブラウザ(localStorage)にだけ保存し、サーバーへは一切送らない。
 * ページ側は data-stamp-* 属性を付けるだけでよく、描画はこのスクリプトが担う。
 */
(function () {
  var KEY = 'bj:stamps:v1';
  var EVENT = 'bj:stamp-change';
  var SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var MAX_ENTRIES = 2000;

  var memory = null; // localStorage が使えない環境（プライベートモード等）の退避先

  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  // 保存形式: { slug: 'YYYY-MM-DD' }。壊れた値・見知らぬ形は黙って捨てる。
  function sanitize(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    var keys = Object.keys(raw).slice(0, MAX_ENTRIES);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (!SLUG_RE.test(k)) continue;
      var v = raw[k];
      out[k] = typeof v === 'string' && DATE_RE.test(v) ? v : today();
    }
    return out;
  }

  function read() {
    if (memory) return memory;
    try {
      var s = window.localStorage.getItem(KEY);
      if (!s) return {};
      var parsed = JSON.parse(s);
      return sanitize(parsed && parsed.stamps ? parsed.stamps : parsed);
    } catch (e) {
      return {};
    }
  }

  function write(map) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, stamps: map }));
    } catch (e) {
      memory = map; // 保存できない環境でも、そのセッション中は動くようにする
    }
    document.dispatchEvent(new CustomEvent(EVENT, { detail: { stamps: map } }));
  }

  function b64encode(str) {
    return btoa(unescape(encodeURIComponent(str))).replace(/=+$/, '');
  }
  function b64decode(str) {
    var s = str.replace(/[^A-Za-z0-9+/=]/g, '');
    while (s.length % 4) s += '=';
    return decodeURIComponent(escape(atob(s)));
  }

  var api = {
    all: read,
    has: function (slug) {
      return Object.prototype.hasOwnProperty.call(read(), slug);
    },
    count: function () {
      return Object.keys(read()).length;
    },
    set: function (slug, on) {
      if (!SLUG_RE.test(slug)) return false;
      var map = read();
      if (on) map[slug] = map[slug] || today();
      else delete map[slug];
      write(map);
      return Boolean(on);
    },
    toggle: function (slug) {
      return api.set(slug, !api.has(slug));
    },
    clear: function () {
      write({});
    },
    /** 他の端末へ移すためのコード。中身は建物slugと押した日だけ。 */
    exportCode: function () {
      return 'BJ1.' + b64encode(JSON.stringify(read()));
    },
    /** コードを読み込んで合流させる（既存の記録は消さない）。戻り値は増えた件数。 */
    importCode: function (code) {
      var body = String(code || '').trim();
      if (body.indexOf('BJ1.') === 0) body = body.slice(4);
      var incoming = sanitize(JSON.parse(b64decode(body)));
      var map = read();
      var added = 0;
      for (var slug in incoming) {
        if (!Object.prototype.hasOwnProperty.call(map, slug)) {
          map[slug] = incoming[slug];
          added++;
        }
      }
      write(map);
      return added;
    },
    onChange: function (fn) {
      document.addEventListener(EVENT, fn);
      return fn;
    },
  };

  // --- 描画（data-stamp-* が付いた要素を自動で面倒みる） ---

  function paintButton(btn, on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('is-stamped', on);
    var label = btn.querySelector('[data-stamp-label]');
    var text = on ? btn.dataset.labelOn : btn.dataset.labelOff;
    if (text) {
      if (label) label.textContent = text;
      else btn.textContent = text;
    }
    var date = btn.parentElement && btn.parentElement.querySelector('[data-stamp-date]');
    if (date) {
      var d = read()[btn.dataset.stampSlug];
      date.textContent = on && d ? (date.dataset.prefix || '') + d : '';
    }
  }

  function paintAll() {
    var map = read();
    var n = Object.keys(map).length;
    document.querySelectorAll('[data-stamp-slug]').forEach(function (btn) {
      paintButton(btn, Object.prototype.hasOwnProperty.call(map, btn.dataset.stampSlug));
    });
    document.querySelectorAll('[data-stamp-count]').forEach(function (el) {
      el.textContent = String(n);
    });
    document.querySelectorAll('[data-stamp-pct]').forEach(function (el) {
      var total = Number(el.dataset.stampPct) || 0;
      el.textContent = total ? String(Math.round((n / total) * 1000) / 10) : '0';
    });
  }

  function wire() {
    document.querySelectorAll('[data-stamp-slug]').forEach(function (btn) {
      if (btn.dataset.stampWired) return;
      btn.dataset.stampWired = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        api.toggle(btn.dataset.stampSlug);
      });
    });
    paintAll();
  }

  window.BJStamp = api;
  document.addEventListener(EVENT, paintAll);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
