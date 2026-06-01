## Admin UI: Knowledge Base AI

Aggiungere una pagina admin per gestire `ai_knowledge_sources` tramite la Edge Function `ingest-knowledge-source` esistente. Nessuna chiamata AI, nessun chunking, nessun embedding.

### File da creare

1. **`src/pages/AdminKnowledgeBase.tsx`** — pagina protetta con guard admin (stesso pattern di `AdminDashboard.tsx`: `supabase.auth.getUser()` + `supabase.rpc('is_admin', { _user_id })`, redirect a `/auth` o `/` con toast). Include `<Navigation />`, header "Knowledge Base AI", bottone "Nuova fonte" che apre il dialog, e la lista.

2. **`src/components/admin/KnowledgeSourcesList.tsx`** — tabella shadcn con colonne: title, domain, source_type, status (badge colorato), language, tags (chips), updated_at. Filtri sopra la tabella: select `domain`, select `status`, select `language`, input search per title (filtro client-side su query già caricata, limit 200). Empty state: "Nessuna fonte nella Knowledge Base. Inizia aggiungendo un testo di riferimento." Query: `supabase.from('ai_knowledge_sources').select('*').order('updated_at', { ascending: false })`. RLS attuale permette SELECT solo su `status = 'active'` — annotare TODO per aggiungere policy admin SELECT su tutti gli status (vedi sezione "Limitazione nota" sotto).

3. **`src/components/admin/KnowledgeSourceForm.tsx`** — form dentro `<Dialog>` con react-hook-form + zod, campi: title (min 3), domain (Select con i 10 valori), source_type (Select: manual_text/note/markdown/txt), status (Select: draft/active, default draft), language (Input default "it"), author (Input opzionale), origin (Input opzionale), tags (Input comma-separated → array normalizzato), raw_text (Textarea min 100 char, contatore). 

   Helper copy sopra raw_text: *"Inserisci qui testi di riferimento alchemici, astrologici o simbolici che potranno guidare le future interpretazioni AI."*

   Privacy warning (Alert variant destructive/warning): *"La Knowledge Base contiene solo materiale curatoriale. Non inserire sogni privati degli utenti."*

   Submit: `supabase.functions.invoke('ingest-knowledge-source', { body: payload })`. Success → toast "Fonte salvata nella Knowledge Base", chiude dialog, callback per refetch lista. Error → toast "Non siamo riusciti a salvare la fonte. Verifica i permessi admin e riprova." Nessun insert diretto client-side.

4. **`docs/admin-knowledge-base-v1.md`** — documenta: route `/admin/knowledge-base`, flusso create via Edge Function, no embeddings/chunks/AI calls ancora, le fonti `active` saranno processate in fase futura, divieto di copiare sogni privati nella KB.

### File da modificare

5. **`src/App.tsx`** — aggiungere `<Route path="/admin/knowledge-base" element={<AdminKnowledgeBase />} />` (lazy import coerente con altre route admin).

6. **`src/pages/AdminDashboard.tsx`** — aggiungere bottone "Knowledge Base AI" accanto a "Gestione Audio" nell'header, che naviga a `/admin/knowledge-base`.

### Limitazione nota (Task 5)

RLS attuale su `ai_knowledge_sources`:
- SELECT: solo `status = 'active'` per authenticated
- INSERT/UPDATE/DELETE: bloccati per client

Conseguenze per questo pass:
- La lista mostrerà solo fonti `active`. Le `draft` create via Edge Function non saranno visibili agli admin dalla UI finché non viene aggiunta una policy SELECT admin.
- Edit / archive / activate dal client non sono possibili senza nuove policy.

Opzioni (da decidere prima dell'implementazione):
- **A (consigliata, minimale):** aggiungere migration con policy SELECT admin su `ai_knowledge_sources` per vedere tutti gli status. Niente UPDATE client (resta TODO documentato).
- **B:** lasciare tutto via Edge Function. La lista resterebbe limitata a `active` — UX poco utile per draft.
- **C:** rimandare ogni cambio RLS, accettare la limitazione.

Il piano assume **opzione A** (una sola policy SELECT admin, nessun privilegio di scrittura aggiunto al client).

### Out of scope (intenzionale)

- Nessuna chiamata a OpenAI / Anthropic / Lovable AI / ElevenLabs
- Nessun chunking, nessun embedding, nessuna retrieval
- Nessuna modifica a iOS / Capacitor
- Nessuna scrittura client diretta su `ai_knowledge_sources`
- Service role key resta solo nella Edge Function
- Nessuna delete permanente
