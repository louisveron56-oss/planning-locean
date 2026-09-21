// Netlify Function: recherche d'evenements OpenAgenda autour de Vannes
// Compatible avec le HTML actuel: il renvoie { text: "[...]" }

const VANNES = { lat: 47.6582, lng: -2.7608 };
const RADIUS_KM = 15;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};

function response(statusCode, obj) {
  return {
    statusCode,
    headers: CORS,
    body: JSON.stringify(obj)
  };
}

function frDateToIso(d, m, y) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function extractDates(body) {
  if (body.startDate && body.endDate) {
    return { startDate: body.startDate, endDate: body.endDate };
  }

  const prompt = body.prompt || '';
  const match = prompt.match(/du\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+au\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (!match) return null;

  return {
    startDate: frDateToIso(match[1], match[2], match[3]),
    endDate: frDateToIso(match[4], match[5], match[6])
  };
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function asText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.fr) return value.fr;
  const first = Object.values(value).find(v => typeof v === 'string');
  return first || '';
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDateTime(begin) {
  if (!begin) return '';
  const d = new Date(begin);
  if (Number.isNaN(d.getTime())) return begin.slice(0, 10);
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d).replace(',', '');
}

function impactFor(event, distance) {
  const title = asText(event.title).toLowerCase();
  const desc = asText(event.description).toLowerCase();
  const text = `${title} ${desc}`;

  const strongWords = [
    'festival', 'concert', 'fête', 'fete', 'régate', 'regate', 'marathon',
    'semi-marathon', 'salon', 'foire', 'carnaval', 'feu d’artifice',
    "feu d'artifice", 'tournoi', 'championnat', 'braderie', 'grande braderie'
  ];

  const mediumWords = [
    'marché', 'marche', 'spectacle', 'course', 'brocante', 'vide-grenier',
    'exposition', 'expo', 'animation', 'défilé', 'defile'
  ];

  const strong = strongWords.some(w => text.includes(w));
  const medium = mediumWords.some(w => text.includes(w));

  if (distance <= 5 && strong) return 'high';
  if (distance <= 8 && (strong || medium)) return 'medium';
  return 'low';
}

async function oaGet(path, params, apiKey) {
  const url = new URL(`https://api.openagenda.com${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, String(value));
    }
  });
  url.searchParams.append('key', apiKey);

  const r = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });

  const raw = await r.text();
  let data;
  try { data = JSON.parse(raw); }
  catch (_) { throw new Error(`OpenAgenda a renvoye une reponse invalide (${r.status})`); }

  if (!r.ok) {
    const message = data?.message || data?.error || `HTTP ${r.status}`;
    throw new Error(`OpenAgenda: ${message}`);
  }
  return data;
}

async function discoverAgendas(apiKey) {
  const searches = ['Vannes', 'Morbihan', 'Golfe du Morbihan'];
  const found = new Map();

  for (const search of searches) {
    const data = await oaGet('/v2/agendas', {
      search,
      size: 40,
      sort: 'recentlyAddedEvents.desc'
    }, apiKey);

    for (const agenda of (data.agendas || [])) {
      if (agenda && agenda.uid) found.set(String(agenda.uid), agenda);
    }
  }

  // Limite volontaire pour garder une fonction rapide et eviter trop d'appels.
  return Array.from(found.values()).slice(0, 25);
}

async function eventsFromAgenda(agenda, startDate, endDate, apiKey) {
  // Boite englobante d'environ 15 km autour de Vannes.
  const latDelta = RADIUS_KM / 111.32;
  const lngDelta = RADIUS_KM / (111.32 * Math.cos(VANNES.lat * Math.PI / 180));

  // Fenetre volontairement un peu plus large; filtrage exact ensuite.
  const startWide = `${addDays(startDate, -1)}T21:00:00.000Z`;
  const endWide = `${addDays(endDate, 1)}T03:00:00.000Z`;

  const data = await oaGet(`/v2/agendas/${agenda.uid}/events`, {
    'timings[gte]': startWide,
    'timings[lte]': endWide,
    'geo[northEast][lat]': VANNES.lat + latDelta,
    'geo[northEast][lng]': VANNES.lng + lngDelta,
    'geo[southWest][lat]': VANNES.lat - latDelta,
    'geo[southWest][lng]': VANNES.lng - lngDelta,
    detailed: 1,
    monolingual: 'fr',
    size: 100,
    'sort[]': 'timings.asc'
  }, apiKey);

  return data.events || [];
}
// ============================================================
// VACANCES SCOLAIRES — ZONES A / B / C
// Source officielle : data.education.gouv.fr
// Si l'API Education échoue, OpenAgenda continue de fonctionner.
// ============================================================

async function getSchoolVacationContext(startDate, endDate) {
  try {
    const zoneRefs = [
      { zone: 'A', location: 'Lyon' },
      { zone: 'B', location: 'Rennes' },
      { zone: 'C', location: 'Paris' }
    ];

    const API =
      'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records';

    const requests = zoneRefs.map(async ref => {
      const url = new URL(API);

      // On ne demande que les périodes qui croisent la semaine choisie.
      url.searchParams.set(
        'where',
        `location = "${ref.location}" and start_date <= "${endDate}" and end_date >= "${startDate}"`
      );

      url.searchParams.set('limit', '50');

      const r = await fetch(url, {
        headers: { Accept: 'application/json' }
      });

      if (!r.ok) {
        throw new Error(
          `Calendrier scolaire ${ref.zone}: HTTP ${r.status}`
        );
      }

      const data = await r.json();
      const records = Array.isArray(data.results) ? data.results : [];

      // On conserve uniquement les vraies vacances scolaires.
      const vacations = records.filter(record => {
        const description = String(record.description || '');

        if (!description.toLowerCase().includes('vacances')) {
          return false;
        }

        if (
          String(record.population || '')
            .toLowerCase()
            .includes('enseignant')
        ) {
          return false;
        }

        const start = String(record.start_date || '').slice(0, 10);
        const end = String(record.end_date || '').slice(0, 10);

        if (!start || !end) return false;

        return start <= endDate && end >= startDate;
      });

      return vacations.map(v => ({
        zone: ref.zone,
        description: v.description || 'Vacances scolaires',
        start: String(v.start_date || '').slice(0, 10),
        end: String(v.end_date || '').slice(0, 10)
      }));
    });

    const settled = await Promise.allSettled(requests);

    const periods = settled
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value);

    if (!periods.length) return [];

    // Regroupe les zones qui sont sur la même période de vacances.
    const grouped = new Map();

    for (const period of periods) {
      const key =
        `${period.description}|${period.start}|${period.end}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          description: period.description,
          start: period.start,
          end: period.end,
          zones: []
        });
      }

      const group = grouped.get(key);

      if (!group.zones.includes(period.zone)) {
        group.zones.push(period.zone);
      }
    }

    return Array.from(grouped.values()).map(group => {
      group.zones.sort();

      const allZones = group.zones.length === 3;

      const zoneLabel = allZones
        ? 'Toutes zones'
        : `Zone${group.zones.length > 1 ? 's' : ''} ${group.zones.join(' + ')}`;

      // Le niveau d'impact touristique augmente avec le nombre de zones.
      const impact =
        group.zones.length === 3
          ? 'high'
          : group.zones.length === 2
            ? 'medium'
            : 'low';

      return {
        type: 'school_holiday',
        name: `🏖 Vacances scolaires — ${zoneLabel}`,
        date: 'Semaine concernée',
        lieu: 'France métropolitaine',
        impact,
        note: group.description,
        url: null
      };
    });

  } catch (error) {
    // IMPORTANT :
    // une panne du calendrier scolaire ne bloque JAMAIS les événements.
    console.warn('Calendrier scolaire indisponible:', error.message);
    return [];
  }
}
// ============================================================
// JOURS FERIES — FRANCE METROPOLITAINE
// Source officielle : calendrier.api.gouv.fr
// Si l'API est indisponible, le reste continue de fonctionner.
// ============================================================

async function getPublicHolidayContext(startDate, endDate) {
  try {
    const r = await fetch(
      'https://calendrier.api.gouv.fr/jours-feries/metropole.json',
      {
        headers: { Accept: 'application/json' }
      }
    );

    if (!r.ok) {
      throw new Error(`Jours fériés: HTTP ${r.status}`);
    }

    const holidays = await r.json();
    const out = [];

    for (const [date, name] of Object.entries(holidays)) {
      if (date < startDate || date > endDate) continue;

      const d = new Date(`${date}T12:00:00Z`);

      const formattedDate = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }).format(d);

      out.push({
        type: 'public_holiday',
        name: `🇫🇷 ${name} — jour férié`,
        date: formattedDate,
        lieu: 'France',
        impact: 'high',
        note: 'Jour férié national',
        url: null
      });
    }

    return out;

  } catch (error) {
    console.warn('Jours fériés indisponibles:', error.message);
    return [];
  }
}
exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return response(200, {});
  if (event.httpMethod !== 'POST') return response(405, { error: 'Methode non autorisee' });

  try {
    const apiKey = process.env.OPENAGENDA_API_KEY;
    if (!apiKey) {
      return response(500, { error: 'OPENAGENDA_API_KEY absente dans Netlify' });
    }

    let body = {};
    try { body = JSON.parse(event.body || '{}'); }
    catch (_) { return response(400, { error: 'Corps JSON invalide' }); }

    const dates = extractDates(body);
    if (!dates) {
      return response(400, { error: 'Impossible de lire les dates de la semaine' });
    }

    const { startDate, endDate } = dates;
    const agendas = await discoverAgendas(apiKey);

    const settled = await Promise.allSettled(
      agendas.map(a => eventsFromAgenda(a, startDate, endDate, apiKey))
    );

    const rawEvents = settled
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    const out = [];
    const seen = new Set();

    for (const ev of rawEvents) {
      const loc = ev.location || {};
      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const distance = haversineKm(VANNES.lat, VANNES.lng, lat, lng);
      if (distance > RADIUS_KM) continue;

      const timings = Array.isArray(ev.timings) ? ev.timings : [];
      const matching = timings.find(t => {
        if (!t || !t.begin) return false;
        // L'API OpenAgenda fournit les horaires dans le fuseau local.
        const localDate = String(t.begin).slice(0, 10);
        return localDate >= startDate && localDate <= endDate;
      });
      if (!matching) continue;

      const name = asText(ev.title) || 'Evenement';
      const city = loc.adminLevel4 || loc.city || '';
      const place = loc.name || '';
      const lieu = [place, city].filter(Boolean).join(' - ');
      const date = formatDateTime(matching.begin);
      const impact = impactFor(ev, distance);
      const key = `${name.toLowerCase()}|${String(matching.begin).slice(0, 16)}|${city.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let note;
      if (impact === 'high') note = `${distance.toFixed(1)} km de Vannes - impact potentiellement fort sur le flux`;
      else if (impact === 'medium') note = `${distance.toFixed(1)} km de Vannes - impact a surveiller`;
      else note = `${distance.toFixed(1)} km de Vannes`;

      out.push({
        name,
        date,
        lieu,
        impact,
        note,
        url: ev.canonicalUrl || null,
        _begin: matching.begin
      });
    }

    // Récupère le contexte vacances scolaires.
// Si aucune zone n'est en vacances : tableau vide = rien n'est affiché.
const schoolContext = await getSchoolVacationContext(startDate, endDate);
const holidayContext = await getPublicHolidayContext(startDate, endDate);
out.sort((a, b) => new Date(a._begin) - new Date(b._begin));

const cleanEvents = out
  .slice(0, 40)
  .map(({ _begin, ...item }) => item);

// Les vacances apparaissent avant les événements.
// S'il n'y en a pas, le résultat reste strictement identique à avant.
const clean = [
  ...holidayContext,
  ...schoolContext,
  ...cleanEvents
];

    // Le HTML actuel attend data.text contenant un tableau JSON en texte.
    return response(200, {
      text: JSON.stringify(clean),
      meta: {
        source: 'OpenAgenda',
        agendasFound: agendas.length,
        agendasQueried: settled.length,
        eventsFound: out.length,
        radiusKm: RADIUS_KM
      }
    });

  } catch (e) {
    console.error('events function error:', e);
    return response(500, { error: e.message || 'Erreur inconnue' });
  }
};    endDate: frDateToIso(match[4], match[5], match[6])
  };
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function asText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.fr) return value.fr;
  const first = Object.values(value).find(v => typeof v === 'string');
  return first || '';
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDateTime(begin) {
  if (!begin) return '';
  const d = new Date(begin);
  if (Number.isNaN(d.getTime())) return begin.slice(0, 10);
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d).replace(',', '');
}

function impactFor(event, distance) {
  const title = asText(event.title).toLowerCase();
  const desc = asText(event.description).toLowerCase();
  const text = `${title} ${desc}`;

  const strongWords = [
    'festival', 'concert', 'fête', 'fete', 'régate', 'regate', 'marathon',
    'semi-marathon', 'salon', 'foire', 'carnaval', 'feu d’artifice',
    "feu d'artifice", 'tournoi', 'championnat', 'braderie', 'grande braderie'
  ];

  const mediumWords = [
    'marché', 'marche', 'spectacle', 'course', 'brocante', 'vide-grenier',
    'exposition', 'expo', 'animation', 'défilé', 'defile'
  ];

  const strong = strongWords.some(w => text.includes(w));
  const medium = mediumWords.some(w => text.includes(w));

  if (distance <= 5 && strong) return 'high';
  if (distance <= 8 && (strong || medium)) return 'medium';
  return 'low';
}

async function oaGet(path, params, apiKey) {
  const url = new URL(`https://api.openagenda.com${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, String(value));
    }
  });
  url.searchParams.append('key', apiKey);

  const r = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });

  const raw = await r.text();
  let data;
  try { data = JSON.parse(raw); }
  catch (_) { throw new Error(`OpenAgenda a renvoye une reponse invalide (${r.status})`); }

  if (!r.ok) {
    const message = data?.message || data?.error || `HTTP ${r.status}`;
    throw new Error(`OpenAgenda: ${message}`);
  }
  return data;
}

async function discoverAgendas(apiKey) {
  const searches = ['Vannes', 'Morbihan', 'Golfe du Morbihan'];
  const found = new Map();

  for (const search of searches) {
    const data = await oaGet('/v2/agendas', {
      search,
      size: 40,
      sort: 'recentlyAddedEvents.desc'
    }, apiKey);

    for (const agenda of (data.agendas || [])) {
      if (agenda && agenda.uid) found.set(String(agenda.uid), agenda);
    }
  }

  // Limite volontaire pour garder une fonction rapide et eviter trop d'appels.
  return Array.from(found.values()).slice(0, 25);
}

async function eventsFromAgenda(agenda, startDate, endDate, apiKey) {
  // Boite englobante d'environ 15 km autour de Vannes.
  const latDelta = RADIUS_KM / 111.32;
  const lngDelta = RADIUS_KM / (111.32 * Math.cos(VANNES.lat * Math.PI / 180));

  // Fenetre volontairement un peu plus large; filtrage exact ensuite.
  const startWide = `${addDays(startDate, -1)}T21:00:00.000Z`;
  const endWide = `${addDays(endDate, 1)}T03:00:00.000Z`;

  const data = await oaGet(`/v2/agendas/${agenda.uid}/events`, {
    'timings[gte]': startWide,
    'timings[lte]': endWide,
    'geo[northEast][lat]': VANNES.lat + latDelta,
    'geo[northEast][lng]': VANNES.lng + lngDelta,
    'geo[southWest][lat]': VANNES.lat - latDelta,
    'geo[southWest][lng]': VANNES.lng - lngDelta,
    detailed: 1,
    monolingual: 'fr',
    size: 100,
    'sort[]': 'timings.asc'
  }, apiKey);

  return data.events || [];
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return response(200, {});
  if (event.httpMethod !== 'POST') return response(405, { error: 'Methode non autorisee' });

  try {
    const apiKey = process.env.OPENAGENDA_API_KEY;
    if (!apiKey) {
      return response(500, { error: 'OPENAGENDA_API_KEY absente dans Netlify' });
    }

    let body = {};
    try { body = JSON.parse(event.body || '{}'); }
    catch (_) { return response(400, { error: 'Corps JSON invalide' }); }

    const dates = extractDates(body);
    if (!dates) {
      return response(400, { error: 'Impossible de lire les dates de la semaine' });
    }

    const { startDate, endDate } = dates;
    const agendas = await discoverAgendas(apiKey);

    const settled = await Promise.allSettled(
      agendas.map(a => eventsFromAgenda(a, startDate, endDate, apiKey))
    );

    const rawEvents = settled
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    const out = [];
    const seen = new Set();

    for (const ev of rawEvents) {
      const loc = ev.location || {};
      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const distance = haversineKm(VANNES.lat, VANNES.lng, lat, lng);
      if (distance > RADIUS_KM) continue;

      const timings = Array.isArray(ev.timings) ? ev.timings : [];
      const matching = timings.find(t => {
        if (!t || !t.begin) return false;
        // L'API OpenAgenda fournit les horaires dans le fuseau local.
        const localDate = String(t.begin).slice(0, 10);
        return localDate >= startDate && localDate <= endDate;
      });
      if (!matching) continue;

      const name = asText(ev.title) || 'Evenement';
      const city = loc.adminLevel4 || loc.city || '';
      const place = loc.name || '';
      const lieu = [place, city].filter(Boolean).join(' - ');
      const date = formatDateTime(matching.begin);
      const impact = impactFor(ev, distance);
      const key = `${name.toLowerCase()}|${String(matching.begin).slice(0, 16)}|${city.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let note;
      if (impact === 'high') note = `${distance.toFixed(1)} km de Vannes - impact potentiellement fort sur le flux`;
      else if (impact === 'medium') note = `${distance.toFixed(1)} km de Vannes - impact a surveiller`;
      else note = `${distance.toFixed(1)} km de Vannes`;

      out.push({
        name,
        date,
        lieu,
        impact,
        note,
        url: ev.canonicalUrl || null,
        _begin: matching.begin
      });
    }

    out.sort((a, b) => new Date(a._begin) - new Date(b._begin));
    const clean = out.slice(0, 40).map(({ _begin, ...item }) => item);

    // Le HTML actuel attend data.text contenant un tableau JSON en texte.
    return response(200, {
      text: JSON.stringify(clean),
      meta: {
        source: 'OpenAgenda',
        agendasFound: agendas.length,
        agendasQueried: settled.length,
        eventsFound: out.length,
        radiusKm: RADIUS_KM
      }
    });

  } catch (e) {
    console.error('events function error:', e);
    return response(500, { error: e.message || 'Erreur inconnue' });
  }
};
