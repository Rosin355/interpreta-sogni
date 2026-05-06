## Obiettivo

Arricchire l'IA che interpreta i sogni con le nuove informazioni alchemiche fornite, espandere la sezione "Alchimia" generata e migliorare la catalogazione automatica Nigredo / Albedo / Rubedo.

## Modifiche

### 1. Prompt IA — Edge Functions

File interessati:
- `supabase/functions/interpret-dream/index.ts`
- `supabase/functions/interpret-dream-with-astrology/index.ts`

In entrambi sostituire il blocco "LESSICO SIMBOLICO ALCHEMICO" con la versione estesa che include:

- **Simboli archetipici tipici** evidenziati:
  - Rubedo → rubino, diamanti, gioielli, sole come simboli tipici
  - Albedo → unicorno come animale tipico
  - Nigredo → corvo come animale tipico
- **Nuovi animali Nigredo**: squalo, calamaro gigante, orca, maiale (in aggiunta a scimmioni, corvi, rinoceronti, coccodrilli, serpenti, topi, elefanti)
- **Nota filosofica Nigredo**: "La Nigredo non è una fase negativa di per sé: è negativa nel senso che 'nega' la distinzione (Viveka). È una fase di indifferenziazione necessaria, non un giudizio."
- **Rubedo arricchita**: enfasi su immagini di fertilità (campi di grano), sole molto lucente, arcobaleno, nuvole paradisiache, abbracci che emanano amore estremo, unioni sessuali/romantiche di estremo benessere, divinità benevole verso il sognatore.
- **Albedo arricchita**: enfasi su animali e uccelli bianchi dal portamento leggiadro (aironi, conigli, oche, colombe, cigni) e creature che mediano fra terra/acqua e cielo.

### 2. Sezione "Alchimia" estesa nell'output

Aggiungere alle REGOLE INTERPRETATIVE l'istruzione esplicita:

> Includi sempre nell'interpretazione una sezione dedicata "✦ Alchimia" in cui:
> 1. Dichiari la fase dominante (Nigredo / Albedo / Rubedo) e motivala citando i simboli precisi presenti nel sogno.
> 2. Riconosci eventuali aperture verso un'altra fase.
> 3. Espandi liberamente con ciò che ritieni più utile al sognatore (significato della fase nel suo percorso, suggerimenti di consapevolezza, cosa la fase "chiede" di integrare).
> 4. Se la fase è Nigredo, ricorda che non è negativa ma una fase di indifferenziazione (Viveka) necessaria alla trasformazione.

### 3. Calcolatore di fase — pesi più precisi

File: `supabase/functions/_shared/alchemical-calculator.ts`

- Alzare il peso dei simboli **tipici** (corvo → 1.0, unicorno → 1.0 già presente, rubino → 1.0, diamante → 0.9, sole → 1.0).
- Aggiungere nuovi tag/keyword Nigredo: `squalo`, `calamaro`, `calamaro gigante`, `orca`, `maiale` (peso 0.7-0.8).
- Aggiungere keyword Rubedo mancanti coerenti col nuovo lessico (`abbraccio luminoso`, `divinità benevola` già presenti — verificare e completare).
- Aggiungere keyword Albedo per "creatura che vola e tocca acqua/terra".

### 4. Out of scope

- Nessuna modifica al frontend (la sezione "Alchimia" sarà parte naturale del testo interpretativo restituito).
- Nessuna nuova tabella né nuova UI.
- `chat-with-alchemist` non viene toccato (mantiene il suo system prompt attuale).

## Verifica

- Build automatica delle Edge Functions.
- Controllo dei log della prossima interpretazione per confermare la presenza della sezione "✦ Alchimia" e una fase coerente con i nuovi simboli.
