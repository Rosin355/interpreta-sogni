# Piano: Sistema di documentazione progetto leggero

Obiettivo: creare 5 file markdown sintetici in `docs/` che permettano a una nuova sessione Claude Code di capire lo stato del progetto leggendo pochi file. Nessun cambiamento al codice runtime, nessun deploy, nessuna chiamata AI.

## File da creare

Tutti sotto `docs/`, ciascuno **< 300 righe**, con tabelle/checklist e link invece di contenuto duplicato.

1. **`docs/PROJECT_STATUS.md`** — stato globale del progetto
   - Last Updated (data 2026-06-03)
   - Current Milestone: "Pre-RevenueCat AI + Knowledge Base foundation"
   - Architecture Summary (iOS / Web-admin / Supabase / AI providers / RevenueCat futuro)
   - Completed Major Milestones (checklist)
   - Active Workstream (KB/RAG foundation)
   - Golden Rules (no API keys in iOS, usage_ledger, trigger AI manuale, ecc.)
   - Read Next → link agli altri 4 file

2. **`docs/IOS_TASKS.md`** — task/status iOS
   - Sezioni: Current iOS Status / Completed / Current TODOs / Later TODOs / Known Risks / Files/Areas to Inspect
   - Contenuto come da brief

3. **`docs/WEB_TASKS.md`** — task/status web/admin
   - Sezioni: Current Web/Admin Status / Completed / Current TODOs / Later TODOs / Files/Areas to Inspect
   - Contenuto come da brief

4. **`docs/AI_BACKEND_STATUS.md`** — stato AI/backend
   - Tabella Provider Strategy (Feature | Provider | Status)
   - Lista Edge Functions correnti + pianificate
   - Lista tabelle Supabase rilevanti
   - Lista secret (solo nomi)
   - Current AI Safety Rules
   - Allineato alla realtà del repo: rimuoverò `get-user-entitlements` e `revenuecat-webhook` dalla lista "esistenti" se non sono presenti, e le sposterò in "planned" (al momento nel repo non risultano)

5. **`docs/CLAUDE_CONTEXT_GUIDE.md`** — guida "read this first"
   - Flusso di lettura (status → task file pertinente → docs di dettaglio solo se serve)
   - Regole di aggiornamento (update dopo ogni task, < 300 righe, no duplicazione)
   - Sezione "Prompt Starter" con tre prompt pronti (iOS / Web-Admin / AI Backend)

## File esistenti da aggiornare minimamente

Solo aggiunta di un breve blocco "See also" in cima/fondo (1-3 righe), nessuna riscrittura:

- `README.md` → link a `docs/PROJECT_STATUS.md` e `docs/CLAUDE_CONTEXT_GUIDE.md`
- `docs/admin-knowledge-base-v1.md` → link a `docs/WEB_TASKS.md` e `docs/PROJECT_STATUS.md`
- `docs/admin-knowledge-ingest-v1.md` → link a `docs/WEB_TASKS.md` e `docs/AI_BACKEND_STATUS.md`
- `docs/ai-knowledge-base-strategy-v1.md` → link a `docs/AI_BACKEND_STATUS.md` e `docs/PROJECT_STATUS.md`

## Verifiche finali

- `wc -l` su ogni nuovo file per confermare < 300 righe
- Nessuna modifica a: `src/**`, `supabase/functions/**`, `supabase/migrations/**`, `supabase/config.toml`, package files
- Nessun deploy, nessuna migrazione, nessuna chiamata AI

## Report finale

Elenco file aggiunti, file modificati (solo link "See also"), conteggio righe per file nuovo, conferma "nessun cambiamento runtime" e "nessuna chiamata AI", e i 3 prompt starter pronti per copia/incolla.

## Domanda di conferma rapida

Nel brief sono elencate come Edge Functions esistenti anche `get-user-entitlements` e `revenuecat-webhook`, ma nel repo attuale non risultano (`supabase/functions/`). Procedo elencandole sotto **planned** invece che **existing** — se invece esistono altrove (o devo comunque listarle come "existing"), dimmelo prima di buildare.
