// Bibliothèque des fiches techniques (livrets 2025-2027) — lecture et complétion.
// - Connexion requise, réservé aux e-mails de SALES_ALLOWED_EMAILS (comme les ventes et les achats).
// - Les fiches d'origine viennent de lib/fiches-livrets.mjs et ne sont jamais modifiées.
// - Les compléments saisis dans Prism (portion, allergènes, lien caisse…) sont gardés à part,
//   fiche par fiche, avec l'auteur et la date. Rien n'est calculé ni deviné ici.
import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";
import base from "./lib/fiches-livrets.mjs";

const KEY = "ocean/bibliotheque";
const send = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
const text = (x, max) => String(x ?? "").trim().slice(0, max);
const IDS = new Set(base.fiches.map(f => f.id));
// Champs que l'équipe peut compléter. Les champs texte vides effacent le complément.
const TEXT_FIELDS = { portion: 300, rendement: 300, cuisson: 1000, dressage: 1500, conservation: 600, allergenes: 400, notes: 2000 };

function clean(fields) {
  const out = {};
  for (const [k, max] of Object.entries(TEXT_FIELDS)) if (k in fields) out[k] = text(fields[k], max);
  if ("allergenesValides" in fields) out.allergenesValides = fields.allergenesValides === true;
  if ("ksd" in fields) {
    const k = fields.ksd;
    out.ksd = k && k.id ? { id: text(k.id, 60), article: text(k.article, 160) } : null;
  }
  if ("horsCarte" in fields) out.horsCarte = fields.horsCarte === true;
  // Présence du plat dans une carte de saison : { "Hiver 2026-2027": true, "Été 2025": false }.
  if (fields.cartes && typeof fields.cartes === "object") {
    out.cartes = {};
    for (const [k, v] of Object.entries(fields.cartes).slice(0, 20)) if (/^(Été \d{4}|Hiver \d{4}-\d{4})$/.test(k)) out.cartes[k] = v === true;
  }
  return out;
}

export default async function (req) {
  if (!["GET", "POST"].includes(req.method)) return send({ error: "Méthode non autorisée" }, 405);
  let user; try { user = await getUser(); } catch (_) { return send({ error: "Session indisponible" }, 401); }
  if (!user?.email) return send({ error: "Connexion requise" }, 401);
  const allowed = (process.env.SALES_ALLOWED_EMAILS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(user.email.toLowerCase())) return send({ error: "Accès interdit" }, 403);

  let db; try { db = getStore({ name: "prism-fiches-techniques", consistency: "strong" }); } catch (_) { return send({ error: "Stockage indisponible" }, 503); }
  try {
    const saved = (await db.get(KEY, { type: "json" })) || { complements: {} };
    saved.complements = saved.complements && typeof saved.complements === "object" ? saved.complements : {};
    if (req.method === "GET") {
      return send({ ok: true, rubriques: base.rubriques, fiches: base.fiches, complements: saved.complements, savedAt: saved.savedAt || null });
    }
    const raw = await req.text();
    if (raw.length > 50000) return send({ error: "Requête trop volumineuse" }, 413);
    let body; try { body = JSON.parse(raw); } catch (_) { return send({ error: "JSON invalide" }, 400); }
    if (body.action !== "complete") return send({ error: "Action inconnue" }, 400);
    if (!IDS.has(body.id)) return send({ error: "Fiche introuvable" }, 404);
    const fields = clean(body.fields || {});
    if (!Object.keys(fields).length) return send({ error: "Rien à enregistrer" }, 400);
    const now = new Date().toISOString(), actor = user.email.toLowerCase();
    const prev = saved.complements[body.id] || {};
    if (fields.cartes) fields.cartes = { ...(prev.cartes || {}), ...fields.cartes };
    saved.complements[body.id] = { ...prev, ...fields, updatedAt: now, updatedBy: actor };
    saved.savedAt = now;
    await db.setJSON(KEY, saved);
    return send({ ok: true, id: body.id, complement: saved.complements[body.id] });
  } catch (e) {
    console.error("Bibliothèque fiches :", e);
    return send({ error: "Opération impossible" }, 500);
  }
}
