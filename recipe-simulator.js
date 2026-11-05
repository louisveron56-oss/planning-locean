/* Prism — Carte & recettes · onglet Fiches techniques.
   - Liste des fiches à gauche avec leur ratio matière recalculé en direct (vert = sous l'objectif,
     rouge = au-dessus), fiche ingrédient par ingrédient au centre, simulateur de prix à droite.
   - Les prix d'achat viennent du catalogue Produits (/.netlify/functions/purchases) : la fiche
     garde la référence du produit et le coût suit le dernier prix connu.
   - Les fiches sont enregistrées dans le stockage privé Prism (/.netlify/functions/technical-sheets),
     partagé entre les comptes autorisés. Les anciens brouillons du navigateur peuvent y être importés.
   - Aucun chiffre inventé : un ingrédient sans prix ou sans unité claire est signalé et le ratio
     de la fiche affiche « — » tant qu'il n'est pas corrigé. */
(function () {
'use strict';
const ROOT_ID = 'prismRecipeSimulator', LOCAL_KEY = 'prism_recipe_drafts_v1', MIGRATED_KEY = 'prism_recipe_drafts_migrated_v1';
const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const pctFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const TO_BASE = { g: ['kg', 0.001], kg: ['kg', 1], ml: ['L', 0.001], cl: ['L', 0.01], L: ['L', 1], piece: ['piece', 1] };
const UNIT_LABEL = { g: 'g', kg: 'kg', ml: 'ml', cl: 'cl', L: 'L', piece: 'pièce' };
const BASIS_LABEL = { kg: 'kg', L: 'L', piece: 'pièce' };
const STEP = { g: 10, kg: 0.1, ml: 10, cl: 1, L: 0.1, piece: 1 };
const UNITS_FOR = { kg: ['g', 'kg'], L: ['cl', 'ml', 'L'], piece: ['piece'] };

let catalog = new Map(), catalogList = [], catalogError = '', sheets = [], settings = { objective: 25 };
let current = null, dirty = false, tab = 'fiches', search = '', addSearch = '', msg = '', busy = false, loaded = false, localDrafts = [];
let custom = { name: '', packagePrice: '', packageQuantity: '', packageUnit: 'kg', category: 'Cuisine' }, creating = false;

const el = (parent, tag, cls, txt) => { const x = document.createElement(tag); if (cls) x.className = cls; if (txt !== undefined) x.textContent = String(txt); if (parent) parent.appendChild(x); return x; };
const btn = (parent, cls, txt, fn) => { const b = el(parent, 'button', cls, txt); b.type = 'button'; if (fn) b.onclick = fn; return b; };
const norm = x => String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const n = x => { const v = Number(String(x ?? '').replace(',', '.')); return Number.isFinite(v) ? v : NaN; };
const pct = v => Number.isFinite(v) ? pctFmt.format(v) + ' %' : '—';
const money = v => Number.isFinite(v) ? euro.format(v) : '—';
const dateFr = iso => { const d = String(iso || '').slice(0, 10); return /^\d{4}-\d\d-\d\d$/.test(d) ? new Date(d + 'T12:00:00').toLocaleDateString('fr-FR') : ''; };

/* ---------- Unités et prix ---------- */
/* Nom lisible : « PAIN BURGER » → « Pain burger » (affichage seulement). */
function tidy(raw) {
  const t = String(raw || '').trim(), letters = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length < 3 || letters.replace(/[^A-ZÀ-Þ]/g, '').length / letters.length <= 0.7) return t;
  return t.toLowerCase().replace(/(^|\s)([a-zà-ÿ])/, (_, a, b) => a + b.toUpperCase()).replace(/(\d)l\b/g, '$1L');
}
function basisOf(unit) {
  const u = norm(unit).replace(/^€\s*\/\s*/, '').replace(/[.\s]/g, '');
  if (['kg', 'kilo', 'kilogramme', 'kilogrammes'].includes(u)) return ['kg', 1];
  if (['g', 'gramme', 'grammes'].includes(u)) return ['kg', 1000];
  if (['l', 'litre', 'litres'].includes(u)) return ['L', 1];
  if (u === 'cl') return ['L', 100];
  if (u === 'ml') return ['L', 1000];
  if (['piece', 'pieces', 'pc', 'pcs', 'unite', 'unites', 'u'].includes(u)) return ['piece', 1];
  return ['', 1];
}
function lastPriceDate(p) {
  const h = Array.isArray(p.priceHistory) ? p.priceHistory.filter(x => !x.invalidatedAt).map(x => x.at).filter(Boolean).sort() : [];
  return h.length ? h[h.length - 1] : (p.sourceLastPurchaseDate || p.updatedAt || p.createdAt || '');
}
/* Prix en vigueur d'une ligne : le catalogue d'abord, sinon le prix enregistré (signalé). */
function linePrice(l) {
  const p = l.productId ? catalog.get(String(l.productId)) : null;
  if (p) return { price: p.basePrice, basis: p.basis, date: p.date, live: true, product: p };
  if (Number.isFinite(l.priceSnapshot) && l.basisSnapshot) return { price: l.priceSnapshot, basis: l.basisSnapshot, date: l.snapshotAt, live: false, product: null };
  return { price: NaN, basis: '', date: '', live: false, product: null };
}
function lineCost(l) {
  const lp = linePrice(l), conv = TO_BASE[l.unit];
  if (!conv || !lp.basis || conv[0] !== lp.basis || !Number.isFinite(lp.price) || !(n(l.qty) >= 0)) return NaN;
  return n(l.qty) * conv[1] * lp.price;
}
function sheetCost(s) { if (!s.lines.length) return NaN; let t = 0; for (const l of s.lines) { const c = lineCost(l); if (!Number.isFinite(c)) return NaN; t += c; } return t; }
function sheetRatio(s) { const c = sheetCost(s), p = n(s.price); return Number.isFinite(c) && p > 0 ? c / p * 100 : NaN; }
function tone(ratio) { return !Number.isFinite(ratio) ? 'none' : ratio <= settings.objective ? 'ok' : 'over'; }

/* ---------- Données ---------- */
async function api(url, body) {
  const u = window.netlifyIdentity?.currentUser?.(); if (!u) throw Error('Connexion Prism requise');
  const res = await fetch(url, { method: body ? 'POST' : 'GET', headers: Object.assign({ Authorization: 'Bearer ' + await u.jwt() }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  let data = {}; try { data = await res.json(); } catch (_) {}
  if (!res.ok || data.ok === false) throw Error(data.error || 'Erreur ' + res.status);
  return data;
}
async function loadCatalog() {
  try {
    const d = await api('/.netlify/functions/purchases');
    catalog = new Map(); catalogList = [];
    (d.products || []).filter(p => p.name && !p.archivedAt).forEach(p => {
      const price = n(p.price), [basis, mult] = basisOf(p.unit);
      const item = { id: String(p.id), name: tidy(p.name), basis, basePrice: Number.isFinite(price) ? price * mult : NaN, date: lastPriceDate(p), category: p.category || '', supplier: p.supplier || '', reference: p.supplierReference || '' };
      catalog.set(item.id, item); catalogList.push(item);
    });
    catalogError = '';
  } catch (e) { catalogError = e.message; }
}
async function loadSheets() {
  const d = await api('/.netlify/functions/technical-sheets');
  sheets = d.sheets || []; settings = d.settings || settings;
}
function readLocalDrafts() {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return [];
    const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    return Array.isArray(data) ? data.filter(x => x && x.name) : [];
  } catch (_) { return []; }
}
function fromLocal(d) {
  return {
    name: d.name, price: n(d.price) > 0 ? n(d.price) : 1, vat: n(d.vat) || 10, category: 'Cuisine',
    lines: (d.lines || []).map(l => ({ productId: l.productId ? String(l.productId) : null, name: l.name, qty: n(l.qty) >= 0 ? n(l.qty) : 0, unit: TO_BASE[l.unit] ? l.unit : 'piece', priceSnapshot: n(l.cost) >= 0 ? n(l.cost) : null, basisSnapshot: ['kg', 'L', 'piece'].includes(l.basis) ? l.basis : '', snapshotAt: null }))
  };
}

/* ---------- Actions ---------- */
function blank() { return { id: null, name: '', category: 'Cuisine', price: 17, vat: 10, portions: 1, lines: [] }; }
function open(s) {
  if (dirty && !confirm('Les modifications de la fiche en cours ne sont pas enregistrées. Continuer ?')) return;
  current = s ? JSON.parse(JSON.stringify(s)) : blank(); dirty = false; msg = ''; addSearch = ''; render();
}
function touch() { dirty = true; live(); }
async function save() {
  if (!current || busy) return;
  if (norm(current.name).length < 2) { msg = 'Donne un nom à la fiche.'; render(); return; }
  if (!(n(current.price) > 0)) { msg = 'Le prix de vente HT doit être supérieur à zéro.'; render(); return; }
  const now = new Date().toISOString();
  const payload = Object.assign({}, current, {
    lines: current.lines.map(l => { const lp = linePrice(l); return { productId: l.productId, name: l.name, qty: n(l.qty) || 0, unit: l.unit, priceSnapshot: Number.isFinite(lp.price) ? lp.price : null, basisSnapshot: lp.basis || '', snapshotAt: lp.live ? (lp.date || now) : l.snapshotAt }; })
  });
  busy = true; msg = 'Enregistrement…'; render();
  try {
    const d = await api('/.netlify/functions/technical-sheets', { action: 'save', sheet: payload });
    const i = sheets.findIndex(s => s.id === d.sheet.id); if (i >= 0) sheets[i] = d.sheet; else sheets.unshift(d.sheet);
    current = JSON.parse(JSON.stringify(d.sheet)); dirty = false; msg = 'Fiche enregistrée.';
  } catch (e) { msg = 'Fiche non enregistrée : ' + e.message; }
  busy = false; render();
}
async function archive() {
  if (!current?.id || !confirm('Archiver la fiche « ' + current.name + ' » ? Elle disparaît de la liste mais n’est pas effacée.')) return;
  busy = true; render();
  try { await api('/.netlify/functions/technical-sheets', { action: 'archive', id: current.id }); sheets = sheets.filter(s => s.id !== current.id); current = null; dirty = false; msg = 'Fiche archivée.'; }
  catch (e) { msg = 'Archivage impossible : ' + e.message; }
  busy = false; render();
}
let objTimer = null;
function setObjective(v) {
  settings.objective = Math.min(80, Math.max(1, Math.round(v)));
  live(); drawList();
  clearTimeout(objTimer);
  objTimer = setTimeout(async () => { try { await api('/.netlify/functions/technical-sheets', { action: 'settings', objective: settings.objective }); } catch (e) { msg = 'Objectif non enregistré : ' + e.message; drawStatus(); } }, 700);
}
async function importLocal() {
  if (!localDrafts.length) return;
  busy = true; msg = 'Import des brouillons…'; render();
  try {
    const d = await api('/.netlify/functions/technical-sheets', { action: 'import-local', sheets: localDrafts.map(fromLocal) });
    sheets = d.sheets || sheets; localDrafts = [];
    try { localStorage.setItem(MIGRATED_KEY, new Date().toISOString()); } catch (_) {}
    msg = d.added + ' brouillon(s) importé(s)' + (d.skipped ? ', ' + d.skipped + ' ignoré(s) car incomplet(s)' : '') + '. Ils sont maintenant visibles sur tous tes appareils.';
  } catch (e) { msg = 'Import impossible : ' + e.message; }
  busy = false; render();
}
function addProduct(p) {
  const units = UNITS_FOR[p.basis] || ['piece'];
  const unit = units[0];
  current.lines.push({ productId: p.id, name: p.name, qty: unit === 'g' ? 100 : unit === 'cl' ? 10 : 1, unit, priceSnapshot: null, basisSnapshot: '', snapshotAt: null });
  addSearch = ''; dirty = true;
  if (!p.basis) msg = 'Unité de prix à confirmer dans Produits pour « ' + p.name + ' » : la ligne n’est pas calculée.';
  render();
  const inputs = document.querySelectorAll('#' + ROOT_ID + ' .ft-qty-input'); if (inputs.length) inputs[inputs.length - 1].focus();
}
async function createCatalogIngredient() {
  if (creating) return;
  const qty = n(custom.packageQuantity), p = n(custom.packagePrice), name = custom.name.trim();
  if (name.length < 2 || !(qty > 0) || !(p >= 0)) { msg = 'Renseigne un nom, un prix d’achat HT et une quantité de conditionnement supérieure à zéro.'; render(); return; }
  if (catalogList.some(x => norm(x.name) === norm(name))) { msg = 'Ce produit existe déjà : cherche-le dans la liste pour l’ajouter.'; render(); return; }
  creating = true; msg = 'Enregistrement du produit dans le catalogue…'; render();
  try {
    const u = window.netlifyIdentity?.currentUser?.(); if (!u) throw Error('Connexion Prism requise');
    const r = await fetch('/.netlify/functions/purchases', { method: 'PATCH', headers: { Authorization: 'Bearer ' + await u.jwt(), 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify({ establishment: 'LOCEAN', action: 'create-from-recipe', product: { name, category: custom.category, packagePrice: p, packageQuantity: qty, packageUnit: custom.packageUnit } }) });
    const d = await r.json(); if (!r.ok || !d.ok) throw Error(d.error || 'Enregistrement impossible');
    const x = d.product, [basis, mult] = basisOf(x.unit);
    const item = { id: String(x.id), name: tidy(x.name), basis, basePrice: n(x.price) * mult, date: new Date().toISOString(), category: x.category || '' };
    catalog.set(item.id, item); catalogList.push(item);
    custom = { name: '', packagePrice: '', packageQuantity: '', packageUnit: 'kg', category: 'Cuisine' };
    window.dispatchEvent(new Event('prism-catalog-updated'));
    msg = 'Produit créé dans le catalogue et ajouté à la fiche.';
    creating = false; addProduct(item); return;
  } catch (e) { msg = 'Produit non enregistré : ' + e.message; }
  creating = false; render();
}

/* ---------- Affichage ---------- */
function root() { return document.getElementById(ROOT_ID); }
function render() {
  const r = root(); if (!r) return;
  r.replaceChildren();
  const head = el(r, 'div', 'ft-head');
  el(head, 'h3', 'ft-title', 'Carte & recettes');
  const tabs = el(head, 'div', 'ft-tabs'); tabs.setAttribute('role', 'tablist');
  [['recettes', 'Recettes'], ['fiches', 'Fiches techniques']].forEach(([k, label]) => {
    const b = btn(tabs, 'ft-tab', label, () => { tab = k; render(); }); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(tab === k));
  });
  if (tab === 'fiches') btn(head, 'ft-primary', 'Nouvelle fiche', () => open(null));
  if (tab === 'recettes') { drawRecipesTab(r); return; }
  if (!loaded) { el(r, 'p', 'ft-empty', 'Chargement des fiches techniques…'); return; }
  const grid = el(r, 'div', 'ft-grid' + (current ? '' : ' ft-grid-nofiche'));
  const left = el(grid, 'div', 'ft-left'); left.id = 'ftLeft';
  drawLeft(left);
  if (!current) {
    const empty = el(grid, 'div', 'ft-pick');
    el(empty, 'p', 'ft-pick-title', sheets.length ? 'Choisis une fiche dans la liste' : 'Aucune fiche technique pour l’instant');
    el(empty, 'p', 'ft-muted', 'Les coûts suivent automatiquement le dernier prix d’achat de chaque produit.');
    btn(empty, 'ft-primary', 'Créer une fiche', () => open(null));
    drawStatus(empty);
    return;
  }
  drawEditor(el(grid, 'div', 'ft-center'));
  drawSim(el(grid, 'aside', 'ft-right'));
  live();
}
function drawLeft(left) {
  const s = el(left, 'label', 'ft-search');
  const i = el(s, 'input'); i.type = 'search'; i.placeholder = 'Chercher une fiche technique'; i.setAttribute('aria-label', 'Chercher une fiche technique'); i.value = search;
  i.oninput = () => { search = i.value; drawList(); };
  el(left, 'div', 'ft-count').id = 'ftCount';
  if (localDrafts.length) {
    const box = el(left, 'div', 'ft-banner');
    el(box, 'span', '', localDrafts.length + ' brouillon(s) enregistré(s) seulement sur cet appareil.');
    btn(box, 'ft-link', 'Les importer dans Prism', importLocal).disabled = busy;
  }
  el(left, 'div', 'ft-list').id = 'ftList';
  drawList();
}
function drawList() {
  const list = document.getElementById('ftList'), count = document.getElementById('ftCount'); if (!list) return;
  list.replaceChildren();
  const all = sheets.map(s => (current && s.id === current.id) ? current : s);
  if (current && !current.id) all.unshift(current);
  const q = norm(search), shown = all.filter(s => !q || norm(s.name + ' ' + s.category).includes(q)).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' }));
  const over = all.filter(s => tone(sheetRatio(s)) === 'over').length;
  if (count) { count.replaceChildren(); el(count, 'span', '', all.length + ' fiche' + (all.length > 1 ? 's' : '') + (over ? ' · ' + over + ' au-dessus' : '')); el(count, 'span', '', 'objectif ' + pct(settings.objective)); }
  if (!shown.length) { el(list, 'p', 'ft-list-empty', all.length ? 'Aucune fiche ne correspond.' : 'Crée ta première fiche avec « Nouvelle fiche ».'); return; }
  shown.forEach(s => {
    const active = current && (s === current || s.id === current.id);
    const b = btn(list, 'ft-item' + (active ? ' is-active' : ''), undefined, () => { if (!active) open(s); });
    const t = el(b, 'span', 'ft-item-text'); el(t, 'span', 'ft-item-name', s.name || 'Nouvelle fiche'); el(t, 'span', 'ft-item-cat', s.category || '');
    const r = sheetRatio(s), pill = el(b, 'span', 'ft-pill ft-' + tone(r), pct(r));
    pill.title = Number.isFinite(r) ? (r <= settings.objective ? 'Sous l’objectif' : 'Au-dessus de l’objectif') : 'Prix ou unité manquant sur un ingrédient';
    if (active) b.setAttribute('aria-current', 'true');
  });
}
function drawEditor(c) {
  const top = el(c, 'div', 'ft-ed-head');
  const meta = el(top, 'div', 'ft-ed-meta');
  const cat = el(meta, 'select', 'ft-cat'); cat.setAttribute('aria-label', 'Catégorie');
  ['Cuisine', 'Bar', 'COCO'].forEach(x => { const o = el(cat, 'option', '', x); o.value = x; }); cat.value = current.category || 'Cuisine';
  cat.onchange = () => { current.category = cat.value; dirty = true; drawList(); };
  const name = el(meta, 'input', 'ft-name'); name.type = 'text'; name.placeholder = 'Nom de la fiche'; name.value = current.name; name.setAttribute('aria-label', 'Nom de la fiche');
  name.oninput = () => { current.name = name.value; dirty = true; drawList(); };
  const actions = el(top, 'div', 'ft-ed-actions');
  btn(actions, 'ft-ghost', 'Imprimer', () => window.print());
  if (current.id) btn(actions, 'ft-ghost', 'Archiver', archive).disabled = busy;

  const card = el(c, 'div', 'ft-card');
  const th = el(card, 'div', 'ft-row ft-row-head');
  el(th, 'span', '', 'Ingrédient · 1 portion'); el(th, 'span', 'ft-c', 'Quantité'); el(th, 'span', 'ft-r', 'Coût'); el(th, 'span', '', '');
  if (!current.lines.length) el(card, 'p', 'ft-list-empty', 'Ajoute un premier ingrédient ci-dessous.');
  current.lines.forEach((l, idx) => drawLine(card, l, idx));
  drawAdd(card);
  el(c, 'p', 'ft-muted ft-foot', catalogError ? 'Catalogue Produits indisponible (' + catalogError + ') : les prix enregistrés sont utilisés.' : 'Prix d’achat HT repris du dernier achat dans Produits · marge matière seule (main-d’œuvre et énergie non comprises)');
}
function drawLine(card, l, idx) {
  const row = el(card, 'div', 'ft-row');
  const info = el(row, 'span', 'ft-ing');
  el(info, 'span', 'ft-ing-name', l.name);
  const lp = linePrice(l), sub = el(info, 'span', 'ft-ing-sub');
  if (Number.isFinite(lp.price) && lp.basis) {
    sub.textContent = euro.format(lp.price) + ' / ' + BASIS_LABEL[lp.basis] + (lp.date ? ' · ' + dateFr(lp.date) : '');
    if (lp.live && Number.isFinite(l.priceSnapshot) && l.basisSnapshot === lp.basis && Math.abs(lp.price - l.priceSnapshot) > 0.004) {
      const up = lp.price > l.priceSnapshot, d = el(sub, 'span', 'ft-delta ' + (up ? 'ft-over' : 'ft-ok'), (up ? ' ▲ ' : ' ▼ ') + euro.format(Math.abs(lp.price - l.priceSnapshot)));
      d.title = 'Depuis le dernier enregistrement de la fiche (' + euro.format(l.priceSnapshot) + ')';
    }
    if (!lp.live) el(sub, 'span', 'ft-warn-text', ' · produit absent du catalogue, prix figé');
  } else el(sub, 'span', 'ft-warn-text', lp.product ? 'Unité de prix à confirmer dans Produits' : 'Prix à brancher');
  const qty = el(row, 'span', 'ft-qty');
  const units = UNITS_FOR[lp.basis] || Object.keys(TO_BASE);
  btn(qty, 'ft-step', '−', () => { l.qty = Math.max(0, Math.round((n(l.qty) - STEP[l.unit]) * 1000) / 1000); qi.value = fmtQty(l.qty); touch(); }).setAttribute('aria-label', 'Moins de ' + l.name);
  const qi = el(qty, 'input', 'ft-qty-input'); qi.type = 'text'; qi.inputMode = 'decimal'; qi.value = fmtQty(l.qty); qi.setAttribute('aria-label', 'Quantité de ' + l.name);
  qi.oninput = () => { const v = n(qi.value); if (v >= 0) { l.qty = v; touch(); } };
  qi.onblur = () => { qi.value = fmtQty(l.qty); };
  if (units.length > 1 || !units.includes(l.unit)) {
    const us = el(qty, 'select', 'ft-unit'); us.setAttribute('aria-label', 'Unité de ' + l.name);
    (units.includes(l.unit) ? units : [l.unit].concat(units)).forEach(u => { const o = el(us, 'option', '', UNIT_LABEL[u] || u); o.value = u; }); us.value = l.unit;
    us.onchange = () => { l.unit = us.value; touch(); };
  } else el(qty, 'span', 'ft-unit-label', UNIT_LABEL[l.unit]);
  btn(qty, 'ft-step', '+', () => { l.qty = Math.round((n(l.qty) + STEP[l.unit]) * 1000) / 1000; qi.value = fmtQty(l.qty); touch(); }).setAttribute('aria-label', 'Plus de ' + l.name);
  const cost = el(row, 'span', 'ft-cost ft-r'); cost.dataset.line = idx;
  btn(row, 'ft-remove', '×', () => { current.lines.splice(idx, 1); dirty = true; render(); }).setAttribute('aria-label', 'Retirer ' + l.name);
}
function fmtQty(v) { return Number.isFinite(n(v)) ? String(Math.round(n(v) * 1000) / 1000).replace('.', ',') : ''; }
function drawAdd(card) {
  const box = el(card, 'div', 'ft-add');
  const lab = el(box, 'label', 'ft-add-search'); el(lab, 'span', 'ft-add-plus', '+');
  const i = el(lab, 'input'); i.type = 'search'; i.placeholder = 'Ajouter un ingrédient depuis Produits…'; i.setAttribute('aria-label', 'Ajouter un ingrédient'); i.value = addSearch;
  const results = el(box, 'div', 'ft-results');
  const show = () => {
    results.replaceChildren(); const q = norm(addSearch); if (q.length < 2) return;
    const found = catalogList.filter(p => norm(p.name + ' ' + p.supplier + ' ' + p.reference).includes(q)).slice(0, 8);
    if (!found.length) { el(results, 'p', 'ft-muted', catalogList.length ? 'Aucun produit trouvé. Tu peux le créer ci-dessous.' : 'Catalogue Produits non chargé.'); return; }
    found.forEach(p => {
      const b = btn(results, 'ft-result', undefined, () => addProduct(p));
      const t = el(b, 'span', 'ft-result-text'); el(t, 'span', 'ft-result-name', p.name); if (p.supplier) el(t, 'span', 'ft-muted', p.supplier);
      el(b, 'span', 'ft-muted', Number.isFinite(p.basePrice) && p.basis ? euro.format(p.basePrice) + ' / ' + BASIS_LABEL[p.basis] : 'unité à confirmer');
    });
    const more = btn(results, 'ft-link ft-find', 'Voir les autres références dans Produits', () => {
      if (typeof window.navigateApp === 'function') window.navigateApp('suppliers');
      window.dispatchEvent(new CustomEvent('prism-find-product', { detail: { query: addSearch } }));
    });
  };
  i.oninput = () => { addSearch = i.value; show(); };
  show();
  const more = el(box, 'details', 'ft-create'); more.open = !!custom.name;
  el(more, 'summary', '', 'Produit absent du catalogue ? Le créer');
  const f = el(more, 'div', 'ft-create-grid');
  const field = (label, value, set, type) => { const l = el(f, 'label'); el(l, 'span', '', label); const x = el(l, 'input'); x.type = type || 'text'; if (type === 'number') { x.min = '0'; x.step = 'any'; } x.value = value; x.oninput = () => set(x.value); return x; };
  const select = (label, value, opts, set) => { const l = el(f, 'label'); el(l, 'span', '', label); const x = el(l, 'select'); opts.forEach(([v, t]) => { const o = el(x, 'option', '', t); o.value = v; }); x.value = value; x.onchange = () => set(x.value); };
  field('Nom du produit', custom.name, v => custom.name = v);
  select('Famille', custom.category, [['Cuisine', 'Cuisine'], ['Bar', 'Bar']], v => custom.category = v);
  field('Prix d’achat HT du conditionnement (€)', custom.packagePrice, v => custom.packagePrice = v, 'number');
  field('Quantité totale du conditionnement', custom.packageQuantity, v => custom.packageQuantity = v, 'number');
  select('Unité', custom.packageUnit, [['kg', 'kg'], ['L', 'litres'], ['pièce', 'pièces']], v => custom.packageUnit = v);
  el(f, 'p', 'ft-muted', 'Exemple : carton de 6 bouteilles d’1 L à 12 € HT → quantité 6, litres, prix 12 € : enregistré à 2 € / L.');
  btn(f, 'ft-ghost', creating ? 'Enregistrement…' : 'Créer dans Produits et ajouter', createCatalogIngredient).disabled = creating;
}
function drawSim(r) {
  const hero = el(r, 'div', 'ft-hero');
  el(hero, 'span', 'ft-hero-label', 'Ratio matière');
  el(hero, 'span', 'ft-hero-value', '—').id = 'ftRatio';
  el(hero, 'span', 'ft-hero-verdict', '').id = 'ftVerdict';
  const pr = el(hero, 'div', 'ft-price');
  const prHead = el(pr, 'div', 'ft-price-head'); el(prHead, 'span', '', 'Prix de vente HT');
  const pi = el(prHead, 'input', 'ft-price-input'); pi.type = 'text'; pi.inputMode = 'decimal'; pi.id = 'ftPriceInput'; pi.setAttribute('aria-label', 'Prix de vente HT en euros');
  pi.value = fmtQty(current.price);
  const slider = el(pr, 'input', 'ft-slider'); slider.type = 'range'; slider.id = 'ftSlider'; slider.step = '0.1'; slider.setAttribute('aria-label', 'Prix de vente HT');
  const range = () => { const p = n(current.price) || 17; slider.min = '1'; slider.max = String(Math.max(30, Math.ceil(p * 1.6))); slider.value = String(p); };
  range();
  const ends = el(pr, 'div', 'ft-price-ends'); el(ends, 'span', '', '1 €'); el(ends, 'span', '', '').id = 'ftSliderMax';
  slider.oninput = () => { current.price = Math.round(n(slider.value) * 10) / 10; pi.value = fmtQty(current.price); touch(); };
  pi.oninput = () => { const v = n(pi.value); if (v > 0) { current.price = v; if (v > n(slider.max)) range(); slider.value = String(v); touch(); } };
  pi.onblur = () => { pi.value = fmtQty(current.price); };

  const box = el(r, 'div', 'ft-stats');
  const obj = el(box, 'div', 'ft-stat ft-stat-obj'); el(obj, 'span', '', 'Objectif ratio matière');
  const os = el(obj, 'span', 'ft-obj');
  btn(os, 'ft-step', '−', () => setObjective(settings.objective - 1)).setAttribute('aria-label', 'Baisser l’objectif');
  el(os, 'strong', '', '').id = 'ftObjective';
  btn(os, 'ft-step', '+', () => setObjective(settings.objective + 1)).setAttribute('aria-label', 'Monter l’objectif');
  const vat = el(box, 'div', 'ft-stat'); el(vat, 'span', '', 'TVA');
  const vs = el(vat, 'select', 'ft-vat'); vs.setAttribute('aria-label', 'Taux de TVA');
  [[5.5, '5,5 %'], [10, '10 %'], [20, '20 %']].forEach(([v, t]) => { const o = el(vs, 'option', '', t); o.value = String(v); }); vs.value = String(current.vat || 10);
  vs.onchange = () => { current.vat = n(vs.value); touch(); };
  [['Coût matière HT', 'ftCost'], ['Prix TTC', 'ftTtc'], ['Marge brute matière', 'ftMargin']].forEach(([label, id]) => { const s = el(box, 'div', 'ft-stat'); el(s, 'span', '', label); el(s, 'strong', '', '—').id = id; });
  const target = el(box, 'div', 'ft-stat ft-target'); el(target, 'span', '', 'Prix minimum pour l’objectif'); el(target, 'strong', '', '—').id = 'ftTarget';
  const save_ = btn(r, 'ft-primary ft-save', busy ? 'Enregistrement…' : 'Enregistrer la fiche', save); save_.disabled = busy; save_.id = 'ftSave';
  drawStatus(r);
}
function drawStatus(parent) {
  let s = document.getElementById('ftStatus');
  if (!s && parent) { s = el(parent, 'p', 'ft-status'); s.id = 'ftStatus'; s.setAttribute('role', 'status'); }
  if (s) s.textContent = msg || (dirty ? 'Modifications non enregistrées.' : '');
}
/* Mise à jour en direct sans reconstruire la page (le champ en cours de saisie garde le focus). */
function live() {
  if (!current) return;
  current.lines.forEach((l, i) => { const c = document.querySelector('#' + ROOT_ID + ' .ft-cost[data-line="' + i + '"]'); if (c) { const v = lineCost(l); c.textContent = Number.isFinite(v) ? euro.format(v) : '—'; c.classList.toggle('ft-warn-text', !Number.isFinite(v)); } });
  const cost = sheetCost(current), price = n(current.price), ratio = sheetRatio(current), t = tone(ratio);
  const set = (id, v) => { const x = document.getElementById(id); if (x) x.textContent = v; };
  set('ftRatio', pct(ratio)); set('ftCost', money(cost)); set('ftTtc', money(price * (1 + (n(current.vat) || 0) / 100)));
  set('ftMargin', Number.isFinite(cost) ? money(price - cost) : '—'); set('ftTarget', Number.isFinite(cost) ? money(cost / (settings.objective / 100)) + ' HT' : '—');
  set('ftObjective', pct(settings.objective));
  const sm = document.getElementById('ftSlider'); if (sm) set('ftSliderMax', sm.max + ' €');
  const r = document.getElementById('ftRatio'); if (r) r.dataset.tone = t;
  const v = document.getElementById('ftVerdict');
  if (v) { v.dataset.tone = t; v.textContent = t === 'none' ? (current.lines.length ? 'Un ingrédient n’a pas de prix ou d’unité exploitable' : 'Ajoute des ingrédients') : t === 'ok' ? '▼ ' + pct(settings.objective - ratio) + ' sous l’objectif' : '▲ ' + pct(ratio - settings.objective) + ' au-dessus de l’objectif'; }
  drawList(); drawStatus();
}
/* Onglet Recettes : en construction ; référentiel COCO conservé ici. */
function drawRecipesTab(r) {
  const box = el(r, 'div', 'ft-card ft-recipes');
  el(box, 'p', 'ft-pick-title', 'Recettes');
  el(box, 'p', 'ft-muted', 'Cet onglet accueillera les recettes (plats vendus). Le travail en cours porte sur les fiches techniques.');
  const imp = el(box, 'details', 'ft-create'); el(imp, 'summary', '', 'Importer les tarifs et fiches techniques COCO');
  el(imp, 'p', 'ft-muted', 'Fichier JSON préparé depuis « COUTS DE REVIENTS.xlsx ». Seuls les produits vérifiables sont ajoutés au catalogue, sans écraser les prix existants.');
  const file = el(imp, 'input'); file.type = 'file'; file.accept = '.json,application/json'; file.onchange = () => importCocoFile(file.files?.[0]);
  const ref = el(box, 'details', 'ft-create'); el(ref, 'summary', '', 'Recettes COCO de référence');
  const host = el(ref, 'div'); host.id = 'ftCoco';
  ref.addEventListener('toggle', () => { if (ref.open && !host.childNodes.length) loadCocoRecipes(host); });
  if (msg) el(box, 'p', 'ft-status', msg);
}
async function importCocoFile(file) {
  if (!file) return;
  try {
    const doc = JSON.parse(await file.text());
    if (doc?.schema !== 'prism-coco-reference-v1' || !Array.isArray(doc.ingredients) || !Array.isArray(doc.recipePrices)) throw Error('Ce fichier n’est pas l’export COCO préparé pour Prism.');
    const candidates = doc.ingredients.filter(x => x.status === 'candidate').length, review = doc.ingredients.length - candidates;
    if (!confirm('Importer ' + candidates + ' références COCO comme tarifs indicatifs dans le catalogue ? Les ' + review + ' lignes à vérifier restent à part. Aucun prix existant n’est remplacé.')) return;
    const u = window.netlifyIdentity?.currentUser?.(); if (!u) throw Error('Connexion Prism requise');
    const res = await fetch('/.netlify/functions/purchases', { method: 'PATCH', headers: { Authorization: 'Bearer ' + await u.jwt(), 'Content-Type': 'application/json' }, body: JSON.stringify({ establishment: 'LOCEAN', action: 'import-coco-reference', document: doc }), cache: 'no-store' });
    const d = await res.json(); if (!res.ok || !d.ok) throw Error(d.error || 'Import refusé');
    msg = 'COCO importé : ' + d.created + ' nouveaux produits, ' + d.existing + ' déjà présents, ' + d.review + ' à confirmer ; ' + d.recipes + ' fiches de référence. Aucun prix existant écrasé.';
    window.dispatchEvent(new Event('prism-catalog-updated')); await loadCatalog();
  } catch (e) { msg = 'Import COCO non terminé : ' + e.message; }
  render();
}
async function loadCocoRecipes(host) {
  host.replaceChildren(); el(host, 'p', 'ft-muted', 'Chargement…');
  try {
    const u = window.netlifyIdentity?.currentUser?.(); if (!u) throw Error('Connexion Prism requise');
    const r = await fetch('/.netlify/functions/purchases?coco=1', { headers: { Authorization: 'Bearer ' + await u.jwt() }, cache: 'no-store' });
    const d = await r.json(); if (!r.ok) throw Error(d.error || 'Référentiel COCO indisponible');
    host.replaceChildren();
    if (!d.ready) { el(host, 'p', 'ft-muted', 'Aucune recette COCO importée.'); return; }
    const ref = d.reference || {};
    (ref.recipePrices || []).forEach(item => {
      const row = el(host, 'details', 'ft-coco');
      el(row, 'summary', '', item.recipe + ' · coût matière de référence ' + money(n(item.foodCostHT)) + ' HT · prix indiqué ' + money(n(item.sellingPriceTTC)) + ' TTC');
      (ref.recipeLines || []).filter(l => l.recipe === item.recipe).forEach(l => el(row, 'p', 'ft-muted', l.ingredient + ' — ' + l.quantity + ' ' + (l.unit || 'unité') + ' · ' + money(n(l.lineCost)) + ' HT'));
    });
  } catch (e) { host.replaceChildren(); el(host, 'p', 'ft-warn-text', 'Lecture des recettes COCO : ' + e.message); }
}

/* ---------- Démarrage ---------- */
async function load() {
  if (loaded || busy) return;
  busy = true;
  try { await Promise.all([loadCatalog(), loadSheets()]); msg = ''; }
  catch (e) { msg = 'Fiches techniques indisponibles : ' + e.message; }
  localDrafts = readLocalDrafts();
  busy = false; loaded = true; render();
}
function init() {
  const page = document.getElementById('module-menu'); if (!page) return;
  const shell = page.querySelector('.module-shell'); if (!shell || document.getElementById(ROOT_ID)) return;
  shell.querySelectorAll('.module-placeholder,.module-kicker,.module-title,.module-lead').forEach(x => { x.hidden = true; x.style.setProperty('display', 'none', 'important'); });
  const section = el(shell, 'section', 'ft-root'); section.id = ROOT_ID;
  render();
  const start = () => { if (page.classList.contains('open') || page.offsetParent) load(); };
  new MutationObserver(start).observe(page, { attributes: true, attributeFilter: ['class'] });
  start();
  window.addEventListener('prism-catalog-updated', () => { if (loaded) loadCatalog().then(() => { if (current) live(); else drawList(); }); });
  if (window.netlifyIdentity?.on) window.netlifyIdentity.on('login', () => { loaded = false; current = null; dirty = false; start(); });
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
