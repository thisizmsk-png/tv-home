// State, header, remote navigation and boot.
(function (TH) {
  'use strict';

  var KEY = TH.KEY, el = TH.el;
  var PREFS = 'tvhome.prefs.v1';
  var prefs = TH.load(PREFS, { style: 'marquee', app: 0 });
  var st = { entries: [], style: prefs.style, row: 1, col: 0, app: 0, item: 0 };
  var header = [];  // { label, run }

  function style() { return TH.styles[st.style] || TH.styles.marquee; }
  function rows() { return [header.length].concat(style().rows(st)); }

  function buildHeader() {
    var nav = document.getElementById('header');
    nav.innerHTML = '';
    header = TH.styleOrder.map(function (key, i) {
      return { label: (['1', '3', '4', '5'][i]) + ' ' + TH.styles[key].name, key: key, run: function () { setStyle(key); } };
    });
    header.push({ label: 'Samsung Home', run: TH.openSamsungHome });
    header.forEach(function (h) { h.node = nav.appendChild(el('span', 'hbtn', h.label)); });
  }

  function paintHeader() {
    header.forEach(function (h, i) {
      h.node.classList.toggle('on', st.row === 0 && i === st.col);
      h.node.classList.toggle('sel', h.key === st.style);
    });
  }

  function build() {
    var stage = document.getElementById('stage');
    stage.innerHTML = '';
    document.getElementById('wall').innerHTML = '';
    document.getElementById('field').style.backgroundColor = '';
    document.body.className = 'style-' + st.style;
    if (st.style === 'wall' || st.style === 'cast') { TH.hideArt(); }
    style().build(st, stage);
    document.getElementById('credit').textContent = TH.art.credit();
    render();
  }

  function render() {
    var r = rows();
    st.row = Math.max(0, Math.min(st.row, r.length - 1));
    st.col = Math.max(0, Math.min(st.col, r[st.row] - 1));
    if (st.row === 1 && st.style !== 'cast') { st.app = st.col; }
    paintHeader();
    style().focus(st);
  }

  function setStyle(key) {
    st.style = key;
    prefs.style = key;
    TH.save(PREFS, prefs);
    build();
  }

  function move(dRow, dCol) {
    var r = rows();
    if (dRow) {
      var next = st.row + dRow;
      if (next < 0 || next >= r.length) { return; }
      st.row = next;
      // Keep the column on the selected app when coming back to the app row.
      if (st.row === 1 && st.style !== 'cast') { st.col = st.app; }
      else if (st.row === 0) { st.col = TH.styleOrder.indexOf(st.style); }
      else if (st.style === 'shelf' && st.row === 2) { st.col = 0; }
    } else {
      st.col += dCol;
      if (st.col < 0 || st.col >= r[st.row]) { st.col -= dCol; return; }
    }
    if (st.row === 1 && st.style !== 'cast') { st.item = 0; }
    prefs.app = st.app;
    TH.save(PREFS, prefs);
    render();
  }

  function activate() {
    if (st.row === 0) { header[st.col].run(); return; }
    var entry = style().activate(st);
    if (entry) { TH.launch(entry); }
  }

  document.addEventListener('keydown', function (e) {
    var k = e.keyCode;
    if (TH.watchingInput()) {
      if (k === KEY.BACK || k === KEY.ESC) { e.preventDefault(); TH.leaveInput(); }
      return;
    }
    if (k === KEY.LEFT) { move(0, -1); }
    else if (k === KEY.RIGHT) { move(0, 1); }
    else if (k === KEY.UP) { move(-1, 0); }
    else if (k === KEY.DOWN) { move(1, 0); }
    else if (k === KEY.ENTER) { activate(); }
    else if (k === KEY.BACK || k === KEY.ESC) { st.row = 1; st.col = st.app; render(); }
    else { return; }
    e.preventDefault();
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { TH.tell('/home'); }
  });

  // Every 20 s the art moves on to the next trending title for the focused app.
  setInterval(function () {
    if (document.hidden || st.style === 'wall' || st.style === 'cast' || (st.style === 'shelf' && st.row === 2)) { return; }
    st.item = (st.item + 1) % 4;
    style().focus(st);
  }, 20000);

  TH.startWatcher();
  TH.startClock();
  buildHeader();
  TH.loadEntries(function (entries) {
    st.entries = entries.length ? entries : [{ kind: 'samsung', name: 'Samsung Home', key: 'other', color: '#2a2d33' }];
    st.app = Math.min(prefs.app || 0, st.entries.length - 1);
    st.col = st.app;
    document.body.classList.remove('loading');
    build();
    TH.tell('/home');
    TH.art.refresh(st.entries, function (changed) {
      if (changed) { build(); }
      TH.art.preload(st.entries);
    });
  });
})(window.TH);
