/* Prism — refonte visuelle (mode sombre / mode clair).
   Couche de présentation uniquement : aucun calcul, aucune donnée, aucun appel réseau.
   Pour tout annuler : retirer la ligne <script src="./prism-refonte.js"> de index.html.

   Mode sombre : active prism-premium-dark.css + prism-refonte.css, puis traduit
   automatiquement vers la palette sombre les couleurs écrites « en dur » par les
   modules (feuilles de style injectées et attributs style), y compris celles des
   écrans ajoutés plus tard. Mode clair : désactive tout cela et revient au thème
   d'origine, poli par prism-refonte.css. L'impression reste toujours en clair. */
(function () {
  'use strict';
  var KEY = 'prism-theme';
  var root = document.documentElement;
  var theme = 'dark';
  try { theme = localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch (e) {}
  root.setAttribute('data-theme', theme);

  /* ---------- Feuilles gérées ---------- */
  function darkLink() { return document.querySelector('link[href*="prism-premium-dark"]'); }
  function syncDarkLink() { var l = darkLink(); if (l) l.disabled = theme !== 'dark'; }
  syncDarkLink();

  var brand = document.createElement('link');
  brand.rel = 'stylesheet'; brand.href = './prism-refonte.css?v=1'; brand.id = 'prism-refonte-css';
  var mapped = document.createElement('style');
  mapped.id = 'prism-refonte-map';

  /* ---------- Couleurs ---------- */
  var P = {
    bg: '#0B0D12', inset: '#10131A', card: '#14171F', raised: '#1A1E28', line: '#1F2330', lineStrong: '#2A2F3D',
    text: '#F2F1EC', text2: '#A3A7B4', text3: '#8A8E9B', accent: '#E3BC72', up: '#7DB8FF', down: '#F0A15A'
  };
  var NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0] };
  var COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;

  function parse(c) {
    c = c.trim().toLowerCase();
    if (NAMED[c]) return NAMED[c].slice();
    if (c[0] === '#') {
      var h = c.slice(1);
      if (h.length === 3 || h.length === 4) h = h.split('').map(function (x) { return x + x; }).join('');
      if (h.length !== 6 && h.length !== 8) return null;
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
    }
    var m = c.match(/rgba?\(([^)]*)\)/);
    if (!m) return null;
    var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(function (x) { return x.indexOf('%') > 0 ? parseFloat(x) * 2.55 : parseFloat(x); });
    if (p.length < 3 || p.some(isNaN)) return null;
    var a = p.length > 3 ? m[1].match(/[\/,]\s*([\d.]+%?)\s*$/) : null;
    var alpha = a ? (a[1].indexOf('%') > 0 ? parseFloat(a[1]) / 100 : parseFloat(a[1])) : 1;
    return [p[0], p[1], p[2], alpha];
  }
  function hsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min, h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return { h: h, l: l, chroma: d };
  }
  function rgba(c, a) { var x = parse(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; }
  function hueFamily(h) {
    if (h < 12 || h >= 330) return 'red';
    if (h < 48) return 'brown';
    if (h < 70) return 'amber';
    if (h < 175) return 'green';
    if (h < 260) return 'blue';
    return 'violet';
  }
  function semantic(fam) {
    if (fam === 'green' || fam === 'blue') return P.up;
    if (fam === 'red' || fam === 'amber') return P.down;
    if (fam === 'brown') return P.accent;
    return '#B9A6F5';
  }

  /* kind : bg | text | border | fill (SVG) ; ctx : 'chrome' (bandeau, menu) ou 'content' */
  var PALETTE = null;
  function inPalette(c) {
    if (!PALETTE) PALETTE = Object.keys(P).map(function (k) { return parse(P[k]); }).concat([parse('#F2F1EC'), parse('#0B0D12')]);
    for (var i = 0; i < PALETTE.length; i++) { var q = PALETTE[i]; if (q[0] === c[0] && q[1] === c[1] && q[2] === c[2]) return true; }
    return c[0] === 242 && c[1] === 241 && c[2] === 236; // voiles clairs
  }
  function mapColor(raw, kind, ctx) {
    var c = parse(raw);
    if (!c || c[3] === 0) return raw;
    if (inPalette(c)) return raw;
    var s = hsl(c), a = c[3], neutral = s.chroma < 0.12;
    if (kind === 'bg') {
      if (a < 0.5) {
        if (s.l > 0.6) return raw;                       // voile clair : déjà pensé pour un fond sombre
        return 'rgba(242,241,236,' + Math.min(a, 0.08).toFixed(3) + ')'; // voile sombre → voile clair
      }
      if (ctx === 'chrome') return s.l < 0.35 ? P.inset : (s.l > 0.8 ? P.raised : P.lineStrong);
      if (neutral) {
        if (s.l > 0.93) return P.card;
        if (s.l > 0.84) return P.raised;
        if (s.l > 0.6) return P.lineStrong;
        if (s.l > 0.3) return '#3A4050';
        return '@dark';                                  // fond foncé : décidé avec la couleur du texte
      }
      var fam = hueFamily(s.h);
      if (s.l > 0.82) return rgba(semantic(fam), 0.14);  // pastilles de statut claires
      if (s.l < 0.3) return '@dark';
      return semantic(fam);
    }
    if (kind === 'border') {
      if (neutral || a < 0.5 || (hueFamily(s.h) === 'brown' && s.chroma < 0.32)) return s.l > 0.75 || s.l < 0.3 ? P.line : P.lineStrong;
      if (s.l > 0.8) return rgba(semantic(hueFamily(s.h)), 0.35);
      return semantic(hueFamily(s.h));
    }
    if (kind === 'fill') {
      if (neutral) return s.l < 0.35 ? P.text2 : (s.l > 0.85 ? P.lineStrong : P.text3);
      return semantic(hueFamily(s.h));
    }
    /* texte */
    if (neutral || s.chroma < 0.16 || (hueFamily(s.h) === 'brown' && s.chroma < 0.3 && s.l < 0.6)) {
      if (s.l > 0.9) return raw;
      if (s.l < 0.45) return P.text;
      if (s.l < 0.62) return P.text2;
      return P.text3;
    }
    if (s.l > 0.85 && a > 0.5) return raw;
    return semantic(hueFamily(s.h));
  }

  var BG_PROPS = { 'background': 1, 'background-color': 1, 'background-image': 1 };
  var TEXT_PROPS = { 'color': 1, '-webkit-text-fill-color': 1, 'caret-color': 1 };
  var BORDER_PROPS = { 'border': 1, 'border-color': 1, 'border-top': 1, 'border-right': 1, 'border-bottom': 1, 'border-left': 1,
    'border-top-color': 1, 'border-right-color': 1, 'border-bottom-color': 1, 'border-left-color': 1, 'outline': 1, 'outline-color': 1 };
  var CHROME_RE = /\.header\b|app-sidebar|#appSidebar|oce-menu|oce-drawer|mobile-bottom-nav|auth-gate|\.brand\b|app-menu-btn/;

  function kindOf(prop) {
    if (BG_PROPS[prop]) return 'bg';
    if (TEXT_PROPS[prop]) return 'text';
    if (BORDER_PROPS[prop]) return 'border';
    if (prop === 'fill' || prop === 'stroke') return 'fill';
    return null;
  }
  function resolveVars(v, scope) {
    if (v.indexOf('var(') < 0) return v;
    var cs = getComputedStyle(scope || root);
    return v.replace(/var\((--[\w-]+)(?:,\s*([^)]*))?\)/g, function (_, n, f) { return (cs.getPropertyValue(n).trim() || f || ''); });
  }

  /* Traduit un bloc de déclarations ; renvoie le texte CSS (avec !important) ou '' */
  function mapDecls(style, ctx) {
    var out = [], hadDarkBg = null, lightText = false;
    for (var i = 0; i < style.length; i++) {
      var prop = style[i], kind = kindOf(prop);
      if (!kind) continue;
      var val = style.getPropertyValue(prop);
      if (!val) continue;
      var resolved = resolveVars(val);
      if (!COLOR_RE.test(resolved)) { COLOR_RE.lastIndex = 0; continue; }
      COLOR_RE.lastIndex = 0;
      if (kind === 'text') { var t = parse((resolved.match(COLOR_RE) || [''])[0]); COLOR_RE.lastIndex = 0; if (t && hsl(t).l > 0.85) lightText = true; }
      var mappedVal = resolved.replace(COLOR_RE, function (m) {
        var r = mapColor(m, kind, ctx);
        if (r === '@dark') { hadDarkBg = parse(m); return '@dark'; }
        return r;
      });
      COLOR_RE.lastIndex = 0;
      if (mappedVal === resolved) continue;
      out.push([prop, mappedVal]);
    }
    if (hadDarkBg) {
      /* Fond foncé dans le contenu : bouton principal ou élément sélectionné.
         Texte clair dans la même règle → pastille inversée (fond clair, texte sombre). */
      var s = hsl(hadDarkBg), fill;
      if (lightText) {
        fill = s.chroma < 0.12 ? P.text : P.accent;
        out = out.filter(function (d) { return d[0] !== 'color'; });
        out.push(['color', P.bg]);
      } else fill = P.lineStrong;
      out = out.map(function (d) { return [d[0], d[1].replace(/@dark/g, fill)]; });
    }
    return out.map(function (d) { return d[0] + ':' + d[1] + ' !important'; }).join(';');
  }

  /* ---------- Feuilles de style ---------- */
  function skipSheet(sheet) {
    var n = sheet.ownerNode;
    if (!n) return true;
    if (n === mapped || n === brand) return true;
    if (n.href && /prism-premium-dark|prism-refonte|fonts\.googleapis|identity\.netlify/.test(n.href)) return true;
    return false;
  }
  function walk(rules, acc) {
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.type === 1) {
        var ctx = CHROME_RE.test(r.selectorText) ? 'chrome' : 'content';
        if (/::?(?:-webkit-scrollbar|selection|placeholder)/.test(r.selectorText)) continue;
        var css = mapDecls(r.style, ctx);
        if (css) acc.push(r.selectorText + '{' + css + '}');
      } else if (r.type === 4) {
        var media = r.conditionText || r.media.mediaText;
        if (/\bprint\b/.test(media) && !/screen/.test(media)) continue;
        var inner = [];
        walk(r.cssRules, inner);
        if (inner.length) acc.push('@media ' + media + '{' + inner.join('\n') + '}');
      } else if (r.cssRules && r.type === 12) {
        var sup = []; walk(r.cssRules, sup);
        if (sup.length) acc.push('@supports ' + r.conditionText + '{' + sup.join('\n') + '}');
      }
    }
  }
  function buildMap() {
    var acc = [];
    for (var i = 0; i < document.styleSheets.length; i++) {
      var sh = document.styleSheets[i], rules;
      if (skipSheet(sh)) continue;
      try { rules = sh.cssRules; } catch (e) { continue; }
      walk(rules, acc);
    }
    mapped.textContent = '@media screen{\n' + acc.join('\n') + '\n}';
  }

  /* ---------- Attributs style et SVG ---------- */
  var INLINE_PROPS = ['background', 'background-color', 'background-image', 'color', 'border', 'border-color',
    'border-top', 'border-bottom', 'border-left', 'border-right', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color', 'outline'];
  function inChrome(el) { return !!(el.closest && el.closest('.header,#appSidebar,.app-sidebar,.oce-drawer,#oceMobileMenu,.mobile-bottom-nav,#authGate')); }
  function skipEl(el) { return !!(el.closest && el.closest('.print-doc,#prism-theme-toggle,.no-theme')); }
  function mapInline(el) {
    if (skipEl(el)) return;
    var st = el.getAttribute('style');
    if (st && /#|rgb|white|black|var\(/i.test(st) && el.dataset.prismOrigStyle !== st && el.dataset.prismMappedStyle !== st) {
      el.dataset.prismOrigStyle = st;
      var ctx = inChrome(el) ? 'chrome' : 'content';
      var fake = document.createElement('div');
      fake.setAttribute('style', st);
      var css = mapDecls(fake.style, ctx);
      if (css) {
        css.split(';').forEach(function (d) {
          var i = d.indexOf(':'); if (i < 0) return;
          el.style.setProperty(d.slice(0, i).trim(), d.slice(i + 1).replace('!important', '').trim(), 'important');
        });
      }
      el.dataset.prismMappedStyle = el.getAttribute('style');
    }
    if (el.namespaceURI === 'http://www.w3.org/2000/svg') {
      ['fill', 'stroke'].forEach(function (attr) {
        var v = el.getAttribute(attr);
        if (!v || v === 'none' || v === 'currentColor' || /url\(/.test(v) || el.getAttribute('data-prism-' + attr)) return;
        var isText = el.tagName === 'text' || el.tagName === 'tspan';
        var m = mapColor(resolveVars(v, el), isText ? 'text' : 'fill', 'content');
        if (m && m !== v && m !== '@dark') { el.setAttribute('data-prism-' + attr, v); el.setAttribute(attr, m); }
      });
    }
  }
  function restoreInline(el) {
    if (el.dataset && el.dataset.prismOrigStyle !== undefined) {
      el.setAttribute('style', el.dataset.prismOrigStyle);
      delete el.dataset.prismOrigStyle; delete el.dataset.prismMappedStyle;
    }
    ['fill', 'stroke'].forEach(function (attr) {
      var o = el.getAttribute && el.getAttribute('data-prism-' + attr);
      if (o) { el.setAttribute(attr, o); el.removeAttribute('data-prism-' + attr); }
    });
  }
  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    mapInline(node);
    var list = node.querySelectorAll('[style],svg [fill],svg [stroke]');
    for (var i = 0; i < list.length; i++) mapInline(list[i]);
  }
  function unscan() {
    var list = document.querySelectorAll('[data-prism-orig-style],[data-prism-fill],[data-prism-stroke]');
    for (var i = 0; i < list.length; i++) restoreInline(list[i]);
  }

  /* ---------- Orchestration ---------- */
  var pendingSheets = false, pendingNodes = [], timer = null, printing = false;
  function keepLast() {
    var head = document.head;
    if (theme === 'dark') { if (mapped.parentNode !== head || head.lastElementChild !== brand) { head.appendChild(mapped); head.appendChild(brand); } }
    else if (brand.parentNode !== head || head.lastElementChild !== brand) { if (mapped.parentNode) mapped.remove(); head.appendChild(brand); }
  }
  function flush() {
    timer = null;
    if (theme !== 'dark' || printing) { pendingNodes = []; pendingSheets = false; keepLast(); return; }
    if (pendingSheets) { pendingSheets = false; buildMap(); }
    var nodes = pendingNodes; pendingNodes = [];
    nodes.forEach(scan);
    keepLast();
  }
  function schedule() { if (!timer) timer = setTimeout(flush, 60); }

  var observer = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'attributes') { if (m.target !== mapped) pendingNodes.push(m.target); continue; }
      for (var j = 0; j < m.addedNodes.length; j++) {
        var n = m.addedNodes[j];
        if (n === mapped || n === brand) continue;
        if (n.nodeType === 1 && (n.tagName === 'STYLE' || n.tagName === 'LINK')) { pendingSheets = true; n.addEventListener && n.addEventListener('load', function () { pendingSheets = true; schedule(); }); }
        else if (n.nodeType === 1) pendingNodes.push(n);
        else if (n.nodeType === 3 && m.target.tagName === 'STYLE') pendingSheets = true;
      }
      if (m.type === 'characterData' && m.target.parentNode && m.target.parentNode.tagName === 'STYLE') pendingSheets = true;
    }
    if (pendingSheets || pendingNodes.length) schedule();
  });

  function apply(next) {
    theme = next;
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem(KEY, theme); } catch (e) {}
    syncDarkLink();
    if (theme === 'dark') { pendingSheets = true; pendingNodes.push(document.body); flush(); }
    else { mapped.textContent = ''; unscan(); keepLast(); }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? P.bg : '#332823');
    updateToggle();
  }

  /* ---------- Bouton de bascule ---------- */
  var toggle;
  var ICON_SUN = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var ICON_MOON = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  function updateToggle() {
    if (!toggle) return;
    var dark = theme === 'dark';
    toggle.innerHTML = (dark ? ICON_SUN : ICON_MOON) + '<span>' + (dark ? 'Mode clair' : 'Mode sombre') + '</span>';
    toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
    toggle.title = dark ? 'Passer en mode clair' : 'Passer en mode sombre';
  }
  function mountToggle() {
    if (document.getElementById('prism-theme-toggle')) return;
    toggle = document.createElement('button');
    toggle.type = 'button'; toggle.id = 'prism-theme-toggle'; toggle.className = 'prism-theme-toggle';
    toggle.addEventListener('click', function () { apply(theme === 'dark' ? 'light' : 'dark'); });
    var foot = document.querySelector('#appSidebar .app-sidebar-foot');
    if (foot) foot.insertBefore(toggle, foot.firstChild); else document.body.appendChild(toggle);
    var mobile = document.querySelector('.header');
    if (mobile && !document.getElementById('prism-theme-toggle-mobile')) {
      var t2 = document.createElement('button');
      t2.type = 'button'; t2.id = 'prism-theme-toggle-mobile'; t2.className = 'prism-theme-toggle-mobile';
      t2.setAttribute('aria-label', 'Changer de mode clair / sombre');
      t2.addEventListener('click', function () { apply(theme === 'dark' ? 'light' : 'dark'); });
      mobile.appendChild(t2);
      var upd = updateToggle;
      updateToggle = function () { upd(); t2.innerHTML = theme === 'dark' ? ICON_SUN : ICON_MOON; };
    }
    updateToggle();
  }

  /* L'impression reste dans les couleurs d'origine. */
  window.addEventListener('beforeprint', function () { if (theme !== 'dark') return; printing = true; unscan(); });
  window.addEventListener('afterprint', function () { if (!printing) return; printing = false; pendingNodes.push(document.body); flush(); });

  function start() {
    mountToggle();
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'fill', 'stroke'], characterData: true });
    pendingSheets = true; pendingNodes.push(document.body); flush();
    window.addEventListener('load', function () { pendingSheets = true; schedule(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.PrismTheme = { get: function () { return theme; }, set: apply };
})();
