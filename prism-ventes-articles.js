/* Prism — Ventes par article (lecture seule).
   Données : onglets Ventes_Articles et Catalogue de LOCEAN_DATA_API, lus par
   /.netlify/functions/sales-details (mêmes droits que les ventes).
   - Ventes_Articles : une ligne par année (export annuel de la caisse) ou par mois
     (Z détaillés reçus chaque nuit) et par article ; Prism additionne par année.
   - Comparaison N-1 seulement entre deux années complètes (règle : jours égaux).
   Aucun chiffre inventé : une donnée absente s'affiche « — ». */
(function () {
  'use strict';
  if (window.__prismVentesArticles) return; window.__prismVentesArticles = true;

  var SECTION_ID = 'module-articles';
  var state = { annee: null, categorie: 'Tout', q: '', tri: 'ca', sens: -1, tout: false };
  var data = null, loading = false, error = null;

  var eur0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var eur2 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var int = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  var pct1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

  function num(v) { var n = Number(String(v == null ? '' : v).replace(/[\s  €]/g, '').replace(',', '.')); return isFinite(n) ? n : 0; }
  function has(v) { return v !== '' && v != null && isFinite(Number(String(v).replace(',', '.'))); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  /* Une date du Sheets peut arriver en « 2024-12-31 », en « 31/12/2024 » ou en horodatage UTC : on garde le jour de Paris. */
  function jour(v) {
    var t = String(v == null ? '' : v).trim();
    var m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    var d = new Date(t);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
  }
  function dateFr(iso) { if (!iso) return '—'; var d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }

  /* ---------- Chargement ---------- */
  async function page(sheet, start, token) {
    var res = await fetch('/.netlify/functions/sales-details?sheet=' + encodeURIComponent(sheet) + '&start=' + start,
      { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', signal: AbortSignal.timeout(25000) });
    var j = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(j.error || ('Lecture impossible : ' + sheet));
    return j;
  }
  async function sheet(name, token) {
    var first = await page(name, 1, token), rows = (first.rows || []).slice();
    var total = Number(first.totalRows) || rows.length;
    for (var s = 1001; s <= total; s += 1000) { var p = await page(name, s, token); rows.push.apply(rows, p.rows || []); }
    var heads = rows[0] || [];
    return rows.slice(1).map(function (r) { var o = {}; heads.forEach(function (h, i) { o[h] = r[i]; }); return o; });
  }
  async function load() {
    if (loading || data) return;
    loading = true; error = null; render();
    try {
      var user = window.netlifyIdentity && window.netlifyIdentity.currentUser();
      if (!user) throw new Error('Connexion nécessaire');
      var token = await user.jwt();
      var res = await Promise.all([sheet('Ventes_Articles', token), sheet('Catalogue', token).catch(function () { return []; })]);
      data = { ventes: res[0], catalogue: res[1] };
      var annees = years();
      if (!state.annee || annees.indexOf(state.annee) < 0) state.annee = annees[annees.length - 1] || null;
    } catch (e) { error = e.message || String(e); }
    loading = false; render();
  }

  /* ---------- Calculs ---------- */
  function years() {
    var set = {};
    (data ? data.ventes : []).forEach(function (r) { var y = Number(r.annee); if (y) set[y] = 1; });
    return Object.keys(set).map(Number).sort();
  }
  function jusquAu(annee) {
    var max = '';
    data.ventes.forEach(function (r) { var d = jour(r.jusqu_au); if (Number(r.annee) === annee && d > max) max = d; });
    return max;
  }
  function complete(annee) { return jusquAu(annee) >= annee + '-12-31'; }
  function articles(annee) {
    var map = {};
    data.ventes.forEach(function (r) {
      if (Number(r.annee) !== annee) return;
      var id = String(r.id_article);
      var o = map[id] = map[id] || { id: id, article: String(r.article || ''), famille: String(r.famille || ''), code: num(r.code_famille),
        categorie: String(r.categorie || ''), prix: has(r.prix_ttc) ? num(r.prix_ttc) : null, qte: 0, ca: 0, ht: 0, htConnu: true };
      o.qte += num(r.quantite); o.ca += num(r.ca_ttc);
      if (has(r.ca_ht)) o.ht += num(r.ca_ht); else o.htConnu = false;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }
  function filtre(list) {
    var q = state.q.trim().toLocaleLowerCase('fr');
    return list.filter(function (a) {
      if (state.categorie !== 'Tout' && a.categorie !== state.categorie) return false;
      if (q && (a.article + ' ' + a.famille).toLocaleLowerCase('fr').indexOf(q) < 0) return false;
      return true;
    });
  }

  /* ---------- Rendu ---------- */
  function pill(label, active, onClick, extra) {
    var b = el('button', 'pva-pill' + (active ? ' is-active' : '') + (extra ? ' ' + extra : ''), label);
    b.type = 'button'; b.setAttribute('aria-pressed', active ? 'true' : 'false');
    b.addEventListener('click', onClick);
    return b;
  }
  function delta(cur, prev) {
    if (!prev) return null;
    var v = (cur / prev - 1) * 100;
    return { up: v >= 0, txt: (v >= 0 ? '▲ +' : '▼ ') + pct1.format(v) + ' %' };
  }
  function barList(items, fmt) {
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    var box = el('div', 'pva-bars');
    items.forEach(function (i) {
      var row = el('div', 'pva-bar');
      var name = el('span', 'pva-bar-name', i.name); name.title = i.name;
      var track = el('div', 'pva-bar-track'), fill = el('div', 'pva-bar-fill');
      fill.style.width = Math.max(1, i.value / max * 100) + '%';
      track.appendChild(fill);
      row.appendChild(name); row.appendChild(track); row.appendChild(el('strong', 'pva-bar-value', fmt(i)));
      box.appendChild(row);
    });
    return box;
  }

  function render() {
    var root = document.getElementById('pva-root');
    if (!root) return;
    root.textContent = '';

    var head = el('div', 'pva-head');
    head.appendChild(el('h1', 'pva-title', 'Ventes par article'));
    root.appendChild(head);

    if (loading && !data) { root.appendChild(el('p', 'pva-muted', 'Chargement des ventes…')); return; }
    if (error) {
      var err = el('div', 'pva-card pva-empty');
      err.appendChild(el('strong', '', 'Ventes par article indisponibles'));
      err.appendChild(el('p', 'pva-muted', error));
      var retry = el('button', 'pva-pill', 'Réessayer'); retry.type = 'button';
      retry.addEventListener('click', function () { data = null; load(); });
      err.appendChild(retry);
      root.appendChild(err); return;
    }
    if (!data) return;
    var annees = years();
    if (!annees.length) {
      var vide = el('div', 'pva-card pva-empty');
      vide.appendChild(el('strong', '', 'Aucune vente par article pour l\'instant'));
      vide.appendChild(el('p', 'pva-muted', 'L\'onglet Ventes_Articles est vide : lancez « importerHistoriqueArticles » une fois dans Apps Script.'));
      root.appendChild(vide); return;
    }

    var Y = state.annee, prevY = Y - 1;
    var tous = articles(Y), liste = filtre(tous);
    var prevMap = {};
    var comparable = complete(Y) && annees.indexOf(prevY) >= 0 && complete(prevY);
    if (annees.indexOf(prevY) >= 0) filtre(articles(prevY)).forEach(function (a) { prevMap[a.id] = a; });

    /* Années */
    var yrs = el('div', 'pva-pills');
    yrs.setAttribute('role', 'group'); yrs.setAttribute('aria-label', 'Année');
    annees.forEach(function (y) { yrs.appendChild(pill(String(y), y === Y, function () { state.annee = y; state.tout = false; render(); })); });
    head.appendChild(yrs);

    /* Filtres */
    var bar = el('div', 'pva-filters');
    var cats = el('div', 'pva-pills');
    ['Tout', 'Boissons', 'Nourriture', 'Hôtel'].forEach(function (c) {
      cats.appendChild(pill(c, state.categorie === c, function () { state.categorie = c; state.tout = false; render(); }));
    });
    bar.appendChild(cats);
    var lab = el('label', 'pva-search');
    lab.appendChild(el('span', 'pva-sr', 'Rechercher un article'));
    var input = el('input'); input.type = 'search'; input.placeholder = 'Rechercher un article…'; input.value = state.q;
    input.addEventListener('input', function () { state.q = input.value; state.tout = false; render(); var i = document.querySelector('#pva-root .pva-search input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } });
    lab.appendChild(input); bar.appendChild(lab);
    root.appendChild(bar);

    /* Héros */
    var ca = liste.reduce(function (s, a) { return s + a.ca; }, 0);
    var qte = liste.reduce(function (s, a) { return s + a.qte; }, 0);
    var vendus = liste.filter(function (a) { return a.qte > 0 || a.ca > 0; }).length;
    var caPrev = Object.keys(prevMap).reduce(function (s, k) { return s + prevMap[k].ca; }, 0);
    var fin = jusquAu(Y);

    var grid = el('div', 'pva-grid');
    var hero = el('div', 'pva-hero');
    hero.appendChild(el('span', 'pva-hero-label', 'CA TTC des articles · ' + Y + (state.categorie !== 'Tout' ? ' · ' + state.categorie : '')));
    hero.appendChild(el('span', 'pva-hero-value', eur0.format(ca)));
    hero.appendChild(el('span', 'pva-hero-sub', int.format(qte) + ' unités · ' + int.format(vendus) + ' articles vendus'));
    var d = comparable ? delta(ca, caPrev) : null;
    var cmp = el('span', 'pva-hero-cmp' + (d ? (d.up ? ' is-up' : ' is-down') : ''),
      d ? d.txt + ' vs ' + prevY : (complete(Y) ? 'Pas d\'année ' + prevY + ' complète pour comparer' : 'Arrêté au ' + dateFr(fin) + ' · comparaison N-1 à jours égaux impossible avec des totaux annuels'));
    hero.appendChild(cmp);
    grid.appendChild(hero);

    /* Top 10 */
    var top = liste.slice().sort(function (a, b) { return b.ca - a.ca; }).slice(0, 10);
    var cTop = el('section', 'pva-card pva-span2');
    cTop.appendChild(el('h2', 'pva-card-title', 'Top 10 du chiffre d\'affaires'));
    if (top.length) cTop.appendChild(barList(top.map(function (a) { return { name: a.article, value: a.ca }; }), function (i) { return eur0.format(i.value); }));
    else cTop.appendChild(el('p', 'pva-muted', 'Aucun article pour ce filtre.'));
    grid.appendChild(cTop);

    /* Familles */
    var fam = {};
    liste.forEach(function (a) { var k = a.famille || '—'; fam[k] = (fam[k] || 0) + a.ca; });
    var famItems = Object.keys(fam).map(function (k) { return { name: k, value: fam[k] }; }).filter(function (i) { return i.value > 0; }).sort(function (a, b) { return b.value - a.value; });
    var cFam = el('section', 'pva-card pva-span2');
    cFam.appendChild(el('h2', 'pva-card-title', 'CA par famille'));
    if (famItems.length) cFam.appendChild(barList(famItems, function (i) { return ca ? pct1.format(i.value / ca * 100) + ' %' : '—'; }));
    else cFam.appendChild(el('p', 'pva-muted', '—'));
    grid.appendChild(cFam);

    /* À la carte mais pas vendus (catalogue actif, année la plus récente seulement) */
    var avecDormants = Y === annees[annees.length - 1] && data.catalogue.length > 0;
    if (!avecDormants) cFam.className = 'pva-card pva-span4';
    if (avecDormants) {
      var vendusIds = {};
      tous.forEach(function (a) { if (a.qte > 0) vendusIds[a.id] = 1; });
      var dormants = data.catalogue.filter(function (c) {
        if (String(c.actif) !== 'oui' || vendusIds[String(c.id_article)] || !(num(c.prix_ttc) > 0)) return false;
        var code = parseInt(String(c.famille), 10);
        var cat = code === 57 ? 'Hôtel' : code < 30 ? 'Boissons' : 'Nourriture';
        if (state.categorie !== 'Tout' && cat !== state.categorie) return false;
        var q = state.q.trim().toLocaleLowerCase('fr');
        return !q || (String(c.article) + ' ' + String(c.famille)).toLocaleLowerCase('fr').indexOf(q) >= 0;
      });
      var cDor = el('section', 'pva-card pva-span2');
      var h = el('h2', 'pva-card-title', 'Au catalogue, sans aucune vente en ' + Y);
      cDor.appendChild(h);
      if (!dormants.length) cDor.appendChild(el('p', 'pva-muted', 'Aucun : tous les articles actifs avec un prix ont été vendus.'));
      else {
        cDor.appendChild(el('p', 'pva-muted', dormants.length + ' article(s) actif(s) avec un prix de vente, jamais encaissé(s) cette année. À vérifier avant le prochain changement de carte.'));
        var chips = el('div', 'pva-chips');
        dormants.sort(function (a, b) { return String(a.famille).localeCompare(String(b.famille)) || String(a.article).localeCompare(String(b.article)); })
          .slice(0, 60).forEach(function (c) { chips.appendChild(el('span', 'pva-chip', c.article + ' · ' + eur2.format(num(c.prix_ttc)))); });
        if (dormants.length > 60) chips.appendChild(el('span', 'pva-chip is-more', '+ ' + (dormants.length - 60)));
        cDor.appendChild(chips);
      }
      grid.appendChild(cDor);
    }
    root.appendChild(grid);

    /* Tableau */
    var card = el('section', 'pva-card pva-table-card');
    card.appendChild(el('h2', 'pva-card-title', 'Tous les articles · ' + int.format(liste.length)));
    var cols = [
      { k: 'article', label: 'Article', txt: function (a) { return a.article; } },
      { k: 'famille', label: 'Famille', txt: function (a) { return a.famille; } },
      { k: 'qte', label: 'Quantité', num: 1, txt: function (a) { return int.format(a.qte); } },
      { k: 'ca', label: 'CA TTC', num: 1, txt: function (a) { return eur0.format(a.ca); } },
      { k: 'part', label: 'Part', num: 1, val: function (a) { return ca ? a.ca / ca : 0; }, txt: function (a) { return ca ? pct1.format(a.ca / ca * 100) + ' %' : '—'; } },
      { k: 'pm', label: 'Prix moyen', num: 1, val: function (a) { return a.qte ? a.ca / a.qte : 0; }, txt: function (a) { return a.qte && a.ca ? eur2.format(a.ca / a.qte) : '—'; } },
      { k: 'prix', label: 'Prix carte', num: 1, val: function (a) { return a.prix || 0; }, txt: function (a) { return a.prix != null ? eur2.format(a.prix) : '—'; } },
      { k: 'n1', label: 'Qté vs ' + prevY, num: 1, val: function (a) { var p = prevMap[a.id]; return comparable && p && p.qte ? a.qte / p.qte - 1 : -Infinity; },
        txt: function (a) { var p = prevMap[a.id]; if (!comparable || !p || !p.qte) return '—'; var x = delta(a.qte, p.qte); return x.txt; },
        cls: function (a) { var p = prevMap[a.id]; if (!comparable || !p || !p.qte) return ''; return a.qte >= p.qte ? 'is-up' : 'is-down'; } }
    ];
    var col = cols.filter(function (c) { return c.k === state.tri; })[0] || cols[3];
    var key = col.val || function (a) { return a[col.k]; };
    var rows = liste.slice().sort(function (a, b) {
      var x = key(a), y = key(b);
      if (typeof x === 'string') return state.sens * x.localeCompare(y, 'fr');
      return state.sens * (x - y);
    });
    var wrap = el('div', 'pva-table-wrap');
    var table = el('table', 'pva-table');
    var thead = el('thead'), tr = el('tr');
    cols.forEach(function (c) {
      var th = el('th', c.num ? 'is-num' : '');
      var b = el('button', 'pva-sort', c.label + (state.tri === c.k ? (state.sens < 0 ? ' ▼' : ' ▲') : ''));
      b.type = 'button';
      th.setAttribute('aria-sort', state.tri === c.k ? (state.sens < 0 ? 'descending' : 'ascending') : 'none');
      b.addEventListener('click', function () {
        if (state.tri === c.k) state.sens = -state.sens; else { state.tri = c.k; state.sens = c.num ? -1 : 1; }
        render();
      });
      th.appendChild(b); tr.appendChild(th);
    });
    thead.appendChild(tr); table.appendChild(thead);
    var tbody = el('tbody');
    var shown = state.tout ? rows : rows.slice(0, 50);
    shown.forEach(function (a) {
      var r = el('tr');
      cols.forEach(function (c) { var td = el('td', (c.num ? 'is-num ' : '') + (c.cls ? c.cls(a) : ''), c.txt(a)); r.appendChild(td); });
      tbody.appendChild(r);
    });
    table.appendChild(tbody); wrap.appendChild(table); card.appendChild(wrap);
    if (rows.length > 50) {
      var more = el('button', 'pva-pill pva-more', state.tout ? 'Afficher les 50 premiers' : 'Afficher les ' + rows.length + ' articles');
      more.type = 'button';
      more.addEventListener('click', function () { state.tout = !state.tout; render(); });
      card.appendChild(more);
    }
    var src = el('p', 'pva-source', 'Source : caisse KSD, totaux annuels exportés' + (fin ? ' (jusqu\'au ' + dateFr(fin) + ')' : '') +
      ' puis Z détaillés de chaque nuit. Montants TTC tels qu\'encaissés.');
    card.appendChild(src);
    root.appendChild(card);
  }

  /* ---------- Montage ---------- */
  function mount() {
    var sec = document.getElementById(SECTION_ID);
    if (!sec) return false;
    if (!document.getElementById('pva-root')) { var r = el('div', 'pva'); r.id = 'pva-root'; sec.appendChild(r); }
    var check = function () { if (sec.classList.contains('open')) { if (!data) load(); else render(); } };
    new MutationObserver(check).observe(sec, { attributes: true, attributeFilter: ['class'] });
    check();
    return true;
  }
  function start() { if (!mount()) setTimeout(start, 300); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
