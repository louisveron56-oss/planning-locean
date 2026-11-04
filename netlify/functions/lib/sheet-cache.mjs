// Lecture Google Sheets (Apps Script) avec cache serveur partagé.
// - Les données d'un onglet sont gardées 10 minutes dans Netlify Blobs (stockage privé, jamais public).
// - Les pages suivantes sont lues en parallèle (4 à la fois) au lieu d'une par une.
// - Si Apps Script échoue, la dernière copie de moins de 24 h est servie, marquée stale:true.
// - ?refresh=1 sur l'appel force une relecture.
// Ce fichier n'est pas une fonction Netlify (il est dans un sous-dossier sans index).
// Ne jamais l'utiliser pour la paie (private-payroll).
import { getStore } from "@netlify/blobs";

const TTL_MS = 10 * 60 * 1000;
const STALE_MAX_MS = 24 * 60 * 60 * 1000;
const PAGE = 1000;
const PARALLEL = 4;
const VERSION = "v1";

function store() {
  try { return getStore({ name: "prism-sheets-cache", consistency: "strong" }); }
  catch (_) { return null; }
}

async function readPage(url, secret, sheet, startRow) {
  const res = await fetch(url, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret, action: "readSheet", sheet, startRow, limit: PAGE }),
    signal: AbortSignal.timeout(23000)
  });
  if (!res.ok) throw new Error("Google Sheets HTTP " + res.status);
  const data = await res.json();
  if (!data.ok || !Array.isArray(data.rows)) throw new Error(data.error || "Réponse Apps Script incorrecte");
  return data;
}

async function readAllFresh(url, secret, sheet, maxRows) {
  const first = await readPage(url, secret, sheet, 1);
  const total = Number(first.totalRows) || first.rows.length;
  if (total > maxRows) {
    const err = new Error("Volume inattendu pour l'onglet " + sheet);
    err.tooLarge = true;
    throw err;
  }
  const starts = [];
  for (let s = 1 + PAGE; s <= total; s += PAGE) starts.push(s);
  const pages = new Array(starts.length);
  for (let i = 0; i < starts.length; i += PARALLEL) {
    const batch = starts.slice(i, i + PARALLEL);
    const got = await Promise.all(batch.map(s => readPage(url, secret, sheet, s)));
    got.forEach((p, j) => { pages[i + j] = p.rows; });
  }
  const rows = first.rows.slice();
  for (const p of pages) rows.push(...p);
  return { rows, totalRows: total };
}

export function wantsRefresh(request) {
  try { return new URL(request.url).searchParams.get("refresh") === "1"; }
  catch (_) { return false; }
}

// Retourne { rows (ligne d'en-tête incluse), totalRows, cachedAt, fromCache, stale }
export async function readSheetCached({ url, secret, sheet, maxRows = 25000, refresh = false }) {
  const key = VERSION + "/" + sheet;
  const s = store();
  let cached = null;
  if (s) { try { cached = await s.get(key, { type: "json" }); } catch (_) { cached = null; } }
  const age = cached?.cachedAt ? Date.now() - Date.parse(cached.cachedAt) : Infinity;

  if (!refresh && cached && age < TTL_MS) {
    return { rows: cached.rows, totalRows: cached.totalRows, cachedAt: cached.cachedAt, fromCache: true, stale: false };
  }

  try {
    const fresh = await readAllFresh(url, secret, sheet, maxRows);
    const entry = { rows: fresh.rows, totalRows: fresh.totalRows, cachedAt: new Date().toISOString() };
    if (s) { try { await s.setJSON(key, entry); } catch (e) { console.error("Cache Sheets non écrit", sheet, e); } }
    return { ...entry, fromCache: false, stale: false };
  } catch (err) {
    if (!err.tooLarge && cached && age < STALE_MAX_MS) {
      console.error("Apps Script indisponible, copie en cache servie", sheet, err);
      return { rows: cached.rows, totalRows: cached.totalRows, cachedAt: cached.cachedAt, fromCache: true, stale: true };
    }
    throw err;
  }
}

// Infos de fraîcheur à joindre aux réponses (champ ajouté, rien n'est retiré).
export function cacheInfo(r) {
  return { at: r.cachedAt, fromCache: r.fromCache, stale: r.stale };
}
