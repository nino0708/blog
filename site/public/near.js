// 「周辺の建物をさがす」の挙動。
// 建物データはページに埋め込み済み(window.__NEAR__)。外部に出るのは地点検索(国土地理院)と地図タイルだけ。
(function () {
  var D = window.__NEAR__;
  if (!D || !window.L) return;

  var POINTS = D.points;
  var L10N = D.labels;
  var IS_JA = D.lang === 'ja';

  var $q = document.getElementById('near-q');
  var $form = document.getElementById('near-form');
  var $geo = document.getElementById('near-geo');
  var $radius = document.getElementById('near-radius');
  var $status = document.getElementById('near-status');
  var $list = document.getElementById('near-list');

  var map = L.map('near-map', { scrollWheelZoom: false }).setView([35.681, 139.767], 12);
  L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>',
    maxZoom: 18,
  }).addTo(map);

  var markers = L.layerGroup().addTo(map);
  var originMarker = null;
  var lastOrigin = null;

  function distanceM(aLat, aLng, bLat, bLng) {
    var R = 6371000;
    var p1 = (aLat * Math.PI) / 180;
    var p2 = (bLat * Math.PI) / 180;
    var dp = ((bLat - aLat) * Math.PI) / 180;
    var dl = ((bLng - aLng) * Math.PI) / 180;
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function fmtDist(m) {
    return m < 1000 ? Math.round(m / 10) * 10 + 'm' : (m / 1000).toFixed(1) + 'km';
  }
  function walkMin(m) {
    return Math.max(1, Math.round(m / 80));
  }

  function setStatus(msg) {
    $status.textContent = msg || '';
  }

  function render(lat, lng, originName) {
    lastOrigin = { lat: lat, lng: lng, name: originName };
    var radius = parseInt($radius.value, 10) || 0;
    var found = POINTS
      .map(function (p) {
        return { p: p, d: distanceM(lat, lng, p.lat, p.lng) };
      })
      .filter(function (x) { return radius === 0 || x.d <= radius; })
      .sort(function (a, b) { return a.d - b.d; })
      .slice(0, 60);

    // --- 一覧 ---
    $list.innerHTML = '';
    if (!found.length) {
      var li = document.createElement('li');
      li.className = 'near-item';
      li.textContent = L10N.empty;
      $list.appendChild(li);
    }
    found.forEach(function (x) {
      var p = x.p;
      var li = document.createElement('li');
      li.className = 'near-item';

      var rank = document.createElement('span');
      rank.className = 'near-rank';
      rank.textContent = fmtDist(x.d);

      var body = document.createElement('span');
      body.className = 'near-body';

      var name;
      if (p.u) {
        name = document.createElement('a');
        name.className = 'near-name';
        name.href = p.u;
        name.textContent = p.n;
      } else {
        name = document.createElement('span');
        name.className = 'near-name is-stub';
        name.textContent = p.n;
        var badge = document.createElement('span');
        badge.className = 'near-badge';
        badge.textContent = L10N.stub;
        name.appendChild(badge);
      }

      var meta = document.createElement('span');
      meta.className = 'near-meta';
      var bits = [p.a, L10N.walkAbout + walkMin(x.d) + L10N.min];
      if (p.h) bits.push(p.h + 'm');
      if (p.y) bits.push(IS_JA ? p.y + '年' : p.y);
      meta.textContent = bits.join(' ・ ');

      var dir = document.createElement('a');
      dir.href = 'https://www.google.com/maps/dir/?api=1&origin=' + lat + ',' + lng +
        '&destination=' + p.lat + ',' + p.lng + '&travelmode=walking';
      dir.target = '_blank';
      dir.rel = 'noopener nofollow';
      dir.textContent = L10N.directions + ' ↗';
      meta.appendChild(dir);

      body.appendChild(name);
      body.appendChild(meta);
      li.appendChild(rank);
      li.appendChild(body);
      $list.appendChild(li);
    });

    // --- 地図 ---
    markers.clearLayers();
    if (originMarker) map.removeLayer(originMarker);
    originMarker = L.circleMarker([lat, lng], {
      radius: 9, color: '#c0392b', weight: 3, fillColor: '#c0392b', fillOpacity: 0.5,
    }).addTo(map).bindPopup((originName ? originName : L10N.origin));

    var bounds = [[lat, lng]];
    found.forEach(function (x) {
      var p = x.p;
      var m = L.marker([p.lat, p.lng]);
      var html = '<b>' + escapeHtml(p.n) + '</b><br>' + escapeHtml(p.a) + ' ・ ' + fmtDist(x.d);
      if (p.u) html += '<br><a href="' + p.u + '">' + (IS_JA ? '記事を読む →' : 'Read article →') + '</a>';
      m.bindPopup(html);
      markers.addLayer(m);
      bounds.push([p.lat, p.lng]);
    });
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    } else {
      map.setView([lat, lng], 15);
    }

    var head = (originName ? L10N.origin + ': ' + originName + ' ・ ' : '');
    setStatus(head + found.length + (IS_JA ? '棟' : ' ') + L10N.result);

    var url = new URL(window.location.href);
    url.searchParams.set('lat', lat.toFixed(6));
    url.searchParams.set('lng', lng.toFixed(6));
    if (originName) url.searchParams.set('name', originName); else url.searchParams.delete('name');
    history.replaceState(null, '', url.toString());
  }

  // 起点を決めずに、収録済みの建物を全部ピンで出す。
  // 「まず全体が見えて、必要なら絞る」ようにしたいので、これを既定の表示にしている。
  function renderAll() {
    lastOrigin = null;
    markers.clearLayers();
    if (originMarker) { map.removeLayer(originMarker); originMarker = null; }

    var bounds = [];
    POINTS.forEach(function (p) {
      // 全件表示では100棟以上が都心に固まるので、雫型ピンだと重なって潰れる。小さい円で密度が見えるようにする。
      var m = L.circleMarker([p.lat, p.lng], {
        radius: 5, weight: 1.5, color: '#14365f', fillColor: '#1f5fae', fillOpacity: 0.75,
      });
      var html = '<b>' + escapeHtml(p.n) + '</b><br>' + escapeHtml(p.a || '');
      if (p.h) html += ' ・ ' + p.h + 'm';
      if (p.y) html += ' ・ ' + p.y + (IS_JA ? '年' : '');
      if (p.u) html += '<br><a href="' + p.u + '">' + (IS_JA ? '記事を読む →' : 'Read article →') + '</a>';
      m.bindPopup(html);
      markers.addLayer(m);
      bounds.push([p.lat, p.lng]);
    });
    if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });

    // 一覧は起点が無いので距離を出せない。エリアごとにまとめて出す。
    $list.innerHTML = '';
    var groups = {};
    POINTS.forEach(function (p) {
      var key = p.a || (IS_JA ? 'その他' : 'Other');
      (groups[key] = groups[key] || []).push(p);
    });
    Object.keys(groups).sort(function (a, b) { return groups[b].length - groups[a].length; })
      .forEach(function (key) {
        groups[key].sort(function (a, b) { return (b.h || 0) - (a.h || 0); });
        groups[key].forEach(function (p) {
          var li = document.createElement('li');
          li.className = 'near-item';

          var rank = document.createElement('span');
          rank.className = 'near-rank';
          rank.textContent = p.h ? p.h + 'm' : '—';

          var body = document.createElement('span');
          body.className = 'near-body';

          var name;
          if (p.u) {
            name = document.createElement('a');
            name.className = 'near-name';
            name.href = p.u;
            name.textContent = p.n;
          } else {
            name = document.createElement('span');
            name.className = 'near-name is-stub';
            name.textContent = p.n;
            var badge = document.createElement('span');
            badge.className = 'near-badge';
            badge.textContent = L10N.stub;
            name.appendChild(badge);
          }

          var meta = document.createElement('span');
          meta.className = 'near-meta';
          var bits = [key];
          if (p.y) bits.push(IS_JA ? p.y + '年' : p.y);
          meta.textContent = bits.join(' ・ ');

          body.appendChild(name);
          body.appendChild(meta);
          li.appendChild(rank);
          li.appendChild(body);
          $list.appendChild(li);
        });
      });

    setStatus(L10N.allShown.replace('{n}', String(POINTS.length)));

    var url = new URL(window.location.href);
    url.searchParams.delete('lat');
    url.searchParams.delete('lng');
    url.searchParams.delete('name');
    history.replaceState(null, '', url.toString());
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 収録済みの建物名から探す。ここに当たれば外部APIを叩かずに済むし、確実に正しい。
  function findLocal(q) {
    var k = q.replace(/[\s\u3000]/g, '').toLowerCase();
    if (!k) return null;
    var hit = null;
    for (var i = 0; i < POINTS.length; i++) {
      var n = POINTS[i].n.replace(/[\s\u3000]/g, '').toLowerCase();
      if (n === k) { hit = POINTS[i]; break; }
      if (!hit && (n.indexOf(k) >= 0 || k.indexOf(n) >= 0)) hit = POINTS[i];
    }
    return hit ? { lat: hit.lat, lng: hit.lng, name: hit.n } : null;
  }

  // 国土地理院の住所検索。キー不要・CORS許可済み。
  // 注意: この API は並び順が当てにならない。「東京駅」を投げると先頭は "東" に引っかかった
  // 「北海道札幌市東区」で、本命の「東京駅」は下位に埋もれている。res[0] を鵜呑みにすると
  // 全然違う場所へ飛ぶので、入力の形に応じて拾い方を変える。
  function normQ(t) {
    return String(t).replace(/[\s\u3000]/g, '')
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
  }
  var PREF_HEAD = /^(北海道|東京都|京都府|大阪府|.{2,3}県)/;

  function pickAddress(res, q) {
    var k = normQ(q);
    // 住所として書かれている(都道府県から始まる)なら、APIの住所解釈をそのまま信じる。
    // 「六丁目１０番」と「6-10-1」は字面が違うので、文字列一致では拾えない。
    if (PREF_HEAD.test(k)) return res[0];
    // それ以外(駅名・地名など)は、まず完全一致を採る。
    // 部分一致で長い方を採ると「東京駅」に対して「丸の内警察署東京駅前交番」を掴んでしまい、
    // 位置は近くても起点の表示名が不可解になるので、一致するものの中で最も短い=素の地名を選ぶ。
    var best = null, bestLen = Infinity;
    for (var i = 0; i < res.length; i++) {
      var title = (res[i].properties && res[i].properties.title) || '';
      var t = normQ(title);
      if (t.length < 2) continue;
      if (t === k) return res[i];
      if (t.indexOf(k) >= 0 || k.indexOf(t) >= 0) {
        if (t.length < bestLen) { best = res[i]; bestLen = t.length; }
      }
    }
    return best;
  }

  function geocode(q) {
    setStatus(L10N.searching);
    var local = findLocal(q);
    if (local) return Promise.resolve(local);
    return fetch('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.length) throw new Error('not found');
        var best = pickAddress(res, q);
        if (!best) throw new Error('no confident match');
        var c = best.geometry.coordinates; // [lng, lat]
        return { lat: c[1], lng: c[0], name: best.properties.title || q };
      });
  }

  $form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var q = $q.value.trim();
    if (!q) { renderAll(); return; }
    geocode(q)
      .then(function (g) { render(g.lat, g.lng, g.name); })
      .catch(function () { setStatus(L10N.notFound); });
  });

  $geo.addEventListener('click', function () {
    if (!navigator.geolocation) { setStatus(L10N.geoUnsupported); return; }
    setStatus(L10N.searching);
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        render(pos.coords.latitude, pos.coords.longitude, IS_JA ? '現在地' : 'My location');
      },
      function () { setStatus(L10N.geoDenied); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  // 範囲を変えたら同じ起点で引き直す
  $radius.addEventListener('change', function () {
    if (lastOrigin) render(lastOrigin.lat, lastOrigin.lng, lastOrigin.name);
  });

  // 記事ページから ?lat=&lng=&name= で飛んできた場合はその地点を起点に開く。
  // それ以外は起点なしで、収録済みの建物を全部ピンで出す（これが既定の姿）。
  var sp = new URLSearchParams(window.location.search);
  var qlat = parseFloat(sp.get('lat'));
  var qlng = parseFloat(sp.get('lng'));
  if (isFinite(qlat) && isFinite(qlng)) {
    render(qlat, qlng, sp.get('name') || '');
  } else {
    renderAll();
  }
})();
