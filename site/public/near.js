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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 国土地理院の住所検索。キー不要・CORS許可済み。
  function geocode(q) {
    setStatus(L10N.searching);
    return fetch('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.length) throw new Error('not found');
        var c = res[0].geometry.coordinates; // [lng, lat]
        return { lat: c[1], lng: c[0], name: res[0].properties.title || q };
      });
  }

  $form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var q = $q.value.trim();
    if (!q) return;
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

  // 記事ページから ?lat=&lng=&name= で飛んできた場合はその地点で開く
  var sp = new URLSearchParams(window.location.search);
  var qlat = parseFloat(sp.get('lat'));
  var qlng = parseFloat(sp.get('lng'));
  if (isFinite(qlat) && isFinite(qlng)) {
    render(qlat, qlng, sp.get('name') || '');
  } else {
    // 起点未指定のときは東京駅を仮の中心にして全体像を見せる
    render(35.681236, 139.767125, IS_JA ? '東京駅' : 'Tokyo Station');
  }
})();
