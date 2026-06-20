# AI Edge Functions — Request/Response Contract v1

Concise contract notes for the iOS/web clients. Only documents fields clients
rely on. Additive fields are safe (clients ignore unknown keys); removing or
renaming fields is a breaking change.

## interpret-dream

`POST /functions/v1/interpret-dream` · `Authorization: Bearer <user JWT>`

### Request

```jsonc
{
  "dream_id": "uuid",   // iOS sends snake_case; the dream row is fetched server-side
  "style": "string",    // optional, advisory (not yet used)
  "locale": "string"    // optional, advisory (e.g. "it-IT")
}
```

**Both `dream_id` (iOS, snake_case) and `dreamId` (web, camelCase) are accepted.**
The function normalizes to an internal `dreamId = dream_id ?? dreamId`. If neither
is present it returns `400 { error, error_code: "missing_dream_id" }`. A malformed
UUID returns `400 "Dati non validi"`.

### Response (200)

```jsonc
{
  "interpretation": "string",
  "interpretation_summary": "string",
  "alchemical_phase": "Nigredo | Albedo | Rubedo",

  // --- additive KB metadata (v1, optional, non-breaking) ---
  "kb_context_used": false,        // true only for tester-gated KB retrieval hits
  "kb_result_count": 0,
  "kb_sources": [                  // titles + domains only (never chunk content)
    { "title": "string", "domain": "string" }
  ]
}
```

The three `kb_*` fields were added with tester-gated Knowledge Base retrieval
(see [`interpret-dream-kb-retrieval-v1.md`](./interpret-dream-kb-retrieval-v1.md)).
They are **always present** but default to `false` / `0` / `[]` when retrieval is
disabled, finds nothing, or fails open. **iOS does not need to change**; it may
optionally surface `kb_sources`.

**Text conventions** (unchanged contract, documented for clients):
- `interpretation` / `interpretation_summary` are in the user `locale` (Italian
  by default); mood words stay in that language. They may contain **Markdown
  bold** (`**keyword**`) for a few symbolic keywords only — clients may render it
  as bold. No citation markers / source references appear.
- `alchemical_phase` ∈ `nigredo | albedo | rubedo`, taken from the phase the
  interpretation text declares (consistent with the written text).

### Errors

| Status | Body | Meaning |
|--------|------|---------|
| 400 | `{ error, error_code: "missing_dream_id" }` | neither `dream_id` nor `dreamId` provided |
| 400 | `{ error: "Dati non validi", details }` | malformed body (e.g. invalid UUID) |
| 401 | `{ error }` | missing / invalid JWT |
| 403 | `{ error }` | dream not owned by caller |
| 404 | `{ error }` | dream not found |
| 429 | `{ error, errorCode?, resetAt? }` | rate limit / AI quota |
| 500 | `{ error }` | internal error |

KB retrieval failures are **never** surfaced as errors — interpretation still
succeeds with `kb_context_used=false`.

## Privacy invariants (all AI functions)

- No dream content, KB chunk content, query text, embeddings, JWTs or API keys
  in logs.
- Retrieval logs store `query = NULL`.
- AI provider keys are server-side only; never returned to clients.

---

_See also: [AI_BACKEND_STATUS](./AI_BACKEND_STATUS.md) · [interpret-dream-kb-retrieval-v1](./interpret-dream-kb-retrieval-v1.md)_
