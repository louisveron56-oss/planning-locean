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



function legacyConfigFor(emp) {
  const comp = COMPETENCES[emp?.name] || { rangs: [], shifts: [], ghost: false };
  const shifts = Array.isArray(comp.shifts) ? comp.shifts : [];
  const hasMorning = shifts.some(s => /matin|10h30|11h/i.test(s));
  const hasEvening = shifts.some(s => /soir/i.test(s));

  return {
    aiEnabled: !comp.ghost && emp?.name !== 'Guillaume',
    countsForCoverage: !comp.ghost && emp?.name !== 'Salome',
    preferredService: hasEvening && !hasMorning ? 'evening' : (hasMorning && !hasEvening ? 'lunch' : 'flexible'),
    services: {
      morning: hasMorning && emp?.name !== 'Salome',
      lunch: hasMorning || emp?.name === 'Salome' || (hasEvening && ['Catherine','Pierre','Ismaël'].includes(emp?.name)),
      evening: hasEvening,
      closing: hasEvening,
      split: false
    },
    ranks: Array.isArray(comp.rangs) ? comp.rangs.slice() : [],
    maxSplits: 0,
    earliestStart: emp?.name === 'Salome' ? '10:00' : '',
    latestEnd: emp?.name === 'Salome' ? '17:30' : ''
  };
}

function runtimeConfig(emp) {
  const legacy = legacyConfigFor(emp);
  const services = emp?.services && typeof emp.services === 'object' ? emp.services : legacy.services;
  return {
    aiEnabled: typeof emp?.aiEnabled === 'boolean' ? emp.aiEnabled : legacy.aiEnabled,
    countsForCoverage: typeof emp?.countsForCoverage === 'boolean' ? emp.countsForCoverage : legacy.countsForCoverage,
    preferredService: emp?.preferredService || legacy.preferredService || 'flexible',
    services: {
      morning: !!services.morning,
      lunch: !!services.lunch,
      evening: !!services.evening,
      closing: !!services.closing,
      split: !!services.split
    },
    ranks: Array.isArray(emp?.ranks) ? emp.ranks.slice() : legacy.ranks,
    maxSplits: Math.max(0, Math.min(2, Number(emp?.maxSplits ?? legacy.maxSplits) || 0)),
    earliestStart: emp?.earliestStart || legacy.earliestStart || '',
    latestEnd: emp?.latestEnd || legacy.latestEnd || ''
  };
}

function canAutoPlan(emp) { return runtimeConfig(emp).aiEnabled; }
function countsInCoverage(emp) { return runtimeConfig(emp).countsForCoverage; }
function employeeRanks(emp) { return runtimeConfig(emp).ranks; }

function parseClockMinutes(value, asEnd=false) {
  if (!value) return null;
  const m = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  let mins = parseInt(m[1],10)*60 + parseInt(m[2],10);
  if (asEnd && mins <= 6*60) mins += 24*60;
  return mins;
}



function isPrimaryEvening(emp) {
  const cfg = runtimeConfig(emp);
  return cfg.preferredService === 'evening' && cfg.services.evening;
}

function isPrimaryLunchOrDay(emp) {
  const cfg = runtimeConfig(emp);
  return ['lunch','morning','flexible'].includes(cfg.preferredService) && cfg.services.lunch;
}

function canUseLunchAsReinforcement(emp) {
  const cfg = runtimeConfig(emp);
  return cfg.services.lunch && isPrimaryEvening(emp);
}

function autoSplitCapacity(emp) {
  const cfg = runtimeConfig(emp);
  if (!cfg.aiEnabled) return 0;

  // Split shifts remain opt-in through the employee data.
  // A positive maxSplits is the actual authorization signal.
  const max = Math.max(0, Math.min(2, Number(cfg.maxSplits) || 0));
  return max;
}

function weeklySplitCount(row) {
  const keys = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  return keys.filter(k => isCoupureValue(row?.[k])).length;
}

function splitHoursForLabel(label='Coupure 11h-15h/18h-01h') {
  return /10h\s*-\s*15h/i.test(label) ? 12 : 11;
}

function projectedHoursWithSplit(emp, row, currentLabel='') {
  const currentTotal = currentPlannedHours(row);
  const oldHours = currentLabel ? (parseShiftHoursLabel(currentLabel) || 0) : 0;
  return currentTotal - oldHours + splitHoursForLabel();
}

function canUseSplitByHours(emp, row, currentLabel='') {
  const projected = projectedHoursWithSplit(emp, row, currentLabel);
  const target = contractTargetHours(emp);

  if (projected > 48) return false;
  if (target !== null && projected > target + 2.5) return false;
  return true;
}

function splitCandidateScore(emp, row) {
  const used = weeklySplitCount(row);
  const target = contractTargetHours(emp);
  const planned = currentPlannedHours(row);
  const gap = target === null ? 0 : target - planned;

  // 0 split always beats 1 split. This is intentionally dominant.
  return used * 100 - Math.max(-10, Math.min(12, gap));
}

function shiftAllowedByEmployee(emp, label) {
  const cfg = runtimeConfig(emp);

  if (isCoupureValue(label)) {
    return autoSplitCapacity(emp) > 0;
  }

  const b = shiftBoundsMinutes(label);
  if (!b) return false;

  if (b.start < 10*60) {
    if (!cfg.services.morning) return false;
  } else if (b.start < 15*60) {
    if (!cfg.services.lunch) return false;
  } else {
    if (!cfg.services.evening) return false;
  }

  if (isClosingShift(label) && !cfg.services.closing) return false;

  const earliest = parseClockMinutes(cfg.earliestStart, false);
  const latest = parseClockMinutes(cfg.latestEnd, true);
  if (earliest !== null && b.start < earliest) return false;
  if (latest !== null && b.end > latest) return false;

  return true;
}

const REGLES_SERVICE = `
RÈGLES DE SERVICE L'OCÉAN — Vannes

IMPORTANT — CONFIGURATION ÉQUIPE :
- Les autorisations de chaque salarié viennent de sa fiche Équipe transmise par l'application.
- "IA planifie" = l'IA peut écrire dans ses cases libres.
- "Compte dans les minimums" = ce salarié compte dans la couverture opérationnelle.
- Matin / Midi / Soir / Fermeture / Coupure sont des autorisations dures.
- Début au plus tôt / fin au plus tard sont des limites dures.
- Les rangs cochés sont les seuls rangs connus.
- Les règles de la fiche Équipe priment sur tout ancien profil historique.
- IMPORTANT : pour un salarié dont la préférence est SOIR, "Midi" signifie capacité de RENFORT, pas affectation de journée par défaut.
- Un salarié principal SOIR + Midi autorisé reste au soir en priorité.
- Si le midi est déficitaire : privilégier d'abord une coupure autorisée ; le passage en journée continue n'arrive qu'en dernier recours après épuisement des profils journée/midi et des coupures possibles.
- Les préférences historiques d'horaires déjà connues pour les salariés existants restent des PRIORITÉS SOUPLES : les utiliser en premier lorsqu'elles respectent la fiche Équipe et la couverture.
- Ne jamais réduire les horaires à un modèle unique d'ouverture / journée / fermeture si plusieurs shifts habituels sont possibles.

OUVERTURE / MATIN — Tous les jours :
- De l'ouverture à 10h00 : minimum 2 personnels opérationnels présents.
- De 10h00 à 11h00 : minimum 3 personnels opérationnels présents.
- Mercredi, samedi et dimanche restent des matinées particulièrement importantes : conserver au moins ces mêmes seuils, sans les sacrifier pour atteindre seulement le midi.
- Un salarié autorisé "Matin" doit pouvoir être utilisé sur des départs 07h / 08h / 09h selon ses limites horaires.
- Un salarié autorisé seulement "Midi" ne doit pas être utilisé avant 10h.
- Salome / Accueil ne compte pas dans ces minimums si "Compte" est décoché.

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

COUVERTURE OPÉRATIONNELLE HIVER À RESPECTER :
- OUVERTURE — COURBE FIXE ET NON NÉGOCIABLE :
  - Lundi, mardi, jeudi, vendredi : EXACTEMENT au minimum 1 arrivée à 07h, 1 à 08h, 1 à 09h, 1 à 10h.
  - Mercredi, samedi, dimanche : EXACTEMENT au minimum 1 arrivée à 07h, 1 à 08h, 1 à 09h, 2 arrivées à 10h.
  - Un salarié déjà indispensable à 07h, 08h, 09h ou 10h ne peut pas être déplacé vers une autre heure si cela casse son quota.
  - Ces quotas sont des contraintes dures, au même niveau que le minimum de fermetures.
  - Respecter les autorisations Matin/Midi et les limites horaires de chaque fiche Équipe.
- MIDI 12h–15h :
  - Lundi, mardi, jeudi, vendredi : 6 opérationnels minimum HORS Salome/Accueil, Martin V et Louis.
  - Mercredi, samedi, dimanche : 7 opérationnels minimum HORS Salome/Accueil, Martin V et Louis.
- APRÈS-MIDI 15h–18h : 4 opérationnels minimum HORS Salome, Martin V et Louis.
- À 18h00–18h30 : conserver au moins 2 salariés de JOURNÉE encore présents jusqu'à 18h30 pour permettre la rotation des repas de l'équipe du soir.
- SOIR HIVER :
  - Lundi à vendredi : 5 opérationnels minimum HORS Salome/Accueil, Martin V et Louis.
  - Samedi et dimanche : 6 opérationnels minimum HORS Salome/Accueil, Martin V et Louis.
- FERMETURE : 5 opérationnels réels jusqu'à F/01h.
- Si l'équipe du soir est surdimensionnée alors que le midi est trop faible, basculer un salarié soir compatible sur une journée continue plutôt que laisser 4 au midi et 8 le soir.

RÈGLES MATIN NOMINATIVES NON NÉGOCIABLES :
- Virginie : lundi 07h>16h, mardi 07h>16h, mercredi 08h>17h, jeudi 08h>17h, vendredi 07h>16h.
- Raphael : lundi 08h>17h, mardi 08h>17h, mercredi 07h>16h, jeudi 07h>16h, dimanche 07h>16h.
- Seb : vendredi 08h>17h, samedi 07h>16h, dimanche 08h>17h. Lundi/jeudi priorité 09h>18h30 ou 10h>18h30.
- Anthony : uniquement prises de poste <=10h. Samedi 08h>17h strict, dimanche 09h>17h strict. En semaine priorité 09h>18h30, 08h>17h, 10h>18h30.
- Ces règles ne sont annulées que par un RH/Vacances/CFA/Arrêt saisi par le manager.

RÉPARTITION DES COUPURES :
- Un salarié à 0 coupure est toujours prioritaire sur un salarié déjà à 1 coupure.
- Une 2e coupure n'est autorisée que si aucun autre salarié éligible à 0 coupure ne peut résoudre le besoin.
- Toute coupure doit respecter le contrat : projeté <= contrat +2h30 et jamais >48h.
- Si un shift soir est remplacé par une coupure, recalculer en remplaçant les heures du shift existant, pas en ajoutant 11h.
- Si seuls Cathy/Pierre sont proposés, vérifier les fiches Équipe des autres : pour être éligible au renfort midi ils doivent avoir Midi autorisé et un nombre de coupures >0.

OPTIMISATION APRÈS-MIDI :
- Le minimum après-midi est une cible opérationnelle, pas un objectif de sureffectif.
- Si l'après-midi est à 6/4 ou 5/4 alors que le midi et le soir ont besoin de la personne, privilégier une coupure autorisée pour ramener l'après-midi vers 4/4.
- Ne jamais convertir en coupure si cela fait tomber le midi, le J18 ou une autre contrainte dure sous son minimum.
- Maximum de coupures par personne = valeur saisie dans Équipe, jamais plus de 2.

RÉÉQUILIBRAGE V7 :
- Avant toute création de shift supplémentaire, chercher un shift existant en surplus le soir/fermeture qui peut être transformé.
- Exemple : F 7/5 + midi 3/7 + 10h 0/2 => tester 17h>F vers 10h>18h30 si autorisé.
- Exemple : soir 7/6 + midi 6/7 avec un 16h>23h non indispensable => tester 11h>21h si autorisé.
- Ne garder une transformation que si le score global de couverture s'améliore.
- Ne jamais casser une fermeture, un soir ou une ouverture déjà au minimum.
- Une coupure n'arrive qu'après cette étape de réaffectation.

PRIORITÉ COUVERTURE :
- Un déficit midi/après-midi/J18 doit être réparé AVANT de conserver du sureffectif le soir.
- MAIS ne transforme pas spontanément les salariés principaux SOIR en salariés de journée : Midi autorisé chez eux = renfort exceptionnel, coupure prioritaire.
- Dès que la cible midi est atteinte, INTERDICTION d'ajouter un nouveau renfort midi.
- Exemple : cible samedi = 7. Si le midi est à 6/7, une seule personne supplémentaire peut être ajoutée. À 7/7, tout ajout midi supplémentaire est interdit.
- Le moteur doit recalculer après CHAQUE modification ; il ne peut pas empiler plusieurs coupures ou journées avant de recompter.
- Il est interdit d'accepter par exemple 3/7 au midi alors que le soir est à 7/5 si des salariés compatibles peuvent être déplacés.
- Les minimums midi sont des contraintes dures : 6 Lun/Mar/Jeu/Ven, 7 Mer/Sam/Dim.

RÈGLES INDIVIDUELLES DURES :
- Respecter les autorisations de la fiche Équipe.
- Les jours RH, Vacances, Arrêt maladie ou CFA déjà saisis sont VERROUILLÉS.
- Si IA planifie = NON, ne jamais écrire dans une case libre.
- Si Compte dans les minimums = NON, sa présence ne valide jamais un seuil de couverture.
- Une fermeture exige Soir + Fermeture autorisés.
- Une coupure est autorisée si le maximum hebdomadaire de coupures de la fiche Équipe est > 0 ; elle respecte strictement ce plafond.

HEURES ET ÉQUILIBRE :
- Le champ contrat saisi dans Équipe est la référence contractuelle de chaque salarié. Viser ce nombre d'heures hebdomadaires.
- Zone cible : environ ±2h autour du contrat.
- Ne dépasser cette zone que si une couverture obligatoire serait sinon impossible.
- Maximum absolu : 48h/semaine.
- Réduire les heures supplémentaires.
- Maximum 2 coupures par salarié et par semaine.
- Une coupure est une solution de dernier recours : préférer un horaire continu quand la couverture reste correcte.

RÈGLES CCN CHR :
- Repos minimum 11h entre deux journées de travail.
- Maximum 48h par semaine.
- Maximum 5 jours travaillés sur une semaine standard quand 2 jours de repos sont prévus.
- Minimum 2 jours de repos par semaine, sauf situation explicitement gérée par le manager.
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

function shiftProfilePool(emp, allowedShifts) {
  return [...allowedContinuousMap(allowedShifts).values()]
    .filter(label => shiftAllowedByEmployee(emp, label));
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

function chooseHabitualShift(emp, allowedShifts, dayStartCounts, idealDailyHours, usedLabels, dayIndex=null) {
  const allowedPool = shiftProfilePool(emp, allowedShifts);
  if (!allowedPool.length) return '';

  const allowedMap = new Map(allowedPool.map(label => [normalizeShiftLabel(label), label]));
  const historicalPrefs = (SHIFT_PREFERENCES[emp.name]?.preferred || [])
    .map(label => allowedMap.get(normalizeShiftLabel(label)))
    .filter(Boolean);

  const dayPrefs = dayIndex === null
    ? []
    : daySpecificMorningPreferences(emp, dayIndex, allowedShifts)
        .map(label => allowedMap.get(normalizeShiftLabel(label)) || label)
        .filter(Boolean);

  const primaryPool = dayPrefs.length
    ? dayPrefs
    : (historicalPrefs.length ? historicalPrefs : allowedPool);
  const pref = runtimeConfig(emp).preferredService || 'flexible';

  let best = '';
  let bestScore = Infinity;

  primaryPool.forEach(label => {
    const start = shiftStartMinutes(label);
    const sameStartCount = dayStartCounts.get(start) || 0;
    const shiftHours = parseShiftHoursLabel(label) || 0;
    const sameLabelCount = usedLabels.get(normalizeShiftLabel(label)) || 0;
    const b = shiftBoundsMinutes(label);

    let score = 0;

    if (idealDailyHours !== null && Number.isFinite(idealDailyHours)) {
      score += Math.abs(idealDailyHours - shiftHours) * 4.0;
      if (shiftHours > idealDailyHours + 2) score += 7;
    }

    score += sameStartCount * 2.0;
    score += sameLabelCount * 1.5;

    if (b) {
      if (pref === 'morning') score += Math.max(0, (b.start - 8*60) / 60) * 1.2;
      if (pref === 'lunch') score += Math.abs(b.start - 10*60) / 60 * 0.7;
      if (pref === 'evening') score += Math.abs(b.start - 16*60) / 60 * 0.7;
    }

    if (dayPrefs.length) {
      const dayIdx = dayPrefs.findIndex(x => normalizeShiftLabel(x) === normalizeShiftLabel(label));
      if (dayIdx >= 0) score += dayIdx * 0.8;
    } else if (historicalPrefs.length) {
      const prefIndex = historicalPrefs.findIndex(x => normalizeShiftLabel(x) === normalizeShiftLabel(label));
      if (prefIndex >= 0) score += prefIndex * 1.2;
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
  if (!s) return null;
  if (isCoupureValue(s)) return /10h\s*-\s*15h/.test(s) ? 12 : 11;
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


const STRICT_MORNING_SCHEDULE = {
  'Virginie': {
    0: '07h > 16h', // lundi ouverture stricte
    1: '07h > 16h', // mardi ouverture stricte
    2: '08h > 17h', // mercredi strict
    3: '08h > 17h', // jeudi strict
    4: '07h > 16h'  // vendredi ouverture stricte
  },
  'Raphael': {
    0: '08h > 17h', // lundi strict
    1: '08h > 17h', // mardi strict
    2: '07h > 16h', // mercredi ouverture stricte
    3: '07h > 16h', // jeudi ouverture stricte
    6: '07h > 16h'  // dimanche ouverture stricte
  },
  'Seb': {
    4: '08h > 17h', // vendredi strict
    5: '07h > 16h', // samedi ouverture stricte
    6: '08h > 17h'  // dimanche strict
  },
  'Anthony': {
    5: '08h > 17h', // samedi strict
    6: '09h > 17h'  // dimanche strict
  }
};

const SOFT_MORNING_PREFERENCES_BY_DAY = {
  'Seb': {
    0: ['09h > 18h30','10h > 18h30'],
    3: ['09h > 18h30','10h > 18h30']
  },
  'Anthony': {
    0: ['09h > 18h30','08h > 17h','10h > 18h30'],
    1: ['09h > 18h30','08h > 17h','10h > 18h30'],
    2: ['09h > 18h30','08h > 17h','10h > 18h30'],
    3: ['09h > 18h30','08h > 17h','10h > 18h30'],
    4: ['09h > 18h30','08h > 17h','10h > 18h30']
  }
};

function strictMorningShiftFor(emp, di, allowedShifts) {
  const wanted = STRICT_MORNING_SCHEDULE[emp?.name]?.[di];
  if (!wanted) return '';
  const allowed = allowedContinuousMap(allowedShifts);
  const exact = allowed.get(normalizeShiftLabel(wanted));
  if (!exact) return '';
  return shiftAllowedByEmployee(emp, exact) ? exact : '';
}

function daySpecificMorningPreferences(emp, di, allowedShifts) {
  const list = SOFT_MORNING_PREFERENCES_BY_DAY[emp?.name]?.[di] || [];
  const allowed = allowedContinuousMap(allowedShifts);
  return list
    .map(x => allowed.get(normalizeShiftLabel(x)))
    .filter(Boolean)
    .filter(label => shiftAllowedByEmployee(emp,label));
}

function contractTargetHours(emp) {
  if (!emp) return null;
  const entered = Number(emp.contract);
  return Number.isFinite(entered) && entered > 0 ? entered : null;
}



function desiredWorkDays(emp, dataRow) {
  // Standard operational target: 5 worked days for a full-time week.
  // Do not invent work on manager-locked absence/RH days.
  // If fewer than 5 days are actually available because of Vacances/CFA/Arrêt/RH,
  // use only the available days.
  if (!emp || !canAutoPlan(emp)) return 0;

  let unavailable = 0;
  for (let di=0; di<7; di++) {
    const d = dataRow && dataRow[di];
    if (!d) continue;
    if (d.x === true) unavailable++;
    else if (['Vacances','Arrêt maladie','CFA'].includes(d.status)) unavailable++;
  }

  return Math.min(5, Math.max(0, 7 - unavailable));
}

function isCoreEveningEmployee(emp) {
  const cfg = runtimeConfig(emp);
  return cfg.aiEnabled && cfg.services.evening &&
    !cfg.services.morning && !cfg.services.lunch && !cfg.services.split;
}

function eveningShiftCandidates(allowedShifts, emp) {
  const allowed = allowedContinuousMap(allowedShifts);
  const wanted = [
    '15h > 23h','15h > F',
    '16h > 23h','16h > F',
    '17h > F',
    '18h > F'
  ];

  const seen = new Set(), out = [];
  wanted.forEach(x => {
    const v = allowed.get(normalizeShiftLabel(x));
    if (v && (!emp || shiftAllowedByEmployee(emp,v)) && !seen.has(normalizeShiftLabel(v))) {
      seen.add(normalizeShiftLabel(v));
      out.push(v);
    }
  });

  return out;
}

function chooseBalancedEveningShift(emp, empIndex, dayIndex, allowedShifts, dayStartCounts, remainingHours, remainingFreeDays, usedLabels) {
  const pool = eveningShiftCandidates(allowedShifts, emp);
  if (!pool.length) return '';

  const prefLabels = (SHIFT_PREFERENCES[emp.name]?.preferred || []).map(normalizeShiftLabel);
  const rotation = [15*60,16*60,17*60,18*60];
  const desiredStart = rotation[(empIndex + dayIndex) % rotation.length];
  const idealHours = remainingFreeDays > 0 ? remainingHours / remainingFreeDays : remainingHours;

  let best='', bestScore=Infinity;

  pool.forEach(label => {
    const start = shiftStartMinutes(label);
    const hours = parseShiftHoursLabel(label) || 0;
    const dayCount = dayStartCounts.get(start) || 0;
    const sameCount = usedLabels.get(normalizeShiftLabel(label)) || 0;

    let score = 0;

    const idx = prefLabels.indexOf(normalizeShiftLabel(label));
    if (idx >= 0) score += idx * 1.1;
    else if (prefLabels.length) score += 3.5;

    score += Math.abs(hours - idealHours) * 3.0;
    score += dayCount * 3.5;
    score += Math.abs(start - desiredStart) / 60 * 0.8;
    score += sameCount * 1.8;

    if (hours > remainingHours + 1.5) score += 10;

    if (score < bestScore) {
      bestScore = score;
      best = label;
    }
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

function isOperationalForCoverage(emp) {
  return !!emp && countsInCoverage(emp);
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
  let openingAt7 = 0;
  let openingAt8 = 0;
  let openingAt9 = 0;
  let openingAt10 = 0;
  let midi = 0;
  let afternoon = 0;
  let bridge1830 = 0;
  let evening = 0;
  let closing = 0;

  (emps || []).forEach((emp, i) => {
    if (!isOperationalForCoverage(emp)) return;
    const row = planning[i];
    if (!row) return;
    const label = row[dayKey];
    if (!isWorkingValue(label)) return;

    if (isCoupureValue(label)) {
      midi++;
      evening++;
      closing++;
      return;
    }

    const b = shiftBoundsMinutes(label);
    if (b) {
      if (b.start === 7*60) openingAt7++;
      if (b.start === 8*60) openingAt8++;
      if (b.start === 9*60) openingAt9++;
      if (b.start === 10*60) openingAt10++;
    }

    if (coversWholeWindow(label, 12*60, 15*60)) midi++;
    if (coversWholeWindow(label, 15*60, 18*60)) afternoon++;
    if (isDayBridgeShift(label)) bridge1830++;
    if (coversWholeWindow(label, 18*60+30, 23*60)) evening++;
    if (isClosingShift(label)) closing++;
  });

  return { openingAt7, openingAt8, openingAt9, openingAt10, midi, afternoon, bridge1830, evening, closing };
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



function allowedExactStartShifts(allowedShifts, emp, hour) {
  const all = [...allowedContinuousMap(allowedShifts).values()];
  return all.filter(label => {
    if (!shiftAllowedByEmployee(emp,label)) return false;
    const b = shiftBoundsMinutes(label);
    return !!b && b.start === hour*60;
  });
}

function chooseExactStartShift(emp, allowedShifts, hour, currentLabel='') {
  const pool = allowedExactStartShifts(allowedShifts, emp, hour);
  if (!pool.length) return '';

  const prefLabels = (SHIFT_PREFERENCES[emp.name]?.preferred || []).map(normalizeShiftLabel);
  const currentHours = parseShiftHoursLabel(currentLabel);

  let best='', bestScore=Infinity;
  pool.forEach(label => {
    const h = parseShiftHoursLabel(label) || 0;
    let score = 0;

    const idx = prefLabels.indexOf(normalizeShiftLabel(label));
    if (idx >= 0) score += idx * 1.0;
    else if (prefLabels.length) score += 3.0;

    if (currentHours !== null) score += Math.abs(h-currentHours)*1.5;

    if (score < bestScore) {
      bestScore=score;
      best=label;
    }
  });

  return best;
}

function allowedOpeningShifts(allowedShifts, emp, before10) {
  const all = [...allowedContinuousMap(allowedShifts).values()];
  return all.filter(label => {
    if (!shiftAllowedByEmployee(emp,label)) return false;
    const b = shiftBoundsMinutes(label);
    if (!b) return false;

    if (before10) {
      // Must actually be there before 10, not arrive at 10.
      return b.start <= 9*60 && b.end >= 10*60;
    }
    // 10–11 coverage can be supplied by a 10h arrival.
    return b.start <= 10*60 && b.end >= 11*60;
  });
}

function chooseOpeningShift(emp, allowedShifts, before10, currentLabel='') {
  const pool = allowedOpeningShifts(allowedShifts, emp, before10);
  if (!pool.length) return '';

  const prefLabels = (SHIFT_PREFERENCES[emp.name]?.preferred || [])
    .map(normalizeShiftLabel);

  const currentHours = parseShiftHoursLabel(currentLabel);
  let best = '', bestScore = Infinity;

  pool.forEach(label => {
    const b = shiftBoundsMinutes(label);
    const h = parseShiftHoursLabel(label) || 0;
    let score = 0;

    const idx = prefLabels.indexOf(normalizeShiftLabel(label));
    if (idx >= 0) score += idx * 1.2;
    else if (prefLabels.length) score += 4.5;

    const idealStart = before10 ? 8*60 : 10*60;
    score += Math.abs(b.start - idealStart) / 60 * 0.55;

    if (currentHours !== null) score += Math.abs(h - currentHours) * 2.0;

    if (score < bestScore) {
      bestScore = score;
      best = label;
    }
  });

  return best;
}

function chooseDayCoverageShift(currentLabel, allowedShifts, needBridge, emp) {
  const pool = allowedDayCoverageShifts(allowedShifts)
    .filter(label => (!emp || shiftAllowedByEmployee(emp,label)))
    .filter(label => {
      const b = shiftBoundsMinutes(label);
      if (!b) return false;
      if (!coversWholeWindow(label, 12*60, 15*60)) return false;
      if (!coversWholeWindow(label, 15*60, 18*60)) return false;
      if (needBridge && b.end < 18*60+30) return false;
      return true;
    });

  if (!pool.length) return '';

  const prefLabels = (SHIFT_PREFERENCES[emp?.name]?.preferred || []).map(normalizeShiftLabel);
  const currentHours = parseShiftHoursLabel(currentLabel);

  let best = '';
  let bestScore = Infinity;

  pool.forEach(label => {
    const h = parseShiftHoursLabel(label) || 0;
    const b = shiftBoundsMinutes(label);
    let score = 0;

    const idx = prefLabels.indexOf(normalizeShiftLabel(label));
    if (idx >= 0) score += idx * 1.2;
    else if (prefLabels.length) score += 4.0;

    if (currentHours !== null) score += Math.abs(h - currentHours) * 2.5;

    score += Math.abs(b.start - 10*60) / 60 * 0.35;

    if (needBridge) {
      score += Math.abs(b.end - (18*60+30)) / 60 * 0.2;
    }

    if (score < bestScore) {
      bestScore = score;
      best = label;
    }
  });

  return best;
}

function closingShiftCandidates(allowedShifts, emp) {
  return eveningShiftCandidates(allowedShifts, emp)
    .filter(label => isClosingShift(label));
}

function chooseClosingShift(currentLabel, allowedShifts, emp) {
  const pool = closingShiftCandidates(allowedShifts, emp);
  if (!pool.length) return '';

  const prefLabels = (SHIFT_PREFERENCES[emp?.name]?.preferred || []).map(normalizeShiftLabel);
  const currentHours = parseShiftHoursLabel(currentLabel);

  let best = '';
  let bestScore = Infinity;

  pool.forEach(label => {
    const h = parseShiftHoursLabel(label) || 0;
    const start = shiftStartMinutes(label);
    let score = 0;

    const idx = prefLabels.indexOf(normalizeShiftLabel(label));
    if (idx >= 0) score += idx * 1.1;
    else if (prefLabels.length) score += 3.5;

    if (currentHours !== null) score += Math.abs(h - currentHours) * 2.0;

    score += Math.abs(start - 16*60) / 60 * 0.25;

    if (score < bestScore) {
      bestScore = score;
      best = label;
    }
  });

  return best;
}

function coverageCandidateScore(emp, currentLabel, targetHours, row) {
  const versatility = employeeRanks(emp).length;
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
    type === 'manual_event' ||
    type === 'rcv_home' ||
    /marathon|vannetaise|rc vannes|festival|concert|salon|foire|braderie|regate|regate|carnaval|championnat|tournoi|noel|grande roue/.test(name)
  );
}

function serviceTargetsForDay(dayIndex, weekDate, externalEvents) {
  // BASE HIVER L'OCÉAN
  // dayIndex: 0=Lun ... 6=Dim
  const isWednesday = dayIndex === 2;
  const isWeekend = dayIndex >= 5;

  const normal = {
    // OUVERTURE / MATIN — courbe fixe
    openingAt7: 1,
    openingAt8: 1,
    openingAt9: 1,
    openingAt10: (isWednesday || isWeekend) ? 2 : 1,

    // MIDI:
    // Lun/Mar/Jeu/Ven = 6 opérationnels hors Salome
    // Mercredi + Samedi + Dimanche = 7 opérationnels hors Salome
    midi: (isWednesday || isWeekend) ? 7 : 6,

    // APRÈS-MIDI inchangé
    afternoon: 4,

    // Rotation repas équipe du soir
    bridge1830: 2,

    // SOIR HIVER:
    // semaine = 5 opérationnels hors Salome
    // week-end = 6 opérationnels hors Salome
    evening: isWeekend ? 6 : 5,

    // FERMETURE inchangée
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

    // Gros événement sans heure précise / toute la journée.
    if (h === null) {
      target.midi = Math.max(target.midi, 7);
      target.afternoon = Math.max(target.afternoon, 5);
      target.evening = Math.max(target.evening, 7);
      return;
    }

    // Événement tôt : renfort midi + après-midi.
    if (h < 14) {
      target.midi = Math.max(target.midi, 7);
      target.afternoon = Math.max(target.afternoon, 5);
      return;
    }

    // 14h–18h30 : impact midi + après-midi + soir.
    // Exemple : match RCV à 16h.
    if (h <= 18.5) {
      target.midi = Math.max(target.midi, 7);
      target.afternoon = Math.max(target.afternoon, 5);
      target.evening = Math.max(target.evening, 7);
      return;
    }

    // 18h30–20h30 : impact après-midi + soir.
    if (h <= 20.5) {
      target.afternoon = Math.max(target.afternoon, 5);
      target.evening = Math.max(target.evening, 7);
      return;
    }

    // Événement tardif, ex. match à 21h : impact soir uniquement.
    target.evening = Math.max(target.evening, 7);
  });

  return target;
}


const V7_DAY_KEYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];

// ================================================================
// V7 — RÉÉQUILIBRAGE GLOBAL PAR SIMULATION
// On ne rajoute plus aveuglément du personnel : on teste d'abord
// si une transformation d'un shift existant améliore la courbe.
// ================================================================

function hardCoverageScore(snapshot, target) {
  // Missing staff is far more expensive than surplus.
  const deficit = (have, need) => Math.max(0, need - have);
  const surplus = (have, need) => Math.max(0, have - need);

  let score = 0;

  // Exact opening slots = very hard constraints.
  score += deficit(snapshot.openingAt7, target.openingAt7) * 1400;
  score += deficit(snapshot.openingAt8, target.openingAt8) * 1400;
  score += deficit(snapshot.openingAt9, target.openingAt9) * 1400;
  score += deficit(snapshot.openingAt10, target.openingAt10) * 1400;

  // Core business coverage.
  score += deficit(snapshot.midi, target.midi) * 1200;
  score += deficit(snapshot.afternoon, target.afternoon) * 1100;
  score += deficit(snapshot.bridge1830, target.bridge1830) * 1000;
  score += deficit(snapshot.evening, target.evening) * 1200;
  score += deficit(snapshot.closing, target.closing) * 1300;

  // Surplus is undesirable but much less severe than a deficit.
  score += surplus(snapshot.midi, target.midi) * 45;
  score += surplus(snapshot.afternoon, target.afternoon) * 55;
  score += surplus(snapshot.bridge1830, target.bridge1830) * 25;
  score += surplus(snapshot.evening, target.evening) * 70;
  score += surplus(snapshot.closing, target.closing) * 85;

  return score;
}

function totalDayPenalty(planning, emps, di, weekDate, externalEvents) {
  const key = V7_DAY_KEYS[di];
  const target = serviceTargetsForDay(di, weekDate, externalEvents);
  const snap = coverageSnapshot(planning, emps, key);

  let score = hardCoverageScore(snap, target);

  // Weekly hour balance: only a soft tiebreaker.
  (emps || []).forEach((emp, i) => {
    const targetHours = contractTargetHours(emp);
    if (targetHours === null) return;

    const h = currentPlannedHours(planning[i]);
    const diff = h - targetHours;

    // Under-hours matter, but coverage remains dominant.
    score += Math.abs(diff) * 2.5;

    // Stronger penalty for overshoot.
    if (diff > 2.5) score += (diff - 2.5) * 18;
    if (h > 48) score += 5000 + (h - 48) * 1000;
  });

  return score;
}

function dayShiftCandidatesForEmployee(emp, allowedShifts) {
  const cfg = runtimeConfig(emp);
  const allowedMap = allowedContinuousMap(allowedShifts);

  const preferred = [
    '10h > 18h30',
    '11h > 21h',
    '11h > 20h',
    '11h > 18h30',
    '09h > 18h30',
    '08h > 17h'
  ];

  return preferred
    .map(x => allowedMap.get(normalizeShiftLabel(x)))
    .filter(Boolean)
    .filter(label => shiftAllowedByEmployee(emp, label))
    .filter(label => {
      const b = shiftBoundsMinutes(label);
      if (!b) return false;

      // Evening-primary employees may be moved to day only if lunch is allowed.
      if (isPrimaryEvening(emp) && !cfg.services.lunch) return false;

      return true;
    });
}

function v7IsManagerFixed(data, i, di) {
  const ref = data && data[i] && data[i][di];
  return referenceOutputValue(ref) !== null;
}

function canReplaceShiftWithoutBreakingStrict(emp, di, current, replacement, allowedShifts) {
  if (!replacement) return false;
  if (!shiftAllowedByEmployee(emp, replacement)) return false;

  const strict = strictMorningShiftFor(emp, di, allowedShifts);
  if (strict && normalizeShiftLabel(strict) === normalizeShiftLabel(current)) {
    return normalizeShiftLabel(strict) === normalizeShiftLabel(replacement);
  }

  // Anthony-type "start <= 10h" constraints are already enforced by shiftAllowedByEmployee.
  return true;
}

function projectedWeeklyHoursAfterReplacement(row, current, replacement) {
  const currentTotal = currentPlannedHours(row);
  const oldH = parseShiftHoursLabel(current) || 0;
  const newH = parseShiftHoursLabel(replacement) || 0;
  return currentTotal - oldH + newH;
}

function isUsefulEveningSurplusCandidate(planning, emps, i, di, weekDate, externalEvents) {
  const key = V7_DAY_KEYS[di];
  const current = planning[i]?.[key];
  const b = shiftBoundsMinutes(current);
  if (!b || b.start < 15*60) return false;

  const target = serviceTargetsForDay(di, weekDate, externalEvents);
  const snap = coverageSnapshot(planning, emps, key);

  // Only consider evening staff when evening or closing is genuinely above target.
  return snap.evening > target.evening || snap.closing > target.closing;
}

function rebalanceDayByBestMove(planning, emps, di, allowedShifts, weekDate, externalEvents, data) {
  const key = V7_DAY_KEYS[di];
  const target = serviceTargetsForDay(di, weekDate, externalEvents);

  let passes = 0;

  while (passes++ < 16) {
    const beforeSnap = coverageSnapshot(planning, emps, key);
    const beforeScore = totalDayPenalty(planning, emps, di, weekDate, externalEvents);

    let best = null;

    // If no meaningful imbalance remains, stop.
    const hasDeficit =
      beforeSnap.openingAt7 < target.openingAt7 ||
      beforeSnap.openingAt8 < target.openingAt8 ||
      beforeSnap.openingAt9 < target.openingAt9 ||
      beforeSnap.openingAt10 < target.openingAt10 ||
      beforeSnap.midi < target.midi ||
      beforeSnap.afternoon < target.afternoon ||
      beforeSnap.bridge1830 < target.bridge1830 ||
      beforeSnap.evening < target.evening ||
      beforeSnap.closing < target.closing;

    if (!hasDeficit) break;

    (emps || []).forEach((emp, i) => {
      if (!canAutoPlan(emp)) return;
      if (v7IsManagerFixed(data, i, di)) return;

      const current = planning[i]?.[key];
      if (!current || isCoupureValue(current)) return;
      if (!isUsefulEveningSurplusCandidate(planning, emps, i, di, weekDate, externalEvents)) return;

      const candidates = dayShiftCandidatesForEmployee(emp, allowedShifts);

      for (const replacement of candidates) {
        if (normalizeShiftLabel(replacement) === normalizeShiftLabel(current)) continue;
        if (!canReplaceShiftWithoutBreakingStrict(emp, di, current, replacement, allowedShifts)) continue;

        const projectedHours = projectedWeeklyHoursAfterReplacement(planning[i], current, replacement);
        const contract = contractTargetHours(emp);

        if (projectedHours > 48) continue;
        if (contract !== null && projectedHours > contract + 2.5) continue;

        // Simulate.
        const old = planning[i][key];
        planning[i][key] = replacement;

        const afterSnap = coverageSnapshot(planning, emps, key);
        const afterScore = totalDayPenalty(planning, emps, di, weekDate, externalEvents);

        // Never accept a move that creates a new hard deficit in closing/evening
        // if those were previously satisfied.
        const breaksClosing = beforeSnap.closing >= target.closing && afterSnap.closing < target.closing;
        const breaksEvening = beforeSnap.evening >= target.evening && afterSnap.evening < target.evening;
        const breaksOpening =
          (beforeSnap.openingAt7 >= target.openingAt7 && afterSnap.openingAt7 < target.openingAt7) ||
          (beforeSnap.openingAt8 >= target.openingAt8 && afterSnap.openingAt8 < target.openingAt8) ||
          (beforeSnap.openingAt9 >= target.openingAt9 && afterSnap.openingAt9 < target.openingAt9) ||
          (beforeSnap.openingAt10 >= target.openingAt10 && afterSnap.openingAt10 < target.openingAt10);

        planning[i][key] = old;

        if (breaksClosing || breaksEvening || breaksOpening) continue;

        const gain = beforeScore - afterScore;
        if (gain <= 0) continue;

        if (!best || gain > best.gain) {
          best = { i, replacement, gain };
        }
      }
    });

    if (!best) break;

    planning[best.i][key] = best.replacement;
  }

  return coverageSnapshot(planning, emps, key);
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
        if (!isOperationalForCoverage(emp)) return false;
        if (!canAutoPlan(emp)) return false;
        if (isManagerFixed(i, di)) return false;

        // Hard morning assignments are non-negotiable and cannot be moved later.
        const strict = strictMorningShiftFor(emp, di, allowedShifts);
        if (strict) {
          const v0 = planning[i] && planning[i][dayKeys[di]];
          if (v0 && normalizeShiftLabel(v0) === normalizeShiftLabel(strict)) return false;
        }

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

      const replacement = chooseDayCoverageShift(current, allowedShifts, needBridge, emps[i]);
      if (!replacement) continue;

      planning[i][key] = replacement;
      return true;
    }

    return false;
  }

  function addFreeDayWorker(di, needBridge, allowEveningPrimary=false) {
    const key = dayKeys[di];
    const candidates = candidateIndexes(di, false);

    for (const i of candidates) {
      const emp = emps[i];
      const cfg = runtimeConfig(emp);
      if (!cfg.services.lunch) continue;

      // "Midi" is a capability, not a default assignment.
      // Evening-primary employees remain on evening unless this is the
      // explicit emergency fallback pass.
      if (isPrimaryEvening(emp) && !allowEveningPrimary) continue;

      const row = planning[i];
      const replacement = chooseDayCoverageShift('', allowedShifts, needBridge, emp);
      if (!replacement) continue;

      const h = parseShiftHoursLabel(replacement) || 0;
      if (currentPlannedHours(row) + h > 48) continue;

      row[key] = replacement;
      return true;
    }

    return false;
  }

  function canConvertEveningToDay(i, di) {
    const key = dayKeys[di];
    const current = planning[i] && planning[i][key];
    const b = shiftBoundsMinutes(current);
    if (!b || b.start < 15*60) return false;

    const emp = emps[i];
    const cfg = runtimeConfig(emp);
    if (!cfg.services.lunch) return false;

    // Never break the closing minimum.
    if (isClosingShift(current)) {
      const snap = coverageSnapshot(planning, emps, key);
      const target = serviceTargetsForDay(di, weekDate, externalEvents);
      if (snap.closing <= target.closing) return false;
    }

    return true;
  }

  function forceRepairLunch(di, needBridge) {
    const key = dayKeys[di];
    const TARGET = serviceTargetsForDay(di, weekDate, externalEvents);
    let guard = 0;

    while (guard++ < 20) {
      const snap = coverageSnapshot(planning, emps, key);

      const midiDeficit = Math.max(0, TARGET.midi - snap.midi);
      const afternoonDeficit = Math.max(0, TARGET.afternoon - snap.afternoon);
      const j18Deficit = Math.max(0, TARGET.bridge1830 - snap.bridge1830);

      // Exact stop: once targets are reached, no more lunch/day reinforcement.
      if (midiDeficit === 0 && afternoonDeficit === 0 && j18Deficit === 0) return true;

      let changed = false;

      // LEVEL 1 — Normal morning/day/lunch staff only.
      // Add ONE person, then fully recalculate deficits.
      if (!changed) {
        const candidates = candidateIndexes(di, false);

        for (const i of candidates) {
          const emp = emps[i];
          if (!isPrimaryLunchOrDay(emp)) continue;

          const replacement = chooseDayCoverageShift('', allowedShifts, j18Deficit > 0 || needBridge, emp);
          if (!replacement) continue;

          const h = parseShiftHoursLabel(replacement) || 0;
          if (currentPlannedHours(planning[i]) + h > 48) continue;

          planning[i][key] = replacement;
          changed = true;
          break;
        }
      }

      // LEVEL 2 — Evening-primary employee: split is preferred over full-day conversion.
      // Fair distribution: anyone on 0 split is preferred over someone already on 1.
      if (!changed && midiDeficit > 0) {
        const candidates = candidateIndexes(di, false)
          .filter(i => {
            const emp = emps[i];
            if (!canUseLunchAsReinforcement(emp)) return false;

            const maxSplits = autoSplitCapacity(emp);
            if (maxSplits <= 0) return false;
            if (weeklySplitCount(planning[i]) >= maxSplits) return false;
            if (!canUseSplitByHours(emp, planning[i])) return false;

            return true;
          })
          .sort((a,b) =>
            splitCandidateScore(emps[a], planning[a]) -
            splitCandidateScore(emps[b], planning[b])
          );

        if (candidates.length) {
          const i = candidates[0];
          planning[i][key] = 'Coupure 11h-15h/18h-01h';
          changed = true;
        }
      }

      // LEVEL 3 — Convert an existing evening shift to split if lunch is still short.
      // Same fairness + hours controls.
      if (!changed && midiDeficit > 0) {
        const candidates = candidateIndexes(di, true)
          .filter(i => {
            const emp = emps[i];
            if (!canUseLunchAsReinforcement(emp)) return false;

            const maxSplits = autoSplitCapacity(emp);
            if (maxSplits <= 0) return false;
            if (weeklySplitCount(planning[i]) >= maxSplits) return false;

            const current = planning[i][key];
            const b = shiftBoundsMinutes(current);
            if (!b || b.start < 15*60) return false;
            if (!canUseSplitByHours(emp, planning[i], current)) return false;

            return true;
          })
          .sort((a,b) =>
            splitCandidateScore(emps[a], planning[a]) -
            splitCandidateScore(emps[b], planning[b])
          );

        if (candidates.length) {
          const i = candidates[0];
          planning[i][key] = 'Coupure 11h-15h/18h-01h';
          changed = true;
        }
      }

      // LEVEL 4 — Full-day conversion of an evening-primary employee is LAST RESORT.
      // It is allowed only if there is still a deficit after all normal-day and split options.
      if (!changed && (midiDeficit > 0 || afternoonDeficit > 0 || j18Deficit > 0)) {
        const candidates = candidateIndexes(di, false);

        for (const i of candidates) {
          const emp = emps[i];
          if (!canUseLunchAsReinforcement(emp)) continue;

          const replacement = chooseDayCoverageShift('', allowedShifts, j18Deficit > 0 || needBridge, emp);
          if (!replacement) continue;

          const h = parseShiftHoursLabel(replacement) || 0;
          if (currentPlannedHours(planning[i]) + h > 48) continue;

          planning[i][key] = replacement;
          changed = true;
          break;
        }
      }

      // LEVEL 5 — Convert an already scheduled evening worker to a full day only if
      // absolutely necessary and without breaking closing.
      if (!changed && (midiDeficit > 0 || afternoonDeficit > 0 || j18Deficit > 0)) {
        const candidates = candidateIndexes(di, true);

        for (const i of candidates) {
          const emp = emps[i];
          if (!canUseLunchAsReinforcement(emp)) continue;
          if (!canConvertEveningToDay(i, di)) continue;

          const current = planning[i][key];
          const replacement = chooseDayCoverageShift(current, allowedShifts, j18Deficit > 0 || needBridge, emp);
          if (!replacement) continue;

          planning[i][key] = replacement;
          changed = true;
          break;
        }
      }

      if (!changed) return false;

      // Recalculate immediately after every single change.
      ensureClosing(di);
    }

    return false;
  }

  function openingTargetForHour(target, hour) {
    if (hour === 7) return target.openingAt7;
    if (hour === 8) return target.openingAt8;
    if (hour === 9) return target.openingAt9;
    if (hour === 10) return target.openingAt10;
    return 0;
  }

  function openingCountForHour(snapshot, hour) {
    if (hour === 7) return snapshot.openingAt7;
    if (hour === 8) return snapshot.openingAt8;
    if (hour === 9) return snapshot.openingAt9;
    if (hour === 10) return snapshot.openingAt10;
    return 0;
  }

  function canMoveFromCurrentOpeningSlot(di, currentLabel, targetHour) {
    const b = shiftBoundsMinutes(currentLabel);
    if (!b) return true;

    const currentHour = Math.floor(b.start / 60);
    if (![7,8,9,10].includes(currentHour)) return true;
    if (currentHour === targetHour) return false;

    const target = serviceTargetsForDay(di, weekDate, externalEvents);
    const snap = coverageSnapshot(planning, emps, dayKeys[di]);

    // Never steal the last person satisfying another required opening slot.
    return openingCountForHour(snap, currentHour) > openingTargetForHour(target, currentHour);
  }

  function ensureExactStart(di, hour, needed) {
    const key = dayKeys[di];
    let guard=0;

    function slotCount() {
      return openingCountForHour(coverageSnapshot(planning, emps, key), hour);
    }

    while (guard++ < 16 && slotCount() < needed) {
      let changed=false;

      // First: convert an already-planned compatible morning/day worker,
      // but NEVER steal someone who is the last person covering 7h/8h/9h/10h.
      const scheduled = candidateIndexes(di, true);
      for (const i of scheduled) {
        const emp=emps[i];
        const cfg=runtimeConfig(emp);

        if (hour < 10 && !cfg.services.morning) continue;
        if (hour === 10 && !(cfg.services.morning || cfg.services.lunch)) continue;

        const current=planning[i][key];
        if (isCoupureValue(current)) continue;

        const b=shiftBoundsMinutes(current);
        if (!b || b.start>=15*60 || b.start===hour*60) continue;
        if (!canMoveFromCurrentOpeningSlot(di, current, hour)) continue;

        const replacement=chooseExactStartShift(emp,allowedShifts,hour,current);
        if (!replacement) continue;

        const row=planning[i];
        const beforeHours=currentPlannedHours(row);
        const oldH=parseShiftHoursLabel(current)||0;
        const newH=parseShiftHoursLabel(replacement)||0;
        if (beforeHours-oldH+newH>48) continue;

        row[key]=replacement;
        changed=true;
        break;
      }

      if (changed) continue;

      // Second: use a free compatible employee.
      const free=candidateIndexes(di,false);
      for (const i of free) {
        const emp=emps[i];
        const cfg=runtimeConfig(emp);

        if (hour < 10 && !cfg.services.morning) continue;
        if (hour === 10 && !(cfg.services.morning || cfg.services.lunch)) continue;

        const replacement=chooseExactStartShift(emp,allowedShifts,hour,'');
        if (!replacement) continue;

        const row=planning[i];
        const currentHours=currentPlannedHours(row);
        const h=parseShiftHoursLabel(replacement)||0;
        if (currentHours+h>48) continue;

        row[key]=replacement;
        changed=true;
        break;
      }

      if (!changed) break;
    }
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

        const replacement = chooseClosingShift(current, allowedShifts, emps[i]);
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
        const replacement = chooseClosingShift('', allowedShifts, emp);
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


  function reduceAfternoonOverstaffWithSplit(di) {
    const key = dayKeys[di];
    const TARGET = serviceTargetsForDay(di, weekDate, externalEvents);

    let guard = 0;
    while (guard++ < 6) {
      const snap = coverageSnapshot(planning, emps, key);

      // Only optimize true afternoon surplus.
      if (snap.afternoon <= TARGET.afternoon) break;

      let bestIndex = -1;
      let bestScore = Infinity;

      (emps || []).forEach((emp, i) => {
        if (!canAutoPlan(emp)) return;
        if (!isOperationalForCoverage(emp)) return;
        if (isManagerFixed(i, di)) return;

        const maxSplits = autoSplitCapacity(emp);
        if (maxSplits <= 0) return;
        if (weeklySplitCount(planning[i]) >= maxSplits) return;

        const current = planning[i]?.[key];
        if (!current || isCoupureValue(current)) return;

        const b = shiftBoundsMinutes(current);
        if (!b) return;
        if (!canUseSplitByHours(emp, planning[i], current)) return;

        if (!coversWholeWindow(current, 12*60, 15*60)) return;
        if (!coversWholeWindow(current, 15*60, 18*60)) return;

        const cfg = runtimeConfig(emp);
        if (!cfg.services.evening || !cfg.services.closing) return;

        // Never touch strict morning assignments.
        const strict = strictMorningShiftFor(emp, di, allowedShifts);
        if (strict && normalizeShiftLabel(strict) === normalizeShiftLabel(current)) return;

        // Critical: split must not create lunch oversupply.
        // Since current already counts at lunch and split also counts at lunch,
        // lunch count remains unchanged. That's okay only if lunch isn't already above target by >1.
        if (snap.midi > TARGET.midi + 1) return;

        // Afternoon must remain exactly at/above target.
        if (snap.afternoon - 1 < TARGET.afternoon) return;

        // Don't break J18.
        if (isDayBridgeShift(current) && snap.bridge1830 - 1 < TARGET.bridge1830) return;

        const h = parseShiftHoursLabel(current) || 0;
        // Fewer existing splits dominates; then prefer longer continuous shift to trim.
        let score = weeklySplitCount(planning[i]) * 100 - h;

        if (score < bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      });

      if (bestIndex < 0) break;

      planning[bestIndex][key] = 'Coupure 11h-15h/18h-01h';
      ensureClosing(di);
    }
  }

  dayKeys.forEach((key, di) => {
    const TARGET = serviceTargetsForDay(di, weekDate, externalEvents);

    function enforceOpeningCurve() {
      ensureExactStart(di, 7, TARGET.openingAt7);
      ensureExactStart(di, 8, TARGET.openingAt8);
      ensureExactStart(di, 9, TARGET.openingAt9);
      ensureExactStart(di, 10, TARGET.openingAt10);
    }

    // 1) Morning hard rules + opening curve.
    enforceOpeningCurve();

    // 1B) V7: BEFORE adding anyone, try to move surplus evening/closing staff
    // into more useful day shifts (10h-18h30, 11h-21h, etc.).
    rebalanceDayByBestMove(planning, emps, di, allowedShifts, weekDate, externalEvents, data);

    // Recheck the opening curve after the simulated reallocation.
    enforceOpeningCurve();

    // 2) LUNCH / AFTERNOON / 18h30 ARE HARD BUSINESS NEEDS.
    // Repair these BEFORE accepting surplus evening staff.
    forceRepairLunch(di, false);

    // 3) Then build the evening and closing minimum.
    ensureClosing(di);

    // 3B) V7 second pass: if evening/closing now has surplus while day is still short,
    // convert the least useful evening shift into a day shift before creating splits.
    rebalanceDayByBestMove(planning, emps, di, allowedShifts, weekDate, externalEvents, data);

    // 4) Final lunch repair after closing, because closing choices may have moved people.
    forceRepairLunch(di, false);

    // 5) If afternoon is overstaffed, convert one eligible continuous day
    // shift into an authorized split rather than leaving 6/4 for no reason.
    reduceAfternoonOverstaffWithSplit(di);

    // 6) Re-stabilize hard edges several times.
    for (let pass=0; pass<5; pass++) {
      const before = JSON.stringify(coverageSnapshot(planning, emps, key));

      enforceOpeningCurve();
      forceRepairLunch(di, false);
      ensureClosing(di);

      const after = JSON.stringify(coverageSnapshot(planning, emps, key));
      if (before === after) break;
    }

    const final = coverageSnapshot(planning, emps, key);

    if (TARGET.strong) {
      notes.push(`${key}: niveau FORT — ${TARGET.reasons.join(' + ')} | cibles midi=${TARGET.midi}, après-midi=${TARGET.afternoon}, soir=${TARGET.evening}`);
    }

    if (final.openingAt7 < TARGET.openingAt7) notes.push(`${key}: arrivée 07h ${final.openingAt7}/${TARGET.openingAt7}`);
    if (final.openingAt8 < TARGET.openingAt8) notes.push(`${key}: arrivée 08h ${final.openingAt8}/${TARGET.openingAt8}`);
    if (final.openingAt9 < TARGET.openingAt9) notes.push(`${key}: arrivée 09h ${final.openingAt9}/${TARGET.openingAt9}`);
    if (final.openingAt10 < TARGET.openingAt10) notes.push(`${key}: arrivée 10h ${final.openingAt10}/${TARGET.openingAt10}`);

    if (final.midi < TARGET.midi) notes.push(`${key}: midi ${final.midi}/${TARGET.midi} opérationnels`);
    if (final.afternoon < TARGET.afternoon) notes.push(`${key}: après-midi ${final.afternoon}/${TARGET.afternoon} opérationnels`);
    if (final.bridge1830 < TARGET.bridge1830) notes.push(`${key}: J18 ${final.bridge1830}/${TARGET.bridge1830}`);
    if (final.evening < TARGET.evening) notes.push(`${key}: soir ${final.evening}/${TARGET.evening}`);
    if (final.closing < TARGET.closing) notes.push(`${key}: fermeture ${final.closing}/${TARGET.closing}`);
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
      } else if (!canAutoPlan(emp)) {
        row[k] = '';
      } else if (isCoreEveningEmployee(emp)) {
        // For the core evening team, discard Groq's free-cell choice.
        // The deterministic balancer will rebuild it to alternate arrivals + hit target hours.
        row[k] = '';
      } else {
        row[k] = src[k] || '';
      }
    });

    result.push(row);
  });


  // HARD MORNING RULES.
  // They apply only to manager-free cells. Manager RH/Vacances/CFA/Arrêt always wins.
  (emps || []).forEach((emp, i) => {
    const row = result[i];
    dayKeys.forEach((k, di) => {
      const ref = data && data[i] && data[i][di];
      if (referenceOutputValue(ref) !== null) return;

      const strict = strictMorningShiftFor(emp, di, allowedShifts);
      if (!strict) return;

      row[k] = strict;
    });
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
    if(!isCoreEveningEmployee(emp))return;

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

    const wantedDays=desiredWorkDays(emp,data&&data[i]);

    freeDays.forEach((k,pos)=>{
      if(worked>=wantedDays)return;

      const remaining=Math.max(0,(target||planned)-planned);
      const daysNeeded=Math.max(1,wantedDays-worked);

      // Only the number of days still needed matters for hour distribution.
      const candidate=chooseBalancedEveningShift(
        emp,i,dayKeys.indexOf(k),allowedShifts,dayStartCounts[dayKeys.indexOf(k)],
        remaining,daysNeeded,usedLabels
      );
      if(!candidate)return;

      const h=parseShiftHoursLabel(candidate);
      if(!h)return;

      // Five worked days is a HARD distribution rule when five days are available.
      // Contract target guides shift length, but must not collapse the week into 4 long days.
      if(planned+h>48)return;

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
    if(isCoreEveningEmployee(emp))return null;
    const row=result[i],target=contractTargetHours(emp),current=currentPlannedHours(row);
    return {emp,i,target,current,gap:target===null?0:Math.max(0,target-current)};
  }).filter(Boolean).sort((a,b)=>b.gap-a.gap);

  order.forEach(item=>{
    const emp=item.emp,i=item.i,row=result[i];
    const profilePool=new Set(shiftProfilePool(emp,allowedShifts).map(normalizeShiftLabel));
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
    const wantedDays=desiredWorkDays(emp,data&&data[i]);

    dayKeys.forEach((k,di)=>{
      const ref=data&&data[i]&&data[i][di];
      if(referenceOutputValue(ref)!==null)return;
      if(row[k])return;
      if(worked>=wantedDays)return;

      const remaining=target===null?null:Math.max(0,target-planned);
      const daysNeeded=Math.max(1,wantedDays-worked);
      const idealDaily=remaining===null?null:(remaining/daysNeeded);

      const candidate=chooseHabitualShift(
        emp,allowedShifts,dayStartCounts[di],idealDaily,usedLabels,di
      );
      if(!candidate||!profilePool.has(normalizeShiftLabel(candidate)))return;

      const h=parseShiftHoursLabel(candidate);if(!h)return;

      // 5-day distribution takes priority over prematurely stopping at the contract target.
      // Hard weekly ceiling remains protected.
      if(planned+h>48)return;

      // On the fifth required day, always prefer a compatible shorter shift,
      // but DO NOT leave the employee on only 4 days just because the contract
      // target has already been almost reached.
      if(target!==null && worked+1>=wantedDays && planned+h>target+2.5){
        const alternatives=[...profilePool]
          .map(n=>allowedContinuousMap(allowedShifts).get(n))
          .filter(Boolean)
          .map(label=>({label,h:parseShiftHoursLabel(label)||999}))
          .filter(x=>planned+x.h<=48)
          .sort((a,b)=>{
            const da=Math.abs((target-planned)-a.h);
            const db=Math.abs((target-planned)-b.h);
            return da-db || a.h-b.h;
          });

        if(alternatives.length){
          const chosen=alternatives[0];
          row[k]=chosen.label;
          planned+=chosen.h;
          worked++;
          const nk=normalizeShiftLabel(chosen.label);
          usedLabels.set(nk,(usedLabels.get(nk)||0)+1);
          const st=shiftStartMinutes(chosen.label);
          if(st!==9999)dayStartCounts[di].set(st,(dayStartCounts[di].get(st)||0)+1);
          return;
        }
      }

      row[k]=candidate;planned+=h;worked++;
      const nk=normalizeShiftLabel(candidate);
      usedLabels.set(nk,(usedLabels.get(nk)||0)+1);
      const st=shiftStartMinutes(candidate);
      if(st!==9999)dayStartCounts[di].set(st,(dayStartCounts[di].get(st)||0)+1);
    });

    if(worked<wantedDays){
      notes.push(`${emp.name}: seulement ${worked}/${wantedDays} jours planifiés — vérifier les disponibilités ou les shifts autorisés`);
    }
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
      shiftProfilePool(emp, allowedShifts).map(normalizeShiftLabel)
    );

    dayKeys.forEach((k, di) => {
      const ref = data && data[i] && data[i][di];
      const fixed = referenceOutputValue(ref);

      // Tout ce qui a été saisi par le manager est intouchable.
      if (fixed !== null) {
        row[k] = fixed;
        return;
      }

      if (!canAutoPlan(emp)) {
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

      if (isCoupureValue(proposed)) {
        const cfg = runtimeConfig(emp);
        const already = dayKeys.filter(x => isCoupureValue(row[x])).length;
        const maxSplits = autoSplitCapacity(emp);
        if (maxSplits <= 0 || already >= maxSplits) {
          row[k] = '';
          manualCoupureDays.add(dayKeys[di]);
          warnings.push(`${emp.name} ${dayKeys[di]} : coupure refusée par la fiche Équipe ou plafond atteint`);
          return;
        }
        row[k] = /10h\s*-\s*15h/i.test(proposed)
          ? 'Coupure 10h-15h/18h-01h'
          : 'Coupure 11h-15h/18h-01h';
        aiFilled.push({ key:k, di });
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

      if (!profilePool.has(norm) || !shiftAllowedByEmployee(emp, canonical)) {
        row[k] = '';
        warnings.push(`${emp.name} ${dayKeys[di]} : shift ${canonical} interdit par la fiche Équipe`);
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
    if (counts.openingAt7 < targets.openingAt7) deficits.push(`07h ${counts.openingAt7}/${targets.openingAt7}`);
    if (counts.openingAt8 < targets.openingAt8) deficits.push(`08h ${counts.openingAt8}/${targets.openingAt8}`);
    if (counts.openingAt9 < targets.openingAt9) deficits.push(`09h ${counts.openingAt9}/${targets.openingAt9}`);
    if (counts.openingAt10 < targets.openingAt10) deficits.push(`10h ${counts.openingAt10}/${targets.openingAt10}`);
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
        openingAt7: counts.openingAt7,
        openingAt8: counts.openingAt8,
        openingAt9: counts.openingAt9,
        openingAt10: counts.openingAt10,
        midi: counts.midi,
        afternoon: counts.afternoon,
        bridge1830: counts.bridge1830,
        evening: counts.evening,
        closing: counts.closing
      },
      targets: {
        openingAt7: targets.openingAt7,
        openingAt8: targets.openingAt8,
        openingAt9: targets.openingAt9,
        openingAt10: targets.openingAt10,
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
      const cfg = runtimeConfig(emp);
      const week = days.map((_, di) => compactDay(body.data?.[i]?.[di])).join('|');
      const contract = (emp.contract === undefined || emp.contract === null || emp.contract === '')
        ? '?'
        : emp.contract;
      const services = [
        cfg.services.morning ? 'matin' : '',
        cfg.services.lunch ? 'midi' : '',
        cfg.services.evening ? 'soir' : '',
        cfg.services.closing ? 'fermeture' : '',
        cfg.services.split ? `coupure(max${cfg.maxSplits})` : ''
      ].filter(Boolean).join(',');
      const ranks = cfg.ranks.length ? cfg.ranks.join(',') : 'NON_RENSEIGNE';
      const span = `${cfg.earliestStart||'?'}-${cfg.latestEnd||'?'}`;
      return `${emp.name};h=${contract};IA=${cfg.aiEnabled?'OUI':'NON'};compte=${cfg.countsForCoverage?'OUI':'NON'};services=${services||'AUCUN'};pref=${cfg.preferredService};amplitude=${span};rangs=${ranks};w=${week}`;
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

Chaque ligne EQUIPE contient désormais les autorisations réelles : IA, compte, services, préférence, amplitude et rangs.
Ne déduis aucune capacité à partir du prénom.
Semaine w=Lun|Mar|Mer|Jeu|Ven|Sam|Dim. "."=case à compléter.
RH/VAC/AM/CFA = VERROUILLES. ESC=Escale. C11/C10=coupures existantes.

EQUIPE:
${teamLines}

SHIFTS AUTORISES:
${allowedCompact}

REGLES DURES:
1) Sur "." : propose UNIQUEMENT un shift CONTINU présent dans SHIFTS AUTORISES, ou laisse "". JAMAIS RH/VAC/AM/CFA/Absent.
2) Une case déjà avec un horaire/statut est une forte référence: conserve-la sauf impossibilité de couverture/légalité.
3) SEMAINE STANDARD TEMPS PLEIN : 5 jours travaillés est une contrainte dure lorsque 5 jours sont disponibles après RH/Vacances/CFA/Arrêts verrouillés. Ne jamais laisser 4 jours uniquement parce que le quota horaire est presque atteint ; choisir un shift plus court le 5e jour si nécessaire. Maximum 5 jours travaillés dans une semaine standard, max 48h, repos entre journées >=11h. Si des indisponibilités verrouillées réduisent les jours disponibles, adapte le nombre de jours sans inventer de RH.
4) M: aucun soir/fermeture/coupure soir. Guillaume non planifié.
5) Salome: avant 12h ne compte pas; dès 12h = accueil seulement.
6) Martin V et Louis = MANUEL UNIQUEMENT : ne leur propose aucun shift sur une case libre et ne les compte jamais dans les minimums.
7) Normal midi/soir = 6 personnels réels; fort = 7. Fermeture = 5 personnels réels jusqu'à F/01h.
8) Matin mer/sam/dim: jusqu'à 10h = 2 réels (bar+plateau); dès 10h = 3 réels.
9) Echelonne réellement les prises de poste : journée = 07h/08h/09h/10h/11h selon besoin ; soir = 15h/16h/17h/18h selon besoin.
10) Les "pref" sont des habitudes, PAS un copier-coller obligatoire. Varie les shifts d'un même salarié quand plusieurs habitudes sont compatibles.
11) ÉQUILIBRE HEURES : tout profil S = cible 42h par défaut ; Arthur-Paul apprenti = 35h. Fais tourner les départs 15h/16h/17h/18h : personne ne doit être systématiquement à 15h ou systématiquement à 18h. Un nouvel employé non configuré est automatiquement S/42h.
12) COUVERTURE OPÉRATIONNELLE PRIORITAIRE : Salome/Accueil, Martin V et Louis ne comptent PAS dans les effectifs ci-dessous.
- BASE HIVER :
  - MIDI lundi/mardi/jeudi/vendredi : minimum 6 opérationnels + Salome/Accueil en plus.
  - MIDI mercredi/samedi/dimanche : minimum 7 opérationnels + Salome/Accueil en plus.
  - APRÈS-MIDI 15h–18h : minimum 4 opérationnels.
  - ROTATION REPAS DU SOIR : minimum 2 salariés de JOURNÉE encore présents jusqu'à 18h30 au minimum.
  - SOIR lundi à vendredi : minimum 5 opérationnels.
  - SOIR samedi/dimanche : minimum 6 opérationnels.
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

COUPURES — DERNIER RECOURS :
- Une coupure n'est autorisée que si la fiche contient coupure(maxN).
- Maximum N par semaine, jamais plus de 2.
- Tenter d'abord tous les shifts continus compatibles.
- Une coupure doit corriger un déficit réel sans en créer un autre.
- Formats admis : "Coupure 11h-15h/18h-01h" ou "Coupure 10h-15h/18h-01h".
13) Répartis la charge entre les salariés disponibles. Ne surutilise pas Emile ou un autre pour combler tous les trous.
14) N'invente jamais un contrat. Si le contrat vaut "?", n'utilise pas de cible d'heures inventée.
15) Si aucune solution continue sûre n'existe, laisse la case vide. Un préplanning incomplet est préférable à une mauvaise affectation.

CONTEXTE:
events=${relevantEvents || '-'}
meteo=${weatherCompact || '-'}

INTERPRETATION CONTEXTE:
La base hiver dépend déjà du jour : mercredi midi et week-end midi sont renforcés même sans événement ; le week-end soir est renforcé même sans événement.
Un événement fort peut encore augmenter le service concerné jusqu'aux seuils FORTS ; beau temps/vacances seuls ne rendent pas automatiquement FORT ; pluie déplace vers intérieur.

SORTIE JSON UNIQUEMENT:
{"planning":[{"name":"Prénom","lundi":"...","mardi":"...","mercredi":"...","jeudi":"...","vendredi":"...","samedi":"...","dimanche":"..."}],"notes":"court"}

Pour "." utilise uniquement un shift CONTINU exactement présent dans SHIFTS AUTORISES, sinon "".
Ne génère une coupure que si la fiche Équipe l'autorise et dans la limite indiquée.
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
