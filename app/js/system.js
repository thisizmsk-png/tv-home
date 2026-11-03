// Apps, HDMI inputs and the Home-button watcher. Launch and handoff rules follow
// AeroTizen 2.5.0, which was tested on this TV model.
(function (TH) {
  'use strict';

  var tz = TH.tz;

  // Preinstalled streamers are known to the TV's local API by store id; the watcher polls that API.
  var STORE_IDS = {
    'org.tizen.netflix-app': '3201907018807',
    'org.tizen.primevideo': '3201910019365',
    'com.samsung.tv.aria-video': '3201807016597'
  };
  var YOUTUBE_STORE_ID = '111299001912';
  var HIDDEN = /service|emanual|companion|dummy|widget|DclHome001|TvHome0001/i;
  var ORDER = ['netflix', 'prime video', 'youtube', 'apple tv'];
  var BRAND = {
    netflix: { key: 'netflix', color: '#7c1a20' },
    'prime video': { key: 'prime', color: '#14405f' },
    youtube: { key: 'youtube', color: '#5e1d1d' },
    'apple tv': { key: 'appletv', color: '#2a2d33' }
  };

  function brandFor(name) {
    var lower = name.toLowerCase();
    for (var prefix in BRAND) { if (lower.indexOf(prefix) === 0) { return BRAND[prefix]; } }
    return { key: 'other', color: '#24312f' };
  }

  function rank(name) {
    var lower = name.toLowerCase();
    for (var i = 0; i < ORDER.length; i++) { if (lower.indexOf(ORDER[i]) === 0) { return i; } }
    return ORDER.length;
  }

  function appEntry(id, name, icon) {
    var b = brandFor(name);
    var storeId = STORE_IDS[id] || (/^youtube$/i.test(name) ? YOUTUBE_STORE_ID : null);
    return { kind: 'app', id: id, storeId: storeId, name: name, icon: icon || '', key: b.key, color: b.color };
  }

  function hdmiEntry(source) {
    var name = source.editName || ('HDMI ' + source.number);
    // A Fire TV stick names itself over HDMI-CEC; show it as the device, not the port.
    return { kind: 'hdmi', id: 'hdmi' + source.number, name: name, sub: 'HDMI ' + source.number,
      raw: source, key: 'hdmi', color: '#3d3217' };
  }

  TH.loadEntries = function (done) {
    if (!tz || !tz.application) {  // desktop preview
      var demo = ['Netflix', 'Prime Video', 'YouTube', 'Apple TV', 'klyq'].map(function (n, i) {
        return appEntry('demo' + i, n, '');
      });
      demo.push(hdmiEntry({ type: 'HDMI', number: 1, editName: 'Fire TV' }));
      done(demo);
      return;
    }
    var apps = [];
    function withInputs() {
      try {
        tz.systeminfo.getPropertyValue('VIDEOSOURCE', function (info) {
          (info.connected || []).forEach(function (s) { if (s.type === 'HDMI') { apps.push(hdmiEntry(s)); } });
          done(apps);
        }, function () { done(apps); });
      } catch (e) { done(apps); }
    }
    try {
      tz.application.getAppsInfo(function (list) {
        list.forEach(function (a) {
          if (a.show === false || !a.name || HIDDEN.test(a.id)) { return; }
          if (!/^[A-Za-z0-9]{10}$/.test(a.packageId || '') && !STORE_IDS[a.id]) { return; }
          apps.push(appEntry(a.id, a.name, a.iconPath));
        });
        apps.sort(function (a, b) { return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name); });
        TH.tell('/apps?ids=' + apps.map(function (a) { return encodeURIComponent(a.storeId || a.id); }).join(','));
        withInputs();
      }, withInputs);
    } catch (e) { withInputs(); }
  };

  // ---- watcher bridge ----
  TH.tell = function (path, ok, failed) {
    if (!tz) { return; }
    var x = new XMLHttpRequest();
    x.open('GET', TH.SERVICE_URL + path);
    x.timeout = 1500;
    x.onload = function () { if (x.status === 200) { if (ok) { ok(); } } else if (failed) { failed(); } };
    x.onerror = x.ontimeout = function () { if (failed) { failed(); } else { TH.startWatcher(); } };
    x.send();
  };
  TH.startWatcher = function () {
    if (!tz) { return; }
    try {
      tz.application.launchAppControl(new tz.ApplicationControl('http://tizen.org/appcontrol/operation/service'),
        TH.SERVICE_ID, null, null);
    } catch (e) { /* without the service, Home goes to Samsung's screen */ }
  };

  // ---- launching ----
  TH.launch = function (entry) {
    if (entry.kind === 'hdmi') { return showInput(entry); }
    if (entry.kind === 'samsung') { return TH.openSamsungHome(); }
    if (!tz || !tz.application) { return TH.toast('Would open ' + entry.name); }
    function failed() { TH.tell('/home'); TH.toast('Could not open ' + entry.name); }
    if (entry.storeId === YOUTUBE_STORE_ID) {
      // YouTube never reports itself on screen, so the watcher must stand down first.
      TH.tell('/leave', function () {
        try { tz.application.launch(entry.id, null, failed); } catch (e) { failed(); }
      }, failed);
      return;
    }
    TH.tell('/watch?id=' + encodeURIComponent(entry.storeId || entry.id));
    try { tz.application.launch(entry.id, null, failed); } catch (e) { failed(); }
  };

  TH.openSamsungHome = function () {
    if (!tz || !tz.application) { return TH.toast('Would open Samsung Home'); }
    TH.tell('/leave', function () {
      try { tz.application.launch('com.samsung.tv.csfs', null, function () { TH.tell('/home'); }); }
      catch (e) { TH.tell('/home'); }
    }, function () { TH.toast('Samsung Home is unavailable'); });
  };

  var watchingInput = false;
  function showInput(entry) {
    if (!tz || !tz.tvwindow) { return TH.toast('Would switch to ' + entry.name); }
    try {
      tz.tvwindow.setSource(entry.raw, function () {
        tz.tvwindow.show(function () {
          watchingInput = true;
          document.body.classList.add('input');
          document.getElementById('hdmi').hidden = false;
        }, function () { TH.toast('Could not show ' + entry.name); }, ['0px', '0px', '1920px', '1080px'], 'MAIN');
      }, function () { TH.toast('Could not switch input'); }, 'MAIN');
    } catch (e) { TH.toast('Could not switch input'); }
  }
  TH.watchingInput = function () { return watchingInput; };
  TH.leaveInput = function () {
    watchingInput = false;
    document.body.classList.remove('input');
    document.getElementById('hdmi').hidden = true;
    try { tz.tvwindow.hide(function () {}, function () {}, 'MAIN'); } catch (e) { /* already hidden */ }
  };
})(window.TH);
