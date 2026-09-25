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
  'Virginie':     { rangs: ['Bar','Salle bas','Salle 400','Grand côté','Petit côté','Runner'], shifts: ['Matin'] },
  'Raphael':      { rangs: ['Bar','Salle bas','Grand côté','Petit côté'], shifts: ['Matin'] },
  'Seb':          { rangs: ['Bar','Salle bas','Grand côté','Petit côté','Fond'], shifts: ['Matin'] },
  'Anthony':      { rangs: ['Fond'], shifts: ['Matin'] },
  'Catherine':    { rangs: ['Salle bas','Salle 400','Petit côté'], shifts: ['Matin','Soir'] },
  'Ismaël':       { rangs: ['Bar','Salle bas','Salle 400','Grand côté','Petit côté','Fond','Runner'], shifts: ['Matin','Soir'] },
  'Pierre':       { rangs: ['Bar','Accueil','Runner'], shifts: ['Matin','Soir'] },
  'Maxence':      { rangs: ['Salle bas','Salle 400','Grand côté','Petit côté','Fond','Runner'], shifts: ['Soir'] },
  'Arthur-Paul':  { rangs: ['Bar','Salle bas','Salle 400','Grand côté','Petit côté','Fond','Runner'], shifts: ['Soir'] },
  'Yoann':        { rangs: ['Salle bas','Salle 400','Grand côté','Petit côté','Fond'], shifts: ['Soir'] },
  'Martin F':     { rangs: ['Salle bas','Salle 400','Grand côté','Petit côté','Fond','Runner'], shifts: ['Soir'] },
  'Antoine':      { rangs: ['Bar','Salle bas','Salle 400','Grand côté','Petit côté','Fond','Runner'], shifts: ['Soir'] },
  'Emile':        { rangs: ['Salle bas','Runner'], shifts: ['Soir'] },
  'Salome':       { rangs: ['Accueil','Runner'], shifts: ['Matin'] },
  'Guillaume':    { rangs: ['Bar'], shifts: [], note: 'Arrêt maladie longue durée - bar uniquement en priorité' },
  'Erwann':       { rangs: ['Bar','Salle bas','Salle 400','Grand côté','Petit côté','Accueil'], shifts: ['Soir'] },
  'Martin V':     { rangs: ['Bar','Salle bas','Salle 400','Grand côté','Petit côté','Fond','Accueil','Runner'], shifts: ['Matin','Soir'] },
  'Louis':        { rangs: ['Bar','Salle bas','Salle 400','Grand côté','Petit côté','Fond','Accueil','Runner'], shifts: ['Matin','Soir'] }
};

const REGLES_SERVICE = `
RÈGLES DE SERVICE L'OCÉAN — Vannes :

CAFÉ MATIN (Mercredi, Samedi, Dimanche uniquement) :
- Avant 10h30 : 1 personne au bar + 2 en terrasse (Petit côté ou Grand côté)
- Après 10h30 : 3 personnes en terrasse minimum
- Shift type : 07h ou 08h → 16h ou 17h

SERVICE MIDI (12h-15h, tous les jours) :
- 3 personnes en terrasse (Grand côté, Petit côté)
- 2 personnes en salle (Salle bas, Salle 400, Fond)
- 1 personne à l'accueil
- 1 personne au bar
- Si pluie : 2 en terrasse, plus en salle
- Shifts type : 11h → 18h30 ou coupure 11h-15h/18h-01h

SERVICE SOIR (18h-23h) :
- 1 personne au bar
- 3 personnes en terrasse (Grand côté, Petit côté)
- 1 personne en salle
- 1 runner
- 1 personne à l'accueil
- En hiver/mauvais temps : 2 en terrasse, 2 en salle
- Shifts type : 15h ou 16h → 23h ou 01h, ou coupure

RÈGLES CCN CHR :
- Repos minimum 11h entre deux services
- Maximum 48h par semaine
- Maximum 6 jours consécutifs
- Minimum 2 jours de repos par semaine
- Amplitude max 13h (coupure incluse)
- Pause coupure minimum 2h entre les deux tranches
`;

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return response(200, {});
  if (event.httpMethod !== 'POST') return response(405, { error: 'Méthode non autorisée' });

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return response(500, { error: 'GROQ_API_KEY manquante dans Netlify' });

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch(_) { return response(400, { error: 'JSON invalide' }); }

    const { weekDate, emps } = body;
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

    // Résumé des employés et leurs contraintes
    let empSummary = '';
    emps.forEach((emp, i) => {
      const comp = COMPETENCES[emp.name] || { rangs: [], shifts: [] };
      const reposDays = days.filter((_, di) => {
        const d = body.data && body.data[i] && body.data[i][di];
        return d && d.x === true;
      });
      const note = comp.note ? ` [${comp.note}]` : '';
      empSummary += `- ${emp.name} (${emp.contract || '?'}h/sem)${note}: rangs=[${comp.rangs.join(', ')}], shifts=[${comp.shifts.join('/')||'non défini'}], repos=${reposDays.join('/')||'aucun fixe'}\n`;
    });

    const prompt = `Tu es un expert en planification de restaurant. Génère une ébauche de planning hebdomadaire pour la semaine du ${dateLabels[0]} au ${dateLabels[6]} pour le restaurant L'Océan à Vannes.

${REGLES_SERVICE}

ÉQUIPE DISPONIBLE CETTE SEMAINE :
${empSummary}

INSTRUCTIONS :
1. Respecte STRICTEMENT les jours de repos fixes de chaque employé
2. Respecte les compétences — n'assigne jamais un rang qu'un employé ne maîtrise pas
3. Respecte les shifts (Matin/Soir) — un employé "Soir uniquement" ne travaille pas le matin
4. Assure la couverture minimale des services chaque jour
5. Respecte le contrat heures/semaine de chaque employé (± 1h)
6. Respecte les règles CCN CHR (repos 11h, max 48h/semaine, max 6 jours consécutifs)
7. Guillaume est en arrêt maladie longue durée — ne le planifie pas sauf instruction contraire

Réponds UNIQUEMENT avec un objet JSON valide, sans texte ni backticks, au format suivant :
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
  "notes": "Commentaires sur les choix faits et points d'attention"
}

Les valeurs possibles pour chaque jour : un horaire comme "09h > 17h30" ou "16h > 01h", "RH" (repos hebdo fixe), "Absent", "Vacances", "Arrêt maladie", "Coupure 11h-15h/18h-01h", "Coupure 10h-15h/18h-01h".`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_completion_tokens: 4000,
        temperature: 0.3,
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
};
