import { getStore } from "@netlify/blobs";

const STORE_NAME = "locean-planning";

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function authorized(event) {
  const expected = process.env.PLANNING_SAVE_TOKEN;
  if (!expected) return { ok: false, config: true };

  const headers = event.headers || {};
  const received =
    headers["x-planning-token"] ||
    headers["X-Planning-Token"] ||
    "";

  return { ok: received === expected, config: false };
}

function validWeek(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

export const handler = async function(event) {
  if (event.httpMethod === "OPTIONS") {
    return response(200, { ok: true });
  }

  const auth = authorized(event);

  if (auth.config) {
    return response(500, {
      error: "PLANNING_SAVE_TOKEN n'est pas configuré dans Netlify."
    });
  }

  if (!auth.ok) {
    return response(401, { error: "Code de sauvegarde incorrect." });
  }

  try {
    // Site-wide store: data survives new deploys and is shared by deploy contexts.
    const store = getStore({
      name: STORE_NAME,
      consistency: "strong"
    });

    if (event.httpMethod === "GET") {
      const params = event.queryStringParameters || {};
      const weekDate = params.week;

      if (!validWeek(weekDate)) {
        return response(400, { error: "Semaine invalide." });
      }

      const [team, week] = await Promise.all([
        store.get("team", { type: "json", consistency: "strong" }),
        store.get(`weeks/${weekDate}`, { type: "json", consistency: "strong" })
      ]);

      return response(200, {
        ok: true,
        team: team || null,
        week: week || null
      });
    }

    if (event.httpMethod === "POST") {
      let payload = {};
      try {
        payload = JSON.parse(event.body || "{}");
      } catch (_) {
        return response(400, { error: "JSON invalide." });
      }

      const weekDate = payload.weekDate;
      if (!validWeek(weekDate)) {
        return response(400, { error: "Semaine invalide." });
      }

      if (!Array.isArray(payload.team)) {
        return response(400, { error: "Équipe invalide." });
      }

      if (!payload.data || typeof payload.data !== "object") {
        return response(400, { error: "Planning invalide." });
      }

      const savedAt = new Date().toISOString();

      const teamPayload = payload.team.map((emp) => ({
        name: String(emp?.name || "").trim(),
        contract: Number(emp?.contract) || 0,
        role: String(emp?.role || ""),
        hidden: Boolean(emp?.hidden),
        rhDays: Array.isArray(emp?.rhDays)
          ? emp.rhDays.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
          : []
      }));

      const weekPayload = {
        weekDate,
        data: payload.data,
        manualEvents: Array.isArray(payload.manualEvents)
          ? payload.manualEvents
          : [],
        savedAt
      };

      await Promise.all([
        store.setJSON("team", teamPayload),
        store.setJSON(`weeks/${weekDate}`, weekPayload)
      ]);

      return response(200, {
        ok: true,
        weekDate,
        savedAt
      });
    }

    return response(405, { error: "Méthode non autorisée." });
  } catch (error) {
    console.error("storage function error:", error);
    return response(500, {
      error: error?.message || "Erreur de sauvegarde serveur."
    });
  }
};
