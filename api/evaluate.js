// Vercel Serverless Function — Circolo Tennis Scaligero
// Genera la valutazione fisico-posturale con Claude. Richiede la env var ANTHROPIC_API_KEY.
const MODEL = 'claude-sonnet-4-6';

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata su Vercel' }); return; }

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    const data = body && body.data ? body.data : body;

    const system =
      "Sei un preparatore atletico e scienziato dello sport esperto di tennis agonistico. " +
      "Ricevi i dati di valutazione di un tennista (antropometria, test fisici, Functional Movement Screen, analisi posturale 2D incluso lo squat frontale e laterale). " +
      "Scrivi una valutazione generale professionale in italiano, chiara e operativa per programmare l'allenamento. " +
      "Usa ESATTAMENTE queste sei sezioni, ognuna come paragrafo che inizia con l'etichetta in MAIUSCOLO seguita dai due punti: " +
      "SINTESI DEL PROFILO: ; PUNTI DI FORZA: ; AREE DI MIGLIORAMENTO: ; PRIORITA DI ALLENAMENTO: ; CONSIGLI DI ALLENAMENTO: ; RISCHIO INFORTUNI: . " +
      "Interpreta i numeri in chiave tennistica: spostamenti multidirezionali, split-step, decelerazioni e ripartenze, servizio e rotazioni del tronco, gestione del lato dominante. " +
      "Il test dei 7 salti consecutivi misura rigidità (stiffness) e reattività (RSI = t volo / t contatto): una buona stiffness migliora split-step, ripartenze e cambi di direzione. " +
      "In CONSIGLI DI ALLENAMENTO dai indicazioni CONCRETE e periodizzate: tipologie di esercizi, frequenza settimanale e, dove utile, schemi indicativi di serie x ripetizioni o durate, collegandole alle criticità emerse. Includi lavoro specifico per il tennis (agilità multidirezionale, pliometria a basso tempo di contatto, cura dell'arto dominante e del riequilibrio). " +
      "Collega esplicitamente i rilievi di postura e di squat (valgismo, profondità, mobilità) alla performance e al rischio infortuni tipici del tennis (spalla dell'arto dominante, gomito, polso, schiena, ginocchio/caviglia nei cambi di direzione). " +
      "Usa SOLO i dati forniti: non inventare valori mancanti e segnala se un dato manca. " +
      "IMPORTANTE sul formato: scrivi in prosa, NON usare markdown (niente #, *, **, trattini come elenco, né righe di separazione ---), NON aggiungere un titolo né una riga con nome/livello all'inizio: parti direttamente da 'SINTESI DEL PROFILO:'. " +
      "Ricorda che è uno screening, non una diagnosi clinica. Lunghezza: 350-500 parole. Tono tecnico ma leggibile.";

    const userMsg =
      "Dati della valutazione (JSON):\n\n" + JSON.stringify(data, null, 2) +
      "\n\nProduci la valutazione generale seguendo ESATTAMENTE le sei sezioni indicate, senza titolo iniziale e senza markdown.";

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, system, messages: [{ role: 'user', content: userMsg }] })
    });
    if (!r.ok) { const t = await r.text(); res.status(502).json({ error: 'Errore API Anthropic', detail: t }); return; }
    const j = await r.json();
    const text = (j.content || []).map(b => b.text || '').join('\n').trim();
    res.status(200).json({ evaluation: text });
  } catch (e) {
    res.status(500).json({ error: 'Errore interno', detail: String(e && e.message || e) });
  }
};
