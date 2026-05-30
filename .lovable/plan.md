# Piano

## 1. Rimuovere Citrinitas (Grande Opera a 3 fasi)

La sezione "La grande opera" deve mostrare solo **Nigredo → Albedo → Rubedo** (coerente con il sistema alchemico già in uso nel resto dell'app, che si basa solo su 3 fasi — vedi `src/utils/alchemical-phases.ts` e `supabase/functions/_shared/alchemical-calculator.ts`).

**File da modificare:**
- `src/components/ResearchSection.tsx` — rimuovere l'oggetto `citrinitas` dall'array `phases`, aggiornare i numeri romani: Nigredo `I · L'oscuramento`, Albedo `II · La purificazione`, Rubedo `III · L'integrazione`. La griglia passa da `lg:grid-cols-4` a `lg:grid-cols-3` e il testo sotto-titolo da "quattro fasi" a "tre fasi" (es. _"Le tre fasi del fuoco interiore"_).
- `supabase/functions/chat-with-alchemist/index.ts` (riga 163) — nel prompt di sistema rimuovere Citrinitas: `Nigredo → Albedo → Rubedo`.

Nessun altro riferimento testuale a Citrinitas è presente nel codice.

## 2. Rinominare "Esplora" → suggerimento

**Proposta**: **"Visioni Condivise"** (alternativa: "Sogni della Community" / "Diario Collettivo").
Motivazione: "Esplora" è generico e non comunica che si tratta di **sogni di altri utenti**. "Visioni Condivise" è coerente con il lessico mistico/editoriale del progetto e chiarisce subito la natura sociale del contenuto.

**File da aggiornare** (testo del label, route resta `/explore` per non rompere link):
- `src/components/Footer.tsx` (riga 18)
- `src/components/ui/mini-navbar.tsx` (riga 77)
- `src/pages/Explore.tsx` — H1, meta description, sottotitolo ("Scopri le visioni condivise dalla community dei sognatori")
- `src/pages/DreamDetail.tsx` (righe 840, 856) — aggiornare i messaggi che citano "pagina Esplora"

## 3. Nuova vista pubblica del sogno (senza chat Alchimista)

Oggi cliccando su una card in /explore l'utente viene mandato a `/dreams/:id`, che è la vista privata completa (include `AlchemistChat`, azioni di edit, condivisione, ecc.) e dipende da policy RLS che possono bloccare non-proprietari.

**Approccio**: creare una rotta dedicata **`/visione/:id`** (pagina `SharedDreamPublicFull.tsx`, basata su `SharedDreamPublic.tsx` già esistente) che mostri:
- Titolo, data, mood, tag, immagine generata
- **Interpretazione completa** (testo + eventuale summary)
- Fase alchemica del sogno (badge)
- Autore (username + avatar) con link al profilo pubblico
- **Niente** `AlchemistChat`, niente azioni di edit/share/delete, niente TTS premium

La query userà `dreams` con filtro `visibility = 'public'` (le RLS già lo permettono — vedi memory _Dreams RLS Privacy_).
Il bottone "Visualizza Sogno" in `Explore.tsx` viene reindirizzato a `/visione/${id}` invece di `/dreams/${id}`.

## 4. Gancio marketing per conversione → iscrizione/abbonamento

Sulla pagina pubblica `/visione/:id`, l'interpretazione viene mostrata in due parti per generare desiderio:

**a) Anteprima libera** — primi ~40% dell'interpretazione visibili in chiaro.

**b) Paywall soft con effetto blur** sul resto, con overlay editoriale:
```text
   ✦ ✦ ✦
   La voce dell'Alchimista continua…
   
   Sblocca l'interpretazione completa, la tua mappa
   alchemica personale e il dialogo con l'Alchimista.
   
   [ Inizia il tuo viaggio — gratis ]
   Hai già un account? Accedi
```

Elementi del gancio:
- **Social proof sotto la card**: "Più di N sognatori stanno tracciando la loro Opera" (contatore da `profiles`).
- **Scarsity/curiosity**: mostrare 2-3 simboli/tag del sogno con tooltip "Significato riservato ai membri".
- **Loss aversion**: "Il tuo sogno di stanotte potrebbe contenere lo stesso simbolo. Scoprilo."
- **CTA primario** → `/auth?mode=signup&from=visione&dream=:id` (parametro `from` per tracciare la sorgente di conversione in futuro).
- **Sticky banner** in fondo alla pagina su mobile con stesso CTA.

Per utenti **già loggati ma free**, sostituire il paywall con CTA verso il piano premium (placeholder per ora se non c'è ancora flusso abbonamento — in tal caso link a `/settings` con tab "Piano").

## Dettagli tecnici

- Nuova rotta in `src/App.tsx`: `<Route path="/visione/:id" element={<SharedDreamPublicFull />} />` (lazy import).
- Componente `PaywallBlur` riutilizzabile in `src/components/marketing/PaywallBlur.tsx` (mask CSS `linear-gradient` + `backdrop-filter: blur(6px)` sul testo nascosto, design coerente con tokens mystic-magenta/glow).
- Aggiornare `src/utils/route-prefetch.ts` se necessario per la nuova rotta.
- Aggiornare memory: la fase Citrinitas non esiste nel sistema (già coerente, solo conferma); nuova rotta canonica `/visione/:id` per vista pubblica con paywall.

## Cosa NON tocco

- RLS, schema DB, edge functions diverse da `chat-with-alchemist`.
- La rotta `/dreams/:id` continua a servire la vista privata completa per il proprietario.
- Nessun cambio al sistema di pagamento reale (non esiste ancora un flusso abbonamenti — il CTA punta a registrazione/settings).

---

**Domande prima di procedere:**
1. Confermi il nome **"Visioni Condivise"** o preferisci "Sogni della Community" / un'altra variante?
2. Il paywall deve scattare **sempre** per non-loggati, o vuoi che i primi N sogni siano completamente leggibili (per SEO/condivisione virale)?
