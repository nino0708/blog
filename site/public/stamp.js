/*
 * Built Japan スタンプラリー（自己申告制）の共有ストア。
 * 記録はこの端末にだけ保存し、サーバーへは一切送らない（アップロードなし＝運用コストゼロ）。
 *   - スタンプ本体と備考（メモ）… localStorage
 *   - 現地写真 … IndexedDB（長辺1280pxのJPEGへ縮小して保存。localStorageでは容量が足りないため）
 * ページ側は data-stamp-* 属性を付けるだけでよく、描画はこのスクリプトが担う。
 */
(function () {
  var KEY = 'bj:stamps:v1';
  var EVENT = 'bj:stamp-change';
  var SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var PID_RE = /^[a-z0-9][a-z0-9-]{0,120}$/;
  var MAX_ENTRIES = 2000;
  var MAX_NOTE = 500;
  var MAX_PHOTOS = 6;
  var MAX_EDGE = 1280;

  var memory = null; // localStorage が使えない環境（プライベートモード等）の退避先

  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  // 1件の記録: { d: 'YYYY-MM-DD', n: '備考', p: ['写真id', ...] }
  // 旧形式（値が日付文字列だけ）も読めるようにしておく。
  function normEntry(v) {
    if (typeof v === 'string') return { d: DATE_RE.test(v) ? v : today(), n: '', p: [] };
    if (!v || typeof v !== 'object') return { d: today(), n: '', p: [] };
    var note = typeof v.n === 'string' ? v.n.slice(0, MAX_NOTE) : '';
    var photos = Array.isArray(v.p) ? v.p.filter(function (id) { return typeof id === 'string' && PID_RE.test(id); }).slice(0, MAX_PHOTOS) : [];
    return { d: typeof v.d === 'string' && DATE_RE.test(v.d) ? v.d : today(), n: note, p: photos };
  }

  function sanitize(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    var keys = Object.keys(raw).slice(0, MAX_ENTRIES);
    for (var i = 0; i < keys.length; i++) {
      if (!SLUG_RE.test(keys[i])) continue;
      out[keys[i]] = normEntry(raw[keys[i]]);
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
      window.localStorage.setItem(KEY, JSON.stringify({ v: 2, stamps: map }));
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

  // --- 写真置き場（IndexedDB） ---

  var dbPromise = null;
  function idb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('no indexedDB'));
      var req = window.indexedDB.open('bj-stamps', 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains('photos')) req.result.createObjectStore('photos', { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function idbRun(mode, fn) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('photos', mode);
        var req = fn(tx.objectStore('photos'));
        tx.onerror = function () { reject(tx.error); };
        tx.oncomplete = function () { resolve(req && req.result); };
      });
    });
  }

  // 端末の写真はそのままだと数MBある。長辺1280pxのJPEGへ落としてから保存する。
  function shrink(file) {
    function fromCanvas(w, h, draw) {
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      draw(c.getContext('2d'));
      return new Promise(function (resolve) {
        c.toBlob(function (b) { resolve(b || file); }, 'image/jpeg', 0.82);
      });
    }
    function scaled(w, h) {
      var s = Math.min(1, MAX_EDGE / Math.max(w, h));
      return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))];
    }
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' })
        .catch(function () { return createImageBitmap(file); })
        .then(function (bmp) {
          var wh = scaled(bmp.width, bmp.height);
          return fromCanvas(wh[0], wh[1], function (ctx) { ctx.drawImage(bmp, 0, 0, wh[0], wh[1]); })
            .then(function (blob) { if (bmp.close) bmp.close(); return blob; });
        });
    }
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var wh = scaled(img.naturalWidth, img.naturalHeight);
        fromCanvas(wh[0], wh[1], function (ctx) { ctx.drawImage(img, 0, 0, wh[0], wh[1]); })
          .then(function (blob) { URL.revokeObjectURL(url); resolve(blob); });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
      img.src = url;
    });
  }

  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error); };
      fr.readAsDataURL(blob);
    });
  }

  function dataURLToBlob(url) {
    var parts = String(url).split(',');
    var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
    var bin = atob(parts[1] || '');
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  var api = {
    all: read,
    get: function (slug) {
      var map = read();
      return Object.prototype.hasOwnProperty.call(map, slug) ? map[slug] : null;
    },
    has: function (slug) {
      return Object.prototype.hasOwnProperty.call(read(), slug);
    },
    count: function () {
      return Object.keys(read()).length;
    },
    set: function (slug, on) {
      if (!SLUG_RE.test(slug)) return false;
      var map = read();
      if (on) {
        map[slug] = map[slug] || { d: today(), n: '', p: [] };
      } else {
        var old = map[slug];
        delete map[slug];
        // スタンプを外したら、その建物の写真も端末から消す（残しても辿れないため）
        if (old && old.p && old.p.length) {
          idbRun('readwrite', function (store) { old.p.forEach(function (id) { store.delete(id); }); }).catch(function () {});
        }
      }
      write(map);
      return Boolean(on);
    },
    toggle: function (slug) {
      return api.set(slug, !api.has(slug));
    },
    setNote: function (slug, text) {
      var map = read();
      if (!map[slug]) return false;
      map[slug].n = String(text || '').slice(0, MAX_NOTE);
      write(map);
      return true;
    },
    maxPhotos: MAX_PHOTOS,
    maxNote: MAX_NOTE,
    /** 端末内に写真を保存し、その建物の記録に紐づける。アップロードはしない。 */
    addPhoto: function (slug, file) {
      var map = read();
      if (!map[slug]) return Promise.reject(new Error('not stamped'));
      if (map[slug].p.length >= MAX_PHOTOS) return Promise.reject(new Error('too many'));
      var id = slug + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      return shrink(file)
        .then(function (blob) { return idbRun('readwrite', function (store) { store.put({ id: id, blob: blob }); }); })
        .then(function () {
          var m = read();
          if (!m[slug]) return null;
          m[slug].p = m[slug].p.concat([id]).slice(0, MAX_PHOTOS);
          write(m);
          return id;
        });
    },
    removePhoto: function (slug, id) {
      var map = read();
      if (!map[slug]) return Promise.resolve(false);
      map[slug].p = map[slug].p.filter(function (x) { return x !== id; });
      write(map);
      return idbRun('readwrite', function (store) { store.delete(id); }).then(function () { return true; }, function () { return true; });
    },
    getPhotoBlob: function (id) {
      return idbRun('readonly', function (store) { return store.get(id); }).then(function (rec) {
        return rec && rec.blob ? rec.blob : null;
      });
    },
    clear: function () {
      write({});
      idbRun('readwrite', function (store) { store.clear(); }).catch(function () {});
    },
    /** 他の端末へ移すための短いコード。写真は入らない（大きすぎるため）＝ファイル書き出しを使う。 */
    exportCode: function () {
      var map = read(), out = {};
      for (var slug in map) out[slug] = { d: map[slug].d, n: map[slug].n };
      return 'BJ1.' + b64encode(JSON.stringify(out));
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
    /** 写真も含めた丸ごとの書き出し（端末内でファイルとして保存する用） */
    exportFile: function () {
      var map = read();
      var ids = [];
      for (var slug in map) ids = ids.concat(map[slug].p);
      var photos = {};
      var chain = Promise.resolve();
      ids.forEach(function (id) {
        chain = chain.then(function () {
          return api.getPhotoBlob(id).then(function (blob) {
            return blob ? blobToDataURL(blob).then(function (url) { photos[id] = url; }) : null;
          }).catch(function () {});
        });
      });
      return chain.then(function () {
        return new Blob([JSON.stringify({ v: 2, app: 'builtjapan-stamps', stamps: map, photos: photos })], {
          type: 'application/json',
        });
      });
    },
    /** 書き出したファイルを読み込んで合流させる。戻り値は {added, photos}。 */
    importFile: function (file) {
      return file.text().then(function (text) {
        var data = JSON.parse(text);
        var incoming = sanitize(data && data.stamps);
        var photos = data && data.photos && typeof data.photos === 'object' ? data.photos : {};
        var map = read();
        var added = 0, saved = 0;
        var chain = Promise.resolve();
        for (var slug in incoming) {
          if (Object.prototype.hasOwnProperty.call(map, slug)) continue;
          (function (slug, entry) {
            var keep = [];
            entry.p.forEach(function (id) {
              var url = photos[id];
              if (typeof url !== 'string' || url.indexOf('data:image/') !== 0) return;
              keep.push(id);
              chain = chain.then(function () {
                return idbRun('readwrite', function (store) { store.put({ id: id, blob: dataURLToBlob(url) }); })
                  .then(function () { saved++; }, function () {});
              });
            });
            entry.p = keep;
            map[slug] = entry;
            added++;
          })(slug, incoming[slug]);
        }
        return chain.then(function () {
          write(map);
          return { added: added, photos: saved };
        });
      });
    },
    onChange: function (fn) {
      document.addEventListener(EVENT, fn);
      return fn;
    },
  };

  // --- 描画（data-stamp-* が付いた要素を自動で面倒みる） ---

  var objectUrls = [];
  function freeUrls() {
    objectUrls.forEach(function (u) { URL.revokeObjectURL(u); });
    objectUrls = [];
  }

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
      var rec = read()[btn.dataset.stampSlug];
      date.textContent = on && rec ? (date.dataset.prefix || '') + rec.d : '';
    }
  }

  /** 備考＋写真のエディタ。data-slug の建物にひもづく。 */
  function paintEditor(box) {
    var slug = box.dataset.slug || '';
    var rec = slug ? api.get(slug) : null;
    box.hidden = !rec;
    if (!rec) return;

    var note = box.querySelector('[data-stamp-note]');
    if (note && document.activeElement !== note) note.value = rec.n || '';
    var left = box.querySelector('[data-stamp-note-left]');
    if (left) left.textContent = String(MAX_NOTE - (note ? note.value.length : 0));

    var addBtn = box.querySelector('[data-stamp-add-photo]');
    if (addBtn) addBtn.disabled = rec.p.length >= MAX_PHOTOS;
    var counter = box.querySelector('[data-stamp-photo-count]');
    if (counter) counter.textContent = rec.p.length + ' / ' + MAX_PHOTOS;

    var list = box.querySelector('[data-stamp-photos]');
    if (!list) return;
    list.textContent = '';
    rec.p.forEach(function (id) {
      var li = document.createElement('li');
      li.className = 'bj-photo';
      var img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'bj-photo-del';
      del.textContent = '×';
      del.setAttribute('aria-label', box.dataset.labelRemovePhoto || 'remove');
      del.addEventListener('click', function () { api.removePhoto(slug, id); });
      li.appendChild(img);
      li.appendChild(del);
      list.appendChild(li);
      api.getPhotoBlob(id).then(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        objectUrls.push(url);
        img.src = url;
      }).catch(function () {});
    });
  }

  function paintAll() {
    var map = read();
    var n = Object.keys(map).length;
    freeUrls();
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
    document.querySelectorAll('[data-stamp-editor]').forEach(paintEditor);
  }

  function wireEditor(box) {
    if (box.dataset.stampWired) return;
    box.dataset.stampWired = '1';

    var note = box.querySelector('[data-stamp-note]');
    if (note) {
      note.maxLength = MAX_NOTE;
      var timer = null;
      note.addEventListener('input', function () {
        var left = box.querySelector('[data-stamp-note-left]');
        if (left) left.textContent = String(MAX_NOTE - note.value.length);
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          if (box.dataset.slug) api.setNote(box.dataset.slug, note.value);
        }, 400);
      });
      note.addEventListener('blur', function () {
        if (box.dataset.slug) api.setNote(box.dataset.slug, note.value);
      });
    }

    var input = box.querySelector('[data-stamp-file]');
    var addBtn = box.querySelector('[data-stamp-add-photo]');
    if (addBtn && input) addBtn.addEventListener('click', function () { input.click(); });
    if (input) {
      input.addEventListener('change', function () {
        var slug = box.dataset.slug;
        var files = [].slice.call(input.files || []);
        input.value = '';
        if (!slug || !files.length) return;
        var status = box.querySelector('[data-stamp-photo-status]');
        if (status) status.textContent = box.dataset.labelSaving || '...';
        var chain = Promise.resolve();
        files.forEach(function (f) {
          chain = chain.then(function () { return api.addPhoto(slug, f).catch(function () {}); });
        });
        chain.then(function () { if (status) status.textContent = ''; });
      });
    }
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
    document.querySelectorAll('[data-stamp-editor]').forEach(wireEditor);
    paintAll();
  }

  window.BJStamp = api;
  document.addEventListener(EVENT, paintAll);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
