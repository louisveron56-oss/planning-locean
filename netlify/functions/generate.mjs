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
  'Catherine': { preferred: ['15h > F','16h > F','17h > F','15h > 23h'], note: 'Soir par défaut.' },
  'Ismaël': { preferred: ['09h > 18h30','08h > 18h30','10h > 19h','11h > 20h'], note: 'Journée prioritaire. Soir possible si besoin.' },
  'Pierre': { preferred: ['15h > F','16h > F','17h > F','15h > 23h'], note: 'Soir par défaut.' },
  'Maxence': { preferred: ['15h > F','17h > F','18h > F','16h > F'], note: 'Soir. Arrivées à échelonner.' },
  'Arthur-Paul': { preferred: ['15h > F','16h > F','17h > F','18h > F'], note: 'Soir.' },
  'Yoann': { preferred: ['18h > F','17h > F','15h > F','16h > F'], note: 'Soir. Arrivée tardive fréquente.' },
  'Martin F': { preferred: ['15h > F','16h > F','18h > F','15h > 23h'], note: 'Soir.' },
  'Antoine': { preferred: ['15h > F','16h > F','17h > F','18h > F'], note: 'Soir.' },
  'Emile': { preferred: ['18h > F','17h > F','15h > F','16h > F'], note: 'Soir. Ne pas le surutiliser.' },
  'Salome': { preferred: ['10h > 17h30'], note: 'Accueil uniquement à partir de midi. Shift naturel 10h > 17h30.' },
  'Erwann': { preferred: ['15h > F','16h > F','17h > F','15h > 23h'], note: 'Soir.' },
  'Martin V': { preferred: ['15h > F','17h > F','09h > 17h','16h > F'], note: 'Fantôme : ne compte jamais dans les minimums.' },
  'Louis': { preferred: ['17h > F','18h > F','15h > 23h','10h > 18h30','11h > 20h'], note: 'Fantôme : ne compte jamais dans les minimums.' }
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

COUVERTURE OPÉRATIONNELLE À RESPECTER :
- MIDI 12h–15h : 5 opérationnels minimum HORS Salome/Accueil, Martin V et Louis.
- APRÈS-MIDI 15h–18h : 4 opérationnels minimum HORS Salome, Martin V et Louis.
- À 18h00–18h30 : conserver au moins 2 salariés de JOURNÉE encore présents jusqu'à 18h30 pour permettre la rotation des repas de l'équipe du soir.
- SOIR : 5 opérationnels minimum HORS Salome/Accueil, Martin V et Louis.
- FERMETURE : 5 opérationnels réels jusqu'à F/01h.
- Si l'équipe du soir est surdimensionnée alors que le midi est trop faible, basculer un salarié soir compatible sur une journée continue plutôt que laisser 4 au midi et 8 le soir.

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


function normalizeShiftLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/01h00/g, '01h')
    .replace(/>\s*f\b/g, '> 01h')
    .replace(/>\s*01h\b/g, '> 01h');
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
    '15h > 23h','15h > F','15h > F',
    '16h > 23h','16h > F','16h > F',
    '17h > F','17h > F','18h > F','18h > F'
  ]);

  if (name === 'Salome') return take(['10h > 17h30']);
  if (['Virginie','Raphael','Seb','Anthony'].includes(name)) return morning;
  if (name === 'Ismaël') return day;
  if (['Pierre','Catherine'].includes(name)) return evening.concat(day);
  if (['Maxence','Arthur-Paul','Yoann','Martin F','Antoine','Emile','Erwann'].includes(name)) return evening;

  // Martin V et Louis sont gérés manuellement, jamais par l'IA.
  if (['Martin V','Louis'].includes(name)) return [];

  // DEFAULT: tout nouvel employé non configuré = SOIR STANDARD.
  return evening;
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

function chooseHabitualShift(name, allowedShifts, dayStartCounts, remainingHours, usedLabels) {
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
    const shiftHours = parseShiftHoursLabel(label) || 0;
    const sameLabelCount = usedLabels.get(normalizeShiftLabel(label)) || 0;

    // Lower is better:
    // - keep employee preferences,
    // - avoid cloning the exact same shift all week,
    // - avoid same starts across the team,
    // - move toward the employee's contract target.
    let score = rank * 1.5;
    score += sameStartCount * 3.5;
    score += sameLabelCount * 2.5;

    if (remainingHours !== null) {
      score += Math.abs(remainingHours - shiftHours) * 1.2;
      if (shiftHours > remainingHours + 2) score += 8;
    }

    if (score < bestScore) {
      bestScore = score;
      best = label;
    }
  });

  return best;
}


function parseShiftHoursLabel(label) {
  const s = String(label || '').trim().toLowerCase();
  if (!s || isCoupureValue(s)) return null;
  const m = s.match(/^(\d{1,2})h(?:(\d{2}))?\s*>\s*(f|01h|23h|(\d{1,2})h(?:(\d{2}))?)$/i);
  if (!m) return null;

  const sh = parseInt(m[1],10);
  const sm = m[2] ? parseInt(m[2],10) : 0;

  let eh, em;
  if (m[3] === 'f' || m[3] === '01h') {
    eh = 1; em = 0;
  } else if (m[3] === '23h') {
    eh = 23; em = 0;
  } else {
    eh = parseInt(m[4],10);
    em = m[5] ? parseInt(m[5],10) : 0;
  }

  let start = sh * 60 + sm;
  let end = eh * 60 + em;
  if (end <= start) end += 24 * 60;
  return (end - start) / 60;
}

function currentPlannedHours(row) {
  const dayKeys = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  return dayKeys.reduce((sum,k) => {
    const h = parseShiftHoursLabel(row[k]);
    return sum + (h || 0);
  }, 0);
}

function contractTargetHours(emp) {
  if (!emp) return null;

  if (emp.name === 'Arthur-Paul') return 35;

  // Martin V et Louis sont volontairement exclus de l'automatisation.
  if (['Martin V','Louis'].includes(emp.name)) return null;

  const knownSpecial = ['Virginie','Raphael','Seb','Anthony','Salome','Ismaël'];
  if (knownSpecial.includes(emp.name)) {
    const n = Number(emp.contract);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  // DEFAULT: tout autre employé = profil soir standard 42h.
  return 42;
}


function isCoreEveningEmployee(name) {
  if (['Martin V','Louis','Virginie','Raphael','Seb','Anthony','Salome','Ismaël'].includes(name)) return false;
  return true;
}

function eveningShiftCandidates(allowedShifts) {
  const allowed = allowedContinuousMap(allowedShifts);
  const wanted = ['15h > F','16h > F','17h > F','18h > F','15h > F','16h > F','17h > F','18h > F'];
  const seen = new Set(), out = [];
  wanted.forEach(x => {
    const v=allowed.get(normalizeShiftLabel(x));
    if(v&&!seen.has(normalizeShiftLabel(v))){
      seen.add(normalizeShiftLabel(v));out.push(v);
    }
  });
  return out;
}

function chooseBalancedEveningShift(name, empIndex, dayIndex, allowedShifts, dayStartCounts, remainingHours, remainingFreeDays, usedLabels) {
  const pool = eveningShiftCandidates(allowedShifts);
  if (!pool.length) return '';

  // Rotating preferred start by employee/day prevents Pierre always 15h and Yoann always 18h.
  const rotation = [15*60,16*60,17*60,18*60];
  const desiredStart = rotation[(empIndex + dayIndex) % rotation.length];
  const idealHours = remainingFreeDays > 0 ? remainingHours / remainingFreeDays : remainingHours;

  let best='',bestScore=Infinity;
  pool.forEach(label => {
    const start=shiftStartMinutes(label);
    const hours=parseShiftHoursLabel(label)||0;
    const dayCount=dayStartCounts.get(start)||0;
    const sameCount=usedLabels.get(normalizeShiftLabel(label))||0;

    let score=0;
    // Primary: land near the 42h/35h target.
    score += Math.abs(hours-idealHours)*4.0;
    // Strongly spread arrivals each evening.
    score += dayCount*7.0;
    // Rotate each employee's arrival across the week.
    score += Math.abs(start-desiredStart)/60*1.6;
    // Avoid repeating exact same shift all week.
    score += sameCount*3.0;

    // Avoid overshooting the remaining weekly target too heavily.
    if(hours>remainingHours+1.5)score+=15;

    if(score<bestScore){bestScore=score;best=label;}
  });
  return best;
}


function shiftBoundsMinutes(label) {
  const s = String(label || '').trim().toLowerCase();
  if (!s || isCoupureValue(s)) return null;

  const m = s.match(/^(\d{1,2})h(?:(\d{2}))?\s*>\s*(f|01h|23h|(\d{1,2})h(?:(\d{2}))?)$/i);
  if (!m) return null;

  const start = parseInt(m[1],10) * 60 + (m[2] ? parseInt(m[2],10) : 0);

  let end;
  if (m[3] === 'f' || m[3] === '01h') {
    end = 25 * 60; // 01:00 the following day
  } else if (m[3] === '23h') {
    end = 23 * 60;
  } else {
    end = parseInt(m[4],10) * 60 + (m[5] ? parseInt(m[5],10) : 0);
    if (end <= start) end += 24 * 60;
  }

  return { start, end };
}

function isOperationalForCoverage(name) {
  return !['Salome','Martin V','Louis'].includes(name);
}

function coversWholeWindow(label, startMinute, endMinute) {
  const b = shiftBoundsMinutes(label);
  return !!b && b.start <= startMinute && b.end >= endMinute;
}

function isDayBridgeShift(label) {
  const b = shiftBoundsMinutes(label);
  if (!b) return false;
  // Must already be a day worker, not an evening arrival,
  // and still be present at least until 18:30.
  return b.start <= 12 * 60 && b.end >= 18 * 60 + 30;
}

function isClosingShift(label) {
  const b = shiftBoundsMinutes(label);
  return !!b && b.end >= 25 * 60;
}

function coverageSnapshot(planning, emps, dayKey) {
  let midi = 0;
  let afternoon = 0;
  let bridge1830 = 0;
  let evening = 0;
  let closing = 0;

  (emps || []).forEach((emp, i) => {
    if (!isOperationalForCoverage(emp.name)) return;
    const row = planning[i];
    if (!row) return;
    const label = row[dayKey];
    if (!isWorkingValue(label) || isCoupureValue(label)) return;

    if (coversWholeWindow(label, 12*60, 15*60)) midi++;
    if (coversWholeWindow(label, 15*60, 18*60)) afternoon++;
    if (isDayBridgeShift(label)) bridge1830++;
    if (coversWholeWindow(label, 18*60+30, 23*60)) evening++;
    if (isClosingShift(label)) closing++;
  });

  return { midi, afternoon, bridge1830, evening, closing };
}

function allowedDayCoverageShifts(allowedShifts) {
  const allowed = allowedContinuousMap(allowedShifts);
  const wanted = [
    '08h > 18h30',
    '09h > 18h30',
    '10h > 18h30',
    '10h > 19h',
    '11h > 18h30',
    '11h > 20h',
    '11h > 21h'
  ];

  const out = [];
  const seen = new Set();
  wanted.forEach(x => {
    const v = allowed.get(normalizeShiftLabel(x));
    if (v && !seen.has(normalizeShiftLabel(v))) {
      seen.add(normalizeShiftLabel(v));
      out.push(v);
    }
  });
  return out;
}

function chooseDayCoverageShift(currentLabel, allowedShifts, needBridge) {
  const pool = allowedDayCoverageShifts(allowedShifts)
    .filter(label => {
      const b = shiftBoundsMinutes(label);
      if (!b) return false;
      if (!coversWholeWindow(label, 12*60, 15*60)) return false;
      if (!coversWholeWindow(label, 15*60, 18*60)) return false;
      if (needBridge && b.end < 18*60+30) return false;
      return true;
    });

  if (!pool.length) return '';

  const currentHours = parseShiftHoursLabel(currentLabel);
  let best = '';
  let bestScore = Infinity;

  pool.forEach(label => {
    const h = parseShiftHoursLabel(label) || 0;
    const b = shiftBoundsMinutes(label);
    let score = 0;

    // Preserve weekly hours as much as possible when converting a shift.
    if (currentHours !== null) score += Math.abs(h - currentHours) * 4;

    // Prefer later starts to avoid unnecessary morning hours.
    score += Math.max(0, (12*60 - b.start) / 60) * 0.25;

    // 18:30 / 19:00 is ideal for the dinner rotation;
    // longer shifts are used when their duration better matches the employee's hours.
    score += Math.abs(b.end - (18*60+30)) / 60 * 0.15;

    if (score < bestScore) {
      bestScore = score;
      best = label;
    }
  });

  return best;
}

function closingShiftCandidates(allowedShifts) {
  return eveningShiftCandidates(allowedShifts)
    .filter(label => isClosingShift(label));
}

function chooseClosingShift(currentLabel, allowedShifts) {
  const pool = closingShiftCandidates(allowedShifts);
  if (!pool.length) return '';

  const currentHours = parseShiftHoursLabel(currentLabel);
  let best = '';
  let bestScore = Infinity;

  pool.forEach(label => {
    const h = parseShiftHoursLabel(label) || 0;
    const start = shiftStartMinutes(label);
    let score = 0;

    if (currentHours !== null) score += Math.abs(h - currentHours) * 3;
    // Prefer later arrivals when there is no coverage reason to start earlier.
    score += Math.abs(start - 17*60) / 60 * 0.5;

    if (score < bestScore) {
      bestScore = score;
      best = label;
    }
  });

  return best;
}

function coverageCandidateScore(emp, currentLabel, targetHours, row) {
  const comp = (typeof COMPETENCES !== 'undefined' && COMPETENCES[emp.name]) || {};
  const versatility = Array.isArray(comp.rangs) ? comp.rangs.length : 0;
  const currentHours = currentPlannedHours(row);
  const gap = targetHours === null ? 0 : (targetHours - currentHours);

  let score = 0;
  // More versatile employees first.
  score -= versatility * 2;
  // Prefer people who still need hours.
  score -= Math.max(-4, Math.min(8, gap));
  // Prefer converting a long evening shift rather than a short one:
  // it better preserves the 42h weekly target.
  score -= (parseShiftHoursLabel(currentLabel) || 0) * 0.4;
  return score;
}


function stripAccents(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function eventDayIndex(ev, weekDate) {
  const days = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  const txt = stripAccents(`${ev?.date || ''} ${ev?.name || ''}`).toLowerCase();

  for (let i=0;i<days.length;i++) {
    if (txt.includes(days[i])) return i;
  }

  // Numeric fallback: dd/mm or ISO in event date text.
  const mon = new Date(`${weekDate}T12:00:00Z`);
  const candidates = [];
  for (let i=0;i<7;i++) {
    const d = new Date(mon);
    d.setUTCDate(d.getUTCDate()+i);
    candidates.push({
      i,
      iso: d.toISOString().slice(0,10),
      d: d.getUTCDate(),
      m: d.getUTCMonth()+1
    });
  }

  for (const c of candidates) {
    if (txt.includes(c.iso)) return c.i;
    const patterns = [
      `${c.d}/${c.m}`,
      `${String(c.d).padStart(2,'0')}/${String(c.m).padStart(2,'0')}`
    ];
    if (patterns.some(p => txt.includes(p))) return c.i;
  }

  return -1;
}

function eventStartHour(ev) {
  const txt = String(ev?.date || '');
  // Take first explicit hh:mm / hh format.
  const m = txt.match(/\b([01]?\d|2[0-3])\s*[h:]\s*(\d{2})?\b/i);
  if (!m) return null;
  return parseInt(m[1],10) + ((m[2] ? parseInt(m[2],10) : 0) / 60);
}

function isStrongLocalEvent(ev) {
  const impact = String(ev?.impact || '').toLowerCase();
  const type = String(ev?.type || '').toLowerCase();
  const name = stripAccents(ev?.name || '').toLowerCase();
  const note = stripAccents(ev?.note || '').toLowerCase();

  if (impact !== 'high' && !impact.includes('fort')) return false;

  // RCV away / relocated do not drive Vannes staffing.
  if (type === 'rcv_away' || type === 'rcv_home_relocated') return false;
  if (note.includes('information uniquement')) return false;
  if (note.includes('ne pas renforcer automatiquement')) return false;

  // Local major-event vocabulary.
  return (
    type === 'major_local_event' ||
    type === 'rcv_home' ||
    /marathon|vannetaise|rc vannes|festival|concert|salon|foire|braderie|regate|regate|carnaval|championnat|tournoi|noel|grande roue/.test(name)
  );
}

function serviceTargetsForDay(dayIndex, weekDate, externalEvents) {
  const normal = {
    midi: 5,
    afternoon: 4,
    bridge1830: 2,
    evening: 5,
    closing: 5,
    strong: false,
    reasons: []
  };

  const relevant = (externalEvents || []).filter(ev =>
    isStrongLocalEvent(ev) && eventDayIndex(ev, weekDate) === dayIndex
  );

  if (!relevant.length) return normal;

  const target = { ...normal, reasons: [] };

  relevant.forEach(ev => {
    const h = eventStartHour(ev);
    const label = ev?.name || 'événement fort';
    target.strong = true;
    target.reasons.push(`${label}${h === null ? '' : ` (${h.toFixed(h%1 ? 1 : 0)}h)`}`);

    // Unknown / all-day event: reinforce the whole commercial day.
    if (h === null) {
      target.midi = Math.max(target.midi, 7);
      target.afternoon = Math.max(target.afternoon, 5);
      target.evening = Math.max(target.evening, 7);
      return;
    }

    // Event early in the day: mainly lunch + afternoon.
    if (h < 14) {
      target.midi = Math.max(target.midi, 7);
      target.afternoon = Math.max(target.afternoon, 5);
      return;
    }

    // 14h–18h30: pre-event lunch + event flow + post-event dinner.
    // Example: RCV at 16h => 7 lunch, 5 afternoon, 7 evening.
    if (h <= 18.5) {
      target.midi = Math.max(target.midi, 7);
      target.afternoon = Math.max(target.afternoon, 5);
      target.evening = Math.max(target.evening, 7);
      return;
    }

    // 18h30–20h30: afternoon transition + evening affected.
    if (h <= 20.5) {
      target.afternoon = Math.max(target.afternoon, 5);
      target.evening = Math.max(target.evening, 7);
      return;
    }

    // Late event (e.g. 21h): dinner affected, not lunch.
    target.evening = Math.max(target.evening, 7);
  });

  return target;
}

function rebalanceCoverage(planning, emps, data, allowedShifts, weekDate, externalEvents) {
  const dayKeys = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  const notes = [];

  function isManagerFixed(i, di) {
    const ref = data && data[i] && data[i][di];
    return referenceOutputValue(ref) !== null;
  }

  function candidateIndexes(di, onlyScheduled) {
    return (emps || [])
      .map((emp, i) => ({ emp, i }))
      .filter(({emp, i}) => {
        if (!isOperationalForCoverage(emp.name)) return false;
        if (['Virginie','Raphael','Seb','Anthony','Salome','Ismaël'].includes(emp.name)) return false;
        if (['Martin V','Louis'].includes(emp.name)) return false;
        if (isManagerFixed(i, di)) return false;

        const v = planning[i] && planning[i][dayKeys[di]];
        if (onlyScheduled) {
          return isWorkingValue(v) && !isCoupureValue(v);
        }
        return !v;
      })
      .sort((a,b) => {
        const va = planning[a.i] ? planning[a.i][dayKeys[di]] : '';
        const vb = planning[b.i] ? planning[b.i][dayKeys[di]] : '';
        return coverageCandidateScore(
          a.emp, va, contractTargetHours(a.emp), planning[a.i]
        ) - coverageCandidateScore(
          b.emp, vb, contractTargetHours(b.emp), planning[b.i]
        );
      })
      .map(x => x.i);
  }

  function canLoseClosing(i, di) {
    const key = dayKeys[di];
    const current = planning[i][key];
    if (!isClosingShift(current)) return true;

    const snap = coverageSnapshot(planning, emps, key);
    const target = serviceTargetsForDay(di, weekDate, externalEvents);
    return snap.closing > target.closing;
  }

  function convertScheduledToDay(di, needBridge) {
    const key = dayKeys[di];
    const candidates = candidateIndexes(di, true);

    for (const i of candidates) {
      const current = planning[i][key];
      const bounds = shiftBoundsMinutes(current);
      if (!bounds) continue;

      // Only repurpose people who are currently on a predominantly evening shift.
      if (bounds.start < 15*60) continue;
      if (!canLoseClosing(i, di)) continue;

      const replacement = chooseDayCoverageShift(current, allowedShifts, needBridge);
      if (!replacement) continue;

      planning[i][key] = replacement;
      return true;
    }

    return false;
  }

  function addFreeDayWorker(di, needBridge) {
    const key = dayKeys[di];
    const candidates = candidateIndexes(di, false);

    for (const i of candidates) {
      const emp = emps[i];
      const row = planning[i];
      const target = contractTargetHours(emp);
      const currentHours = currentPlannedHours(row);

      if (target !== null && currentHours >= target + 1.5) continue;

      const replacement = chooseDayCoverageShift('', allowedShifts, needBridge);
      if (!replacement) continue;

      const h = parseShiftHoursLabel(replacement) || 0;
      if (target !== null && currentHours + h > target + 2) continue;

      row[key] = replacement;
      return true;
    }

    return false;
  }

  function ensureClosing(di) {
    const key = dayKeys[di];
    const target = serviceTargetsForDay(di, weekDate, externalEvents);

    while (coverageSnapshot(planning, emps, key).closing < target.closing) {
      let changed = false;

      // First, extend an existing evening employee to F.
      const scheduled = candidateIndexes(di, true);
      for (const i of scheduled) {
        const current = planning[i][key];
        const b = shiftBoundsMinutes(current);
        if (!b || b.start < 15*60 || isClosingShift(current)) continue;

        const replacement = chooseClosingShift(current, allowedShifts);
        if (!replacement) continue;

        planning[i][key] = replacement;
        changed = true;
        break;
      }

      if (changed) continue;

      // Then add a free evening employee if contract room exists.
      const free = candidateIndexes(di, false);
      for (const i of free) {
        const emp = emps[i];
        const row = planning[i];
        const target = contractTargetHours(emp);
        const currentHours = currentPlannedHours(row);
        const replacement = chooseClosingShift('', allowedShifts);
        if (!replacement) continue;

        const h = parseShiftHoursLabel(replacement) || 0;
        if (target !== null && currentHours + h > target + 2) continue;

        row[key] = replacement;
        changed = true;
        break;
      }

      if (!changed) break;
    }
  }

  dayKeys.forEach((key, di) => {
    const TARGET = serviceTargetsForDay(di, weekDate, externalEvents);

    // 1) Protect the minimum number of closers first.
    ensureClosing(di);

    // 2) Repair lunch / afternoon / 18:30 bridge by converting surplus evening staff.
    let guard = 0;
    while (guard++ < 12) {
      const snap = coverageSnapshot(planning, emps, key);

      const needMidi = snap.midi < TARGET.midi;
      const needAfternoon = snap.afternoon < TARGET.afternoon;
      const needBridge = snap.bridge1830 < TARGET.bridge1830;

      if (!needMidi && !needAfternoon && !needBridge) break;

      // The replacement shifts all cover lunch + afternoon.
      // When the 18:30 bridge is short, force an end >=18:30.
      const changed =
        convertScheduledToDay(di, needBridge) ||
        addFreeDayWorker(di, needBridge);

      if (!changed) break;

      // A conversion may reduce closers: restore them immediately if needed.
      ensureClosing(di);
    }

    // 3) Final audit.
    const final = coverageSnapshot(planning, emps, key);

    if (TARGET.strong) {
      notes.push(`${key}: niveau FORT — ${TARGET.reasons.join(' + ')} | cibles midi=${TARGET.midi}, après-midi=${TARGET.afternoon}, soir=${TARGET.evening}`);
    }

    if (final.midi < TARGET.midi) {
      notes.push(`${key}: midi ${final.midi}/${TARGET.midi} opérationnels hors accueil`);
    }
    if (final.afternoon < TARGET.afternoon) {
      notes.push(`${key}: après-midi ${final.afternoon}/${TARGET.afternoon} opérationnels`);
    }
    if (final.bridge1830 < TARGET.bridge1830) {
      notes.push(`${key}: seulement ${final.bridge1830}/${TARGET.bridge1830} shifts journée présents jusqu'à 18h30`);
    }
    if (final.evening < TARGET.evening) {
      notes.push(`${key}: soir ${final.evening}/${TARGET.evening} opérationnels`);
    }
    if (final.closing < TARGET.closing) {
      notes.push(`${key}: fermeture ${final.closing}/${TARGET.closing} jusqu'à F`);
    }
  });

  return { planning, notes };
}

function deterministicHabitualPrefill(planningRows, emps, data, allowedShifts, weekDate, externalEvents) {
  const dayKeys = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  const byName = new Map((planningRows || []).map(r => [r && r.name, r]));
  const result = [];
  const notes = [];
  const dayStartCounts = dayKeys.map(() => new Map());

  // Start from manager-entered content + sanitized proposal.
  (emps || []).forEach((emp, i) => {
    const src = byName.get(emp.name) || { name: emp.name };
    const row = { name: emp.name };

    dayKeys.forEach((k, di) => {
      const ref = data && data[i] && data[i][di];
      const fixed = referenceOutputValue(ref);

      // Manager input is always preserved.
      if (fixed !== null) {
        row[k] = fixed;
      } else if (['Martin V','Louis'].includes(emp.name)) {
        // These two rows are 100% manual: AI never writes a free cell.
        row[k] = '';
      } else if (isCoreEveningEmployee(emp.name)) {
        // For the core evening team, discard Groq's free-cell choice.
        // The deterministic balancer will rebuild it to alternate arrivals + hit target hours.
        row[k] = '';
      } else {
        row[k] = src[k] || '';
      }
    });

    result.push(row);
  });

  // Count only preserved assignments before generating new ones.
  result.forEach(row => {
    dayKeys.forEach((k,di) => {
      if(isWorkingValue(row[k])&&!isCoupureValue(row[k])){
        const st=shiftStartMinutes(row[k]);
        if(st!==9999)dayStartCounts[di].set(st,(dayStartCounts[di].get(st)||0)+1);
      }
    });
  });

  // Core evening team first: balance 42h targets (Arthur-Paul 35h) and rotate starts.
  (emps || []).forEach((emp, i) => {
    if(!isCoreEveningEmployee(emp.name))return;

    const row=result[i];
    const target=contractTargetHours(emp);
    let planned=currentPlannedHours(row);
    let worked=dayKeys.filter(k=>isWorkingValue(row[k])).length;
    const usedLabels=new Map();

    dayKeys.forEach(k=>{
      if(isWorkingValue(row[k])){
        const nk=normalizeShiftLabel(row[k]);
        usedLabels.set(nk,(usedLabels.get(nk)||0)+1);
      }
    });

    const freeDays=dayKeys.filter((k,di)=>{
      const ref=data&&data[i]&&data[i][di];
      return referenceOutputValue(ref)===null;
    });

    freeDays.forEach((k,pos)=>{
      if(worked>=6)return;
      if(target!==null && planned>=target-0.5)return;

      const remaining=Math.max(0,(target||planned)-planned);
      const remainingSlots=freeDays.length-pos;
      const candidate=chooseBalancedEveningShift(
        emp.name,i,dayKeys.indexOf(k),allowedShifts,dayStartCounts[dayKeys.indexOf(k)],
        remaining,remainingSlots,usedLabels
      );
      if(!candidate)return;

      const h=parseShiftHoursLabel(candidate);
      if(!h)return;

      // Do not overshoot target by more than 2h.
      if(target!==null && planned+h>target+2)return;

      row[k]=candidate;
      planned+=h;worked++;

      const nk=normalizeShiftLabel(candidate);
      usedLabels.set(nk,(usedLabels.get(nk)||0)+1);
      const st=shiftStartMinutes(candidate);
      if(st!==9999){
        const di=dayKeys.indexOf(k);
        dayStartCounts[di].set(st,(dayStartCounts[di].get(st)||0)+1);
      }
    });

    if(target!==null){
      const delta=Math.round((planned-target)*10)/10;
      if(Math.abs(delta)>2){
        notes.push(`${emp.name}: ${planned.toFixed(1)}h / cible ${target}h (${delta>0?'+':''}${delta}h)`);
      }
    }
  });

  // Other employees: habitual prefill, respecting their real contract when known.
  const order=(emps||[]).map((emp,i)=>{
    if(isCoreEveningEmployee(emp.name))return null;
    const row=result[i],target=contractTargetHours(emp),current=currentPlannedHours(row);
    return {emp,i,target,current,gap:target===null?0:Math.max(0,target-current)};
  }).filter(Boolean).sort((a,b)=>b.gap-a.gap);

  order.forEach(item=>{
    const emp=item.emp,i=item.i,row=result[i];
    const profilePool=new Set(shiftProfilePool(emp.name,allowedShifts).map(normalizeShiftLabel));
    const usedLabels=new Map();
    dayKeys.forEach(k=>{
      if(isWorkingValue(row[k])){
        const nk=normalizeShiftLabel(row[k]);
        usedLabels.set(nk,(usedLabels.get(nk)||0)+1);
      }
    });

    let worked=dayKeys.filter(k=>isWorkingValue(row[k])).length;
    let planned=currentPlannedHours(row);
    const target=contractTargetHours(emp);

    dayKeys.forEach((k,di)=>{
      const ref=data&&data[i]&&data[i][di];
      if(referenceOutputValue(ref)!==null)return;
      if(row[k])return;
      if(worked>=6)return;
      if(target!==null&&planned>=target-1.5)return;

      const remaining=target===null?null:Math.max(0,target-planned);
      const candidate=chooseHabitualShift(emp.name,allowedShifts,dayStartCounts[di],remaining,usedLabels);
      if(!candidate||!profilePool.has(normalizeShiftLabel(candidate)))return;
      const h=parseShiftHoursLabel(candidate);if(!h)return;
      if(target!==null&&planned+h>target+2)return;

      row[k]=candidate;planned+=h;worked++;
      const nk=normalizeShiftLabel(candidate);
      usedLabels.set(nk,(usedLabels.get(nk)||0)+1);
      const st=shiftStartMinutes(candidate);
      if(st!==9999)dayStartCounts[di].set(st,(dayStartCounts[di].get(st)||0)+1);
    });
  });

  // Coverage pass AFTER individual-hours balancing.
  // This is the key operational layer: the service curve has priority over
  // keeping every "evening" employee on an evening-only shift.
  const coverageBalanced = rebalanceCoverage(result, emps, data, allowedShifts, weekDate, externalEvents);
  notes.push(...coverageBalanced.notes);

  // Human notes only for remaining truly free cells / target gaps.
  (emps||[]).forEach((emp,i)=>{
    const row=coverageBalanced.planning[i];
    const remainingCells=dayKeys.filter((k,di)=>{
      const ref=data&&data[i]&&data[i][di];
      return referenceOutputValue(ref)===null&&!row[k];
    });
    if(remainingCells.length)notes.push(`${emp.name}: ${remainingCells.join(', ')} à compléter si besoin`);
  });

  return {planning:coverageBalanced.planning,notes};
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

      // Martin V et Louis restent entièrement manuels.
      if (['Martin V','Louis'].includes(emp.name)) {
        row[k] = '';
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




function buildCoverageAudit(planning, emps, weekDate, externalEvents) {
  const dayKeys = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];

  return dayKeys.map((key, di) => {
    const counts = coverageSnapshot(planning, emps, key);
    const targets = serviceTargetsForDay(di, weekDate, externalEvents);

    const deficits = [];
    if (counts.midi < targets.midi) deficits.push(`Midi ${counts.midi}/${targets.midi}`);
    if (counts.afternoon < targets.afternoon) deficits.push(`Après-midi ${counts.afternoon}/${targets.afternoon}`);
    if (counts.bridge1830 < targets.bridge1830) deficits.push(`18h30 ${counts.bridge1830}/${targets.bridge1830}`);
    if (counts.evening < targets.evening) deficits.push(`Soir ${counts.evening}/${targets.evening}`);
    if (counts.closing < targets.closing) deficits.push(`Fermeture ${counts.closing}/${targets.closing}`);

    return {
      day: key,
      level: targets.strong ? 'FORT' : 'NORMAL',
      reasons: targets.reasons || [],
      counts: {
        midi: counts.midi,
        afternoon: counts.afternoon,
        bridge1830: counts.bridge1830,
        evening: counts.evening,
        closing: counts.closing
      },
      targets: {
        midi: targets.midi,
        afternoon: targets.afternoon,
        bridge1830: targets.bridge1830,
        evening: targets.evening,
        closing: targets.closing
      },
      deficits,
      ok: deficits.length === 0
    };
  });
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
      if (['Martin V','Louis'].includes(name)) return 'MAN';
      if (name === 'Salome') return 'ACC';
      if (['Virginie','Raphael','Seb','Anthony'].includes(name)) return 'M';
      if (name === 'Ismaël') return 'J';
      // DEFAULT: nouvel employé non configuré = soir standard 42h.
      return 'S';
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

LEGENDE profils: M=matin strict; S=soir standard 42h; J=journée prioritaire/soir possible; ACC=Salome accueil; MAN=manuel uniquement.
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
6) Martin V et Louis = MANUEL UNIQUEMENT : ne leur propose aucun shift sur une case libre et ne les compte jamais dans les minimums.
7) Normal midi/soir = 6 personnels réels; fort = 7. Fermeture = 5 personnels réels jusqu'à F/01h.
8) Matin mer/sam/dim: jusqu'à 10h = 2 réels (bar+plateau); dès 10h = 3 réels.
9) Echelonne réellement les prises de poste : journée = 07h/08h/09h/10h/11h selon besoin ; soir = 15h/16h/17h/18h selon besoin.
10) Les "pref" sont des habitudes, PAS un copier-coller obligatoire. Varie les shifts d'un même salarié quand plusieurs habitudes sont compatibles.
11) ÉQUILIBRE HEURES : tout profil S = cible 42h par défaut ; Arthur-Paul apprenti = 35h. Fais tourner les départs 15h/16h/17h/18h : personne ne doit être systématiquement à 15h ou systématiquement à 18h. Un nouvel employé non configuré est automatiquement S/42h.
12) COUVERTURE OPÉRATIONNELLE PRIORITAIRE : Salome/Accueil, Martin V et Louis ne comptent PAS dans les effectifs ci-dessous.
- NIVEAU NORMAL :
  - MIDI 12h–15h : minimum 5 opérationnels + Salome/Accueil en plus.
  - APRÈS-MIDI 15h–18h : minimum 4 opérationnels.
  - ROTATION REPAS DU SOIR : minimum 2 salariés de JOURNÉE encore présents jusqu'à 18h30 au minimum.
  - SOIR : minimum 5 opérationnels.
  - FERMETURE : minimum 5 opérationnels jusqu'à F.
- NIVEAU FORT / GROS ÉVÉNEMENT LOCAL :
  - MIDI : minimum 7 opérationnels hors Salome.
  - APRÈS-MIDI : minimum 5 opérationnels.
  - SOIR : minimum 7 opérationnels hors Salome.
  - FERMETURE : reste minimum 5 sauf besoin spécifique.
- L'heure de l'événement détermine les services renforcés :
  - événement vers 14h–18h30 (ex. match RCV à 16h) => MIDI + APRÈS-MIDI + SOIR renforcés ;
  - événement vers 21h => SOIR renforcé, pas le MIDI ;
  - événement tôt / journée => renforcer les plages qu'il touche réellement.
- Un RCV extérieur ou un domicile délocalisé hors Vannes n'augmente pas les effectifs de L'Océan.
Un salarié classé soir peut exceptionnellement être basculé sur un shift journée (10h/11h → 18h30/19h/20h/21h) si le midi, l'après-midi ou le pont 18h30 est insuffisant. La couverture du service passe avant son profil soir par défaut.
12) 
IMPORTANT FORMAT HORAIRE SOIR :
- Utilise toujours la lettre majuscule F pour la fermeture.
- Exemples valides : "15h > F", "16h > F", "17h > F", "18h > F".
- N'écris jamais "15h > F", "16h > F", etc.

COUPURES INTERDITES : n'écris jamais C10, C11, "Coupure", ni deux tranches. Si une coupure semble nécessaire, laisse la case "" et indique dans notes : "Coupure manuelle à envisager : [jour] — [raison]".
13) Répartis la charge entre les salariés disponibles. Ne surutilise pas Emile ou un autre pour combler tous les trous.
14) N'invente jamais un contrat. Si le contrat vaut "?", n'utilise pas de cible d'heures inventée.
15) Si aucune solution continue sûre n'existe, laisse la case vide. Un préplanning incomplet est préférable à une mauvaise affectation.

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
      allowedShifts,
      weekDate,
      externalEvents
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

    const coverageAudit = buildCoverageAudit(
      habitual.planning,
      emps,
      weekDate,
      externalEvents
    );

    const coverageAlerts = coverageAudit
      .filter(d => !d.ok)
      .map(d => `${d.day}: ${d.deficits.join(', ')}`);

    return response(200, {
      planning: {
        planning: habitual.planning,
        notes: [baseNotes, coupureNote, humanNote].filter(Boolean).join(' | '),
        coverage: coverageAudit,
        coverageAlerts
      }
    });

  } catch(e) {
    console.error('generate function error:', e);
    return response(500, { error: e.message || 'Erreur inconnue' });
  }
};
