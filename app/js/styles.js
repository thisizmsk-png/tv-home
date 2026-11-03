// The four home-screen styles. Each builds its DOM once, then only updates classes and art
// on focus changes, so remote presses stay fast on the TV's chip.
//   rows(st)        -> number of items in each focus row (row 0 is the header, owned by main.js)
//   build(st)       -> fill #stage
//   focus(st)       -> reflect st.row / st.col / st.app
//   activate(st)    -> entry to open, or null
(function (TH) {
  'use strict';

  var el = TH.el;
  var bg = { front: null, back: null, url: '' };

  // Two stacked layers crossfade; the new image is decoded before it is shown.
  function showArt(url) {
    if (!bg.front) {
      bg.front = document.getElementById('bgA');
      bg.back = document.getElementById('bgB');
    }
    if (!url || url === bg.url) { return; }
    bg.url = url;
    var img = new Image();
    img.onload = function () {
      if (bg.url !== url) { return; }
      bg.back.style.backgroundImage = 'url("' + url + '")';
      bg.back.classList.add('on');
      bg.front.classList.remove('on');
      var t = bg.front; bg.front = bg.back; bg.back = t;
    };
    img.src = url;
  }
  TH.hideArt = function () {
    bg.url = '';
    if (bg.front) { bg.front.classList.remove('on'); }
  };

  function tile(entry) {
    var t = el('div', 'tile');
    t.style.backgroundColor = entry.color;
    if (entry.logo || entry.wordmark) {
      t.classList.add('brand');
      t.style.color = entry.fg;
      var mark = el('span', entry.logo ? 'logo' : 'wordmark', entry.wordmark || '');
      if (entry.logo) {
        mark.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="' + TH.LOGOS[entry.logo] + '"/></svg>';
      }
      t.appendChild(mark);
      return t;
    }
    if (entry.icon) {
      var img = el('img', 'icon');
      img.src = entry.icon;
      img.onerror = function () { img.remove(); };
      t.appendChild(img);
    }
    var label = el('span', 'name', entry.name);
    if (entry.sub) { label.appendChild(el('small', '', entry.sub)); }
    t.appendChild(label);
    return t;
  }

  function current(st) { return TH.art.items(st.entries[st.app], st.app)[st.item % 4]; }

  function copyBlock() {
    var box = el('div', 'copy');
    box.appendChild(el('span', 'kicker'));
    box.appendChild(el('p', 'big'));
    box.appendChild(el('span', 'meta'));
    return box;
  }
  function fillCopy(box, kicker, title, meta) {
    box.children[0].textContent = kicker;
    box.children[1].textContent = title;
    box.children[2].textContent = meta;
  }

  // ---------- 1 Marquee ----------
  var marquee = {
    name: 'Marquee',
    rows: function (st) { return [st.entries.length]; },
    build: function (st, stage) {
      this.copy = copyBlock();
      this.row = el('div', 'row apps');
      this.tiles = st.entries.map(function (e) { var t = tile(e); this.row.appendChild(t); return t; }, this);
      stage.appendChild(this.copy);
      stage.appendChild(this.row);
    },
    focus: function (st) {
      var it = current(st), entry = st.entries[st.app];
      this.tiles.forEach(function (t, i) { t.classList.toggle('on', st.row === 1 && i === st.app); });
      fillCopy(this.copy, entry.name + (entry.sub ? ' · ' + entry.sub : ''), it.title, it.sub);
      showArt(it.backdrop);
    },
    activate: function (st) { return st.entries[st.app]; }
  };

  // ---------- 3 Shelf ----------
  var shelf = {
    name: 'Shelf',
    rows: function (st) { return [st.entries.length, TH.art.items(st.entries[st.app], st.app).length]; },
    build: function (st, stage) {
      this.copy = copyBlock();
      var band = el('div', 'band');
      band.appendChild(el('span', 'label', 'Apps'));
      this.appRow = el('div', 'row apps');
      this.tiles = st.entries.map(function (e) { var t = tile(e); this.appRow.appendChild(t); return t; }, this);
      band.appendChild(this.appRow);
      this.trendLabel = el('span', 'label');
      band.appendChild(this.trendLabel);
      this.cardRow = el('div', 'row cards');
      band.appendChild(this.cardRow);
      stage.appendChild(this.copy);
      stage.appendChild(band);
      this.cardsFor = -1;
    },
    focus: function (st) {
      var entry = st.entries[st.app], items = TH.art.items(entry, st.app);
      if (this.cardsFor !== st.app) {
        this.cardsFor = st.app;
        this.cardRow.innerHTML = '';
        this.cards = items.map(function (it) {
          var c = el('div', 'card');
          c.style.backgroundImage = 'url("' + it.card + '")';
          c.appendChild(el('span', '', it.title));
          this.cardRow.appendChild(c);
          return c;
        }, this);
        this.trendLabel.textContent = TH.art.live ? 'Trending on ' + entry.name : 'Picks';
      }
      var it = st.row === 2 ? items[st.col] : current(st);
      this.tiles.forEach(function (t, i) { t.classList.toggle('on', st.row === 1 && i === st.app); t.classList.toggle('sel', i === st.app); });
      this.cards.forEach(function (c, i) { c.classList.toggle('on', st.row === 2 && i === st.col); });
      fillCopy(this.copy, entry.name, it.title, it.sub);
      showArt(it.backdrop);
    },
    activate: function (st) { return st.entries[st.app]; }
  };

  // ---------- 4 Poster Wall ----------
  var wall = {
    name: 'Wall',
    rows: function (st) { return [st.entries.length]; },
    build: function (st, stage) {
      var posters = [];
      st.entries.forEach(function (e, i) {
        TH.art.items(e, i).forEach(function (it) { if (posters.indexOf(it.poster) < 0) { posters.push(it.poster); } });
      });
      var wallEl = document.getElementById('wall');
      wallEl.innerHTML = '';
      for (var c = 0; c < 6; c++) {
        var col = el('div', 'col');
        var list = [];
        for (var p = 0; p < 5; p++) { list.push(posters[(c * 5 + p * 7) % posters.length]); }
        // Two copies so the column loops without a seam.
        list.concat(list).forEach(function (src) {
          var img = el('div', 'poster');
          img.style.backgroundImage = 'url("' + src + '")';
          col.appendChild(img);
        });
        wallEl.appendChild(col);
      }
      var title = el('div', 'title');
      this.day = el('p', 'big');
      title.appendChild(this.day);
      title.appendChild(el('span', 'meta', TH.art.live ? 'Trending tonight' : 'Tonight on your TV'));
      this.dock = el('div', 'row apps dock');
      this.tiles = st.entries.map(function (e) { var t = tile(e); this.dock.appendChild(t); return t; }, this);
      stage.appendChild(title);
      stage.appendChild(this.dock);
    },
    focus: function (st) {
      this.day.textContent = new Date().toLocaleDateString([], { weekday: 'long' });
      this.tiles.forEach(function (t, i) { t.classList.toggle('on', st.row === 1 && i === st.app); });
    },
    activate: function (st) { return st.entries[st.app]; }
  };

  // ---------- 5 Cast ----------
  var FIELDS = ['#a5452c', '#2f5b70', '#6d5a1f', '#4a4d80', '#3d6047', '#6b3350', '#5a4632'];
  var cast = {
    name: 'Cast',
    rows: function (st) { return st.entries.map(function () { return 1; }); },
    build: function (st, stage) {
      this.word = el('div', 'word');
      this.frame = el('div', 'portrait');
      this.list = el('div', 'list');
      this.items = st.entries.map(function (e) {
        var row = el('div', 'item', e.name);
        this.list.appendChild(row);
        return row;
      }, this);
      this.who = el('div', 'who');
      [this.word, this.frame, this.list, this.who].forEach(function (n) { stage.appendChild(n); });
      this.req = 0;
    },
    focus: function (st) {
      var self = this, idx = st.row >= 1 ? st.row - 1 : st.app;
      st.app = idx;
      this.items.forEach(function (n, i) { n.classList.toggle('on', i === idx); n.classList.toggle('sel', st.row === 0 && i === idx); });
      document.getElementById('field').style.backgroundColor = FIELDS[idx % FIELDS.length];
      var it = TH.art.items(st.entries[idx], idx)[0], req = ++this.req;
      TH.art.cast(it, function (person) {
        if (req !== self.req) { return; }
        var who = person || { name: it.title, character: '', profile: it.poster };
        var first = (who.character || who.name).split(/[ /(]/)[0];
        self.word.textContent = first;
        self.frame.style.backgroundImage = 'url("' + who.profile + '")';
        self.who.innerHTML = '';
        self.who.appendChild(el('span', 'kicker', "Today's face of " + st.entries[idx].name));
        self.who.appendChild(el('b', '', who.character ? who.character : who.name));
        self.who.appendChild(el('span', 'meta', who.note || ((who.character ? who.name + ' in ' : '') + it.title)));
      });
    },
    activate: function (st) { return st.entries[st.app]; }
  };

  TH.styles = { marquee: marquee, shelf: shelf, wall: wall, cast: cast };
  TH.styleOrder = ['marquee', 'shelf', 'wall', 'cast'];
})(window.TH);
