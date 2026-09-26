const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};

function response(statusCode, obj) {
  return { statusCode, headers: CORS, body: JSON.stringify(obj) };
}

const COMPETENCES = {
  'Virginie':     { rangs: ['Bar','Salle bas','Salle 400','Grand côté','Petit côté','Runner'], shifts: ['Matin'], note: 'Équipe matin stricte : aucun service du soir, aucune fermeture, aucune coupure avec tranche du soir.' },
  'Raphael':      { rangs: ['Bar','Salle bas','Grand côté','Petit côté'], shifts: ['Matin'], note: 'Équipe matin stricte : aucun service du soir, aucune fermeture, aucune coupure avec tranche du soir.' },
  'Seb':          { rangs: ['Bar','Salle bas','Grand côté','Petit côté','Fond'], shifts: ['Matin'], note: 'Équipe matin stricte : aucun service du soir, aucune fermeture, aucune coupure avec tranche du soir.' },
  'Anthony':      { rangs: ['Fond'], shifts: ['Matin'], note: 'Équipe matin stricte : aucun service du soir, aucune fermeture, aucune coupure avec tranche du soir.' },
  'Catherine':    { rangs: ['Salle bas','Salle 400','Petit côté'], shifts: ['Soir','Matin exceptionnel'], note: 'Équipe soir par défaut. Matin uniquement si besoin exceptionnel.' },
  'Ismaël':       { rangs: ['Bar','Salle bas','Salle 400','Grand côté','Petit côté','Fond','Runner'], shifts: ['Matin','Soir'], note: 'Priorité forte aux journées. Soir possible. Éviter les coupures sauf impossibilité de couverture.' },
  'Pierre':       { rangs: ['Bar','Accueil','Runner'], shifts: ['Soir','Matin exceptionnel'], note: 'Équipe soir par défaut. Matin uniquement si besoin exceptionnel.' },
  'Maxence':      { rangs: ['Salle bas','Salle 400','Grand côté','Petit côté','Fond','Runner'], shifts: ['Soir'] },
  'Arthur-Paul':  { rangs: ['Bar','Salle bas','Salle 400','Grand côté','Petit côté','Fond','Runner'], shifts: ['Soir'] },
  'Yoann':        { rangs: ['Salle bas','Salle 400','Grand côté','Petit côté','Fond'], shifts: ['Soir'] },
  'Martin F':     { rangs: ['Salle bas','Salle 400','Grand côté','Petit côté','Fond','Runner'], shifts: ['Soir'] },
  'Antoine':      { rangs: ['Bar','Salle bas','Salle 400','Grand côté','Petit côté','Fond','Runner'], shifts: ['Soir'] },
  'Emile':        { rangs: ['Salle bas','Runner'], shifts: ['Soir'] },
  'Salome':       { rangs: ['Accueil'], shifts: ['Arrivée 10h30/11h'], note: 'Arrive vers 10h30/11h pour panneaux, réservations et préparation accueil. Avant midi elle ne produit pas en service et ne compte dans aucun minimum. À partir de midi : Accueil uniquement. Jamais rang, bar, terrasse, salle ou runner.' },
  'Guillaume':    { rangs: ['Bar'], shifts: [], note: 'Arrêt maladie longue durée : ne pas planifier sauf instruction contraire explicite.' },
  'Erwann':       { rangs: ['Bar','Salle bas','Salle 400','Grand côté','Petit côté','Accueil'], shifts: ['Soir'] },
  'Martin V':     { rangs: ['Bar','Salle bas','Salle 400','Grand côté','Petit côté','Fond','Accueil','Runner'], shifts: ['Matin','Soir'], ghost: true, note: 'FANTÔME : peut apparaître au planning mais peut être mobilisé à L\'Escale. Ne jamais le compter pour atteindre un minimum de couverture.' },
  'Louis':        { rangs: ['Bar','Salle bas','Salle 400','Grand côté','Petit côté','Fond','Accueil','Runner'], shifts: ['Matin','Soir'], ghost: true, note: 'FANTÔME : peut apparaître au planning mais peut être mobilisé à L\'Escale. Ne jamais le compter pour atteindre un minimum de couverture.' }
};

const SHIFT_PREFERENCES = {
  'Virginie': { preferred: ['07h > 16h','08h > 17h','09h > 18h30'], note: 'Matin strict. Pas de soir ni fermeture.' },
  'Raphael': { preferred: ['09h > 17h','07h > 16h','08h > 17h'], note: 'Matin strict. Arrivée souvent décalée.' },
  'Seb': { preferred: ['08h > 17h','07h > 16h','09h > 17h'], note: 'Matin strict. Journée continue.' },
  'Anthony': { preferred: ['10h > 18h30','08h > 17h','07h > 16h','09h > 18h30','11h > 18h30'], note: 'Matin/journée. Renfort décalé. Pas de tranche soir.' },
  'Catherine': { preferred: ['15h > f','16h > f','17h > f','15h > 23h'], note: 'Soir par défaut.' },
  'Ismaël': { preferred: ['09h > 18h30','08h > 18h30','10h > 19h','11h > 20h'], note: 'Journée prioritaire. Soir possible si besoin.' },
  'Pierre': { preferred: ['15h > f','16h > f','17h > f','15h > 23h'], note: 'Soir par défaut.' },
  'Maxence': { preferred: ['15h > f','17h > f','18h > f','16h > f'], note: 'Soir. Arrivées à échelonner.' },
  'Arthur-Paul': { preferred: ['15h > f','16h > f','17h > f','18h > f'], note: 'Soir.' },
  'Yoann': { preferred: ['18h > f','17h > f','15h > f','16h > f'], note: 'Soir. Arrivée tardive fréquente.' },
  'Martin F': { preferred: ['15h > f','16h > f','18h > f','15h > 23h'], note: 'Soir.' },
  'Antoine': { preferred: ['15h > f','16h > f','17h > f','18h > f'], note: 'Soir.' },
  'Emile': { preferred: ['18h > f','17h > f','15h > f','16h > f'], note: 'Soir. Ne pas le surutiliser.' },
  'Salome': { preferred: ['10h > 17h30'], note: 'Accueil uniquement à partir de midi. Shift naturel 10h > 17h30.' },
  'Erwann': { preferred: ['15h > f','16h > f','17h > f','15h > 23h'], note: 'Soir.' },
  'Martin V': { preferred: ['15h > f','17h > f','09h > 17h','16h > f'], note: 'Fantôme : ne compte jamais dans les minimums.' },
  'Louis': { preferred: ['17h > f','18h > f','15h > 23h','10h > 18h30','11h > 20h'], note: 'Fantôme : ne compte jamais dans les minimums.' }
};


const REGLES_SERVICE = `
RÈGLES DE SERVICE L'OCÉAN — Vannes

IMPORTANT — TERMINOLOGIE :
- "Personnel réel" = tous les salariés SAUF Martin V et Louis.
- Martin V et Louis sont des salariés FANTÔMES : ils peuvent être planifiés, mais ils ne comptent JAMAIS dans les minimums de couverture.
- Salome arrive vers 10h30/11h pour tâches hors service (panneaux, réservations, préparation accueil). Avant midi elle ne compte dans aucun minimum opérationnel. À partir de midi : ACCUEIL UNIQUEMENT. Jamais rang, bar, terrasse, salle ou runner.

CAFÉ / MATIN — Mercredi, Samedi, Dimanche uniquement :
- Jusqu'à 10h00 : minimum 2 personnels réels = 1 au bar + 1 en salle/plateau.
- À partir de 10h00 : minimum 3 personnels réels = 1 au bar + 2 au plateau.
- Salome ne compte jamais dans ces besoins.
- Shifts habituels : départ 07h ou 08h, fin 16h ou 17h environ.

SERVICE MIDI — 12h00 à 15h00, tous les jours :
Niveau NORMAL :
- minimum 6 personnels réels opérationnels ;
- 1 personne capable de tenir le bar ;
- 3 personnes capables de tenir la terrasse / plateau ;
- 1 personne capable de tenir l'intérieur ;
- 1 accueil ;
- le runner n'est pas un poste dédié : l'intérieur + l'accueil peuvent absorber le runner si le flux reste calme/normal.
Niveau FORT :
- minimum 7 personnels réels ;
- la 7e personne permet d'avoir un runner réellement dédié.
En cas de mauvais temps :
- rééquilibrer vers l'intérieur, sans réduire le minimum global nécessaire.
Shifts habituels : journée continue autour de 11h → 18h30, ou coupure si réellement nécessaire.

SERVICE SOIR — 18h00 à 23h00 :
Niveau NORMAL :
- minimum 6 personnels réels opérationnels ;
- 1 bar ;
- 3 terrasse / plateau ;
- 1 intérieur ;
- 1 accueil ;
- runner absorbé par intérieur + accueil si le flux le permet.
Niveau FORT :
- minimum 7 personnels réels ;
- la 7e personne devient runner dédié.
Shifts habituels : 15h ou 16h → 23h ou F/01h, ou coupure si nécessaire.

FERMETURE :
- Il faut 5 personnels réels jusqu'à F/01h.
- Peu importe lesquels, à condition que l'équipe restante soit opérationnelle.
- Martin V et Louis ne comptent pas dans ces 5.

RÈGLES INDIVIDUELLES DURES :
- Virginie, Raphael, Seb et Anthony : équipe matin stricte. Aucun service du soir, aucune fermeture, aucune coupure avec tranche du soir.
- Salome : arrivée possible 10h30/11h pour tâches hors service ; avant midi, zéro couverture opérationnelle. À partir de midi : accueil uniquement. Jamais rang, bar, terrasse, salle ou runner.
- Guillaume : arrêt maladie longue durée, ne pas planifier.
- Les jours déjà marqués RH, Vacances, Arrêt maladie ou CFA dans le planning de référence sont VERROUILLÉS et ne doivent jamais être remplacés.

PRÉFÉRENCES FORTES :
- Ismaël : privilégier les journées ; soir possible ; éviter les coupures sauf si la couverture est impossible autrement.
- Pierre et Catherine : équipe soir par défaut ; matin seulement de façon exceptionnelle.
- Martin V et Louis : conserver autant que possible les horaires déjà présents dans le planning de référence, mais ne jamais dépendre d'eux pour couvrir un minimum.

HEURES ET ÉQUILIBRE :
- Viser le contrat hebdomadaire de chaque salarié.
- Zone cible : environ ±2h autour du contrat.
- Ne dépasser cette zone que si une couverture obligatoire serait sinon impossible.
- Maximum absolu : 48h/semaine.
- Réduire les heures supplémentaires.
- Maximum 2 coupures par salarié et par semaine.
- Une coupure est une solution de dernier recours : préférer un horaire continu quand la couverture reste correcte.

RÈGLES CCN CHR :
- Repos minimum 11h entre deux journées de travail.
- Maximum 48h par semaine.
- Maximum 6 jours consécutifs.
- Minimum 2 jours de repos par semaine.
- Amplitude max 13h, coupure incluse.
- Pause de coupure minimum 2h.

ORDRE DE PRIORITÉ EN CAS DE CONFLIT :
1. Statuts verrouillés / repos fixes / interdictions individuelles.
2. Compétences nécessaires.
3. Couverture minimale réelle des services.
4. Règles légales de repos et durée.
5. Heures contractuelles.
6. Stabilité par rapport au planning de référence.
7. Réduction des heures supplémentaires et des coupures.

Si toutes les contraintes sont impossibles à satisfaire :
- ne viole jamais silencieusement une règle dure ;
- conserve la meilleure solution possible ;
- explique clairement dans "notes" ce qui manque et sur quel jour/service.
`;

function formatReferenceDay(d) {
  if (!d) return 'VIDE';
  if (d.status) return d.status;
  if (d.x === true) return 'RH';
  const shifts = Array.isArray(d.shifts) ? d.shifts.filter(s => s && s.s) : [];
  if (!shifts.length) return 'VIDE';
  return shifts.map(s => `${s.s}${s.e ? ' > ' + s.e : ''}`).join(' / ');
}

function lockedReferenceValue(d) {
  if (!d) return null;
  if (d.status === 'Vacances') return 'Vacances';
  if (d.status === 'Arrêt maladie') return 'Arrêt maladie';
  if (d.status === 'CFA') return 'CFA';
  if (d.x === true) return 'RH';
  return null;
}

function isWorkingValue(v) {
  if (!v) return false;
  const s = String(v).trim().toLowerCase();
  return !['rh','repos','absent','vacances','arrêt maladie','arret maladie','cfa','—',''].includes(s);
}

function normalizeStatusValue(v) {
  if (!v) return '';
  const s = String(v).trim().toLowerCase();
  if (s === 'rh' || s === 'repos') return 'RH';
  if (s === 'vacances') return 'Vacances';
  if (s === 'cfa') return 'CFA';
  if (s === 'arrêt maladie' || s === 'arret maladie') return 'Arrêt maladie';
  if (s === 'absent') return 'Absent';
  return '';
}


function normalizeShiftLabel(v) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*>\s*/g, ' > ')
    .replace('01h00', '01h');
}

function isCoupureValue(v) {
  const s = String(v || '').toLowerCase();
  return s.includes('coupure') ||
         /10h\s*-\s*15h/.test(s) ||
         /11h\s*-\s*15h/.test(s) ||
         (s.includes('/') && s.includes('18h'));
}

function allowedContinuousMap(allowedShifts) {
  const map = new Map();
  (allowedShifts || []).forEach(label => {
    const s = String(label || '').trim();
    if (!s || isCoupureValue(s)) return;
    map.set(normalizeShiftLabel(s), s);
  });
  return map;
}

function shiftProfilePool(name, allowedShifts) {
  const map = allowedContinuousMap(allowedShifts);
  const take = labels => labels
    .map(x => map.get(normalizeShiftLabel(x)))
    .filter(Boolean);

  const morning = take([
    '07h > 16h','07h > 17h','08h > 17h','08h > 18h30',
    '09h > 17h','09h > 17h30','09h > 18h','09h > 18h30',
    '10h > 17h30','10h > 18h30','10h > 19h','11h > 18h30'
  ]);

  const day = take([
    '08h > 18h30','09h > 17h30','09h > 18h','09h > 18h30',
    '10h > 17h30','10h > 18h30','10h > 19h',
    '11h > 18h30','11h > 20h','11h > 21h'
  ]);

  const evening = take([
    '15h > 23h','15h > f','15h > 01h',
    '16h > 23h','16h > f','16h > 01h',
    '17h > f','17h > 01h','18h > f','18h > 01h'
  ]);

  if (name === 'Salome') return take(['10h > 17h30']);
  if (['Virginie','Raphael','Seb','Anthony'].includes(name)) return morning;
  if (name === 'Ismaël') return day;
  if (['Pierre','Catherine'].includes(name)) return evening.concat(day);
  if (['Maxence','Arthur-Paul','Yoann','Martin F','Antoine','Emile','Erwann'].includes(name)) return evening;
  if (['Martin V','Louis'].includes(name)) return [...map.values()];
  return [...map.values()];
}

function validatePlanningProposal(planningRows, emps, data) {
  const errors = [];
  const dayKeys = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];

  const byName = new Map((planningRows || []).map(r => [r && r.name, r]));

  (emps || []).forEach((emp, i) => {
    const row = byName.get(emp.name);
    if (!row) {
      errors.push(`${emp.name}: absent de la réponse`);
      return;
    }

    let workedDays = 0;
    dayKeys.forEach((k, di) => {
      const ref = data && data[i] && data[i][di];
      const locked = lockedReferenceValue(ref);
      const proposed = row[k];

      if (locked) {
        if (String(proposed || '').trim().toLowerCase() !== String(locked).trim().toLowerCase()) {
          errors.push(`${emp.name} ${dayKeys[di]}: statut verrouillé ${locked} modifié en ${proposed || 'vide'}`);
        }
        return;
      }

      const proposedStatus = normalizeStatusValue(proposed);
      if (['RH','Vacances','CFA','Arrêt maladie','Absent'].includes(proposedStatus)) {
        errors.push(`${emp.name} ${dayKeys[di]}: statut ${proposedStatus} inventé sur une case libre`);
        return;
      }

      if (isWorkingValue(proposed)) workedDays += 1;
    });

    if (workedDays > 6) {
      errors.push(`${emp.name}: ${workedDays} jours travaillés, maximum autorisé 6`);
    }
  });

  return errors;
}

function referenceOutputValue(d) {
  if (!d) return null;
  if (d.x === true) return 'RH';
  if (d.status === 'Vacances') return 'Vacances';
  if (d.status === 'Arrêt maladie') return 'Arrêt maladie';
  if (d.status === 'CFA') return 'CFA';
  if (d.status === 'Escale') return 'Escale';
  if (d.status === 'Coupure') return 'Coupure 11h-15h/18h-01h';
  if (d.status === 'Coupure2') return 'Coupure 10h-15h/18h-01h';
  if (d.status) return d.status;

  const shifts = Array.isArray(d.shifts)
    ? d.shifts.filter(s => s && s.s && s.s !== '—' && s.e && s.e !== '—')
    : [];
  if (!shifts.length) return null;

  const fmt = t => {
    if (!t) return '';
    const [h,m] = String(t).split(':');
    const hh = String(parseInt(h,10));
    if (t === '01:00') return 'f';
    return m && m !== '00' ? `${hh}h${m}` : `${hh}h`;
  };
  return shifts.map(s => `${fmt(s.s)} > ${fmt(s.e)}`).join(' / ');
}


function shiftStartMinutes(label) {
  const m = String(label || '').match(/^(\d{1,2})h(?:(\d{2}))?\s*>/i);
  if (!m) return 9999;
  return parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0);
}

function chooseHabitualShift(name, allowedShifts, dayStartCounts) {
  const allowed = allowedContinuousMap(allowedShifts);
  const prefs = (SHIFT_PREFERENCES[name]?.preferred || [])
    .map(x => allowed.get(normalizeShiftLabel(x)))
    .filter(Boolean);

  const fallback = shiftProfilePool(name, allowedShifts);
  const pool = prefs.length ? prefs : fallback;
  if (!pool.length) return '';

  let best = '';
  let bestScore = Infinity;

  pool.forEach((label, rank) => {
    const start = shiftStartMinutes(label);
    const sameStartCount = dayStartCounts.get(start) || 0;

    // Preference first, but strongly penalize identical starting times.
    const score = (rank * 2) + (sameStartCount * 6);
    if (score < bestScore) {
      bestScore = score;
      best = label;
    }
  });

  return best;
}

function deterministicHabitualPrefill(planningRows, emps, data, allowedShifts) {
  const dayKeys = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  const byName = new Map((planningRows || []).map(r => [r && r.name, r]));
  const result = [];
  const notes = [];
  const dayStartCounts = dayKeys.map(() => new Map());

  // Copy the sanitized proposal and count existing starts.
  (emps || []).forEach((emp) => {
    const src = byName.get(emp.name) || { name: emp.name };
    const row = { name: emp.name };

    dayKeys.forEach((k, di) => {
      row[k] = src[k] || '';
      if (isWorkingValue(row[k]) && !isCoupureValue(row[k])) {
        const st = shiftStartMinutes(row[k]);
        if (st !== 9999) {
          dayStartCounts[di].set(st, (dayStartCounts[di].get(st) || 0) + 1);
        }
      }
    });

    result.push(row);
  });

  // Fill genuinely free slots with habitual continuous shifts.
  (emps || []).forEach((emp, i) => {
    const row = result[i];
    const profilePool = new Set(
      shiftProfilePool(emp.name, allowedShifts).map(normalizeShiftLabel)
    );

    let worked = dayKeys.filter(k => isWorkingValue(row[k])).length;

    dayKeys.forEach((k, di) => {
      const ref = data && data[i] && data[i][di];

      // Manager-entered content stays untouched.
      if (referenceOutputValue(ref) !== null) return;

      // Keep any valid AI proposal already present.
      if (row[k]) return;

      // Never create a 7/7. Do not invent RH.
      if (worked >= 6) return;

      const candidate = chooseHabitualShift(emp.name, allowedShifts, dayStartCounts[di]);
      if (!candidate) return;

      if (!profilePool.has(normalizeShiftLabel(candidate))) return;

      row[k] = candidate;
      worked += 1;

      const st = shiftStartMinutes(candidate);
      if (st !== 9999) {
        dayStartCounts[di].set(st, (dayStartCounts[di].get(st) || 0) + 1);
      }
    });

    const remaining = dayKeys.filter((k, di) => {
      const ref = data && data[i] && data[i][di];
      return referenceOutputValue(ref) === null && !row[k];
    });

    if (remaining.length) {
      notes.push(`${emp.name}: ${remaining.join(', ')}`);
    }
  });

  return { planning: result, notes };
}

function sanitizePlanningProposal(planningRows, emps, data, allowedShifts) {
  const dayKeys = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  const byName = new Map((planningRows || []).map(r => [r && r.name, r]));
  const cleaned = [];
  const warnings = [];
  const manualCoupureDays = new Set();
  const catalogue = allowedContinuousMap(allowedShifts);

  (emps || []).forEach((emp, i) => {
    const source = byName.get(emp.name) || { name: emp.name };
    const row = { name: emp.name };
    const aiFilled = [];
    const profilePool = new Set(
      shiftProfilePool(emp.name, allowedShifts).map(normalizeShiftLabel)
    );

    dayKeys.forEach((k, di) => {
      const ref = data && data[i] && data[i][di];
      const fixed = referenceOutputValue(ref);

      // Tout ce qui a été saisi par le manager est intouchable.
      if (fixed !== null) {
        row[k] = fixed;
        return;
      }

      const proposed = String(source[k] || '').trim();
      const status = normalizeStatusValue(proposed);

      // L'IA ne crée aucun statut.
      if (['RH','Vacances','CFA','Arrêt maladie','Absent'].includes(status)) {
        row[k] = '';
        warnings.push(`${emp.name} ${dayKeys[di]} : case laissée vide, statut ${status} refusé`);
        return;
      }

      // L'IA ne pose JAMAIS une coupure.
      if (isCoupureValue(proposed)) {
        row[k] = '';
        manualCoupureDays.add(dayKeys[di]);
        warnings.push(`${emp.name} ${dayKeys[di]} : coupure refusée en automatique`);
        return;
      }

      // Vide volontaire = décision humaine ultérieure.
      if (!proposed) {
        row[k] = '';
        return;
      }

      // Le shift doit exister réellement dans le HTML.
      const norm = normalizeShiftLabel(proposed);
      const canonical = catalogue.get(norm);
      if (!canonical) {
        row[k] = '';
        warnings.push(`${emp.name} ${dayKeys[di]} : shift "${proposed}" absent du catalogue`);
        return;
      }

      // Le shift doit appartenir à la famille habituelle du salarié.
      if (!profilePool.has(norm)) {
        row[k] = '';
        warnings.push(`${emp.name} ${dayKeys[di]} : shift ${canonical} incompatible avec son profil habituel`);
        return;
      }

      row[k] = canonical;
      aiFilled.push({ key:k, di });
    });

    // Jamais 7 jours IA. On laisse une case à compléter au lieu d'inventer un RH.
    let worked = dayKeys.filter(k => isWorkingValue(row[k])).length;
    if (worked > 6) {
      const candidates = aiFilled.slice().sort((a,b) => {
        const aWeekend = a.di >= 5 ? 1 : 0;
        const bWeekend = b.di >= 5 ? 1 : 0;
        return aWeekend - bWeekend || b.di - a.di;
      });

      while (worked > 6 && candidates.length) {
        const c = candidates.shift();
        row[c.key] = '';
        worked--;
        warnings.push(`${emp.name} ${dayKeys[c.di]} : laissé à compléter pour éviter 7 jours travaillés`);
      }
    }

    cleaned.push(row);
  });

  return {
    planning: cleaned,
    warnings,
    manualCoupureDays: [...manualCoupureDays]
  };
}



export const handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return response(200, {});
  if (event.httpMethod !== 'POST') return response(405, { error: 'Méthode non autorisée' });

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return response(500, { error: 'GROQ_API_KEY manquante dans Netlify' });

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch(_) { return response(400, { error: 'JSON invalide' }); }

    const { weekDate, emps } = body;
    const context = body.context || {};
    const externalEvents = Array.isArray(context.events) ? context.events : [];
    const weatherByDate = context.weather && typeof context.weather === 'object' ? context.weather : {};
    const allowedShifts = Array.isArray(body.allowedShifts)
      ? [...new Set(body.allowedShifts.map(v => String(v).trim()).filter(Boolean))]
      : [];
    if (!weekDate || !emps) return response(400, { error: 'Paramètres manquants (weekDate, emps)' });

    // Construire la liste des employés disponibles cette semaine
    const days = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
    const isWeekend = [false,false,false,false,false,true,true];
    const cafeMatinDays = ['Mercredi','Samedi','Dimanche'];

    // Date de début
    const mon = new Date(weekDate + 'T12:00:00Z');
    const dateLabels = days.map((_, i) => {
      const d = new Date(mon);
      d.setUTCDate(d.getUTCDate() + i);
      return `${days[i]} ${d.getUTCDate()}/${d.getUTCMonth()+1}`;
    });

    // ------------------------------------------------------------
    // V5.2 COMPACTE : mêmes règles métier, beaucoup moins de tokens.
    // Le modèle complète le squelette existant au lieu de réinventer la semaine.
    // ------------------------------------------------------------

    function roleCodes(comp) {
      const roles = new Set();
      (comp.rangs || []).forEach(r => {
        if (r === 'Bar') roles.add('B');
        if (['Grand côté','Petit côté'].includes(r)) roles.add('T');
        if (['Salle bas','Salle 400','Fond'].includes(r)) roles.add('I');
        if (r === 'Accueil') roles.add('A');
        if (r === 'Runner') roles.add('R');
      });
      return [...roles].join('') || '-';
    }

    function profileCode(name, comp) {
      if (comp.ghost) return 'G';
      if (name === 'Salome') return 'ACC';
      if (['Virginie','Raphael','Seb','Anthony'].includes(name)) return 'M';
      if (name === 'Ismaël') return 'J';
      if (['Pierre','Catherine','Maxence','Arthur-Paul','Yoann','Martin F','Antoine','Emile','Erwann'].includes(name)) return 'S';
      return 'X';
    }

    function compactDay(d) {
      if (!d) return '.';
      if (d.x === true) return 'RH';
      if (d.status === 'Vacances') return 'VAC';
      if (d.status === 'Arrêt maladie') return 'AM';
      if (d.status === 'CFA') return 'CFA';
      if (d.status === 'Escale') return 'ESC';
      if (d.status === 'Coupure') return 'C11';
      if (d.status === 'Coupure2') return 'C10';
      if (d.status) return d.status;
      const shifts = Array.isArray(d.shifts)
        ? d.shifts.filter(s => s && s.s && s.s !== '—' && s.e && s.e !== '—')
        : [];
      if (!shifts.length) return '.';
      return shifts.map(s => `${s.s}-${s.e}`).join('+');
    }

    const teamLines = emps.map((emp, i) => {
      const comp = COMPETENCES[emp.name] || { rangs: [], shifts: [], ghost: false };
      const pref = SHIFT_PREFERENCES[emp.name];
      const currentAllowed = allowedContinuousMap(allowedShifts);
      const prefs = pref && pref.preferred && pref.preferred.length
        ? pref.preferred
            .map(x => currentAllowed.get(normalizeShiftLabel(x)))
            .filter(Boolean)
            .join(',')
        : '-';
      const week = days.map((_, di) => compactDay(body.data?.[i]?.[di])).join('|');
      // IMPORTANT : contrat repris uniquement de la base transmise par le HTML.
      const contract = (emp.contract === undefined || emp.contract === null || emp.contract === '')
        ? '?'
        : emp.contract;
      return `${emp.name};h=${contract};p=${profileCode(emp.name, comp)};r=${roleCodes(comp)};pref=${prefs};w=${week}`;
    }).join('\n');

    const continuousShifts = [...allowedContinuousMap(allowedShifts).values()];
    const allowedCompact = continuousShifts.length
      ? continuousShifts.join(',')
      : 'shifts continus déjà visibles uniquement';

    // Contexte externe volontairement filtré et compacté.
    const relevantEvents = externalEvents
      .filter(ev => {
        const impact = String(ev?.impact || '').toLowerCase();
        return impact.includes('fort') || impact.includes('high') ||
               impact.includes('moy') || impact.includes('medium') ||
               /rc vannes|marathon|vannetaise|no[eë]l|salon|concert|festival|f[ée]ri[ée]|vacances/i.test(String(ev?.name || ''));
      })
      .slice(0, 8)
      .map(ev => `${ev.date || '?'}:${ev.name || 'evt'}${ev.impact ? '['+ev.impact+']' : ''}`)
      .join(';');

    const weatherCompact = Object.entries(weatherByDate)
      .slice(0, 7)
      .map(([date,w]) => `${date}:${w?.max ?? '?'}C/${w?.rainProb ?? '?'}%`)
      .join(';');

    const prompt = `PLAN L'OCEAN ${dateLabels[0]}-${dateLabels[6]}.
Objectif: PRE-REMPLIR le maximum de "." avec les shifts habituels CONTINUS. Tout ce qui est déjà saisi sera imposé par le code et n'est pas une décision IA. Ne laisse vide que si aucune solution habituelle sûre n'existe.

LEGENDE profils: M=matin strict; S=soir défaut; J=journée prioritaire/soir possible; ACC=Salome accueil; G=fantôme.
Rôles: B=bar,T=terrasse,I=intérieur,A=accueil,R=runner.
Semaine w=Lun|Mar|Mer|Jeu|Ven|Sam|Dim. "."=case à compléter.
RH/VAC/AM/CFA = VERROUILLES. ESC=Escale. C11/C10=coupures existantes.

EQUIPE:
${teamLines}

SHIFTS AUTORISES:
${allowedCompact}

REGLES DURES:
1) Sur "." : propose UNIQUEMENT un shift CONTINU présent dans SHIFTS AUTORISES, ou laisse "". JAMAIS RH/VAC/AM/CFA/Absent.
2) Une case déjà avec un horaire/statut est une forte référence: conserve-la sauf impossibilité de couverture/légalité.
3) Maximum 6 jours travaillés; jamais 7/7. Max 48h. Repos entre journées >=11h.
4) M: aucun soir/fermeture/coupure soir. Guillaume non planifié.
5) Salome: avant 12h ne compte pas; dès 12h = accueil seulement.
6) Martin V et Louis (G) peuvent être planifiés mais ne comptent JAMAIS dans les minimums.
7) Normal midi/soir = 6 personnels réels; fort = 7. Fermeture = 5 personnels réels jusqu'à F/01h.
8) Matin mer/sam/dim: jusqu'à 10h = 2 réels (bar+plateau); dès 10h = 3 réels.
9) Echelonne réellement les prises de poste : journée = 07h/08h/09h/10h/11h selon besoin ; soir = 15h/16h/17h/18h selon besoin.
10) Les "pref" sont les habitudes fortes de chaque salarié. Commence par elles avant tout autre shift continu compatible.
11) COUPURES INTERDITES : n'écris jamais C10, C11, "Coupure", ni deux tranches. Si une coupure semble nécessaire, laisse la case "" et indique dans notes : "Coupure manuelle à envisager : [jour] — [raison]".
12) Répartis la charge entre les salariés disponibles. Ne surutilise pas Emile ou un autre pour combler tous les trous.
13) Respecte au mieux le contrat h transmis. N'invente jamais un contrat.
14) Si aucune solution continue sûre n'existe, laisse la case vide. Un préplanning incomplet est préférable à une mauvaise affectation.

CONTEXTE:
events=${relevantEvents || '-'}
meteo=${weatherCompact || '-'}

INTERPRETATION CONTEXTE:
défaut=NORMAL; événement fort peut renforcer le service concerné; beau temps/vacances seuls ne rendent pas automatiquement FORT; pluie déplace vers intérieur.

SORTIE JSON UNIQUEMENT:
{"planning":[{"name":"Prénom","lundi":"...","mardi":"...","mercredi":"...","jeudi":"...","vendredi":"...","samedi":"...","dimanche":"..."}],"notes":"court"}

Pour "." utilise uniquement un shift CONTINU exactement présent dans SHIFTS AUTORISES, sinon "".
Ne génère JAMAIS une coupure. Une éventuelle coupure doit uniquement être signalée dans "notes" pour pose manuelle.
Dans la sortie écris les statuts verrouillés en toutes lettres: RH, Vacances, Arrêt maladie, CFA.`;

    async function callGroq(promptText) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          max_completion_tokens: 2600,
          temperature: 0.1,
          reasoning_effort: 'low',
          include_reasoning: false,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Planification restaurant. Respect absolu des contraintes dures. JSON uniquement.' },
            { role: 'user', content: promptText }
          ]
        })
      });

      if (!groqRes.ok) {
        const err = await groqRes.text();
        throw new Error(`Groq erreur ${groqRes.status}: ${err.slice(0, 350)}`);
      }

      const groqData = await groqRes.json();
      const text = groqData.choices?.[0]?.message?.content || '';
      const a = text.indexOf('{');
      const b = text.lastIndexOf('}');
      if (a < 0 || b < 0) throw new Error('Réponse Groq non parseable');
      try {
        return JSON.parse(text.slice(a, b + 1));
      } catch (_) {
        throw new Error('Réponse Groq non parseable');
      }
    }

    // UNE SEULE requête Groq par clic pour éviter de doubler la consommation TPM.
    const rawPlanning = await callGroq(prompt);

    // Reconstruction déterministe :
    // - tout ce que le manager avait déjà saisi est recopié par le code, pas par l'IA ;
    // - un RH/Vacances/CFA/Arrêt inventé sur une case libre est supprimé et laissé à compléter ;
    // - un éventuel 7/7 est ramené à 6 jours en laissant une case IA à compléter.
    const sanitized = sanitizePlanningProposal(rawPlanning?.planning, emps, body.data, allowedShifts);

    // If Groq leaves too many blanks, the code itself pre-fills them
    // from each employee's habitual continuous shifts.
    const habitual = deterministicHabitualPrefill(
      sanitized.planning,
      emps,
      body.data,
      allowedShifts
    );

    const validationErrors = validatePlanningProposal(habitual.planning, emps, body.data);
    if (validationErrors.length) {
      return response(422, {
        error: 'Préplanning encore invalide après sécurisation',
        details: validationErrors.slice(0, 20)
      });
    }

    const baseNotes = rawPlanning?.notes ? String(rawPlanning.notes) : '';
    const coupureNote = sanitized.manualCoupureDays.length
      ? `Coupure(s) à évaluer et poser MANUELLEMENT si nécessaire : ${sanitized.manualCoupureDays.join(', ')}.`
      : '';
    const humanNote = habitual.notes.length
      ? `À compléter manuellement si nécessaire : ${habitual.notes.join(' ; ')}`
      : '';

    return response(200, {
      planning: {
        planning: habitual.planning,
        notes: [baseNotes, coupureNote, humanNote].filter(Boolean).join(' | ')
      }
    });

  } catch(e) {
    console.error('generate function error:', e);
    return response(500, { error: e.message || 'Erreur inconnue' });
  }
};
