/* Prism — accueil du tableau de bord (DA Sable & Or).
   Lecture seule : réutilise les mêmes sources que le tableau de bord unifié
   (/.netlify/functions/sales et materials-monthly), sans rien écrire ni recalculer
   côté serveur. Affiche : « Bonjour <prénom> », une phrase de synthèse, la carte
   héros (CA HT du mois, écart N-1, courbe dorée), le CA par mois cliquable et
   l'encart « À surveiller ». Chargé par prism-refonte.js. */
(function () {
  'use strict';
  if (window.__prismAccueil) return;
  window.__prismAccueil = true;

  var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var eur = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  var pctFmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  function money(v) { return Number.isFinite(v) ? eur.format(v) + ' €' : '—'; }
  function pct(v) { return pctFmt.format(Math.abs(v)) + ' %'; }
  function amount(x) { return Number(String(x == null ? '' : x).replace(/[\s  €]/g, '').replace(',', '.')); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function el(tag, cls, txt, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (parent) parent.appendChild(e); return e; }
  function svgEl(tag, attrs, parent) { var e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  var STORAGE_KEY = 'prism-analysis-period-mode-v1';
  function savedBasis() { try { var v = localStorage.getItem(STORAGE_KEY); return ['fiscal', 'civil', 'custom'].indexOf(v) >= 0 ? v : 'fiscal'; } catch (_) { return 'fiscal'; } }
  var state = { loading: false, loaded: false, error: '', months: {}, lastDay: '', mat: [], sel: '', mode: 'ytd', basis: savedBasis(), customStart: '2026-01', customEnd: '2026-12' };
  function fy(m) { return Number(m.slice(0,4)) + (Number(m.slice(5,7)) >= 10 ? 1 : 0); }
  function shifted(m, n) { return (Number(m.slice(0,4)) + n) + m.slice(4); }
  function rangeMonths(first,last) { var out=[],m=first;for(var i=0;i<36&&m<=last;i++){out.push(m);var y=Number(m.slice(0,4)),mo=Number(m.slice(5,7))+1;if(mo===13){mo=1;y++;}m=y+'-'+String(mo).padStart(2,'0');}return out; }
  function chosenYear() { return state.basis==='fiscal' ? fy(state.sel) : Number(state.sel.slice(0,4)); }
  function analysisMonths() {
    if(state.basis==='custom')return rangeMonths(state.customStart,state.customEnd);
    var year=chosenYear(),start=state.basis==='fiscal' ? (year-1)+'-10' : year+'-01',end=state.basis==='fiscal'?year+'-09':year+'-12';
    return rangeMonths(start,end);
  }
  function monthsToDate() { return analysisMonths().filter(function(m){return m <= state.sel && m <= state.lastDay.slice(0,7);}); }
  function periodLabel() { return state.basis==='fiscal'?'Exercice '+chosenYear():state.basis==='civil'?'Année civile '+chosenYear():'Période personnalisée'; }
  function setBasis(v, external) {
    if(['fiscal','civil','custom'].indexOf(v)<0||v===state.basis)return;
    state.basis=v;state.mode='ytd';
    if(!external){try{localStorage.setItem(STORAGE_KEY,v);}catch(_){}window.dispatchEvent(new CustomEvent('prism-analysis-period-change',{detail:{basis:v}}));}
    render();
  }


  function firstName() {
    var shown = document.getElementById('authUserEmail');
    var n = shown && shown.textContent.trim();
    if (n) return n.split(/\s+/)[0];
    var u = window.netlifyIdentity && window.netlifyIdentity.currentUser && window.netlifyIdentity.currentUser();
    var meta = u && u.user_metadata || {};
    n = String(meta.full_name || meta.name || meta.first_name || '').trim();
    return n ? n.split(/\s+/)[0] : '';
  }
  function greeting() {
    var h = new Date().getHours();
    var name = firstName();
    return (h >= 18 || h < 4 ? 'Bonsoir' : 'Bonjour') + (name ? ' ' + name : '');
  }
  function todayLabel() { return cap(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })); }

  async function load() {
    if (state.loading || state.loaded) return;
    var u = window.netlifyIdentity && window.netlifyIdentity.currentUser && window.netlifyIdentity.currentUser();
    if (!u) return;
    state.loading = true; render();
    try {
      var token = await u.jwt();
      var get = function (url) { return fetch(url, { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' }).then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw Error(j.error || 'Lecture impossible'); return j; }); }); };
      var res = await Promise.all([get('/.netlify/functions/sales'), get('/.netlify/functions/materials-monthly').catch(function () { return { months: [] }; })]);
      var months = {}, last = '';
      (res[0].rows || []).forEach(function (r) {
        var d = String(r.date || '').slice(0, 10);
        if (!/^\d{4}-\d\d-\d\d$/.test(d)) return;
        if (!String(r.etablissement || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes('ocean')) return;
        var ht = amount(r.ca_ht); if (!Number.isFinite(ht)) return;
        var m = d.slice(0, 7);
        (months[m] = months[m] || { ht: 0, ttc: 0, days: {} }).ht += ht;
        var ttc = amount(r.ca_ttc); if (Number.isFinite(ttc)) months[m].ttc += ttc;
        months[m].days[d] = (months[m].days[d] || 0) + ht;
        if (d > last) last = d;
      });
      state.months = months; state.lastDay = last; state.mat = res[1].months || [];
      state.sel = last.slice(0, 7); state.loaded = true;
    } catch (e) { state.error = e.message || 'Données indisponibles'; }
    state.loading = false; render();
  }

  /* CA d'un mois ; pour le mois en cours, comparaison à jours égaux avec N-1. */
  function monthTotal(m, uptoDay) {
    var x = state.months[m]; if (!x) return null;
    if (!uptoDay) return x.ht;
    var t = 0; for (var d in x.days) if (+d.slice(8, 10) <= uptoDay) t += x.days[d];
    return t;
  }
  function prevYear(m) { return (+m.slice(0, 4) - 1) + m.slice(4); }
  function figures() {
    var sel=state.sel,partial=0;
    if(sel===state.lastDay.slice(0,7)){var dd0=+state.lastDay.slice(8,10),dim=new Date(+sel.slice(0,4),+sel.slice(5,7),0).getDate();partial=dd0<dim?dd0:0;}
    var y=sel.slice(0,4),mi=+sel.slice(5,7);
    if(state.mode==='ytd'){
      var selected=monthsToDate(),cur=0,prev=0;
      selected.forEach(function(m){var p=m===sel?partial:0;cur+=monthTotal(m,p)||0;prev+=monthTotal(prevYear(m),p)||0;});
      var first=selected[0]||analysisMonths()[0],last=selected[selected.length-1]||sel;
      var firstLabel=MONTHS[+first.slice(5,7)-1],lastLabel=MONTHS[+last.slice(5,7)-1];
      return {cur:cur,prev:prev,label:periodLabel()+' · '+firstLabel+' '+first.slice(0,4)+' → '+lastLabel+' '+last.slice(0,4),prevLabel:'N−1, même période',partial:partial};
    }
    return {cur:monthTotal(sel,partial),prev:monthTotal(prevYear(sel),partial),label:MONTHS[mi-1]+' '+y,prevLabel:MONTHS[mi-1]+' '+(y-1)+(partial?' (au '+partial+')':''),partial:partial};
  }
  function matFor(m) { for (var i = 0; i < state.mat.length; i++) if (state.mat[i].month === m) return state.mat[i]; return null; }

  function render() {
    var shell = document.querySelector('#module-dashboard .module-shell');
    if (!shell) return;
    var host = document.getElementById('prismAccueil');
    if (!host) { host = el('section', 'pa-root no-print'); host.id = 'prismAccueil'; var mount = document.getElementById('prismDashboardMount'); shell.insertBefore(host, mount || shell.firstChild); }
    host.replaceChildren();

    var head = el('header', 'pa-head', null, host);
    var hl = el('div', 'pa-head-text', null, head);
    el('p', 'pa-date', todayLabel() + ' · L’Océan', hl);
    el('h1', 'pa-hello', greeting(), hl);
    var sum = el('p', 'pa-summary', null, hl);

    if (!state.loaded || !state.sel) {
      sum.textContent = state.error ? 'Les chiffres ne sont pas disponibles pour le moment.' : state.loaded ? 'Pas encore de chiffre de caisse importé.' : 'Récupération des derniers chiffres…';
      return;
    }
    var f = figures(), d = f.prev ? (f.cur / f.prev - 1) * 100 : null;
    sum.textContent = cap(f.label) + (f.partial ? ' (au ' + f.partial + ')' : '') + ' : ' + money(f.cur) + ' HT' +
      (d == null ? '.' : ', ' + (d >= 0 ? '+' : '−') + pct(d) + ' sur ' + f.prevLabel.replace(/ \(au \d+\)/, '') + '.');

    try { window.dispatchEvent(new CustomEvent('prism-periode', { detail: { month: state.sel, mode: state.mode, basis: state.basis, start: analysisMonths()[0], end: analysisMonths().slice(-1)[0] } })); } catch (_) {}
    var ctrl = el('div', 'pa-controls', null, head);
    /* Navigation dans le temps : mois précédent / suivant et années disponibles */
    var nav = el('div', 'pa-nav', null, ctrl);
    var avail = Object.keys(state.months).filter(function (m) { return m <= state.lastDay.slice(0, 7); }).sort();
    var at = avail.indexOf(state.sel);
    var prevB = el('button', 'pa-nav-btn', '‹', nav); prevB.type = 'button'; prevB.setAttribute('aria-label', 'Mois précédent'); prevB.disabled = at <= 0;
    prevB.onclick = function () { if (at > 0) { state.sel = avail[at - 1]; render(); } };
    el('span', 'pa-nav-label', cap(MONTHS[+state.sel.slice(5, 7) - 1]) + ' ' + state.sel.slice(0, 4), nav);
    var nextB = el('button', 'pa-nav-btn', '›', nav); nextB.type = 'button'; nextB.setAttribute('aria-label', 'Mois suivant'); nextB.disabled = at < 0 || at >= avail.length - 1;
    nextB.onclick = function () { if (at < avail.length - 1) { state.sel = avail[at + 1]; render(); } };
    var choices=el('div','pa-seg',null,ctrl);choices.setAttribute('role','group');choices.setAttribute('aria-label','Type de période');
    [['fiscal','Exercice fiscal'],['civil','Année civile'],['custom','Personnalisée']].forEach(function(pair){
      var b=el('button',state.basis===pair[0]?'is-on':'',pair[1],choices);b.type='button';b.setAttribute('aria-pressed',state.basis===pair[0]);b.onclick=function(){setBasis(pair[0],false);};
    });
    if(state.basis==='custom'){
      var rangeBox=el('div','pa-nav',null,ctrl);
      [['Début',true],['Fin',false]].forEach(function(pair){
        var lab=el('label','pa-nav-label',pair[0]+' ',rangeBox);
        var input=el('input',null,null,lab);input.type='month';input.style.cssText='width:137px;max-width:100%;padding:7px;border:1px solid #ddd;border-radius:8px';
        input.value=pair[1]?state.customStart:state.customEnd;input.onchange=function(){
          var v=input.value;if(!/^\\d{4}-\\d{2}$/.test(v))return;
          var first=pair[1]?v:state.customStart,last=pair[1]?state.customEnd:v;
          var count=(Number(last.slice(0,4))-Number(first.slice(0,4)))*12+Number(last.slice(5,7))-Number(first.slice(5,7))+1;
          if(first>last||count>12){input.setCustomValidity('Choisis entre 1 et 12 mois, dans l’ordre.');input.reportValidity();return;}
          input.setCustomValidity('');state.customStart=first;state.customEnd=last;state.sel=last>state.lastDay.slice(0,7)?state.lastDay.slice(0,7):last;state.mode='ytd';render();
        };
      });
    }else{
      var years=el('div','pa-years',null,ctrl);years.setAttribute('role','group');years.setAttribute('aria-label',state.basis==='fiscal'?'Exercice fiscal':'Année civile');
      var ys=[];avail.forEach(function(m){var yy=state.basis==='fiscal'?fy(m):+m.slice(0,4);if(ys.indexOf(yy)<0)ys.push(yy);});
      ys.slice(-5).forEach(function(yy){var b=el('button',chosenYear()===yy?'is-on':'',String(yy),years);b.type='button';
        b.onclick=function(){var arr=avail.filter(function(m){return (state.basis==='fiscal'?fy(m):+m.slice(0,4))===yy;});if(arr.length){state.sel=arr[arr.length-1];render();}};
      });
    }
    var seg=el('div','pa-seg',null,ctrl);seg.setAttribute('role','group');seg.setAttribute('aria-label','Période');
    [['month','Mois'],['ytd',state.basis==='fiscal'?'Cumul exercice':state.basis==='civil'?'Cumul civil':'Cumul période']].forEach(function(o){
      var b=el('button',state.mode===o[0]?'is-on':'',o[1],seg);b.type='button';b.setAttribute('aria-pressed',state.mode===o[0]);
      b.onclick=function(){state.mode=o[0];render();};
    });
    var grid = el('div', 'pa-grid', null, host);
    /* Carte héros */
    var hero = el('div', 'pa-hero', null, grid);
    var ht = el('div', 'pa-hero-text', null, hero);
    el('p', 'pa-hero-label', 'Chiffre d’affaires HT · ' + f.label, ht);
    el('p', 'pa-hero-value', money(f.cur), ht);
    var meta = el('p', 'pa-hero-meta', null, ht);
    if (d != null) { var chip = el('span', 'pa-chip ' + (d >= 0 ? 'is-up' : 'is-down'), (d >= 0 ? '▲ +' : '▼ −') + pct(d), meta); }
    el('span', 'pa-hero-prev', 'vs ' + money(f.prev) + ' en ' + f.prevLabel, meta);
    if (state.mode === 'month') ht.appendChild(goalBlock(state.sel));
    hero.appendChild(sparkline());

    /* Graphique mensuel + À surveiller */
    var row = el('div', 'pa-row', null, host);
    row.appendChild(monthChart());
    row.appendChild(watchList());
  }

  /* Objectif mensuel (CA TTC) : le même que sur la page Ventes, enregistré sur cet appareil. */
  var GOAL_KEY = 'locean-ca-target-month';
  function goals() { try { return JSON.parse(localStorage.getItem(GOAL_KEY) || '{}'); } catch (_) { return {}; } }
  function goalBlock(month) {
    var box = el('div', 'pa-goal');
    var target = Number(goals()[month]) || 0, done = state.months[month] ? state.months[month].ttc : 0;
    var head = el('div', 'pa-goal-head', null, box);
    el('span', 'pa-goal-label', 'Objectif ' + MONTHS[+month.slice(5, 7) - 1] + ' (TTC)', head);
    if (target) {
      var p = done / target * 100;
      el('strong', 'pa-goal-pct', pctFmt.format(p) + ' %', head);
      var track = el('div', 'pa-goal-track', null, box); track.setAttribute('aria-hidden', 'true');
      el('span', 'pa-goal-fill', null, track).style.width = Math.max(0, Math.min(100, p)) + '%';
      el('p', 'pa-goal-meta', money(done) + ' sur ' + money(target) + ' · ' + (done >= target ? 'objectif atteint' : money(target - done) + ' restants'), box);
    }
    var edit = el('button', 'pa-goal-edit', target ? 'Modifier l’objectif' : 'Définir un objectif', box); edit.type = 'button';
    var form = el('div', 'pa-goal-form', null, box); form.hidden = true;
    var lab = el('label', 'pa-goal-sr', 'Objectif TTC en euros', form);
    var input = el('input', null, null, form); input.type = 'number'; input.min = '0'; input.step = '100'; input.inputMode = 'numeric';
    input.placeholder = 'Objectif TTC (€)'; input.value = target || ''; input.id = 'pa-goal-input'; lab.htmlFor = 'pa-goal-input';
    var ok = el('button', 'pa-goal-save', 'Valider', form); ok.type = 'button';
    edit.onclick = function () { form.hidden = !form.hidden; if (!form.hidden) input.focus(); };
    function save() {
      var n = Number(input.value); if (!Number.isFinite(n) || n < 0) return;
      var g = goals(); if (n > 0) g[month] = n; else delete g[month];
      try { localStorage.setItem(GOAL_KEY, JSON.stringify(g)); } catch (_) {}
      render();
    }
    ok.onclick = save; input.onkeydown = function (e) { if (e.key === 'Enter') save(); };
    return box;
  }

  function yearMonths(y) { var a = []; for (var i = 1; i <= 12; i++) a.push(y + '-' + String(i).padStart(2, '0')); return a; }
  function sparkline() {
    var y = state.sel.slice(0, 4), ms = yearMonths(y).filter(function (m) { return state.months[m] && m <= state.lastDay.slice(0, 7); });
    var W = 260, H = 76, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, class: 'pa-spark', role: 'img', 'aria-label': 'Évolution du CA HT ' + y + ' : fais glisser le point pour changer de mois' });
    if (ms.length < 2) return svg;
    var vals = ms.map(function (m) { return state.months[m].ht; }), mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), sp = (mx - mn) || 1;
    var pts = vals.map(function (v, i) { return [Math.round(14 + i * (W - 28) / (vals.length - 1)), Math.round(H - 14 - (v - mn) / sp * (H - 28))]; });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
    svgEl('path', { d: line + ' L' + pts[pts.length - 1][0] + ' ' + H + ' L' + pts[0][0] + ' ' + H + ' Z', class: 'pa-spark-area' }, svg);
    svgEl('path', { d: line, class: 'pa-spark-line' }, svg);
    var si = ms.indexOf(state.sel);
    if (si >= 0) {
      svgEl('line', { x1: pts[si][0], x2: pts[si][0], y1: 0, y2: H, class: 'pa-spark-cursor' }, svg);
      svgEl('circle', { cx: pts[si][0], cy: pts[si][1], r: 12, class: 'pa-spark-halo' }, svg);
      svgEl('circle', { cx: pts[si][0], cy: pts[si][1], r: 6, class: 'pa-spark-dot' }, svg);
    }
    /* Glisser le point (souris ou doigt) : le mois et toute la page suivent. */
    svg.addEventListener('pointerdown', function (e) { drag = { ms: ms, xs: pts.map(function (p) { return p[0]; }), W: W }; e.preventDefault(); scrub(e); });
    return svg;
  }
  var drag = null;
  function scrub(e) {
    if (!drag) return;
    var svg = document.querySelector('#prismAccueil .pa-spark'); if (!svg) return;
    var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * drag.W, best = 0;
    for (var i = 1; i < drag.xs.length; i++) if (Math.abs(drag.xs[i] - x) < Math.abs(drag.xs[best] - x)) best = i;
    if (drag.ms[best] !== state.sel) { state.sel = drag.ms[best]; render(); }
  }
  window.addEventListener('pointermove', function (e) { if (drag) { e.preventDefault(); scrub(e); } }, { passive: false });
  window.addEventListener('pointerup', function () { drag = null; });
  window.addEventListener('pointercancel', function () { drag = null; });
  function monthChart() {
    var y = state.sel.slice(0, 4), card = el('div', 'pa-card pa-chart');
    var h = el('div', 'pa-card-head', null, card);
    var t = el('div', null, null, h); el('h2', 'pa-card-title', 'CA HT par mois', t); el('p', 'pa-card-hint', 'Clique sur un mois pour mettre la page à jour', t);
    var lg = el('p', 'pa-legend', null, h); el('span', 'pa-dot is-cur', null, lg); lg.appendChild(document.createTextNode(y + '  ')); el('span', 'pa-dot is-prev', null, lg); lg.appendChild(document.createTextNode(String(y - 1)));
    var ms = yearMonths(y), all = ms.concat(ms.map(prevYear)).map(function (m) { return state.months[m] ? state.months[m].ht : 0; });
    var max = Math.max.apply(null, all.concat([1])) * 1.08;
    var plot = el('div', 'pa-bars', null, card), labels = el('div', 'pa-bars-labels', null, card);
    ms.forEach(function (m, i) {
      var cur = state.months[m] ? state.months[m].ht : 0, prev = state.months[prevYear(m)] ? state.months[prevYear(m)].ht : 0, has = !!state.months[m];
      var inRange = state.mode === 'ytd' ? m <= state.sel : m === state.sel;
      var b = el('button', 'pa-bar' + (m === state.sel ? ' is-sel' : ''), null, plot); b.type = 'button'; b.disabled = !has;
      var dd = prev ? (cur / prev - 1) * 100 : null;
      var lab = cap(MONTHS[i]) + ' ' + y + ' : ' + (has ? money(cur) : 'pas encore de données') + ' · ' + (y - 1) + ' : ' + money(prev) + (has && dd != null ? ' · ' + (dd >= 0 ? '+' : '−') + pct(dd) : '');
      b.title = lab; b.setAttribute('aria-label', lab);
      el('span', 'pa-bar-prev', null, b).style.height = (prev / max * 100) + '%';
      var c = el('span', 'pa-bar-cur' + (inRange ? ' is-range' : ''), null, b); c.style.height = (cur / max * 100) + '%';
      b.onclick = function () { if (has) { state.sel = m; render(); } };
      el('span', m === state.sel ? 'is-sel' : '', SHORT[i], labels);
    });
    return card;
  }
  function watchList() {
    var card = el('div', 'pa-card pa-watch'); el('h2', 'pa-card-title', 'À surveiller', card);
    var y = state.sel.slice(0, 4), items = [];
    var pend = state.mat.filter(function (x) { return x.month.slice(0, 4) === y && !x.validated; }).map(function (x) { return MONTHS[+x.month.slice(5, 7) - 1]; });
    if (pend.length) items.push(['warn', 'Factures incomplètes', 'Ratio matière provisoire en ' + pend.join(', ') + ' : il bougera quand toutes les factures seront dans Pennylane.']);
    var low = state.mat.filter(function (x) { return x.month.slice(0, 4) === y && x.validated && x.ratioDrinks < 6; }).map(function (x) { return MONTHS[+x.month.slice(5, 7) - 1]; });
    if (low.length) items.push(['gold', 'Achats boissons anormalement bas', 'Moins de 6 % du CA en ' + low.join(', ') + ' : des factures boissons manquent probablement.']);
    var best = null; yearMonths(y).forEach(function (m) { if (state.months[m] && (!best || state.months[m].ht > state.months[best].ht)) best = m; });
    if (best) { var pb = state.months[prevYear(best)], dv = pb ? (state.months[best].ht / pb.ht - 1) * 100 : null;
      items.push(['up', 'Meilleur mois de l’année', cap(MONTHS[+best.slice(5, 7) - 1]) + ' ' + y + ' : ' + money(state.months[best].ht) + ' HT' + (dv != null ? ', ' + (dv >= 0 ? '+' : '−') + pct(dv) + ' sur ' + (y - 1) : '') + '.']); }
    items.push(['ink', 'Coût du personnel', 'Ajoute le journal de paie pour suivre le ratio personnel chaque mois.']);
    items.forEach(function (it) { var r = el('div', 'pa-watch-item is-' + it[0], null, card); el('span', 'pa-watch-dot', null, r); var tx = el('div', null, null, r); el('p', 'pa-watch-title', it[1], tx); el('p', 'pa-watch-text', it[2], tx); });
    return card;
  }

  function boot() {
    render();
    if (window.netlifyIdentity && window.netlifyIdentity.on) { window.netlifyIdentity.on('init', function () { load(); render(); }); window.netlifyIdentity.on('login', function () { load(); }); }
    load();
    var tries = 0, t = setInterval(function () { tries++; if (state.loaded || tries > 20) clearInterval(t); load(); render(); }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
