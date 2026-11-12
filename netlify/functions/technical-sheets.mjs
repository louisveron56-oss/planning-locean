// Fiches techniques Prism — stockage privé partagé entre les comptes autorisés.
// - Lecture/écriture réservées aux e-mails de SALES_ALLOWED_EMAILS (comme le catalogue achats).
// - Une fiche garde la RÉFÉRENCE du produit (productId) : le coût est recalculé dans le
//   navigateur avec le dernier prix du catalogue. Le prix enregistré (priceSnapshot) ne sert
//   qu'à signaler une hausse/baisse depuis le dernier enregistrement, ou de secours si le
//   produit a disparu du catalogue.
// - Une suppression archive la fiche (rien n'est effacé définitivement).
// - Ne touche ni au Google Sheet, ni au catalogue achats.
import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";

const KEY = "ocean/fiches";
const send = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
const text = (x, max) => String(x ?? "").trim().slice(0, max);
const num = (x, min, max) => { const n = Number(x); return Number.isFinite(n) && n >= min && n <= max ? n : null; };
const UNITS = ["g", "kg", "ml", "cl", "L", "piece"];
const BASES = ["kg", "L", "piece", ""];
const CATEGORIES = ["Cuisine", "Bar", "COCO"];
const DEFAULT_OBJECTIVE = 25;

function cleanLine(l) {
  const qty = num(l?.qty, 0, 100000);
  const unit = UNITS.includes(l?.unit) ? l.unit : null;
  const name = text(l?.name, 200);
  if (qty === null || !unit || !name) throw new Error("Ingrédient invalide");
  return {
    productId: l?.productId ? text(l.productId, 100) : null,
    name,
    qty,
    unit,
    priceSnapshot: num(l?.priceSnapshot, 0, 100000),
    basisSnapshot: BASES.includes(l?.basisSnapshot) ? l.basisSnapshot : "",
    snapshotAt: text(l?.snapshotAt, 40) || null
  };
}

function cleanSheet(s, actor, now, previous) {
  const name = text(s?.name, 120);
  if (name.length < 2) throw new Error("Nom de fiche obligatoire");
  const price = num(s?.price, 0.01, 1000);
  if (price === null) throw new Error("Prix de vente HT invalide");
  const vat = [5.5, 10, 20].includes(Number(s?.vat)) ? Number(s.vat) : 10;
  if (!Array.isArray(s?.lines) || s.lines.length > 80) throw new Error("Liste d'ingrédients invalide");
  const id = /^ft-[a-z0-9-]{4,60}$/.test(String(s?.id || "")) ? s.id : "ft-" + crypto.randomUUID();
  return {
    id,
    name,
    category: CATEGORIES.includes(s?.category) ? s.category : "Cuisine",
    price,
    vat,
    portions: num(s?.portions, 1, 500) || 1,
    livretId: /^[a-z0-9-]{2,80}$/.test(String(s?.livretId || "")) ? s.livretId : (previous?.livretId || null),
    lines: s.lines.map(cleanLine),
    createdAt: previous?.createdAt || now,
    createdBy: previous?.createdBy || actor,
    updatedAt: now,
    updatedBy: actor,
    archivedAt: null
  };
}

export default async function (req) {
  if (!["GET", "POST"].includes(req.method)) return send({ error: "Méthode non autorisée" }, 405);
  let user; try { user = await getUser(); } catch (_) { return send({ error: "Session indisponible" }, 401); }
  if (!user?.email) return send({ error: "Connexion requise" }, 401);
  const allowed = (process.env.SALES_ALLOWED_EMAILS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(user.email.toLowerCase())) return send({ error: "Accès interdit" }, 403);

  let db; try { db = getStore({ name: "prism-fiches-techniques", consistency: "strong" }); } catch (_) { return send({ error: "Stockage indisponible" }, 503); }
  try {
    const saved = (await db.get(KEY, { type: "json" })) || { sheets: [], settings: { objective: DEFAULT_OBJECTIVE } };
    saved.sheets = Array.isArray(saved.sheets) ? saved.sheets : [];
    saved.settings = { objective: num(saved.settings?.objective, 1, 80) || DEFAULT_OBJECTIVE };

    if (req.method === "GET") {
      return send({ ok: true, sheets: saved.sheets.filter(s => !s.archivedAt), settings: saved.settings, savedAt: saved.savedAt || null });
    }

    const raw = await req.text();
    if (raw.length > 600000) return send({ error: "Requête trop volumineuse" }, 413);
    let body; try { body = JSON.parse(raw); } catch (_) { return send({ error: "JSON invalide" }, 400); }
    const actor = user.email.toLowerCase(), now = new Date().toISOString();

    if (body.action === "save") {
      const index = saved.sheets.findIndex(s => s.id === body.sheet?.id);
      const sheet = cleanSheet(body.sheet, actor, now, index >= 0 ? saved.sheets[index] : null);
      if (index >= 0) saved.sheets[index] = sheet; else saved.sheets.unshift(sheet);
      if (saved.sheets.length > 2000) return send({ error: "Trop de fiches" }, 422);
      saved.savedAt = now;
      await db.setJSON(KEY, saved);
      return send({ ok: true, sheet });
    }
    if (body.action === "import-local") {
      if (!Array.isArray(body.sheets) || body.sheets.length > 200) return send({ error: "Import invalide" }, 400);
      let added = 0, skipped = 0;
      for (const s of body.sheets) {
        try { saved.sheets.unshift(cleanSheet({ ...s, id: null }, actor, now, null)); added++; } catch (_) { skipped++; }
      }
      saved.savedAt = now;
      await db.setJSON(KEY, saved);
      return send({ ok: true, added, skipped, sheets: saved.sheets.filter(s => !s.archivedAt) });
    }
    if (body.action === "archive") {
      const sheet = saved.sheets.find(s => s.id === body.id && !s.archivedAt);
      if (!sheet) return send({ error: "Fiche introuvable" }, 404);
      sheet.archivedAt = now; sheet.archivedBy = actor;
      saved.savedAt = now;
      await db.setJSON(KEY, saved);
      return send({ ok: true, id: sheet.id });
    }
    if (body.action === "settings") {
      const objective = num(body.objective, 1, 80);
      if (objective === null) return send({ error: "Objectif invalide (1 à 80 %)" }, 400);
      saved.settings.objective = objective;
      saved.settings.updatedAt = now; saved.settings.updatedBy = actor;
      await db.setJSON(KEY, saved);
      return send({ ok: true, settings: saved.settings });
    }
    return send({ error: "Action inconnue" }, 400);
  } catch (e) {
    console.error("Fiches techniques :", e);
    return send({ error: "Opération impossible : " + e.message }, 400);
  }
}
