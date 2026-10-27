
import { getUser } from "@netlify/identity";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

async function readSheet(url, secret, startRow) {
  const response = await fetch(url, {
    method: "POST",
    redirect: "follow",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      secret,
      action: "readSheet",
      sheet: "Jours",
      startRow,
      limit: 1000
    })
  });

  if (!response.ok) {
    throw new Error("Erreur HTTP " + response.status);
  }

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error || "Erreur Apps Script");
  }

  return data;
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
    const first = await readSheet(url, secret, 1);
    const headers = first.rows[0] || [];

    const required = [
      "date", "etablissement", "ca_ttc",
      "couverts", "ticket_moyen"
    ];

    if (!required.every(key => headers.includes(key))) {
      throw new Error("Colonnes attendues introuvables");
    }

    const values = first.rows.slice(1);
    const total = Number(first.totalRows) || 0;

    for (let start = 1001; start <= total; start += 1000) {
      if (start > 20001) throw new Error("Volume inattendu");
      const page = await readSheet(url, secret, start);
      values.push(...page.rows);
    }

    const fields = [
      "date", "etablissement", "ca_ttc", "ca_ht",
      "ca_tables", "couverts", "ticket_moyen", "nb_tickets"
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
      rows
    });

  } catch (error) {
    console.error("Erreur Google Sheets :", error);
    return json({
      error: "Impossible de lire les données Google Sheets"
    }, 502);
  }
}
