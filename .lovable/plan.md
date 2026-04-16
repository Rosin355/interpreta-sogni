

## Diagnosi dei tre problemi

### Problema 1 — Link "pagina non trovata"
Il link inviato è `https://dreamalchemist.app/dream/4dc5f27e-...`. Ma in `App.tsx` la rotta canonica è `/dreams/:id` (plurale). Esistono solo due rotte con `/dream/`: `/dream/shared/:token` (link pubblico). La rotta `/dream/:id` (singolare) non esiste — quindi cade su `NotFound`.

**Causa**: nella edge function `send-email-notification`, `buildNewCommentEmail` usa `${APP_URL}/dream/${data?.dreamId}` (singolare). Inoltre `buildDreamSharedEmail` e `buildDreamSharedUserRequestEmail` puntano a `/shared-dreams-received`, ma in `App.tsx` la rotta è `/shared-with-me`. Tutti i link nelle email sono rotti.

In più `APP_URL` è hardcoded a `https://interpreta-sogni.lovable.app` invece del dominio attivo `https://dreamalchemist.app`.

### Problema 2 — Email non recapitata a jessicaommarin@gmail.com
Il toast mostra "inviato" perché `supabase.functions.invoke` non attende l'esito reale di Resend (e non logga niente lato client). Possibili cause da verificare nei log Resend:
- Account Resend in modalità test (può inviare solo all'email del proprietario)
- Bounce / classificazione spam
- Dominio `dreamalchemist.app` non completamente verificato su Resend

Non posso "risolvere" questo dalla codebase senza i log Resend, ma posso (a) restituire e mostrare l'errore reale al mittente, (b) loggarlo in `error_logs` con il pattern unificato, (c) verificare che `RESEND_API_KEY` e dominio siano configurati correttamente.

### Problema 3 — Counter dei tab a 0 nel pannello del ricevente
In `SharedDreamsReceived.tsx` la query filtra su `shared_with_user_id`. La INSERT in `TabEmail` (`ShareDreamUnified.tsx` riga 162-164) imposta correttamente `shared_with_user_id: recipientId`. Quindi i record dovrebbero esserci.

Ma Jessica nel suo pannello "vede i sogni condivisi" — quindi la query funziona. Il problema dei counter nasce dal fatto che `filteredShares(status)` viene chiamato dentro il render della TabsList **prima** che `shares` sia popolato (oppure tutti hanno `status` ≠ pending/accepted/declined). Più probabile: gli `status` salvati hanno valore atteso ma la realtime subscription scatena un re-render dove `shares` resta sincronizzato. Devo ispezionare lo stato reale via console — ma il bug più plausibile è che il record di Jessica abbia `shared_with_user_id = null` perché il lookup `find_user_by_email` non l'ha trovata (Jessica non era ancora registrata al momento del primo invio) → è entrata nel ramo `user_invitation` invece di creare il record `dream_shares`. Quando poi si è registrata, i sogni "che vede" sono in realtà quelli condivisi via altro canale.

Per il counter serve verifica diretta a runtime; il fix che propongo è aggiungere logging visibile + assicurarsi che lo stato `status` letto dalla DB sia esattamente uno tra `pending|accepted|declined`.

---

## Fix proposti (atomici, nessuna feature nuova)

### File 1 — `supabase/functions/send-email-notification/index.ts`
- Cambiare `APP_URL` in `https://dreamalchemist.app`
- `buildDreamSharedEmail`: link → `${APP_URL}/shared-with-me`
- `buildDreamSharedUserRequestEmail`: link → `${APP_URL}/shared-with-me`
- `buildNewCommentEmail`: link → `${APP_URL}/dreams/${data?.dreamId}` (plurale)
- `buildProfessionalApprovedEmail`: link → `${APP_URL}/shared-dreams`
- Già logga su console; lascio com'è.

### File 2 — `src/components/ShareDreamUnified.tsx`
- In `TabEmail.handleShare` e `TabProfessional.handleShare`: catturare `error` da `supabase.functions.invoke('send-email-notification', ...)` e:
  - Estrarre il messaggio reale via `await error.context?.json()`
  - Mostrare toast con warning "Sogno condiviso ma email non recapitata: <motivo>"
  - Loggare in `error_logs` con `function_name: 'send-email-notification'`, `dream_id`, metadata (recipient, type)
- Così Jessica e l'admin vedranno subito perché l'email non è arrivata.

### File 3 — `src/pages/SharedDreamsReceived.tsx`
- Aggiungere `console.log` di debug in `loadShares` per stampare l'array `shares` con tutti gli `status` (utile per la diagnosi runtime di Jessica). Verrà rimosso dopo conferma.
- Nessun cambio funzionale ai counter (la logica `filteredShares` è corretta — il bug, se esiste, è nei dati).

### Verifica esterna richiesta all'utente (dopo il fix)
1. Aprire **Resend dashboard → Logs** e cercare l'email a `jessicaommarin@gmail.com`: confermare che sia stata accettata, che il dominio `dreamalchemist.app` sia `verified` (SPF/DKIM/DMARC ok), e che non sia stata classificata come bounce/spam.
2. Se Resend è in modalità **test**, può inviare solo all'email del proprietario dell'account → in tal caso bisogna verificare il dominio.

### File NON toccati
- `App.tsx` (rotte già corrette)
- DB schema, RLS policies
- Altre edge function
- Auth, dashboard admin

