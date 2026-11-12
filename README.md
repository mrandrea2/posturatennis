# Circolo Tennis Scaligero · Valutazione atletico-posturale agonisti

App a pagina singola per il settore agonistico (a cura di Andrea Bertelli).

- **Test atletici**: batteria CTS 2026/27 (sit and reach, salto in lungo, lancio dorsale, navetta 8×6, sprint 20 m, navetta 5×4, beep test) con livelli 1-4 sulle soglie del circolo per sesso e fascia d'età, differenza 5×4 − 20 m e giudizio complessivo. Stesse regole del foglio `test_2026_27.xlsx`.
- **Postura**: FMS + foto (frontale, laterale, squat frontale e laterale) con pose estimation eseguita sul dispositivo.
- **FMS da foto o video**: in ogni test si carica una foto o un video breve; nei test bilaterali basta un unico video con il lato destro e poi il sinistro. L'app estrae 5 fotogrammi (10 nei bilaterali) e `api/fms.js` chiede a Claude una proposta di punteggio 1-3 con motivazione e compensi visti. Il punteggio lo conferma il preparatore; dolore (0) e test di clearing non vengono valutati dall'IA.
- **Analisi complessiva e piano di lavoro**: generati da Claude tramite `api/evaluate.js`; se il servizio non risponde l'app usa l'analisi locale a regole.
- **Importa da Excel**: il pulsante legge il foglio «Dati test» di `test_2026_27.xlsx` e crea una scheda per ogni atleta. Reimportando il file aggiornato i risultati si aggiornano e foto e analisi già fatte restano. Si sceglie l'atleta, si caricano le foto e la scheda si salva da sola dopo l'analisi.
- **Report PDF** con logo del circolo.

## Deploy su Vercel
1. Carica questa cartella in un repository e importalo su Vercel.
2. In Settings → Environment Variables aggiungi `ANTHROPIC_API_KEY`, poi fai redeploy.
3. Modello predefinito: Claude Sonnet 5.5 (`claude-sonnet-5-5`), con Sonnet 4.6 di riserva. Facoltativo: `CLAUDE_MODEL` per cambiarlo.

## Ritarare le soglie
Le soglie sono nell'oggetto `REF` in `index.html`, una riga per sesso e fascia: `[Ottimo, Buono, Sufficiente]` per ogni test e `diff` per la differenza 5×4 − 20 m.

## Dati personali
Il repository non contiene dati di atleti. Le schede vivono solo nel browser di chi importa il file Excel (IndexedDB), quindi su un altro dispositivo vanno importate di nuovo. All'IA vengono inviati età, sesso, risultati, note di anamnesi e, se la casella è attiva, le foto; mai nome e data di nascita.
