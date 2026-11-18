// Feature checks for older Tizen web engines; css/compat.css holds the matching fallbacks.
(function () {
  'use strict';
  var root = document.documentElement;
  // Flexbox gap cannot be detected with @supports (grid gap answers yes), so measure it.
  var flex = document.createElement('div');
  flex.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
  flex.appendChild(document.createElement('div'));
  flex.appendChild(document.createElement('div'));
  document.body.appendChild(flex);
  if (flex.scrollHeight !== 1) { root.className += ' no-flexgap'; }
  document.body.removeChild(flex);
  if (!(window.CSS && CSS.supports && CSS.supports('aspect-ratio', '1 / 1'))) { root.className += ' no-aspect'; }
})();
