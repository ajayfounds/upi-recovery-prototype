/* Tiny runtime for the prototype screens.
   Supports the subset of template syntax the screens use:
   {{path}} in text + attributes, onClick="{{fn}}", <sc-if value>, <sc-for list as>, <dc-import name ...props>.
   Components persist across renders; DOM is patched with morphdom so running CSS animations are not restarted. */
(function () {
  'use strict';
  var registry = {};
  var instances = {};     // key -> { inst, name }
  var seen = null;        // keys rendered this pass
  var handlers = {};      // id -> fn (rebuilt each render)
  var hid = 0;
  var rootEl = null, rootName = null, rootProps = null;
  var scheduled = false;
  var mounted = [];

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (patch) {
    var s = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    this.state = Object.assign({}, this.state, s);
    schedule();
  };
  DCLogic.prototype.renderVals = function () { return {}; };
  window.DCLogic = DCLogic;

  function register(name, html, Cls) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    var n = 0;
    t.content.querySelectorAll('dc-import').forEach(function (el) { el.setAttribute('data-imp', String(n++)); });
    registry[name] = { tpl: t, Cls: Cls };
  }

  var ONLY = /^\{\{\s*([^}]+?)\s*\}\}$/;
  var ANY = /\{\{\s*([^}]+?)\s*\}\}/g;

  function lookup(scope, expr) {
    expr = expr.trim();
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return parseFloat(expr);
    var parts = expr.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }
  function interp(str, scope) {
    return str.replace(ANY, function (_, e) { var v = lookup(scope, e); return v == null ? '' : String(v); });
  }

  function renderComponent(name, props, key) {
    var def = registry[name];
    if (!def) { var miss = document.createElement('div'); miss.textContent = 'Missing ' + name; return [miss]; }
    var rec = instances[key];
    if (!rec || rec.name !== name) {
      var inst = new def.Cls(props);
      rec = instances[key] = { inst: inst, name: name, fresh: true };
    } else {
      rec.inst.props = props;
    }
    seen[key] = true;
    var vals = Object.assign({}, rec.inst.renderVals() || {});
    var out = [];
    def.tpl.content.childNodes.forEach(function (n) { walk(n, vals, key, out); });
    if (rec.fresh) { rec.fresh = false; mounted.push(rec.inst); }
    out.forEach(function (n) { if (n.nodeType === 1) n.setAttribute('data-dc-key', key); });
    return out;
  }

  function walk(node, scope, key, out) {
    if (node.nodeType === 3) { add(out, document.createTextNode(interp(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();
    if (tag === 'helmet' || tag === 'script') return;
    if (tag === 'sc-if') {
      var raw = node.getAttribute('value') || '';
      var m = raw.match(ONLY);
      var ok = m ? lookup(scope, m[1]) : !!raw;
      if (ok) node.childNodes.forEach(function (c) { walk(c, scope, key, out); });
      return;
    }
    if (tag === 'sc-for') {
      var lm = (node.getAttribute('list') || '').match(ONLY);
      var list = lm ? lookup(scope, lm[1]) : [];
      var as = node.getAttribute('as') || 'item';
      (list || []).forEach(function (item, i) {
        var s = Object.create(scope); s[as] = item; s.index = i;
        node.childNodes.forEach(function (c) { walk(c, s, key, out); });
      });
      return;
    }
    if (tag === 'dc-import') {
      var props = {};
      Array.prototype.forEach.call(node.attributes, function (a) {
        if (a.name === 'name' || a.name === 'data-imp' || a.name.indexOf('hint-') === 0) return;
        var mm = a.value.match(ONLY);
        props[a.name] = mm ? lookup(scope, mm[1]) : a.value;
      });
      var ck = key + '/' + node.getAttribute('name') + '#' + node.getAttribute('data-imp');
      renderComponent(node.getAttribute('name'), props, ck).forEach(function (n) { add(out, n); });
      return;
    }
    var el = document.createElementNS(node.namespaceURI, node.localName);
    Array.prototype.forEach.call(node.attributes, function (a) {
      var name = a.name;
      if (/^on[a-z]+$/i.test(name)) {
        var mm = a.value.match(ONLY);
        var fn = mm ? lookup(scope, mm[1]) : null;
        if (typeof fn === 'function') {
          var id = 'h' + (hid++);
          handlers[id] = fn;
          el.setAttribute('data-dc-' + name.toLowerCase(), id);
        }
        return;
      }
      el.setAttribute(name, a.value.indexOf('{{') >= 0 ? interp(a.value, scope) : a.value);
    });
    node.childNodes.forEach(function (c) { walk(c, scope, key, el); });
    add(out, el);
  }

  function add(out, n) { if (Array.isArray(out)) out.push(n); else out.appendChild(n); }

  function render() {
    scheduled = false;
    seen = {}; handlers = {}; hid = 0; mounted = [];
    var frag = document.createElement('div');
    renderComponent(rootName, rootProps, 'root').forEach(function (n) { frag.appendChild(n); });
    var next = rootEl.cloneNode(false);
    while (frag.firstChild) next.appendChild(frag.firstChild);
    window.morphdom(rootEl, next, {
      getNodeKey: function (n) { return n.getAttribute ? (n.getAttribute('data-dc-key') || n.id) : null; },
      onBeforeElUpdated: function (from, to) { return !from.isEqualNode(to); }
    });
    Object.keys(instances).forEach(function (k) {
      if (!seen[k]) {
        var i = instances[k].inst;
        delete instances[k];
        if (i.componentWillUnmount) try { i.componentWillUnmount(); } catch (e) { console.error(e); }
      }
    });
    mounted.forEach(function (i) { if (i.componentDidMount) try { i.componentDidMount(); } catch (e) { console.error(e); } });
  }
  function schedule() {
    if (scheduled || !rootEl) return;
    scheduled = true;
    Promise.resolve().then(render);
  }

  function mount(el, name, props) {
    rootEl = el; rootName = name; rootProps = props || {};
    el.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-dc-onclick]') : null;
      if (!t || !el.contains(t)) return;
      var fn = handlers[t.getAttribute('data-dc-onclick')];
      if (fn) fn(e);
    });
    render();
    return instances.root && instances.root.inst;
  }

  window.DC = { register: register, mount: mount, rerender: schedule };
})();
