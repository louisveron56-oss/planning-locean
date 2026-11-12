/* Prism — Fiches techniques des livrets 2025-2027 (une page par plat).
   Données : /.netlify/functions/technical-library (fiches des livrets + compléments saisis dans Prism)
   et /.netlify/functions/sales-details (Ventes_Articles de la caisse KSD) pour le prix et les ventes.
   - Une fiche reprend la version la plus récente du livret ; les anciennes saisons sont en historique.
   - Rien n'est inventé : une rubrique vide s'affiche « à compléter », un chiffre absent « — ».
   - Le lien avec l'article de caisse est proposé par le nom, puis confirmé à la main.
   - Les allergènes ne comptent comme complets qu'une fois validés par le chef. */
(function () {
'use strict';
if (window.__prismFichesLivrets) return; window.__prismFichesLivrets = true;

const PAGE = 'recipe-archive';
const RUB = ['Rendement', 'Portion servie', 'Ingrédients', 'Quantités', 'Préparation', 'Cuisson', 'Dressage', 'Conservation', 'Allergènes', 'Coût portion', 'Prix de vente', 'Photo'];
/* Cartes de saison : la carte change en mai (été) et en novembre (hiver). */
const SAISONS = (() => { const out = []; for (let y = 2024; y <= 2027; y++) { out.push({ id: 'Été ' + y, debut: y + '-05-01', fin: y + '-10-31' }); out.push({ id: 'Hiver ' + y + '-' + (y + 1), debut: y + '-11-01', fin: (y + 1) + '-04-30' }); } return out; })();
const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
const ACTUELLE = (SAISONS.find(x => x.debut <= today && today <= x.fin) || SAISONS[SAISONS.length - 1]).id;
const CATS = ['Toutes', 'Entrées et planches', 'À partager', 'Côté mer', 'La popote', 'Sur le pouce', 'Desserts', 'Sauces et préparations'];
const S = { fiches: [], compl: {}, ventes: null, annee: null, venteErr: '', loaded: false, loading: false, err: '',
  costs: {}, q: '', cat: 'Toutes', saison: ACTUELLE, tri: 'ca', open: null, edit: false, busy: false, msg: '' };
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const eur0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const int = new Intl.NumberFormat('fr-FR');
const norm = x => String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const num = v => { const n = Number(String(v ?? '').replace(/[\s €]/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const has = v => v !== '' && v != null && Number.isFinite(Number(String(v).replace(',', '.')));
const dateFr = iso => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
function el(parent, tag, cls, txt) { const x = document.createElement(tag); if (cls) x.className = cls; if (txt !== undefined) x.textContent = String(txt); if (parent) parent.appendChild(x); return x; }
function btn(parent, cls, txt, fn) { const b = el(parent, 'button', cls, txt); b.type = 'button'; if (fn) b.onclick = fn; return b; }

/* ---------- Données ---------- */
async function token() { const u = window.netlifyIdentity && window.netlifyIdentity.currentUser(); if (!u) throw new Error('Connexion nécessaire'); return u.jwt(); }
async function salesSheet(name, tk) {
  const get = async start => { const r = await fetch('/.netlify/functions/sales-details?sheet=' + name + '&start=' + start, { headers: { Authorization: 'Bearer ' + tk }, cache: 'no-store' }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Ventes indisponibles'); return j; };
  const first = await get(1), rows = (first.rows || []).slice(), total = Number(first.totalRows) || rows.length;
  for (let s = 1001; s <= total; s += 1000) rows.push(...((await get(s)).rows || []));
  const h = rows[0] || [];
  return rows.slice(1).map(r => { const o = {}; h.forEach((k, i) => { o[k] = r[i]; }); return o; });
}
async function load() {
  if (S.loading || S.loaded) return;
  S.loading = true; S.err = ''; render();
  try {
    const tk = await token();
    const r = await fetch('/.netlify/functions/technical-library', { headers: { Authorization: 'Bearer ' + tk }, cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Fiches indisponibles');
    S.fiches = j.fiches || []; S.compl = j.complements || {}; S.loaded = true;
    loadCosts();
    try { buildSales(await salesSheet('Ventes_Articles', tk)); } catch (e) { S.venteErr = e.message || String(e); }
  } catch (e) { S.err = e.message || String(e); }
  S.loading = false; render();
}
/* Coûts calculés dans le simulateur (Recettes & fiches techniques) pour les fiches reliées. */
async function loadCosts() {
  if (!window.PrismRecipeSimulator) return;
  try { S.costs = await window.PrismRecipeSimulator.costs(); } catch (_) { S.costs = {}; }
  render();
}
/* Ventes de l'année la plus récente, regroupées par article de caisse. */
function buildSales(rows) {
  let annee = 0; rows.forEach(r => { const y = Number(r.annee); if (y > annee) annee = y; });
  const map = {};
  rows.forEach(r => {
    if (Number(r.annee) !== annee) return;
    const id = String(r.id_article || ''); if (!id) return;
    const o = map[id] = map[id] || { id, article: String(r.article || ''), famille: String(r.famille || ''), prix: null, qte: 0, ca: 0 };
    if (has(r.prix_ttc)) o.prix = num(r.prix_ttc);
    o.qte += num(r.quantite); o.ca += num(r.ca_ttc);
  });
  S.annee = annee || null; S.ventes = map;
}

/* ---------- Fiche enrichie ---------- */
const C = f => S.compl[f.id] || {};
const val = (f, k) => { const c = C(f); return c[k] !== undefined && c[k] !== '' ? c[k] : (f[k] || ''); };
function article(f) { const k = C(f).ksd; return k && S.ventes ? S.ventes[k.id] || { id: k.id, article: k.article, prix: null, qte: 0, ca: 0, absent: true } : null; }
/* Proposition de lien caisse : article dont le nom partage le plus de mots avec la fiche. */
function suggest(f) {
  if (!S.ventes) return null;
  const words = norm(f.nom).split(' ').filter(w => w.length > 2 && !['aux', 'les', 'des', 'facon', 'et'].includes(w));
  if (!words.length) return null;
  let best = null, score = 0;
  Object.values(S.ventes).forEach(a => {
    const n = ' ' + norm(a.article) + ' ';
    const s = words.filter(w => n.includes(' ' + w) || n.includes(w.slice(0, 5))).length / words.length;
    if (s > score || (s === score && best && a.ca > best.ca)) { score = s; best = a; }
  });
  return score >= 0.6 ? best : null;
}
function ok(f) {
  const ing = f.ingredients || [], a = article(f), c = C(f);
  return {
    'Rendement': !!val(f, 'rendement'), 'Portion servie': !!val(f, 'portion'), 'Ingrédients': ing.length > 0,
    'Quantités': ing.length > 0 && ing.filter(i => /\d/.test(i.quantite)).length / ing.length >= 0.6,
    'Préparation': (f.preparation || []).length > 0, 'Cuisson': !!val(f, 'cuisson'), 'Dressage': !!val(f, 'dressage'),
    'Conservation': !!val(f, 'conservation'), 'Allergènes': !!(c.allergenes && c.allergenesValides),
    'Coût portion': !!(S.costs[f.id] && Number.isFinite(S.costs[f.id].cost)), 'Prix de vente': !!(a && a.prix), 'Photo': !!f.photo
  };
}
const score = f => Object.values(ok(f)).filter(Boolean).length;
/* Un plat est dans une carte si un livret de cette saison le contient, sauf réglage contraire dans Prism. */
const fromLivret = (f, saison) => f.saison === saison || (f.historique || []).some(h => h.saison === saison);
const inCarte = (f, saison) => { const k = (C(f).cartes || {})[saison]; return k === undefined ? fromLivret(f, saison) : k; };
const onCarte = f => inCarte(f, ACTUELLE);

/* ---------- Enregistrement ---------- */
async function save(f, fields) {
  S.busy = true; S.msg = ''; render();
  try {
    const tk = await token();
    const r = await fetch('/.netlify/functions/technical-library', { method: 'POST', headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', id: f.id, fields }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Enregistrement impossible');
    S.compl[f.id] = j.complement; S.msg = 'Enregistré'; S.edit = false;
  } catch (e) { S.msg = e.message || String(e); }
  S.busy = false; render();
}

/* ---------- Rendu ---------- */
let root;
function render() {
  if (!root) return;
  root.replaceChildren();
  if (!S.loaded) {
    el(root, 'h1', 'pfl-title', 'Fiches techniques');
    el(root, 'p', 'pfl-muted', S.err ? S.err : 'Chargement des fiches…');
    if (S.err) btn(root, 'pfl-pill', 'Réessayer', () => { S.err = ''; load(); });
    return;
  }
  const f = S.open && S.fiches.find(x => x.id === S.open);
  if (f) drawFiche(f); else drawList();
}
function pill(parent, label, active, fn) { const b = btn(parent, 'pfl-pill' + (active ? ' is-active' : ''), label, fn); b.setAttribute('aria-pressed', active ? 'true' : 'false'); return b; }

function drawList() {
  el(root, 'h1', 'pfl-title', 'Fiches techniques');
  const all = S.fiches, carte = S.saison ? all.filter(x => inCarte(x, S.saison)) : all, full = carte.filter(x => score(x) >= 10).length;
  const hero = el(root, 'div', 'pfl-hero');
  const h1 = el(hero, 'div'); el(h1, 'div', 'pfl-hero-label', 'Fiches complètes (10/12 et plus)'); el(h1, 'div', 'pfl-hero-value', full + ' / ' + carte.length);
  const h2 = el(hero, 'div'); el(h2, 'div', 'pfl-hero-label', S.saison ? 'Plats de la carte ' + S.saison : 'Toutes les fiches'); el(h2, 'div', 'pfl-hero-value', String(carte.length));
  const h3 = el(hero, 'div'); el(h3, 'div', 'pfl-hero-label', 'Reliées à la caisse'); el(h3, 'div', 'pfl-hero-value', String(carte.filter(x => C(x).ksd).length));
  if (S.venteErr) el(root, 'p', 'pfl-warn', 'Ventes KSD indisponibles : ' + S.venteErr + '. Prix et ventes affichés « — ».');

  const bar = el(root, 'div', 'pfl-bar');
  const q = el(bar, 'input', 'pfl-search'); q.type = 'search'; q.placeholder = 'Rechercher un plat ou un ingrédient'; q.value = S.q;
  q.oninput = () => { S.q = q.value; drawRows(); };
  btn(bar, 'pfl-pill', 'Imprimer tout', () => printAll(rowsOf()));
  const sb = el(root, 'div', 'pfl-bar');
  const years = [...new Set(SAISONS.map(x => x.debut.slice(0, 4)))];
  const cur = SAISONS.find(x => x.id === S.saison);
  const yr = cur ? cur.debut.slice(0, 4) : null;
  years.forEach(y => pill(sb, y, yr === y, () => { const k = cur && cur.id.startsWith('Hiver') ? 'Hiver' : 'Été'; S.saison = SAISONS.find(x => x.id.startsWith(k) && x.debut.startsWith(y)).id; render(); }));
  if (yr) ['Été', 'Hiver'].forEach(k => pill(sb, k, cur.id.startsWith(k), () => { S.saison = SAISONS.find(x => x.id.startsWith(k) && x.debut.startsWith(yr)).id; render(); }));
  pill(sb, 'Carte actuelle', S.saison === ACTUELLE, () => { S.saison = ACTUELLE; render(); });
  pill(sb, 'Toutes les fiches', !S.saison, () => { S.saison = null; render(); });
  if (S.saison) el(root, 'p', 'pfl-muted', S.saison + (S.saison === ACTUELLE ? ' (carte actuelle)' : '') + ' · ' + dateFr(cur.debut) + ' au ' + dateFr(cur.fin) + (S.annee ? ' · ventes : total de l\'année ' + S.annee + ' (la caisse ne détaille pas encore par saison)' : ''));
  pill(bar, 'Tri : ventes', S.tri === 'ca', () => { S.tri = 'ca'; render(); });
  pill(bar, 'Tri : à compléter', S.tri === 'score', () => { S.tri = 'score'; render(); });
  const cats = el(root, 'div', 'pfl-bar');
  CATS.forEach(c => pill(cats, c, S.cat === c, () => { S.cat = c; render(); }));
  const list = el(root, 'div', 'pfl-list');
  function rowsOf() {
    const qq = norm(S.q);
    const rows = carte.filter(x => (S.cat === 'Toutes' || x.categorie === S.cat) &&
      (!qq || norm(x.nom + ' ' + x.carte + ' ' + (x.ingredients || []).map(i => i.nom).join(' ')).includes(qq)));
    return rows.sort((a, b) => S.tri === 'score' ? score(a) - score(b) || a.nom.localeCompare(b.nom, 'fr') : ((article(b) || {}).ca || 0) - ((article(a) || {}).ca || 0) || score(b) - score(a));
  }
  function drawRows() {
    list.replaceChildren();
    const rows = rowsOf();
    if (!rows.length) el(list, 'p', 'pfl-muted', S.saison ? 'Aucun plat dans la carte ' + S.saison + ' pour ce filtre. Ajoute des plats depuis leur fiche, ou affiche « Toutes les fiches ».' : 'Aucune fiche pour ce filtre.');
    rows.forEach(x => {
      const s = score(x), a = article(x), row = btn(list, 'pfl-row', undefined, () => { S.open = x.id; S.edit = false; S.msg = ''; render(); window.scrollTo(0, 0); });
      const name = el(row, 'div', 'pfl-row-name'); el(name, 'strong', '', x.nom); el(name, 'span', 'pfl-muted', x.categorie + ' · ' + x.saison);
      const g = el(row, 'div', 'pfl-gauge'); const t = el(g, 'div', 'pfl-gauge-track'); const fl = el(t, 'div', 'pfl-gauge-fill'); fl.style.width = (s / 12 * 100) + '%';
      fl.dataset.level = s >= 10 ? 'ok' : s >= 6 ? 'mid' : 'low'; el(g, 'span', '', s + '/12');
      el(row, 'div', 'pfl-row-num', a && a.prix ? eur.format(a.prix) : '—');
      el(row, 'div', 'pfl-row-num', a ? int.format(Math.round(a.qte)) + ' vendus' : C(x).ksd ? '—' : 'Non relié');
    });
  }
  drawRows();
}

function section(parent, title, filled) { const s = el(parent, 'section', 'pfl-card' + (filled ? '' : ' is-empty')); el(s, 'h3', 'pfl-card-title', title); return s; }
function textOrTodo(parent, v) { if (v) el(parent, 'p', 'pfl-text', v); else el(parent, 'p', 'pfl-todo', 'À compléter'); }
function groups(list) { const g = []; list.forEach(x => { let last = g[g.length - 1]; if (!last || last.name !== x.groupe) g.push(last = { name: x.groupe, items: [] }); last.items.push(x); }); return g; }

function drawFiche(f) {
  const st = ok(f), s = score(f), a = article(f), c = C(f), sug = !c.ksd && suggest(f);
  const top = el(root, 'div', 'pfl-actions no-print');
  btn(top, 'pfl-pill', '← Toutes les fiches', () => { S.open = null; S.edit = false; render(); });
  btn(top, 'pfl-pill', S.edit ? 'Annuler' : 'Compléter la fiche', () => { S.edit = !S.edit; S.msg = ''; render(); });
  btn(top, 'pfl-pill', 'Imprimer', () => printFiche(false));
  btn(top, 'pfl-pill', 'Imprimer les cases à remplir', () => printFiche(true));
  if (S.msg) el(top, 'span', 'pfl-muted', S.msg);

  const page = el(root, 'article', 'pfl-fiche');
  const head = el(page, 'header', 'pfl-head');
  el(head, 'h1', 'pfl-title', f.nom);
  const tags = el(head, 'div', 'pfl-tags');
  [f.categorie, 'Livret ' + f.saison + ' · page ' + f.source.page, onCarte(f) ? 'Carte actuelle' : 'Hors carte actuelle'].forEach(t => el(tags, 'span', 'pfl-tag', t));
  if (f.carte) el(head, 'p', 'pfl-carte', f.carte);

  const hero = el(page, 'div', 'pfl-hero');
  const h1 = el(hero, 'div'); el(h1, 'div', 'pfl-hero-label', 'Prix de vente TTC (caisse)'); el(h1, 'div', 'pfl-hero-value', a && a.prix ? eur.format(a.prix) : '—');
  const h2 = el(hero, 'div'); el(h2, 'div', 'pfl-hero-label', 'Ventes ' + (S.annee || '')); el(h2, 'div', 'pfl-hero-value', a ? int.format(Math.round(a.qte)) : '—');
  if (a && a.ca) el(h2, 'div', 'pfl-hero-sub', eur0.format(a.ca) + ' de CA TTC');
  const h3 = el(hero, 'div'); el(h3, 'div', 'pfl-hero-label', 'Fiche complète à'); el(h3, 'div', 'pfl-hero-value', s + '/12');
  const missing = RUB.filter(r => !st[r]); if (missing.length) el(h3, 'div', 'pfl-hero-sub', 'Manque : ' + missing.join(', ').toLowerCase());

  const link = el(page, 'section', 'pfl-card no-print'); el(link, 'h3', 'pfl-card-title', 'Article de caisse');
  if (c.ksd) {
    el(link, 'p', 'pfl-text', c.ksd.article + (a && a.absent ? ' (aucune vente en ' + S.annee + ')' : ''));
    btn(link, 'pfl-pill', 'Retirer le lien', () => save(f, { ksd: null }));
  } else if (sug) {
    el(link, 'p', 'pfl-text', 'Proposition : ' + sug.article + (sug.prix ? ' · ' + eur.format(sug.prix) : '') + ' · ' + int.format(Math.round(sug.qte)) + ' vendus en ' + S.annee);
    btn(link, 'pfl-pill is-active', 'Confirmer ce lien', () => save(f, { ksd: { id: sug.id, article: sug.article } }));
    pickArticle(link, f);
  } else { el(link, 'p', 'pfl-todo', S.ventes ? 'Aucun article proposé.' : 'Ventes KSD indisponibles.'); if (S.ventes) pickArticle(link, f); }
  const cartes = el(page, 'section', 'pfl-card no-print'); el(cartes, 'h3', 'pfl-card-title', 'Cartes de saison');
  const cw = el(cartes, 'div', 'pfl-bar');
  SAISONS.forEach(x => pill(cw, x.id + (x.id === ACTUELLE ? ' (actuelle)' : ''), inCarte(f, x.id), () => save(f, { cartes: { [x.id]: !inCarte(f, x.id) } })));
  el(cartes, 'p', 'pfl-muted', 'Cliquer sur une saison ajoute ou retire le plat de cette carte.');

  const grid = el(page, 'div', 'pfl-grid');
  editable(grid, f, 'rendement', 'Rendement', st['Rendement']);
  editable(grid, f, 'portion', 'Portion servie', st['Portion servie'], 'Ex. 160 g de saumon, 120 g de purée');

  const ing = section(page, 'Ingrédients', st['Ingrédients']);
  if (!f.ingredients.length) el(ing, 'p', 'pfl-todo', 'À compléter');
  groups(f.ingredients).forEach(g => {
    if (g.name) el(ing, 'h4', 'pfl-sub', g.name);
    const t = el(ing, 'table', 'pfl-table');
    g.items.forEach(i => { const tr = el(t, 'tr'); el(tr, 'td', '', i.nom); const q = el(tr, 'td', 'pfl-qty', [i.quantite, i.unite].filter(Boolean).join(' ') || '—'); if (/vérifier|manquante/.test(i.unite)) q.classList.add('is-warn'); });
  });
  const prep = section(page, 'Préparation', st['Préparation']);
  if (!f.preparation.length) el(prep, 'p', 'pfl-todo', 'À compléter');
  groups(f.preparation).forEach(g => { if (g.name) el(prep, 'h4', 'pfl-sub', g.name); const ol = el(prep, 'ol', 'pfl-steps'); g.items.forEach(x => el(ol, 'li', '', x.texte)); });

  const grid2 = el(page, 'div', 'pfl-grid');
  editable(grid2, f, 'cuisson', 'Cuisson', st['Cuisson']);
  editable(grid2, f, 'dressage', 'Dressage', st['Dressage']);
  editable(grid2, f, 'conservation', 'Conservation · DLC', st['Conservation']);
  const al = section(grid2, 'Allergènes', st['Allergènes']);
  if (S.edit) {
    const ta = el(al, 'textarea', 'pfl-input'); ta.value = c.allergenes || ''; ta.dataset.field = 'allergenes'; ta.placeholder = 'Ex. lait, œufs, gluten, poisson';
    const lb = el(al, 'label', 'pfl-check'); const v = el(lb, 'input'); v.type = 'checkbox'; v.checked = !!c.allergenesValides; v.dataset.field = 'allergenesValides'; el(lb, 'span', '', 'Validés par le chef');
  } else if (c.allergenes) { el(al, 'p', 'pfl-text', c.allergenes); el(al, 'p', c.allergenesValides ? 'pfl-ok' : 'pfl-warn', c.allergenesValides ? 'Validés par le chef' : 'Non validés'); }
  else el(al, 'p', 'pfl-todo', 'À compléter');
  const sim = S.costs[f.id], co = section(grid2, 'Coût portion', st['Coût portion']);
  if (sim && Number.isFinite(sim.cost)) {
    el(co, 'p', 'pfl-text', eur.format(sim.cost) + ' HT');
    if (Number.isFinite(sim.ratio)) el(co, 'p', sim.ratio <= sim.objective ? 'pfl-ok' : 'pfl-warn', (sim.ratio <= sim.objective ? '▼ ' : '▲ ') + 'ratio matière ' + sim.ratio.toFixed(1).replace('.', ',') + ' % (objectif ' + sim.objective + ' %)');
  } else el(co, 'p', 'pfl-todo', sim ? 'Un ingrédient n\'a pas encore de prix ou d\'unité dans le simulateur.' : 'À brancher.');
  if (window.PrismRecipeSimulator) btn(co, 'pfl-pill no-print', sim ? 'Ouvrir dans le simulateur' : 'Calculer le coût', () => window.PrismRecipeSimulator.openFromLivret({ livretId: f.id, name: f.nom, priceTtc: a && a.prix ? a.prix : 0 }));
  const ph = section(grid2, 'Photo', st['Photo']); if (f.photo) el(ph, 'p', 'pfl-text', 'Page ' + f.photo.page + ' du livret ' + f.photo.livret); else el(ph, 'p', 'pfl-todo', 'À compléter');

  if (S.edit) {
    const n = section(page, 'Notes', true); const ta = el(n, 'textarea', 'pfl-input'); ta.value = c.notes || ''; ta.dataset.field = 'notes';
    const bar = el(page, 'div', 'pfl-actions');
    btn(bar, 'pfl-pill is-active', S.busy ? 'Enregistrement…' : 'Enregistrer', () => {
      if (S.busy) return;
      const fields = {};
      page.querySelectorAll('[data-field]').forEach(x => { fields[x.dataset.field] = x.type === 'checkbox' ? x.checked : x.value; });
      save(f, fields);
    });
  }
  if (c.updatedAt) el(page, 'p', 'pfl-muted', 'Complétée le ' + new Date(c.updatedAt).toLocaleDateString('fr-FR') + ' par ' + c.updatedBy);
  if (f.historique && f.historique.length) {
    const d = el(page, 'details', 'pfl-card no-print'); el(d, 'summary', 'pfl-card-title', 'Anciennes versions (' + f.historique.length + ')');
    f.historique.forEach(h => { el(d, 'h4', 'pfl-sub', h.saison + ' · page ' + h.page); el(d, 'pre', 'pfl-pre', h.texte_livret); });
  }
}
/* Rubrique texte : valeur du livret, remplacée par le complément s'il existe. */
function editable(parent, f, key, title, filled, ph) {
  const s = section(parent, title, filled);
  if (S.edit) { const ta = el(s, 'textarea', 'pfl-input'); ta.value = val(f, key); ta.dataset.field = key; if (ph) ta.placeholder = ph; }
  else textOrTodo(s, val(f, key));
}
function pickArticle(parent, f) {
  const wrap = el(parent, 'div', 'pfl-pick'); const inp = el(wrap, 'input', 'pfl-search'); inp.type = 'search'; inp.placeholder = 'Chercher un autre article de caisse';
  const res = el(wrap, 'div', 'pfl-pick-list');
  inp.oninput = () => {
    res.replaceChildren(); const q = norm(inp.value); if (q.length < 2) return;
    Object.values(S.ventes).filter(a => norm(a.article).includes(q)).sort((x, y) => y.ca - x.ca).slice(0, 8)
      .forEach(a => btn(res, 'pfl-pill', a.article + (a.prix ? ' · ' + eur.format(a.prix) : ''), () => save(f, { ksd: { id: a.id, article: a.article } })));
  };
}
/* Tout le dossier : chaque fiche affichée sur sa page, puis retour à la liste. */
function printAll(list) {
  if (!list.length) return;
  const keep = root;
  const box = document.createElement('div'); box.className = 'pfl-print-all';
  const wasEdit = S.edit; S.edit = false;
  list.forEach(f => { root = el(box, 'div', 'pfl-print-page'); drawFiche(f); });
  root = keep; S.edit = wasEdit;
  root.replaceChildren(box);
  printFiche(false, () => render());
}
function printFiche(blanks, after) {
  document.body.classList.add('pfl-printing'); if (blanks) document.body.classList.add('pfl-print-blanks');
  let fired = false; const done = () => { if (fired) return; fired = true; document.body.classList.remove('pfl-printing', 'pfl-print-blanks'); window.removeEventListener('afterprint', done); if (after) after(); };
  window.addEventListener('afterprint', done); window.print(); setTimeout(done, 1500);
}

/* Accès aux ingrédients d'une fiche pour le simulateur. */
window.PrismFichesLivrets = {
  async ingredients(id) { await load(); while (S.loading) await new Promise(r => setTimeout(r, 200)); const f = S.fiches.find(x => x.id === id); return f ? f.ingredients : []; }
};

/* ---------- Montage ---------- */
function boot() {
  const target = document.querySelector('.prism-native-nav [data-page="menu"]');
  if (!target || document.getElementById('module-' + PAGE)) return;
  const nav = document.createElement('button'); nav.type = 'button'; nav.className = 'app-nav-item'; nav.dataset.page = PAGE;
  nav.innerHTML = '<span class="app-nav-icon">▤</span>Fiches techniques';
  nav.addEventListener('click', () => { window.navigateApp(PAGE); load(); });
  target.insertAdjacentElement('afterend', nav);
  const page = document.createElement('section'); page.className = 'module-page'; page.id = 'module-' + PAGE; page.dataset.module = PAGE;
  root = el(page, 'div', 'module-shell prism-fiches-livrets');
  const existing = document.getElementById('module-menu');
  if (existing) existing.insertAdjacentElement('afterend', page); else document.body.appendChild(page);
  new MutationObserver(() => { if (page.classList.contains('open')) { if (S.loaded) loadCosts(); else load(); } }).observe(page, { attributes: true, attributeFilter: ['class'] });
  render();
}
/* Montage immédiat (le script est en fin de page) : la barre du haut, chargée en « defer »,
   lit le menu latéral avant DOMContentLoaded et doit y trouver l'entrée. */
if (document.querySelector('.prism-native-nav [data-page="menu"]')) boot();
else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
