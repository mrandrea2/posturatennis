# Circolo Tennis Scaligero — Valutazione fisico-posturale

App single-page per la valutazione fisico-posturale dei tennisti (a cura di Andrea Bertelli).
Analisi posturale 2D da foto (MediaPipe), test fisici con semaforo, FMS, test di stiffness sui 7 salti
consecutivi, valutazione scritta (IA o locale) e report PDF.

## Deploy su Vercel
1. Crea un repo con questi file (`index.html`, `api/evaluate.js`).
2. Importa il repo su Vercel.
3. Aggiungi la Environment Variable `ANTHROPIC_API_KEY` (Settings → Environment Variables) e fai redeploy.
   Senza chiave, l'app funziona comunque e usa la valutazione locale automatica.

## Note
- Il test dei 7 salti: si inseriscono tempo di contatto e tempo di volo del salto migliore;
  l'app calcola RSI (t volo / t contatto), l'altezza di volo e la rigidità verticale (metodo di Morin, serve il peso).
- Le bande di riferimento (oggetto `REF` in `index.html`) sono indicative: vanno calibrate sui dati reali del circolo.
- Foto: usa JPG/PNG. Gli HEIC dell'iPhone vengono convertiti automaticamente (serve connessione la prima volta).
