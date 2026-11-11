// Vercel Serverless Function · Circolo Tennis Scaligero
// Analisi complessiva atletico-posturale degli agonisti con Claude (testo + lettura delle foto).
// Richiede la variabile d'ambiente ANTHROPIC_API_KEY.
// Modello: Claude Sonnet 5.5. Si può cambiare senza toccare il codice con la variabile CLAUDE_MODEL.
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const FALLBACK_MODEL = 'claude-sonnet-4-6'; // usato solo se il modello principale non è disponibile per la chiave

const SYSTEM = [
  "Sei un preparatore atletico esperto di tennis giovanile agonistico e di valutazione funzionale. Lavori per il settore agonistico del Circolo Tennis Scaligero di Verona.",
  "Ricevi in JSON la valutazione di un atleta agonista (di norma tra 8 e 18 anni): antropometria, batteria di test atletici del circolo con livello già assegnato (1 Ottimo, 2 Buono, 3 Sufficiente, 4 Scarso, calcolato sulle soglie del circolo per sesso e fascia d'età), differenza tra navetta 5x4 e sprint 20 m (efficacia nei cambi di direzione), Functional Movement Screen e misure posturali ricavate da foto con pose estimation. Possono essere allegate le foto (frontale, laterale, squat frontale, squat laterale).",
  "Compito: produrre un'analisi complessiva che metta in relazione i dati tra loro (non un elenco di numeri) e un piano di lavoro concreto.",
  "Regole di contenuto:",
  "- Usa solo i dati ricevuti. Non inventare valori, non ricalcolare i livelli, non citare test che mancano se non per dire che mancano.",
  "- Collega le qualità: ad esempio sprint buono ma navetta 5x4 scarsa indica un problema di frenata e gioco di gambe, non di velocità; scarsa flessibilità e squat poco profondo vanno letti insieme; valgismo del ginocchio e cambi di direzione; asimmetrie e lato dominante.",
  "- Leggi tutto in chiave tennistica: split step, primo passo, spostamenti laterali, decelerazioni e ripartenze, servizio, rotazioni del tronco, sport monolaterale.",
  "- Adatta esercizi e carichi all'età: fino a 11 anni gioco, coordinazione e corpo libero; 12-15 anni tecnica dei fondamentali di forza, pliometria controllata, attenzione ai picchi di crescita; dai 16 anni forza con sovraccarichi progressivi. Mai carichi massimali nei più giovani.",
  "- Dosaggi sempre espliciti (serie x ripetizioni, durate, recuperi) e frequenza settimanale realistica per un ragazzo che si allena anche in campo.",
  "- Se sono presenti le foto, osserva solo assetto posturale ed esecuzione dello squat (allineamento di capo, spalle, bacino, ginocchia, piedi; profondità e compensi) e integra o correggi le misure automatiche quando l'immagine lo giustifica. Non commentare aspetto fisico, peso corporeo o identità della persona.",
  "- Se nell'FMS c'è un punteggio 0 (dolore) o in anamnesi è riferito dolore, indica la necessità di una valutazione medica o fisioterapica prima di caricare il distretto.",
  "- È uno screening, non una diagnosi: niente diagnosi cliniche.",
  "- Tono: tecnico ma comprensibile anche per atleta e genitori. Non usare il nome dell'atleta (non ti viene fornito): scrivi «l'atleta».",
  "Formato di risposta: SOLO un oggetto JSON valido, senza testo prima o dopo e senza blocchi di codice, con esattamente queste chiavi:",
  '{',
  '  "sintesi": "4-6 frasi: quadro generale, giudizio atletico, relazione tra le qualità, lettura posturale essenziale",',
  '  "punti_forza": ["3-5 voci brevi con il dato a supporto"],',
  '  "aree_miglioramento": ["3-6 voci brevi con il dato a supporto"],',
  '  "lettura_postura": "3-5 frasi che integrano FMS, misure da foto e (se presenti) osservazione delle foto; se mancano dillo in una frase",',
  '  "priorita": [{"titolo": "priorità in poche parole", "motivo": "perché, con riferimento ai dati"}],',
  '  "piano_lavoro": [{"area": "nome del blocco", "obiettivo": "una frase", "frequenza": "es. 2 volte a settimana · 15 min", "esercizi": [{"nome": "esercizio", "dosaggio": "es. 3 x 8 per lato", "note": "indicazione tecnica breve"}]}],',
  '  "prevenzione": ["3-5 indicazioni di prevenzione infortuni specifiche per il tennis e per questo profilo"],',
  '  "monitoraggio": "quando ripetere i test e cosa osservare"',
  '}',
  "Vincoli: 2-4 priorità in ordine di importanza; 3-6 blocchi nel piano di lavoro, ordinati come le priorità, ciascuno con 3-5 esercizi. Testi in italiano, senza markdown, senza simboli come <= o >= (scrivi «fino a», «almeno»).",
].join("\n");

function extractJson(text) {
  if (!text) return null;
  const t = text.replace(/```json|```/g, '');
  const i = t.indexOf('{'), j = t.lastIndexOf('}');
  if (i < 0 || j <= i) return null;
  try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { return null; }
}

async function callClaude(key, model, content) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 4000, system: SYSTEM, messages: [{ role: 'user', content }] })
  });
  const raw = await r.text();
  return { ok: r.ok, status: r.status, raw };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata su Vercel' }); return; }

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    const data = body && body.data ? body.data : body;
    const images = Array.isArray(body && body.images) ? body.images.slice(0, 4) : [];

    const content = [];
    let used = 0;
    for (const im of images) {
      if (!im || typeof im.data !== 'string' || im.data.length < 100 || im.data.length > 1500000) continue;
      content.push({ type: 'text', text: 'Foto: ' + String(im.vista || 'vista').slice(0, 40) });
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: im.data } });
      used++;
    }
    content.push({ type: 'text', text:
      'Dati della valutazione (JSON):\n\n' + JSON.stringify(data, null, 2) +
      '\n\nProduci l\'analisi complessiva e il piano di lavoro nel formato JSON indicato.' });

    let model = MODEL;
    let out = await callClaude(key, model, content);
    // Se il modello non è disponibile per questa chiave, riprova con quello di riserva.
    if (!out.ok && (out.status === 404 || out.status === 403) && model !== FALLBACK_MODEL) {
      model = FALLBACK_MODEL;
      out = await callClaude(key, model, content);
    }
    if (!out.ok) { res.status(502).json({ error: 'Errore API Anthropic', status: out.status, detail: out.raw.slice(0, 600) }); return; }

    const j = JSON.parse(out.raw);
    const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text || '').join('\n').trim();
    const evaluation = extractJson(text);
    if (!evaluation) { res.status(502).json({ error: 'Risposta del modello non in formato JSON', detail: text.slice(0, 600) }); return; }
    res.status(200).json({ evaluation, model: j.model || model, images_used: used });
  } catch (e) {
    res.status(500).json({ error: 'Errore interno', detail: String((e && e.message) || e) });
  }
};
