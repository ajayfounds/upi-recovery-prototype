(function () {
  'use strict';
  var script = document.currentScript;
  var rootName = script.getAttribute('data-root');
  var app = document.getElementById('app');
  var stage = document.getElementById('stage');

  var inst = DC.mount(app, rootName, {});
  var ORDER = inst.renderVals().screens.map(function (s, i) { return s; });
  var IDS = ['checking', 'status', 'explainer', 'waiting', 'notification', 'escalation', 'handoff', 'success', 'reassurance', 'duplicate', 'refunded'];
  var LABELS = {}; ORDER.forEach(function (s, i) { LABELS[IDS[i]] = s.label; });

  // Compact (phone) controls
  var ctl = document.createElement('nav');
  ctl.className = 'ctl';
  ctl.setAttribute('aria-label', 'Flow controls');
  ctl.innerHTML =
    '<button class="ctl-btn" data-act="prev" aria-label="Previous screen"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
    '<label class="ctl-pick"><span class="ctl-n"></span><span class="ctl-label"></span>' +
    '<select aria-label="Jump to screen">' + IDS.map(function (id, i) { return '<option value="' + id + '">' + String(i + 1).padStart(2, '0') + ' · ' + LABELS[id] + '</option>'; }).join('') + '</select></label>' +
    '<button class="ctl-btn" data-act="next" aria-label="Next screen"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>';
  document.body.appendChild(ctl);
  var sel = ctl.querySelector('select');

  var current = 'checking';
  function onChange(id) {
    if (!id) return;
    current = id;
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
    document.querySelectorAll('[data-theme-link]').forEach(function (a) {
      a.setAttribute('href', '../' + a.getAttribute('data-theme-link') + '/#' + id);
    });
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
  ctl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (b) step(b.getAttribute('data-act') === 'next' ? 1 : -1);
  });
  sel.addEventListener('change', function () { inst.go(sel.value); });
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });

  var start = (location.hash || '').slice(1);
  if (IDS.indexOf(start) > 0) inst.go(start); else onChange('checking');

  // Fit the fixed-size artboard into the viewport
  function fit() {
    var compact = window.innerWidth < 900 || window.innerHeight < 620;
    document.body.classList.toggle('compact', compact);
    var w = compact ? 390 : 1180, h = compact ? 844 : 1000;
    var bar = document.querySelector('.bar').offsetHeight;
    var cH = compact ? ctl.offsetHeight : 0;
    var availW = window.innerWidth, availH = window.innerHeight - bar - cH;
    stage.style.height = availH + 'px';
    var pad = compact ? 0 : 16;
    var s = Math.min((availW - pad * 2) / w, (availH - pad * 2) / h, compact ? 1.4 : 1.15);
    app.style.width = w + 'px';
    app.style.height = h + 'px';
    app.style.transform = 'scale(' + s + ')';
    app.style.left = Math.round((availW - w * s) / 2) + 'px';
    app.style.top = Math.round((availH - h * s) / 2) + 'px';
  }
  window.addEventListener('resize', fit);
  fit();
  document.fonts && document.fonts.ready.then(fit);
})();
