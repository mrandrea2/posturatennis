// Vercel Serverless Function · Circolo Tennis Scaligero
// Proposta di punteggio FMS da foto o fotogrammi video, con Claude (visione).
// Richiede ANTHROPIC_API_KEY. Modello: Claude Sonnet 5.5 (CLAUDE_MODEL per cambiarlo).
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const FALLBACK_MODEL = 'claude-sonnet-4-6';

// Criteri di punteggio del Functional Movement Screen (Cook et al.), 3 = esecuzione corretta.
const CRITERI = {
  squat: { nome: 'Deep Squat', bi: false, testo:
    "Bastone sopra la testa a braccia tese, piedi alla larghezza delle spalle, discesa massima.\n" +
    "3: busto parallelo alla tibia o più verticale, femore sotto l'orizzontale, ginocchia allineate sopra i piedi, bastone allineato sopra i piedi, talloni a terra.\n" +
    "2: criteri del 3 raggiunti solo con i talloni rialzati (asse/rialzo sotto i talloni).\n" +
    "1: anche con i talloni rialzati busto e tibia non paralleli, femore non sotto l'orizzontale, ginocchia non allineate o flessione lombare evidente." },
  hurdle: { nome: 'Hurdle Step', bi: true, testo:
    "Bastone sulle spalle, scavalcamento dell'ostacolo (altezza della tuberosità tibiale) con una gamba e ritorno; il lato è quello della gamba che scavalca.\n" +
    "3: anca, ginocchio e caviglia allineati sul piano sagittale, minimo o nessun movimento lombare, bastone e ostacolo restano paralleli.\n" +
    "2: allineamento anca-ginocchio-caviglia perso, movimento lombare, bastone e ostacolo non paralleli.\n" +
    "1: contatto del piede con l'ostacolo oppure perdita di equilibrio." },
  lunge: { nome: 'In-Line Lunge', bi: true, testo:
    "Piedi sulla stessa linea, bastone dietro la schiena a contatto con testa, dorso e sacro; il lato è quello della gamba avanti.\n" +
    "3: contatti del bastone mantenuti, nessun movimento del busto, bastone e piedi sul piano sagittale, il ginocchio dietro tocca dietro il tallone del piede avanti.\n" +
    "2: contatti del bastone non mantenuti, movimento del busto, bastone e piedi fuori dal piano sagittale, il ginocchio non tocca dietro il tallone.\n" +
    "1: perdita di equilibrio." },
  shoulder: { nome: 'Shoulder Mobility', bi: true, testo:
    "Pugni chiusi, una mano dall'alto e una dal basso dietro la schiena in un solo movimento; il lato è quello della mano in alto. Si misura la distanza tra i pugni rispetto alla lunghezza della mano dell'atleta.\n" +
    "3: pugni entro una lunghezza di mano.\n2: pugni entro una lunghezza e mezza di mano.\n1: pugni oltre una lunghezza e mezza di mano.\n" +
    "Dalla foto la distanza si può solo stimare: dichiaralo e usa confidenza al massimo «media»." },
  aslr: { nome: 'Active Straight-Leg Raise', bi: true, testo:
    "Supino, braccia lungo i fianchi, si solleva una gamba tesa con piede a martello mentre l'altra resta a terra; il lato è quello della gamba sollevata.\n" +
    "3: il malleolo della gamba sollevata supera la metà della coscia opposta (tra metà coscia e spina iliaca anteriore superiore).\n" +
    "2: il malleolo è tra metà coscia e la linea articolare del ginocchio.\n1: il malleolo è sotto la linea articolare del ginocchio.\n" +
    "Considera anche se la gamba a terra si flette o ruota." },
  pushup: { nome: 'Trunk Stability Push-Up', bi: false, testo:
    "Prono, piegamento con il corpo che si solleva in blocco, senza ritardo della zona lombare.\n" +
    "Maschi: 3 = una ripetizione corretta con i pollici all'altezza della fronte; 2 = con i pollici all'altezza del mento; 1 = non riesce con i pollici al mento.\n" +
    "Femmine: 3 = una ripetizione corretta con i pollici all'altezza del mento; 2 = con i pollici all'altezza delle clavicole; 1 = non riesce con i pollici alle clavicole.\n" +
    "Se il corpo non si solleva in blocco quella posizione non è superata." },
  rotary: { nome: 'Rotary Stability', bi: true, testo:
    "In quadrupedia sopra un'asse, estensione di braccio e gamba con ritorno a toccare gomito e ginocchio; il lato è quello del braccio che si muove.\n" +
    "3: ripetizione corretta in schema omolaterale (braccio e gamba dello stesso lato) con la schiena parallela all'asse.\n" +
    "2: ripetizione corretta solo in schema diagonale (braccio e gamba opposti).\n1: non riesce nemmeno lo schema diagonale." },
};

function system(c, sesso) {
  return [
    "Sei un valutatore esperto del Functional Movement Screen (FMS) e lavori con giovani tennisti agonisti.",
    "Ricevi foto o fotogrammi di un video (in ordine temporale) di un solo test FMS, eventualmente separati per lato. Proponi il punteggio da 1 a 3 per ogni lato ricevuto, seguendo solo questi criteri:",
    `TEST: ${c.nome}\n${c.testo}`,
    sesso ? `Sesso dell'atleta: ${sesso === 'F' ? 'femmina' : 'maschio'}.` : "Sesso dell'atleta non indicato: se conta per il punteggio, dillo nella motivazione.",
    "Regole:",
    "- Valuta solo ciò che si vede. Se inquadratura, angolazione o momento ripreso non permettono di decidere, metti punteggio null e spiega cosa riprendere.",
    "- Non assegnare mai 0: il dolore non si vede in un'immagine e lo valuta il preparatore. Non valutare i test di clearing.",
    "- Confidenza: «alta» solo se tutti i criteri decisivi sono chiaramente visibili; «media» se uno è dubbio; «bassa» se ne vedi pochi.",
    "- Motivazione in 1-2 frasi in italiano, legata ai criteri (es. «talloni sollevati per arrivare in basso, femore sotto l'orizzontale: 2»). Compensi: elenco breve di quelli visibili.",
    "- Non commentare aspetto fisico o identità della persona.",
    'Rispondi SOLO con JSON valido, senza testo prima o dopo: {"lati":[{"lato":"Sx"|"Dx"|null,"punteggio":1|2|3|null,"confidenza":"alta"|"media"|"bassa","motivazione":"...","compensi":["..."]}],"nota":"eventuale consiglio sulla ripresa, altrimenti stringa vuota"}',
    c.bi ? [
      "Test bilaterale. Se le riprese sono già indicate come «Lato Sx» o «Lato Dx», restituisci un elemento per ciascun lato ricevuto.",
      "Se ricevi un'unica ripresa, contiene l'esecuzione dei due lati uno dopo l'altro (di norma prima il destro e poi il sinistro, ma verificalo): individua in ogni fotogramma quale lato sta eseguendo secondo la definizione di lato del test e restituisci SEMPRE due elementi, uno con «lato» \"Dx\" e uno con «lato» \"Sx\".",
      "Lato significa lato dell'atleta, non dell'immagine: in una ripresa frontale la parte sinistra dell'atleta appare a destra nella foto, in una ripresa da dietro coincide. Capisci prima da dove è ripreso (viso visibile = frontale).",
      "Se un lato non compare nei fotogrammi o non riesci ad attribuirlo con sicurezza, per quel lato metti punteggio null e spiegalo; se l'attribuzione Sx/Dx è incerta usa confidenza «bassa».",
      "Se l'inquadratura non è adatta al test (es. Active Straight-Leg Raise, Trunk Stability Push-Up o Rotary Stability ripresi solo di fronte), dillo nella «nota» e abbassa la confidenza."
    ].join('\n') : "Test non bilaterale: un solo elemento con «lato» null. Se l'inquadratura non permette di vedere i criteri decisivi, dillo nella «nota».",
  ].join('\n');
}

function extractJson(text) {
  if (!text) return null;
  const t = text.replace(/```json|```/g, '');
  const i = t.indexOf('{'), j = t.lastIndexOf('}');
  if (i < 0 || j <= i) return null;
  try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { return null; }
}

async function callClaude(key, model, sys, content) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 1200, system: sys, messages: [{ role: 'user', content }] })
  });
  return { ok: r.ok, status: r.status, raw: await r.text() };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata su Vercel' }); return; }
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    const c = CRITERI[body && body.test];
    if (!c) { res.status(400).json({ error: 'Test FMS non riconosciuto' }); return; }
    const lati = (Array.isArray(body.lati) ? body.lati : []).slice(0, 2);
    const content = []; let n = 0;
    for (const l of lati) {
      const frames = (Array.isArray(l.frames) ? l.frames : []).filter(f => typeof f === 'string' && f.length > 100 && f.length < 1500000).slice(0, 12);
      if (!frames.length) continue;
      const lato = l.lato === 'Sx' || l.lato === 'Dx' ? l.lato : null;
      const intro = lato ? `Lato ${lato}` : (c.bi ? 'Ripresa unica con entrambi i lati' : 'Ripresa');
      content.push({ type: 'text', text: intro + (frames.length > 1 ? ` · ${frames.length} fotogrammi in ordine temporale (F1 = inizio)` : ' · foto') });
      frames.forEach((f, k) => { if (frames.length > 1) content.push({ type: 'text', text: `F${k + 1}` }); content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f } }); n++; });
    }
    if (!n) { res.status(400).json({ error: 'Nessuna immagine ricevuta' }); return; }
    content.push({ type: 'text', text: `Proponi il punteggio FMS per ${c.nome}${body.eta ? ` (atleta di ${body.eta} anni)` : ''} nel formato JSON indicato.` });

    const sys = system(c, body.sesso === 'M' || body.sesso === 'F' ? body.sesso : null);
    let model = MODEL;
    let out = await callClaude(key, model, sys, content);
    if (!out.ok && (out.status === 404 || out.status === 403) && model !== FALLBACK_MODEL) {
      model = FALLBACK_MODEL; out = await callClaude(key, model, sys, content);
    }
    if (!out.ok) { res.status(502).json({ error: 'Errore API Anthropic', status: out.status, detail: out.raw.slice(0, 600) }); return; }
    const j = JSON.parse(out.raw);
    const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text || '').join('\n');
    const parsed = extractJson(text);
    if (!parsed || !Array.isArray(parsed.lati)) { res.status(502).json({ error: 'Risposta non in formato JSON', detail: text.slice(0, 400) }); return; }
    parsed.lati = parsed.lati.map(l => Object.assign({}, l, {
      lato: c.bi ? (l.lato === 'Sx' || l.lato === 'Dx' ? l.lato : null) : null,
      punteggio: [1, 2, 3].includes(l.punteggio) ? l.punteggio : null }));
    if (c.bi) parsed.lati.sort((a, b) => (a.lato === 'Sx' ? 0 : 1) - (b.lato === 'Sx' ? 0 : 1));
    res.status(200).json(Object.assign(parsed, { model: j.model || model }));
  } catch (e) {
    res.status(500).json({ error: 'Errore interno', detail: String((e && e.message) || e) });
  }
};
