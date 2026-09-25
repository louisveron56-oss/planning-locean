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

exports.handler = async function(event) {
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

    // Résumé des employés, contraintes et planning actuellement affiché
    let empSummary = '';
    let referencePlanning = '';
    emps.forEach((emp, i) => {
      const comp = COMPETENCES[emp.name] || { rangs: [], shifts: [], ghost: false };
      const reposDays = days.filter((_, di) => {
        const d = body.data && body.data[i] && body.data[i][di];
        return d && d.x === true;
      });
      const note = comp.note ? ` [${comp.note}]` : '';
      const ghost = comp.ghost ? ' [FANTÔME - ne compte pas dans les minimums]' : '';
      empSummary += `- ${emp.name} (${emp.contract || '?'}h/sem)${ghost}${note}: rangs=[${comp.rangs.join(', ')}], profil=[${comp.shifts.join('/')||'non défini'}], repos fixes=${reposDays.join('/')||'aucun'}\n`;

      const current = days.map((day, di) => {
        const d = body.data && body.data[i] && body.data[i][di];
        return `${day}=${formatReferenceDay(d)}`;
      }).join(' | ');
      referencePlanning += `- ${emp.name}: ${current}\n`;
    });

    const externalContextText = [
      'ÉVÉNEMENTS / VACANCES / JOURS FÉRIÉS :',
      externalEvents.length
        ? externalEvents.map(ev => `- ${ev.date || 'date inconnue'} | ${ev.name || 'Événement'} | lieu=${ev.lieu || ''} | impact=${ev.impact || 'non défini'} | ${ev.note || ''}`).join('\n')
        : '- Aucun événement/context externe notable transmis.',
      '',
      'MÉTÉO PAR JOUR :',
      Object.keys(weatherByDate).length
        ? Object.entries(weatherByDate).map(([date,w]) => `- ${date} : code=${w.code}, max=${w.max}°C, probabilité pluie=${w.rainProb}%`).join('\n')
        : '- Météo indisponible.'
    ].join('\n');

    const prompt = `Tu es un expert en planification opérationnelle de restaurant. Génère une ÉBAUCHE de planning hebdomadaire pour la semaine du ${dateLabels[0]} au ${dateLabels[6]} pour le restaurant L'Océan à Vannes.

${REGLES_SERVICE}

ÉQUIPE ET COMPÉTENCES :
${empSummary}

PLANNING DE RÉFÉRENCE ACTUELLEMENT AFFICHÉ :
${referencePlanning}

CONTEXTE EXTERNE DE LA SEMAINE :
${externalContextText}

INTERPRÉTATION DU NIVEAU D'ACTIVITÉ :
- Le niveau par défaut est NORMAL.
- Un événement à fort impact le même jour (ex. RC Vannes à domicile, marathon, Vannetaise, gros salon/concert, Noël/centre-ville) peut faire passer le service concerné à FORT.
- Beau temps seul ne suffit pas automatiquement à classer FORT : il renforce surtout la terrasse, particulièrement vendredi/samedi/dimanche et en période de vacances.
- Vacances scolaires ou jour férié seuls = facteur de hausse, pas automatiquement FORT.
- Plusieurs signaux cumulés (week-end + beau temps + vacances + événement fort) = FORT.
- Pluie ou météo défavorable ne signifie pas automatiquement CALME : elle déplace surtout les besoins de terrasse vers l'intérieur.
- Utilise l'heure de l'événement si elle est disponible : un match le soir doit surtout influencer le soir, pas forcément le midi.
- Si le contexte est ambigu, reste NORMAL plutôt que d'inventer une hausse.
- Dans "notes", indique brièvement quels jours/services tu as considérés FORTS et pourquoi.

COMMENT UTILISER LE PLANNING DE RÉFÉRENCE :
- Un statut RH, Vacances, Arrêt maladie ou CFA est verrouillé : ne le change jamais.
- Un horaire déjà présent est une forte préférence de stabilité : conserve-le s'il respecte les règles et la couverture.
- Une case VIDE est libre.
- Ne reconstruis pas toute la semaine inutilement : pars de ce squelette et modifie uniquement ce qui est nécessaire.
- Les salariés FANTÔMES Martin V et Louis peuvent conserver leurs horaires, mais ils ne comptent jamais dans les effectifs minimums.

CONSIGNES DE GÉNÉRATION :
1. Respecte toutes les RÈGLES DURES avant toute autre considération.
2. Vérifie mentalement la couverture de chaque service avec les PERSONNELS RÉELS uniquement.
3. Salome peut être planifiée dès 10h30/11h pour préparation accueil, mais elle ne satisfait aucun besoin opérationnel avant 12h ; à partir de midi elle ne peut satisfaire que le besoin "Accueil".
4. Pour un service normal, assure 6 personnels réels ; pour une fermeture, 5 personnels réels jusqu'à F.
5. N'utilise pas une coupure si un shift continu permet une couverture correcte ; maximum 2 coupures par salarié/semaine.
6. Vise le contrat de chaque salarié avec une tolérance d'environ ±2h ; évite les heures supplémentaires inutiles.
7. Préserve au maximum la stabilité du planning de référence.
8. Guillaume reste en arrêt maladie et n'est pas planifié.
9. Si une contrainte rend la couverture impossible, ne triche pas : indique le manque dans "notes".
10. En l'absence d'un indicateur explicite de flux fort, considère le service au niveau NORMAL.

Avant de produire le JSON final, contrôle :
- aucun salarié matin strict sur un service du soir ou une fermeture ;
- Salome non comptée opérationnellement avant 12h, puis accueil uniquement ;
- Martin V et Louis exclus de tous les calculs de minimum ;
- 5 personnels réels à chaque fermeture ;
- repos/statuts verrouillés conservés ;
- aucune violation du repos minimum ;
- heures contractuelles raisonnablement proches de la cible.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte ni backticks, au format :
{
  "planning": [
    {
      "name": "Prénom",
      "lundi": "09h > 17h30" ou "RH" ou "Absent" ou "Vacances" ou "Coupure 11h-15h/18h-01h",
      "mardi": "...",
      "mercredi": "...",
      "jeudi": "...",
      "vendredi": "...",
      "samedi": "...",
      "dimanche": "..."
    }
  ],
  "notes": "Résumé concis des niveaux d’activité retenus par jour/service (NORMAL/FORT + raison), arbitrages, manques de couverture éventuels, dépassements ou exceptions."
}

Valeurs autorisées pour chaque jour :
- un horaire comme "09h > 17h30", "16h > 01h" ;
- "RH", "Absent", "Vacances", "Arrêt maladie", "CFA" ;
- "Coupure 11h-15h/18h-01h" ;
- "Coupure 10h-15h/18h-01h".`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_completion_tokens: 4000,
        temperature: 0.15,
        reasoning_effort: 'low',
        reasoning_format: 'hidden',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Tu es un assistant de planification pour restaurant. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ni après, sans backticks.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return response(500, { error: `Groq erreur ${groqRes.status}: ${err.slice(0, 200)}` });
    }

    const groqData = await groqRes.json();
    const text = groqData.choices?.[0]?.message?.content || '';

    // Extraire le JSON
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    let planning = null;
    try {
      if (start >= 0 && end >= 0) planning = JSON.parse(text.slice(start, end + 1));
    } catch(e) {
      return response(500, { error: 'Réponse Groq non parseable', raw: text.slice(0, 500) });
    }

    return response(200, { planning });

  } catch(e) {
    console.error('generate function error:', e);
    return response(500, { error: e.message || 'Erreur inconnue' });
  }
