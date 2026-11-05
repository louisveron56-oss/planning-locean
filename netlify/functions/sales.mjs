
import { getUser } from "@netlify/identity";
import { readSheetCached, wantsRefresh, cacheInfo } from "./lib/sheet-cache.mjs";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export default async function(request) {
  if (request.method !== "GET") {
    return json({ error: "Méthode non autorisée" }, 405);
  }

  const user = await getUser();

  if (!user?.email) {
    return json({ error: "Connexion requise" }, 401);
  }

  const allowed = (process.env.SALES_ALLOWED_EMAILS || "")
    .split(",")
    .map(email => email.trim().toLowerCase());

  if (!allowed.includes(user.email.toLowerCase())) {
    return json({ error: "Accès aux ventes non autorisé" }, 403);
  }

  const url = process.env.LOCEAN_SHEETS_API_URL;
  const secret = process.env.LOCEAN_SHEETS_API_SECRET;

  if (!url || !secret) {
    return json({ error: "Configuration Sheets manquante" }, 503);
  }

  try {
    const sheet = await readSheetCached({ url, secret, sheet: "Jours", maxRows: 21000, refresh: wantsRefresh(request) });
    const headers = sheet.rows[0] || [];

    const required = [
      "date", "etablissement", "ca_ttc",
      "couverts", "ticket_moyen"
    ];

    if (!required.every(key => headers.includes(key))) {
      throw new Error("Colonnes attendues introuvables");
    }

    const values = sheet.rows.slice(1);

    const fields = [
      "date", "etablissement", "ca_ttc", "ca_ht",
      "ca_tables", "ca_comptoir", "couverts", "ticket_moyen", "nb_tickets",
      "retours_nb", "retours_montant", "offerts_nb", "offerts_montant"
    ];

    const rows = values.map(row =>
      Object.fromEntries(
        fields.map(key => [key, row[headers.indexOf(key)]])
      )
    ).filter(row =>
      row.date &&
      String(row.etablissement || "")
        .toLowerCase().includes("océan")
    );

    return json({
      ok: true,
      source: "LOCEAN_DATA_API",
      rows,
      cache: cacheInfo(sheet)
    });

  } catch (error) {
    console.error("Erreur Google Sheets :", error);
    return json({
      error: "Impossible de lire les données Google Sheets"
    }, 502);
  }
}
