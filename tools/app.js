(function () {
  'use strict';
  var script = document.currentScript;
  var rootName = script.getAttribute('data-root');
  var theme = script.getAttribute('data-theme');
  var other = script.getAttribute('data-other');
  var app = document.getElementById('app');
  var stage = document.getElementById('stage');

  var W = 390, H = 844;
  var inst = DC.mount(app, rootName, {});
  var IDS = ['checking', 'status', 'explainer', 'waiting', 'notification', 'escalation', 'handoff', 'success', 'reassurance', 'duplicate', 'refunded'];
  var LABELS = {};
  var ORDER = inst.renderVals().screens;
  ORDER.forEach(function (s, i) { LABELS[IDS[i]] = s.label; });

  var current = 'checking';

  // Build bottom controls
  var ctl = document.createElement('nav');
  ctl.className = 'ctl';
  ctl.setAttribute('aria-label', 'Flow controls');

  var themeIcon = theme === 'daylight'
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';

  ctl.innerHTML =
    '<button class="ctl-btn" data-act="prev" aria-label="Previous screen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
    '<label class="ctl-pick"><span class="ctl-n"></span><span class="ctl-label"></span>' +
    '<select aria-label="Jump to screen">' + IDS.map(function (id, i) { return '<option value="' + id + '">' + String(i + 1).padStart(2, '0') + ' · ' + LABELS[id] + '</option>'; }).join('') + '</select></label>' +
    '<button class="ctl-btn" data-act="next" aria-label="Next screen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>' +
    '<a class="ctl-theme" href="../' + other + '/" aria-label="Switch to ' + other + ' theme">' + themeIcon + '</a>';
  document.body.appendChild(ctl);
  var sel = ctl.querySelector('select');

  function onChange(id) {
    if (!id) return;
    current = id;
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
    // Update theme link to preserve screen
    ctl.querySelector('.ctl-theme').setAttribute('href', '../' + other + '/#' + id);
    var i = IDS.indexOf(id);
    ctl.querySelector('.ctl-n').textContent = String(i + 1).padStart(2, '0') + ' / 11';
    ctl.querySelector('.ctl-label').textContent = LABELS[id];
    sel.value = id;
  }

  var origGo = inst.go;
  inst.go = function (id) { origGo(id); onChange(id); };
  DC.rerender();

  function step(d) {
    var i = IDS.indexOf(current);
    inst.go(IDS[(i + d + IDS.length) % IDS.length]);
  }

  // Button clicks
  ctl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (b) step(b.getAttribute('data-act') === 'next' ? 1 : -1);
  });
  sel.addEventListener('change', function () { inst.go(sel.value); });

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });

  // Touch swipe
  var touchX = null;
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) touchX = e.touches[0].clientX;
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  // Initial screen from hash
  var start = (location.hash || '').slice(1);
  if (IDS.indexOf(start) > 0) inst.go(start); else onChange('checking');

  // Scale the 390x844 screen to fill the viewport
  function fit() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var ctlH = ctl.offsetHeight || 56;
    var isPhone = vw <= 500;
    var pad = isPhone ? 0 : 24;
    var availW = vw - pad * 2;
    var availH = vh - ctlH - (isPhone ? 0 : pad);
    var s = Math.min(availW / W, availH / H, isPhone ? 999 : 1.3);
    app.style.width = W + 'px';
    app.style.height = H + 'px';
    app.style.transform = 'scale(' + s + ')';
    app.style.left = Math.round((vw - W * s) / 2) + 'px';
    app.style.top = Math.round(((vh - ctlH) - H * s) / 2) + 'px';
    // On phones, no border-radius (edge-to-edge); on desktop, rounded like a device
    document.documentElement.style.setProperty('--app-radius', isPhone ? '0' : '40px');
  }
  window.addEventListener('resize', fit);
  fit();
  if (document.fonts) document.fonts.ready.then(fit);
})();
