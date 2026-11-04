/* Prism — DA « Sable & Or » (mode clair par défaut) et mode sombre brun chaud.
   Couche de présentation uniquement : aucun calcul, aucune donnée, aucun appel réseau.
   Pour tout annuler : retirer la ligne <script src="./prism-refonte.js"> de index.html.

   Les couleurs écrites « en dur » par les modules (feuilles de style injectées et
   attributs style) sont traduites automatiquement vers la palette du mode choisi,
   y compris celles des écrans ajoutés plus tard. prism-refonte.css ajoute la couche
   de marque (menu flottant, typographie, boutons). L'impression reste en couleurs d'origine. */
(function () {
  'use strict';
  var KEY = 'prism-theme-v2';
  var root = document.documentElement;
  var theme = 'light';
  try { theme = localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch (e) {}
  root.setAttribute('data-theme', theme);

  /* ---------- Feuilles gérées ---------- */
  function darkLink() { return document.querySelector('link[href*="prism-premium-dark"]'); }
  function syncDarkLink() { var l = darkLink(); if (l) l.disabled = true; } // remplacé par cette couche
  syncDarkLink();

  var brand = document.createElement('link');
  brand.rel = 'stylesheet'; brand.href = './prism-refonte.css?v=7'; brand.id = 'prism-refonte-css';
  var mapped = document.createElement('style');
  mapped.id = 'prism-refonte-map';

  /* ---------- Couleurs ---------- */
  var PALS = {
    dark: { bg: '#1D1816', inset: '#221C1A', card: '#272120', raised: '#2E2725', line: '#3A302C', lineStrong: '#4A3E39', mid: '#5A4D47',
      text: '#F5EEE9', text2: '#C9B9B0', text3: '#A8968C', accent: '#E3BC72', up: '#7FD6A3', down: '#FF9C8A' },
    light: { bg: '#F5F3EF', panel: '#FFFFFF', panel2: '#FAF8F4', soft: '#F1EEE8', line: '#E5E0D7', lineStrong: '#D4CDBF', track: '#DDD7CC',
      ink: '#111317', ink2: '#55575E', ink3: '#6B6D73', side: '#111317', sidePill: '#262930', sand: '#F5F3EF', gold: '#B8893B', goldText: '#8A6420' }
  };
  var P = PALS[theme];
  var FAM_LIGHT = {
    soft: { green: '#E3F3EA', red: '#FBEAE1', brown: '#F4EBDA', amber: '#F4EBDA', blue: '#E6EEF9', violet: '#EEEAF8' },
    fill: { green: '#1F7A4D', red: '#B4441C', brown: '#B8893B', amber: '#B8893B', blue: '#2F5FA7', violet: '#5B4BB7' },
    text: { green: '#1F7A4D', red: '#B4441C', brown: '#8A6420', amber: '#8A6420', blue: '#2F5FA7', violet: '#5B4BB7' }
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
    if (!PALETTE) {
      PALETTE = Object.keys(P).map(function (k) { return parse(P[k]); });
      if (P.ink) ['soft', 'fill', 'text'].forEach(function (g) { Object.keys(FAM_LIGHT[g]).forEach(function (f) { PALETTE.push(parse(FAM_LIGHT[g][f])); }); });
    }
    for (var i = 0; i < PALETTE.length; i++) { var q = PALETTE[i]; if (q[0] === c[0] && q[1] === c[1] && q[2] === c[2]) return true; }
    return false;
  }
  function mapLight(raw, c, s, kind, ctx) {
    var a = c[3], fam = hueFamily(s.h), quiet = s.chroma < 0.12 || (fam === 'brown' && s.chroma < 0.32);
    if (kind === 'bg') {
      if (a < 0.5) return raw;
      if (ctx === 'chrome') return s.l < 0.35 ? P.side : P.sidePill;
      if (quiet) {
        if (s.l > 0.96) return P.panel;
        if (s.l > 0.9) return P.panel2;
        if (s.l > 0.84) return P.soft;
        if (s.l > 0.6) return P.line;
        if (s.l > 0.3) return P.ink2;
        return '@dark';
      }
      if (s.l > 0.82) return FAM_LIGHT.soft[fam];
      if (s.l < 0.3) return '@dark';
      return FAM_LIGHT.fill[fam];
    }
    if (kind === 'border') {
      if (quiet || a < 0.5) return s.l > 0.75 ? P.line : P.lineStrong;
      if (s.l > 0.8) return FAM_LIGHT.soft[fam];
      return FAM_LIGHT.fill[fam];
    }
    if (kind === 'fill') {
      if (quiet) return s.l < 0.35 ? P.ink : (s.l > 0.85 ? P.track : '#8E9096');
      return FAM_LIGHT.fill[fam];
    }
    if (ctx === 'chrome') return raw;
    if (quiet || s.chroma < 0.16) {
      if (s.l > 0.9) return raw;
      if (s.l < 0.45) return P.ink;
      if (s.l < 0.62) return P.ink2;
      return P.ink3;
    }
    if (s.l > 0.85) return raw;
    if (s.l < 0.3) return P.ink;                         // bleu marine, brun foncé… : encre
    return FAM_LIGHT.text[fam];
  }
  function mapColor(raw, kind, ctx) {
    var c = parse(raw);
    if (!c || c[3] === 0) return raw;
    if (inPalette(c)) return raw;
    var s = hsl(c), a = c[3], neutral = s.chroma < 0.12;
    if (P.ink) return mapLight(raw, c, s, kind, ctx);
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
        if (s.l > 0.3) return P.mid;
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
    if (s.l < 0.3) return P.text;
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
      if (P.ink) {
        fill = P.ink;
        if (lightText) { out = out.filter(function (d) { return d[0] !== 'color'; }); out.push(['color', P.sand]); }
      } else if (lightText) {
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
  /* Noms en capitales nettoyés à l'affichage (texte d'origine conservé dans title). */
  var SMALL = { de: 1, du: 1, des: 1, et: 1, la: 1, le: 1, les: 1, en: 1, au: 1, aux: 1, a: 1 };
  function mostlyUpper(t) { var l = t.replace(/[^A-Za-zÀ-ÿ]/g, ''); if (l.length < 3) return false; var u = l.replace(/[^A-ZÀ-Þ]/g, ''); return u.length / l.length > 0.7; }
  function cleanName(t) {
    var x = t.replace(/^\s*\d{8,}\s*/, '').replace(/^\s*\d{1,3}\s*[_\[\]“”"'‘’=…\-—.+]+\s*/, '').replace(/^\s*[_\[\]“”"'‘’=…\-—.]+\s*/, '');
    x = x.replace(/(\s+\d+[.,]\d{2}\s*€?)+\s*$/, '').trim();
    return x || t;
  }
  function sentence(t) { var x = t.toLowerCase(); return x.replace(/^([^a-zà-ÿ]*)([a-zà-ÿ])/, function (_, a, b) { return a + b.toUpperCase(); }); }
  function title(t) { return t.toLowerCase().split(/(\s+|-)/).map(function (w, i) { return (i && SMALL[w]) ? w : w.charAt(0).toUpperCase() + w.slice(1); }).join(''); }
  function prettify(root) {
    var list = root.querySelectorAll ? root.querySelectorAll('.pcu-product-link,.pcu-product-name,.pcu-supplier-cell,.pcu-product-supplier,.pcu-price') : [];
    for (var i = 0; i < list.length; i++) {
      var e = list[i], t = e.textContent;
      if (!t || e.dataset.prismPretty === t) continue;
      if (e.classList.contains('pcu-price')) {
        var m = t.match(/^(.*?)\s*·\s*unité à vérifier\s*$/);
        if (m) { e.textContent = m[1]; var pill = document.createElement('span'); pill.className = 'pcu-unit-check'; pill.textContent = 'unité à vérifier'; e.appendChild(pill); }
        e.dataset.prismPretty = e.textContent; continue;
      }
      if (!mostlyUpper(t)) { e.dataset.prismPretty = t; continue; }
      var isSupplier = e.classList.contains('pcu-supplier-cell') || e.classList.contains('pcu-product-supplier');
      var out = isSupplier ? title(t.trim()) : sentence(cleanName(t.trim()));
      if (!e.title) e.title = t.trim();
      e.textContent = out; e.dataset.prismPretty = out;
    }
  }
  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    prettify(node);
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
    if (mapped.parentNode !== head || head.lastElementChild !== brand) { head.appendChild(mapped); head.appendChild(brand); }
  }
  function flush() {
    timer = null;
    if (printing) { pendingNodes = []; pendingSheets = false; keepLast(); return; }
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
    P = PALS[theme]; PALETTE = null;
    unscan(); pendingSheets = true; pendingNodes.push(document.body); flush();
    setMeta();
    updateToggle();
  }

  function setMeta() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? PALS.dark.bg : PALS.light.bg);
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
  function mountDrawerToggle() {
    var drawer = document.querySelector('#oceMobileMenu');
    if (!drawer || document.getElementById('prism-theme-toggle-drawer')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'prism-theme-toggle-drawer'; b.className = 'prism-theme-toggle prism-theme-toggle-drawer';
    b.addEventListener('click', function () { apply(theme === 'dark' ? 'light' : 'dark'); });
    drawer.appendChild(b);
    var upd = updateToggle;
    updateToggle = function () { upd(); b.innerHTML = (theme === 'dark' ? ICON_SUN : ICON_MOON) + '<span>' + (theme === 'dark' ? 'Mode clair' : 'Mode sombre') + '</span>'; };
    updateToggle();
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

  /* ---------- Établissement en haut à gauche, bandeau allégé ---------- */
  function mountSiteSwitch() {
    var src = document.querySelector('.header .prism-establishments');
    var head = document.querySelector('#appSidebar .app-sidebar-head');
    if (!src || !head || document.getElementById('prism-site-switch')) return;
    var btns = [].slice.call(src.querySelectorAll('button'));
    if (!btns.length) return;
    var wrap = document.createElement('div');
    wrap.id = 'prism-site-switch'; wrap.className = 'prism-site-switch';
    var cur = document.createElement('button');
    cur.type = 'button'; cur.className = 'prism-site-current'; cur.setAttribute('aria-expanded', 'false');
    var list = document.createElement('div');
    list.className = 'prism-site-list'; list.hidden = true;
    function label() {
      var on = btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || btns[0];
      cur.innerHTML = '<span class="prism-site-kicker">Établissement</span><span class="prism-site-name"></span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
      cur.querySelector('.prism-site-name').textContent = on.textContent.trim();
    }
    btns.forEach(function (b) {
      var o = document.createElement('button');
      o.type = 'button'; o.className = 'prism-site-option';
      o.disabled = b.disabled;
      o.setAttribute('aria-pressed', b.getAttribute('aria-pressed') || 'false');
      o.innerHTML = '<span></span>' + (b.disabled ? '<em>à brancher</em>' : '');
      o.firstChild.textContent = b.textContent.trim();
      o.addEventListener('click', function () { b.click(); list.hidden = true; cur.setAttribute('aria-expanded', 'false'); setTimeout(label, 0); });
      list.appendChild(o);
    });
    cur.addEventListener('click', function () { list.hidden = !list.hidden; cur.setAttribute('aria-expanded', list.hidden ? 'false' : 'true'); });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) { list.hidden = true; cur.setAttribute('aria-expanded', 'false'); } });
    label();
    wrap.appendChild(cur); wrap.appendChild(list);
    head.parentNode.insertBefore(wrap, head.nextSibling);
    root.classList.add('prism-has-site-switch');
  }
  function headerHasTools(h) {
    var r = h.querySelector('.hright');
    if (!r) return false;
    var cs = getComputedStyle(r);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.getBoundingClientRect().width > 0 && r.children.length > 0;
  }
  function fixHeader() {
    var h = document.querySelector('body>.header');
    if (!h) return;
    var name = h.querySelector('.brand-name');
    if (name && name.textContent !== 'Prism') name.textContent = 'Prism';
    if (!window.matchMedia('(min-width:901px)').matches) { h.classList.remove('prism-header-empty'); return; }
    var empty = !headerHasTools(h);
    h.classList.toggle('prism-header-empty', empty);
    ['height', 'min-height', 'max-height'].forEach(function (p) { if (h.style.getPropertyValue(p) !== 'auto') h.style.setProperty(p, 'auto', 'important'); });
  }
  var headerTimer = null;
  function scheduleHeader() { if (!headerTimer) headerTimer = setTimeout(function () { headerTimer = null; fixHeader(); }, 30); }
  window.addEventListener('resize', scheduleHeader);

  /* L'impression reste dans les couleurs d'origine. */
  window.addEventListener('beforeprint', function () { printing = true; unscan(); mapped.disabled = true; brand.disabled = true; });
  window.addEventListener('afterprint', function () { if (!printing) return; printing = false; mapped.disabled = false; brand.disabled = false; pendingNodes.push(document.body); flush(); });

  function start() {
    mountToggle(); setMeta(); mountSiteSwitch(); fixHeader();
    if (!document.getElementById('prism-accueil-js')) { var sa = document.createElement('script'); sa.id = 'prism-accueil-js'; sa.src = './prism-accueil.js?v=3'; document.body.appendChild(sa); }
    var hdr = document.querySelector('body>.header');
    if (hdr) new MutationObserver(scheduleHeader).observe(hdr, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
    if (typeof window.navigateApp === 'function' && !window.navigateApp.__prism) {
      var nav = window.navigateApp;
      window.navigateApp = function () { var r = nav.apply(this, arguments); scheduleHeader(); return r; };
      window.navigateApp.__prism = true;
    }
    window.addEventListener('load', function () { mountSiteSwitch(); scheduleHeader(); mountDrawerToggle(); });
    mountDrawerToggle(); setTimeout(mountDrawerToggle, 1500);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'fill', 'stroke'], characterData: true });
    pendingSheets = true; pendingNodes.push(document.body); flush();
    window.addEventListener('load', function () { pendingSheets = true; schedule(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.PrismTheme = { get: function () { return theme; }, set: apply };
})();
