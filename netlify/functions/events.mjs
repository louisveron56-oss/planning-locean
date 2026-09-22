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

// ============================================================
// SOURCES LOCALES — VILLE DE VANNES + RC VANNES
// - Agenda officiel de la Ville : événements à potentiel de flux
// - Billetterie officielle RC Vannes : matchs TOP 14 à domicile
// - Aucun compte ni clé supplémentaire
// - Si une source tombe, les autres continuent de fonctionner
// ============================================================

const VANNES_AGENDA_BASE =
  'https://www.mairie-vannes.fr/agenda?field_accessible_value=All&field_date_de_fin_evenement_value=&field_date_de_fin_evenement_value_1=&field_gratuit_value=All&field_public_concerne_target_id=All&field_thematique_target_id=All';

const VANNES_AGENDA_TARGETED = [
  {
    category: 'Sport',
    url: 'https://www.mairie-vannes.fr/agenda?field_accessible_value=All&field_date_de_fin_evenement_value=&field_date_de_fin_evenement_value_1=&field_gratuit_value=All&field_public_concerne_target_id=All&field_thematique_target_id=25'
  },
  {
    category: 'Fêtes, festivals, salons',
    url: 'https://www.mairie-vannes.fr/agenda?field_accessible_value=All&field_date_de_fin_evenement_value=&field_date_de_fin_evenement_value_1=&field_gratuit_value=All&field_public_concerne_target_id=All&field_thematique_target_id=35'
  }
];

const RCV_TICKETING_URL = 'https://billetterie.rcvannes.bzh/fr';

function decodeHtmlBasic(str) {
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
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function htmlToPlainText(html) {
  return decodeHtmlBasic(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
}

function normalizeFrenchMonth(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '');
}

function monthNumber(value) {
  const m = normalizeFrenchMonth(value);
  const months = {
    janv: 1, janvier: 1,
    fevr: 2, fevrier: 2,
    mars: 3,
    avr: 4, avril: 4,
    mai: 5,
    juin: 6,
    juil: 7, juillet: 7,
    aout: 8,
    sept: 9, septembre: 9,
    oct: 10, octobre: 10,
    nov: 11, novembre: 11,
    dec: 12, decembre: 12
  };
  return months[m] || null;
}

function isoFromShortFrenchDate(day, monthText, year) {
  const month = monthNumber(monthText);
  if (!month) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function findEventBlockStart(html, anchorIndex) {
  const before = html.slice(Math.max(0, anchorIndex - 5000), anchorIndex);
  const markers = [
    '<article',
    '<li',
    'views-row',
    'view-content',
    'node--type-evenement',
    'node--type-event'
  ];

  let best = -1;

  for (const marker of markers) {
    const pos = before.toLowerCase().lastIndexOf(marker.toLowerCase());
    if (pos > best) best = pos;
  }

  if (best < 0) return Math.max(0, anchorIndex - 1200);
  return Math.max(0, anchorIndex - before.length + best);
}

function extractDatesFromEventBlock(blockHtml, selectedStartDate) {
  const text = htmlToPlainText(blockHtml);
  const selectedYear = Number(String(selectedStartDate).slice(0, 4));

  const re = /\b(\d{1,2})\s+(janv(?:ier)?\.?|f[ée]vr(?:ier)?\.?|mars|avr(?:il)?\.?|mai|juin|juil(?:let)?\.?|ao[uû]t|sept(?:embre)?\.?|oct(?:obre)?\.?|nov(?:embre)?\.?|d[ée]c(?:embre)?\.?)\b/gi;
  const matches = [...text.matchAll(re)];

  if (!matches.length) return null;

  const last = matches[matches.length - 1];
  const prev = matches.length >= 2 ? matches[matches.length - 2] : null;

  let end = isoFromShortFrenchDate(last[1], last[2], selectedYear);
  if (!end) return null;

  let start = end;

  if (prev) {
    const candidate = isoFromShortFrenchDate(prev[1], prev[2], selectedYear);
    if (candidate) {
      const days = Math.abs(
        (new Date(`${end}T12:00:00Z`) - new Date(`${candidate}T12:00:00Z`)) / 86400000
      );
      if (days <= 45) start = candidate;
    }
  }

  if (start > end) {
    const endYear = selectedYear + 1;
    end = isoFromShortFrenchDate(last[1], last[2], endYear) || end;
  }

  return { start, end };
}

function extractDisplayTime(text) {
  const matches = [...String(text || '').matchAll(/\b(\d{1,2})\s*h(?:\s*([0-5]\d))?\b/gi)]
    .map(m => {
      const h = String(Number(m[1]));
      const min = m[2] ? String(m[2]).padStart(2, '0') : '';
      return min && min !== '00' ? `${h}h${min}` : `${h}h`;
    });

  const unique = [...new Set(matches)];

  if (!unique.length) return '';
  if (unique.length >= 2) return `${unique[0]}–${unique[1]}`;
  return unique[0];
}

function localImpactFromText(name, category, extraText = '') {
  const text = `${name} ${category} ${extraText}`.toLowerCase();

  const strong = [
    'marathon', 'vannetaise', 'festival', 'salon', 'foire',
    'concert', 'régate', 'regate', 'braderie', 'carnaval',
    'fête', 'fete', 'feu d’artifice', "feu d'artifice",
    'rugby', 'gwened', 'relais entreprises', '20 km', '5 km',
    'défilé', 'defile', 'ultra marin', 'arvor', 'sekai', 'sekaï',
    'marché de noël', 'marche de noel', 'village de noël', 'village de noel',
    'grande roue', 'illuminations de noël', 'illuminations de noel',
    'noël à vannes', 'noel à vannes', 'noel a vannes'
  ];

  const medium = [
    'spectacle', 'marché', 'marche', 'brocante',
    'vide-grenier', 'course', 'tournoi', 'championnat',
    'animation', 'open air', 'show', 'gala'
  ];

  if (strong.some(w => text.includes(w))) return 'high';
  if (medium.some(w => text.includes(w))) return 'medium';
  return 'low';
}

function isLocallyRelevant(name, category, blockText = '') {
  const impact = localImpactFromText(name, category, blockText);

  // Les grosses familles événementielles restent prioritaires.
  if (/fêtes|festivals|salons/i.test(category)) return true;

  // Pour l'agenda général, on ne garde que ce qui a un potentiel
  // réel de fréquentation : concert, marché, sport majeur, spectacle,
  // Noël, festival, salon, brocante, etc.
  return impact !== 'low';
}

function prettyLocalEventDate(start, end, time = '') {
  function fmt(iso) {
    const d = new Date(`${iso}T12:00:00Z`);
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    }).format(d);
  }

  const base = start === end ? fmt(start) : `${fmt(start)} → ${fmt(end)}`;
  return time ? `${base} · ${time}` : base;
}

function normalizeEventKey(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titleFromAgendaLink(anchorHtml, href) {
  const heading = String(anchorHtml || '').match(
    /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i
  );
  if (heading) {
    const txt = htmlToPlainText(heading[1]);
    if (txt) return txt;
  }

  const titled = String(anchorHtml || '').match(
    /<(?:div|span|p)\b[^>]*class=["'][^"']*(?:title|titre)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|p)>/i
  );
  if (titled) {
    const txt = htmlToPlainText(titled[1]);
    if (txt) return txt;
  }

  try {
    const slug = new URL(href, 'https://www.mairie-vannes.fr')
      .pathname
      .split('/')
      .filter(Boolean)
      .pop()
      .replace(/-\d+$/, '');

    return decodeURIComponent(slug)
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  } catch (_) {
    return htmlToPlainText(anchorHtml).slice(0, 120);
  }
}

async function fetchVannesAgendaPage(url, category, startDate, endDate) {
  try {
    const r = await fetch(url, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'Mozilla/5.0 PlanningLOcean/1.0'
      }
    });

    if (!r.ok) {
      console.warn(`Agenda Ville de Vannes ${category}: HTTP ${r.status}`);
      return [];
    }

    const html = await r.text();
    const results = [];
    const linkRegex = /<a\b[^>]*href=["']([^"']*\/agenda\/[^"'?#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const blockStart = findEventBlockStart(html, match.index);
      const blockEnd = Math.min(html.length, linkRegex.lastIndex + 1200);
      const block = html.slice(blockStart, blockEnd);
      const blockText = htmlToPlainText(block);

      const name = titleFromAgendaLink(match[2], href);

      if (!name || name.length < 3 || name.length > 140) continue;
      if (/agenda|en savoir plus|lire la suite|voir plus/i.test(name)) continue;
      if (!isLocallyRelevant(name, category, blockText)) continue;

      const dates = extractDatesFromEventBlock(block, startDate);
      if (!dates) continue;
      if (dates.end < startDate || dates.start > endDate) continue;

      const time = extractDisplayTime(blockText);
      const impact = localImpactFromText(name, category, blockText);

      results.push({
        name,
        date: prettyLocalEventDate(dates.start, dates.end, time),
        lieu: 'Vannes',
        impact,
        note: null,
        url: new URL(href, 'https://www.mairie-vannes.fr').href,
        _sourceStart: dates.start
      });
    }

    return results;
  } catch (error) {
    console.warn(`Agenda Ville de Vannes ${category} indisponible:`, error.message);
    return [];
  }
}

async function getVilleVannesEvents(startDate, endDate) {
  try {
    // Pages générales : on balaye plusieurs pages pour attraper
    // concerts, spectacles, marchés, événements saisonniers et Noël.
    const generalPages = Array.from({ length: 7 }, (_, page) => ({
      category: 'Tous les événements',
      url: `${VANNES_AGENDA_BASE}&page=${page}`
    }));

    const requests = [
      ...VANNES_AGENDA_TARGETED,
      ...generalPages
    ];

    const settled = await Promise.allSettled(
      requests.map(source =>
        fetchVannesAgendaPage(source.url, source.category, startDate, endDate)
      )
    );

    const raw = settled
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    const seen = new Set();
    const results = [];

    for (const item of raw) {
      const key = `${normalizeEventKey(item.name)}|${item._sourceStart}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      results.push(item);
    }

    results.sort((a, b) => a._sourceStart.localeCompare(b._sourceStart));

    return results.map(({ _sourceStart, ...item }) => item);

  } catch (error) {
    console.warn('Agenda Ville de Vannes indisponible:', error.message);
    return [];
  }
}

// ============================================================
// RC VANNES — MATCHS TOP 14 À DOMICILE
// Source : billetterie officielle du RC Vannes.
// Affichage volontairement court : adversaire + date/heure + Rabine.
// ============================================================

function prettyRcvOpponent(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      if (['asm', 'lou', 'usap', 'rc', 'racing'].includes(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

async function getRcvTop14Events(startDate, endDate) {
  try {
    const r = await fetch(RCV_TICKETING_URL, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'Mozilla/5.0 PlanningLOcean/1.0'
      }
    });

    if (!r.ok) {
      throw new Error(`HTTP ${r.status}`);
    }

    const html = await r.text();
    const text = htmlToPlainText(html);

    const top14Start = text.search(/\bTOP 14\b/i);
    const top14End = text.search(/\bREICHEL ESPOIRS ELITE\b/i);

    const section = top14Start >= 0
      ? text.slice(top14Start, top14End > top14Start ? top14End : undefined)
      : text;

    const re = /RC VANNES\s*\/\s*([A-ZÀ-Ÿ0-9 .'\-]+?)\s+(?:Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\s+(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})\s*-\s*(\d{1,2}):([0-5]\d)\s+STADE DE LA RABINE/gi;

    const results = [];
    const seen = new Set();
    let match;

    while ((match = re.exec(section)) !== null) {
      const opponentRaw = match[1].trim();
      const day = match[2];
      const month = match[3];
      const year = match[4];
      const hour = String(Number(match[5]));
      const minute = match[6];

      const iso = isoFromShortFrenchDate(day, month, year);
      if (!iso) continue;
      if (iso < startDate || iso > endDate) continue;

      const opponent = prettyRcvOpponent(opponentRaw);
      const key = `${iso}|${normalizeEventKey(opponent)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const displayTime = minute === '00' ? `${hour}h` : `${hour}h${minute}`;

      results.push({
        name: `RC Vannes – ${opponent}`,
        date: prettyLocalEventDate(iso, iso, displayTime),
        lieu: 'Stade de la Rabine',
        impact: 'high',
        note: null,
        url: RCV_TICKETING_URL
      });
    }

    return results;

  } catch (error) {
    console.warn('RC Vannes TOP 14 indisponible:', error.message);
    return [];
  }
}

function mergeEventSources(...sources) {
  const result = [];
  const seen = new Set();

  for (const item of sources.flat()) {
    const key = normalizeEventKey(item.name);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    result.push(item);
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

    // Contextes et sources locales, tous fail-safe.
    const schoolContext = await getSchoolVacationContext(startDate, endDate);
    const holidayContext = await getPublicHolidayContext(startDate, endDate);

    const [villeVannesEvents, rcvTop14Events] = await Promise.all([
      getVilleVannesEvents(startDate, endDate),
      getRcvTop14Events(startDate, endDate)
    ]);

    out.sort((a, b) => new Date(a._begin) - new Date(b._begin));

    const cleanEvents = out
      .slice(0, 40)
      .map(({ _begin, ...item }) => item);

    // Priorité aux sources locales officielles, puis OpenAgenda.
    // Les doublons sont supprimés par nom normalisé.
    const mergedEvents = mergeEventSources(
      rcvTop14Events,
      villeVannesEvents,
      cleanEvents
    );

    const clean = [
      ...holidayContext,
      ...schoolContext,
      ...mergedEvents
    ];

    // Le HTML actuel attend data.text contenant un tableau JSON en texte.
    return response(200, {
      text: JSON.stringify(clean),
      meta: {
        source: 'OpenAgenda',
        agendasFound: agendas.length,
        agendasQueried: settled.length,
        eventsFound: out.length,
        villeVannesFound: villeVannesEvents.length,
        rcvTop14Found: rcvTop14Events.length,
        radiusKm: RADIUS_KM
      }
    });

  } catch (e) {
    console.error('events function error:', e);
    return response(500, { error: e.message || 'Erreur inconnue' });
  }
};
