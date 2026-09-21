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
}// ============================================================
// TEMPS FORTS — GOLFE DU MORBIHAN
// Lecture directe de l'agenda public.
// Si le site est indisponible ou change de structure,
// OpenAgenda + vacances + jours fériés continuent de fonctionner.
// ============================================================

const GOLFE_AGENDA_URL =
  'https://www.golfedumorbihan.bzh/explorer-vannes/activites-vannes/agenda/';

const LOCAL_CITY_PATTERNS = [
  { city: 'Vannes', re: /\s+VANNES\s*$/i },
  { city: 'Séné', re: /\s+S[ÉE]N[ÉE]\s*$/i },
  { city: 'Saint-Avé', re: /\s+(?:ST|SAINT)[ -]?AV[ÉE]\s*$/i },
  { city: 'Plescop', re: /\s+PLESCOP\s*$/i },
  { city: 'Ploeren', re: /\s+PLOEREN\s*$/i },
  { city: 'Arradon', re: /\s+ARRADON\s*$/i },
  { city: 'Theix-Noyalo', re: /\s+THEIX(?:-NOYALO)?\s*$/i },
  { city: 'Meucon', re: /\s+MEUCON\s*$/i },
  { city: 'Saint-Nolff', re: /\s+SAINT[- ]NOLFF\s*$/i },
  { city: 'Treffléan', re: /\s+TREFFL[ÉE]AN\s*$/i },
  { city: 'Surzur', re: /\s+SURZUR\s*$/i }
];

function decodeBasicHtml(str) {
  return String(str || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&rsquo;/gi, '’')
    .replace(/&eacute;/gi, 'é')
    .replace(/&Eacute;/gi, 'É')
    .replace(/&agrave;/gi, 'à')
    .replace(/&Agrave;/gi, 'À')
    .replace(/&ecirc;/gi, 'ê')
    .replace(/&ccedil;/gi, 'ç')
    .replace(/&#(\d+);/g, (_, n) =>
      String.fromCharCode(Number(n))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16))
    );
}

function htmlToText(html) {
  return decodeBasicHtml(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function frenchMonthNumber(month) {
  const clean = String(month || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const months = {
    janvier: 1,
    fevrier: 2,
    mars: 3,
    avril: 4,
    mai: 5,
    juin: 6,
    juillet: 7,
    aout: 8,
    septembre: 9,
    octobre: 10,
    novembre: 11,
    decembre: 12
  };

  return months[clean] || null;
}

function frenchTextDateToIso(day, month, year) {
  const m = frenchMonthNumber(month);
  if (!m) return null;

  return `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function prettyIsoDate(iso) {
  const d = new Date(`${iso}T12:00:00Z`);

  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  }).format(d);
}

function parseGolfeHighlight(text, url) {
  let rest = String(text || '').trim();

  let start = null;
  let end = null;

  // Exemple :
  // "Du 26 septembre 2026 au 27 septembre 2026 Marathon de Vannes VANNES"
  let match = rest.match(
    /^Du\s+(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})\s+au\s+(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})\s+(.+)$/i
  );

  if (match) {
    start = frenchTextDateToIso(match[1], match[2], match[3]);
    end = frenchTextDateToIso(match[4], match[5], match[6]);
    rest = match[7].trim();
  } else {
    // Exemple :
    // "Le 03 octobre 2026 Salon de l'étudiant au Parc Chorus VANNES"
    match = rest.match(
      /^Le\s+(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})\s+(.+)$/i
    );

    if (!match) return null;

    start = frenchTextDateToIso(match[1], match[2], match[3]);
    end = start;
    rest = match[4].trim();
  }

  if (!start || !end) return null;

  let city = null;

  for (const entry of LOCAL_CITY_PATTERNS) {
    if (entry.re.test(rest)) {
      city = entry.city;
      rest = rest.replace(entry.re, '').trim();
      break;
    }
  }

  // On ne conserve ici que Vannes et les communes proches.
  if (!city) return null;

  const date =
    start === end
      ? prettyIsoDate(start)
      : `${prettyIsoDate(start)} → ${prettyIsoDate(end)}`;

  return {
    name: rest,
    date,
    lieu: city,
    impact: 'high',
    note: 'Temps fort officiel — Golfe du Morbihan',
    url,
    _start: start,
    _end: end
  };
}

async function getGolfeHighlights(startDate, endDate) {
  try {
    const r = await fetch(GOLFE_AGENDA_URL, {
      headers: {
        Accept: 'text/html',
        'User-Agent':
          'Mozilla/5.0 PlanningLOcean/1.0'
      }
    });

    if (!r.ok) {
      throw new Error(`Golfe du Morbihan: HTTP ${r.status}`);
    }

    const html = await r.text();

    /*
      On essaie de limiter la lecture à la partie
      "LES TEMPS FORTS".
    */
    let section = html;

    const startMarker = html.search(/LES\s+TEMPS\s+FORTS/i);

    if (startMarker >= 0) {
      const afterStart = html.slice(startMarker);

      const endMarker = afterStart.search(
        /ANNONCER\s+VOTRE\s+[ÉE]V[ÉE]NEMENT/i
      );

      section =
        endMarker > 0
          ? afterStart.slice(0, endMarker)
          : afterStart;
    }

    const events = [];
    const seenUrls = new Set();

    const anchorRegex =
      /<a\b[^>]*href=["']([^"']*\/evenement\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while ((match = anchorRegex.exec(section)) !== null) {
      const href = match[1];
      const text = htmlToText(match[2]);

      if (!text || !/\b202\d\b/.test(text)) continue;

      const absoluteUrl = new URL(
        href,
        GOLFE_AGENDA_URL
      ).href;

      if (seenUrls.has(absoluteUrl)) continue;
      seenUrls.add(absoluteUrl);

      const parsed = parseGolfeHighlight(
        text,
        absoluteUrl
      );

      if (!parsed) continue;

      // L'événement doit croiser la semaine sélectionnée.
      if (
        parsed._end < startDate ||
        parsed._start > endDate
      ) {
        continue;
      }

      events.push(parsed);
    }

    return events;

  } catch (error) {
    // Une panne de cette source ne bloque jamais le reste.
    console.warn(
      'Golfe du Morbihan indisponible:',
      error.message
    );

    return [];
  }
}

function normalizeEventName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function mergeLocalEvents(primary, secondary) {
  const seen = new Set();
  const result = [];

  // primary en premier :
  // Golfe du Morbihan est prioritaire sur OpenAgenda.
  for (const item of [...primary, ...secondary]) {
    const key = normalizeEventName(item.name);

    if (!key || seen.has(key)) continue;

    seen.add(key);

    const { _start, _end, ...cleanItem } = item;
    result.push(cleanItem);
  }

  return result;
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
const golfeHighlights = await getGolfeHighlights(startDate, endDate);
out.sort((a, b) => new Date(a._begin) - new Date(b._begin));

const cleanEvents = out
  .slice(0, 40)
  .map(({ _begin, ...item }) => item);

// Les Temps forts du Golfe sont prioritaires.
// Si le même événement existe dans OpenAgenda,
// il ne sera affiché qu'une seule fois.
const mergedEvents = mergeLocalEvents(
  golfeHighlights,
  cleanEvents
);

const clean = [
  ...holidayContext,
  ...schoolContext,
  ...mergedEvents
];
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
};
