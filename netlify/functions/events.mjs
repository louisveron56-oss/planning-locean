// Netlify Function — événements L'Océan
// Sources:
// - OpenAgenda autour de Vannes
// - Calendrier scolaire officiel
// - Jours fériés officiels
// - Calendrier RC Vannes via le site officiel TOP 14 / LNR
//
// Compatible avec le HTML actuel : renvoie { text: "[...]" }

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
  const match = prompt.match(
    /du\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+au\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i
  );
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
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDateTime(begin) {
  if (!begin) return '';
  const d = new Date(begin);
  if (Number.isNaN(d.getTime())) return String(begin).slice(0, 10);
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

// ============================================================
// OPENAGENDA
// ============================================================

async function oaGet(path, params, apiKey) {
  const url = new URL(`https://api.openagenda.com${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, String(value));
    }
  });
  url.searchParams.append('key', apiKey);

  const r = await fetch(url, {
    headers: { Accept: 'application/json' }
  });

  const raw = await r.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch (_) {
    throw new Error(`OpenAgenda a renvoyé une réponse invalide (${r.status})`);
  }

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

    for (const agenda of data.agendas || []) {
      if (agenda && agenda.uid) found.set(String(agenda.uid), agenda);
    }
  }

  return Array.from(found.values()).slice(0, 25);
}

async function eventsFromAgenda(agenda, startDate, endDate, apiKey) {
  const latDelta = RADIUS_KM / 111.32;
  const lngDelta =
    RADIUS_KM /
    (111.32 * Math.cos(VANNES.lat * Math.PI / 180));

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
// VACANCES SCOLAIRES
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
      url.searchParams.set(
        'where',
        `location = "${ref.location}" and start_date <= "${endDate}" and end_date >= "${startDate}"`
      );
      url.searchParams.set('limit', '50');

      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) {
        throw new Error(`Calendrier scolaire ${ref.zone}: HTTP ${r.status}`);
      }

      const data = await r.json();
      const records = Array.isArray(data.results) ? data.results : [];

      return records
        .filter(record => {
          const description = String(record.description || '');
          if (!description.toLowerCase().includes('vacances')) return false;
          if (
            String(record.population || '')
              .toLowerCase()
              .includes('enseignant')
          ) return false;

          const start = String(record.start_date || '').slice(0, 10);
          const end = String(record.end_date || '').slice(0, 10);
          return start && end && start <= endDate && end >= startDate;
        })
        .map(v => ({
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

    const grouped = new Map();

    for (const period of periods) {
      const key = `${period.description}|${period.start}|${period.end}`;

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

      const zoneLabel =
        group.zones.length === 3
          ? 'Toutes zones'
          : `Zone${group.zones.length > 1 ? 's' : ''} ${group.zones.join(' + ')}`;

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
    console.warn('Calendrier scolaire indisponible:', error.message);
    return [];
  }
}

// ============================================================
// JOURS FÉRIÉS
// ============================================================

async function getPublicHolidayContext(startDate, endDate) {
  try {
    const r = await fetch(
      'https://calendrier.api.gouv.fr/jours-feries/metropole.json',
      { headers: { Accept: 'application/json' } }
    );

    if (!r.ok) throw new Error(`Jours fériés: HTTP ${r.status}`);

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

// ============================================================
// RC VANNES — TOUS LES MATCHS, DOMICILE + EXTÉRIEUR
// Source principale : calendrier officiel TOP 14 / LNR.
// Un match extérieur est informatif seulement.
// Un match "domicile" délocalisé hors Vannes est affiché mais
// n'augmente pas artificiellement le besoin du restaurant.
// ============================================================

const RCV_CALENDAR_URL =
  'https://top14.lnr.fr/club/vannes/calendrier-resultats';

const TOP14_SEASON = '2026-2027';

const TOP14_TEAMS = [
  'RC Vannes',
  'Stade Toulousain',
  'Union Bordeaux-Bègles',
  'Stade Rochelais',
  'RC Toulon',
  'Aviron Bayonnais',
  'ASM Clermont',
  'Montpellier Hérault Rugby',
  'Castres Olympique',
  'Racing 92',
  'Stade Français Paris',
  'LOU Rugby',
  'Section Paloise',
  'USA Perpignan'
];

const MONTHS_FR = {
  janvier: 1,
  février: 2,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  août: 8,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12,
  decembre: 12
};

function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&eacute;/gi, 'é')
    .replace(/&egrave;/gi, 'è')
    .replace(/&ecirc;/gi, 'ê')
    .replace(/&agrave;/gi, 'à')
    .replace(/&ocirc;/gi, 'ô')
    .replace(/&ucirc;/gi, 'û')
    .replace(/&ccedil;/gi, 'ç')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function htmlLines(html) {
  const text = decodeHtmlEntities(
    String(html || '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<(br|p|div|li|h1|h2|h3|h4|section|article|tr|td|th)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );

  return text
    .split(/\n+/)
    .map(x => x.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function normalizeTeamLine(line) {
  return String(line || '')
    .replace(/\d+\s*(e|er|ème|eme)\b/gi, '')
    .trim();
}

function parseFrenchCalendarDate(line) {
  const m = String(line || '').toLowerCase().match(
    /(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})\s+([a-zàâäéèêëîïôöùûüç]+)/
  );
  if (!m) return null;

  const day = Number(m[1]);
  const month = MONTHS_FR[m[2]];
  if (!month) return null;

  // Saison 2026/2027 : septembre-décembre => 2026, janvier-juin => 2027.
  const year = month >= 7 ? 2026 : 2027;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractMatchLinks(html) {
  const out = new Map();
  const re = /href=["']([^"']*\/feuille-de-match\/2026-2027\/j(\d+)\/[^"']*vannes[^"']*)["']/gi;
  let m;

  while ((m = re.exec(String(html || '')))) {
    let href = m[1];
    const round = Number(m[2]);
    if (!href.startsWith('http')) {
      href = `https://top14.lnr.fr${href.startsWith('/') ? '' : '/'}${href}`;
    }
    // On conserve la page principale du match, sans sous-onglet.
    href = href
      .replace(/\/(compositions|face-a-face|statistiques|videos).*$/i, '')
      .replace(/\/+$/, '');
    if (!out.has(round)) out.set(round, href);
  }

  return out;
}

function parseRcvCalendar(html, startDate, endDate) {
  const lines = htmlLines(html);
  const linksByRound = extractMatchLinks(html);
  const matches = [];

  for (let i = 0; i < lines.length; i++) {
    const jm = lines[i].match(/^J(\d+)$/i);
    if (!jm) continue;

    const round = Number(jm[1]);
    const block = lines.slice(i + 1, i + 28);

    let dateIso = null;
    let time = null;
    const teams = [];

    for (const raw of block) {
      if (!dateIso) dateIso = parseFrenchCalendarDate(raw);

      if (!time) {
        const tm = raw.match(/\b(\d{1,2})h(\d{2})\b/i);
        if (tm) {
          time = `${String(tm[1]).padStart(2, '0')}:${tm[2]}`;
        }
      }

      const line = normalizeTeamLine(raw);
      const team = TOP14_TEAMS.find(t => line === t);
      if (team && !teams.includes(team)) teams.push(team);

      if (teams.length >= 2 && dateIso) break;
    }

    if (!dateIso || teams.length < 2) continue;
    if (!teams.includes('RC Vannes')) continue;
    if (dateIso < startDate || dateIso > endDate) continue;

    matches.push({
      round,
      dateIso,
      time,
      homeTeam: teams[0],
      awayTeam: teams[1],
      detailUrl: linksByRound.get(round) || null
    });
  }

  return matches;
}

function extractVenueFromMatchPage(html) {
  const lines = htmlLines(html);

  const explicit = [
    'Stade de la Rabine',
    'Roazhon Park',
    'Stade de la Beaujoire',
    'Stade de la Beaujoire - Louis Fonteneau',
    'Stade Mayol',
    'Stade Aimé Giral',
    'Stade Pierre-Fabre',
    'Stade Marcel-Michelin',
    'Stade Jean-Dauger',
    'Stade Chaban-Delmas',
    'Matmut Stadium',
    'Paris La Défense Arena',
    'Stade Marcel-Deflandre',
    'Septeo Stadium'
  ];

  for (const venue of explicit) {
    if (lines.some(line => line.toLowerCase().includes(venue.toLowerCase()))) {
      return venue;
    }
  }

  const clubNames = new Set(TOP14_TEAMS.map(x => x.toLowerCase()));

  for (const line of lines.slice(0, 120)) {
    if (
      /^(stade|arena|roazhon park|matmut stadium)/i.test(line) &&
      !clubNames.has(line.toLowerCase()) &&
      line.length <= 90
    ) {
      return line;
    }
  }

  return '';
}

function venueCity(venue) {
  const v = String(venue || '').toLowerCase();

  if (v.includes('rabine')) return 'Vannes';
  if (v.includes('roazhon')) return 'Rennes';
  if (v.includes('beaujoire')) return 'Nantes';
  if (v.includes('mayol')) return 'Toulon';
  if (v.includes('aimé giral') || v.includes('aime giral')) return 'Perpignan';
  if (v.includes('pierre-fabre')) return 'Castres';
  if (v.includes('marcel-michelin')) return 'Clermont-Ferrand';
  if (v.includes('jean-dauger')) return 'Bayonne';
  if (v.includes('chaban-delmas')) return 'Bordeaux';
  if (v.includes('matmut')) return 'Lyon';
  if (v.includes('défense arena') || v.includes('defense arena')) return 'Nanterre';
  if (v.includes('marcel-deflandre')) return 'La Rochelle';
  if (v.includes('septeo')) return 'Montpellier';

  return '';
}

function formatRcvDate(dateIso, time) {
  const d = new Date(`${dateIso}T12:00:00Z`);
  const day = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(d);

  return time ? `${day} · ${time.replace(':', 'h')}` : day;
}

async function getRcvContext(startDate, endDate) {
  try {
    const r = await fetch(RCV_CALENDAR_URL, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'Mozilla/5.0 L-Ocean-Planning/1.0'
      }
    });

    if (!r.ok) throw new Error(`Calendrier RCV: HTTP ${r.status}`);

    const calendarHtml = await r.text();
    const matches = parseRcvCalendar(calendarHtml, startDate, endDate);

    if (!matches.length) return [];

    return Promise.all(
      matches.map(async match => {
        let venue = '';

        if (match.detailUrl) {
          try {
            const mr = await fetch(match.detailUrl, {
              headers: {
                Accept: 'text/html',
                'User-Agent': 'Mozilla/5.0 L-Ocean-Planning/1.0'
              }
            });
            if (mr.ok) {
              venue = extractVenueFromMatchPage(await mr.text());
            }
          } catch (_) {
            // Le match reste affiché même si le stade n'a pas pu être lu.
          }
        }

        const isHome = match.homeTeam === 'RC Vannes';
        const city = venueCity(venue);
        const isRabine = /rabine/i.test(venue);
        const isRelocatedHome =
          isHome &&
          !!venue &&
          !isRabine &&
          city !== 'Vannes';

        let type;
        let impact;
        let note;

        if (!isHome) {
          type = 'rcv_away';
          impact = 'low';
          note = 'RCV à l’extérieur — information uniquement, sans renfort automatique à Vannes';
        } else if (isRelocatedHome) {
          type = 'rcv_home_relocated';
          impact = 'low';
          note = `Domicile délocalisé${city ? ` à ${city}` : ''} — ne pas renforcer automatiquement le restaurant`;
        } else {
          type = 'rcv_home';
          impact = 'high';
          note = 'RCV à domicile à Vannes — impact local fort potentiel';
        }

        const opponent = isHome ? match.awayTeam : match.homeTeam;

        const name = isHome
          ? `🏉 RC Vannes – ${opponent}`
          : `🏉 ${opponent} – RC Vannes`;

        const lieu = venue
          ? `${venue}${city ? ` — ${city}` : ''}`
          : isHome
            ? 'Stade à confirmer'
            : 'Stade extérieur à confirmer';

        return {
          type,
          name,
          date: formatRcvDate(match.dateIso, match.time),
          lieu,
          impact,
          note,
          url: match.detailUrl || RCV_CALENDAR_URL,
          _sortDate: `${match.dateIso}T${match.time || '12:00'}:00`
        };
      })
    );
  } catch (error) {
    console.warn('Calendrier RC Vannes indisponible:', error.message);
    return [];
  }
}

// ============================================================
// HANDLER
// ============================================================

export const handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return response(200, {});
  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Méthode non autorisée' });
  }

  try {
    const apiKey = process.env.OPENAGENDA_API_KEY;
    if (!apiKey) {
      return response(500, {
        error: 'OPENAGENDA_API_KEY absente dans Netlify'
      });
    }

    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {
      return response(400, { error: 'Corps JSON invalide' });
    }

    const dates = extractDates(body);
    if (!dates) {
      return response(400, {
        error: 'Impossible de lire les dates de la semaine'
      });
    }

    const { startDate, endDate } = dates;

    const [
      agendas,
      schoolContext,
      holidayContext,
      rcvContext
    ] = await Promise.all([
      discoverAgendas(apiKey),
      getSchoolVacationContext(startDate, endDate),
      getPublicHolidayContext(startDate, endDate),
      getRcvContext(startDate, endDate)
    ]);

    const settled = await Promise.allSettled(
      agendas.map(a =>
        eventsFromAgenda(a, startDate, endDate, apiKey)
      )
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

      const distance = haversineKm(
        VANNES.lat,
        VANNES.lng,
        lat,
        lng
      );

      if (distance > RADIUS_KM) continue;

      const timings = Array.isArray(ev.timings)
        ? ev.timings
        : [];

      const matching = timings.find(t => {
        if (!t || !t.begin) return false;
        const localDate = String(t.begin).slice(0, 10);
        return localDate >= startDate && localDate <= endDate;
      });

      if (!matching) continue;

      const name = asText(ev.title) || 'Événement';
      const city = loc.adminLevel4 || loc.city || '';
      const place = loc.name || '';
      const lieu = [place, city].filter(Boolean).join(' - ');
      const date = formatDateTime(matching.begin);
      const impact = impactFor(ev, distance);

      const key =
        `${name.toLowerCase()}|` +
        `${String(matching.begin).slice(0, 16)}|` +
        `${city.toLowerCase()}`;

      if (seen.has(key)) continue;
      seen.add(key);

      let note;
      if (impact === 'high') {
        note =
          `${distance.toFixed(1)} km de Vannes - ` +
          'impact potentiellement fort sur le flux';
      } else if (impact === 'medium') {
        note =
          `${distance.toFixed(1)} km de Vannes - ` +
          'impact à surveiller';
      } else {
        note = `${distance.toFixed(1)} km de Vannes`;
      }

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

    out.sort(
      (a, b) =>
        new Date(a._begin).getTime() -
        new Date(b._begin).getTime()
    );

    const cleanEvents = out
      .slice(0, 40)
      .map(({ _begin, ...item }) => item);

    const rcvClean = rcvContext
      .sort(
        (a, b) =>
          new Date(a._sortDate).getTime() -
          new Date(b._sortDate).getTime()
      )
      .map(({ _sortDate, ...item }) => item);

    const clean = [
      ...holidayContext,
      ...schoolContext,
      ...rcvClean,
      ...cleanEvents
    ];

    return response(200, {
      text: JSON.stringify(clean),
      meta: {
        source: 'OpenAgenda + sources officielles + LNR',
        agendasFound: agendas.length,
        agendasQueried: settled.length,
        eventsFound: out.length,
        rcvMatchesFound: rcvClean.length,
        radiusKm: RADIUS_KM
      }
    });
  } catch (e) {
    console.error('events function error:', e);
    return response(500, {
      error: e.message || 'Erreur inconnue'
    });
  }
};
