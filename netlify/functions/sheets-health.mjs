// netlify/functions/sheets-health.mjs
// Test sécurisé de connexion Netlify -> Google Apps Script.
// Cette fonction ne renvoie AUCUNE donnée commerciale au navigateur.

export default async (req) => {
  try {
    if (req.method !== "GET") {
      return json(405, {
        ok: false,
        error: "Méthode non autorisée"
      });
    }

    const apiUrl = Netlify.env.get("LOCEAN_SHEETS_API_URL");
    const apiSecret = Netlify.env.get("LOCEAN_SHEETS_API_SECRET");

    if (!apiUrl || !apiSecret) {
      return json(500, {
        ok: false,
        error: "Variables Netlify manquantes"
      });
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action: "listSheets",
        secret: apiSecret
      }),
      redirect: "follow"
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return json(502, {
        ok: false,
        error: "Réponse Google non JSON",
        googleStatus: response.status
      });
    }

    if (!response.ok || !data?.ok) {
      return json(502, {
        ok: false,
        error: data?.error || "Connexion Google refusée",
        googleStatus: response.status
      });
    }

    const sheets = Array.isArray(data.sheets)
      ? data.sheets.map((s) => ({
          name: String(s.name || ""),
          rows: Number(s.rows || 0),
          columns: Number(s.columns || 0)
        }))
      : [];

    return json(200, {
      ok: true,
      source: "BASE Z OCEAN",
      connected: true,
      sheetsCount: sheets.length,
      sheets
    });

  } catch (err) {
    return json(500, {
      ok: false,
      error: "Erreur serveur",
      detail: String(err?.message || err)
    });
  }
};

function json(status, body) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    }
  );
}
