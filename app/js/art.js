// Show art. With a TMDB key: what is trending on each app in the US, refreshed twice a day.
// Without one, or offline: bundled public-domain paintings (Art Institute of Chicago, CC0).
(function (TH) {
  'use strict';

  var API = 'https://api.themoviedb.org/3';
  var IMG = 'https://image.tmdb.org/t/p/';
  var CACHE = 'tvhome.tmdb.v2';
  var TTL = 12 * 3600 * 1000;
  var KEY = window.TVHOME_TMDB_KEY || '';

  // TMDB watch-provider ids for the US.
  var SOURCES = {
    netflix: { provider: 8 },
    prime: { provider: 9 },
    appletv: { provider: 350 },
    youtube: { trending: 'all/week' },
    hdmi: { trending: 'movie/week' },
    other: { trending: 'tv/day' }
  };

  var PAINTINGS = [
    ['rain', 'Paris Street; Rainy Day', 'Gustave Caillebotte, 1877'],
    ['wave', 'Under the Wave off Kanagawa', 'Katsushika Hokusai, about 1830'],
    ['jatte', 'A Sunday on La Grande Jatte', 'Georges Seurat, 1884'],
    ['bedroom', 'The Bedroom', 'Vincent van Gogh, 1889'],
    ['train', 'Arrival of the Normandy Train', 'Claude Monet, 1877'],
    ['beach', 'The Beach at Sainte-Adresse', 'Claude Monet, 1867'],
    ['wheat', 'Stacks of Wheat', 'Claude Monet, 1890'],
    ['acrobats', 'Acrobats at the Cirque Fernando', 'Pierre-Auguste Renoir, 1879'],
    ['lilies', 'Water Lilies', 'Claude Monet, 1906'],
    ['pond', 'Water Lily Pond', 'Claude Monet, 1900']
  ];
  var FALLBACK_CAST = { name: 'Vincent van Gogh', character: '', note: 'Self-Portrait, 1887', profile: 'art/selfie.jpg' };

  var data = TH.load(CACHE, null);
  var art = TH.art = { live: !!KEY };

  function fallback(index) {
    var items = [];
    for (var i = 0; i < 4; i++) {
      var p = PAINTINGS[(index * 3 + i) % PAINTINGS.length];
      items.push({ title: p[1], sub: p[2], backdrop: 'art/' + p[0] + '.jpg', card: 'art/' + p[0] + '.jpg', poster: 'art/' + p[0] + '.jpg' });
    }
    return items;
  }

  art.items = function (entry, index) {
    var list = data && data.items && data.items[entry.key];
    return list && list.length ? list : fallback(index);
  };

  function get(path, done) {
    var x = new XMLHttpRequest();
    var bearer = KEY.indexOf('eyJ') === 0;
    var url = API + path + (bearer ? '' : (path.indexOf('?') < 0 ? '?' : '&') + 'api_key=' + encodeURIComponent(KEY));
    x.open('GET', url);
    if (bearer) { x.setRequestHeader('Authorization', 'Bearer ' + KEY); }
    x.timeout = 8000;
    x.onload = function () {
      if (x.status !== 200) { return done(null); }
      try { done(JSON.parse(x.responseText)); } catch (e) { done(null); }
    };
    x.onerror = x.ontimeout = function () { done(null); };
    x.send();
  }

  function toItem(r, media) {
    if (!r.backdrop_path || !r.poster_path) { return null; }
    var year = (r.first_air_date || r.release_date || '').slice(0, 4);
    var type = (r.media_type || media) === 'tv' ? 'Series' : 'Movie';
    return {
      id: r.id, media: r.media_type || media, title: r.name || r.title,
      sub: type + (year ? ' · ' + year : ''), popularity: r.popularity || 0,
      // Cards show at 326 px wide, so w300 is enough; w780 was 4x the bytes.
      backdrop: IMG + 'w1280' + r.backdrop_path, card: IMG + 'w300' + r.backdrop_path,
      poster: IMG + 'w342' + r.poster_path
    };
  }

  function fetchSource(source, done) {
    var calls = source.provider ? [
      ['tv', '/discover/tv?watch_region=US&sort_by=popularity.desc&with_watch_providers=' + source.provider],
      ['movie', '/discover/movie?watch_region=US&sort_by=popularity.desc&include_adult=false&with_watch_providers=' + source.provider]
    ] : [[null, '/trending/' + source.trending]];
    var left = calls.length, all = [];
    calls.forEach(function (c) {
      get(c[1], function (res) {
        ((res && res.results) || []).forEach(function (r) {
          var item = toItem(r, c[0] || r.media_type);
          if (item && (item.media === 'tv' || item.media === 'movie')) { all.push(item); }
        });
        if (--left === 0) {
          all.sort(function (a, b) { return b.popularity - a.popularity; });
          done(all.slice(0, 8));
        }
      });
    });
  }

  // Calls done(changed) once every app's art is known.
  art.refresh = function (entries, done) {
    if (!KEY) { return done(false); }
    if (data && Date.now() - data.at < TTL) { return done(false); }
    var keys = [];
    entries.forEach(function (e) { if (keys.indexOf(e.key) < 0) { keys.push(e.key); } });
    var next = { at: Date.now(), items: {} }, left = keys.length, got = 0;
    keys.forEach(function (k) {
      fetchSource(SOURCES[k] || SOURCES.other, function (items) {
        if (items.length) { next.items[k] = items; got++; }
        if (--left === 0) {
          if (!got) { return done(false); }  // offline: keep the old art
          data = next;
          TH.save(CACHE, data);
          done(true);
        }
      });
    });
  };

  // Fetch each app's first backdrop ahead of time so moving across tiles shows art at once.
  art.preload = function (entries) {
    entries.forEach(function (e, i) { new Image().src = art.items(e, i)[0].backdrop; });
  };

  // Lead cast member of a title, for the Cast style.
  art.cast = function (item, done) {
    if (!KEY || !item.id) { return done(FALLBACK_CAST); }
    if (item.cast) { return done(item.cast); }
    get('/' + item.media + '/' + item.id + '/credits', function (res) {
      var people = ((res && res.cast) || []).filter(function (p) { return p.profile_path; });
      if (!people.length) { return done(null); }
      var p = people[0];
      item.cast = { name: p.name, character: p.character || '', profile: IMG + 'w500' + p.profile_path };
      TH.save(CACHE, data);
      done(item.cast);
    });
  };

  art.credit = function () {
    return KEY ? 'Art and data from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.'
      : 'Stand-in art: public-domain paintings, Art Institute of Chicago (CC0). Add a TMDB key for trending shows.';
  };
})(window.TH);
