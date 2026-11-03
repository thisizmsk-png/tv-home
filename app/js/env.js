// Shared basics: TV detection, remote keys, storage, toast and clock.
window.TH = {};
(function (TH) {
  'use strict';

  TH.tz = window.tizen || null;
  TH.KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009, ESC: 27 };
  TH.SERVICE_URL = 'http://127.0.0.1:47791';
  TH.SERVICE_ID = 'TvHome0001.Watcher';

  TH.load = function (key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  };
  TH.save = function (key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage is optional */ }
  };

  var toastTimer = null;
  TH.toast = function (text) {
    var el = document.getElementById('toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  };

  TH.el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text !== undefined) { e.textContent = text; }
    return e;
  };

  function tick() {
    var now = new Date();
    var time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    var day = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    var el = document.getElementById('clock');
    el.innerHTML = '';
    el.appendChild(TH.el('b', '', time));
    el.appendChild(TH.el('span', '', day));
  }
  TH.startClock = function () { tick(); setInterval(tick, 15000); };
})(window.TH);
