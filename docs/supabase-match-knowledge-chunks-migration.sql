-- Knowledge Base — pgvector similarity search RPC: match_knowledge_chunks
--
-- WHY
--   search-knowledge (Edge Function) embeds a query with OpenAI and needs a
--   top-k cosine-similarity lookup over ai_knowledge_chunks. This RPC keeps the
--   vector math + visibility rules in the database so the Edge Function only
--   passes a query embedding and filters.
--
-- SAFETY
--   * Returns ONLY chunks whose source.status = 'active' (never draft /
--     processing / failed / archived) and whose embedding IS NOT NULL.
--   * Returns curated KB content only — no user private data, no embeddings.
--   * SECURITY DEFINER with a pinned search_path so the visibility filter cannot
--     be bypassed by a caller's search_path; intended caller is the Edge
--     Function via the service role.
--   * Idempotent: CREATE OR REPLACE + idempotent GRANT/REVOKE. Re-runnable.
--   * NON-destructive: no table/data changes. Run manually (NOT auto-applied).
--
-- Cosine similarity = 1 - (embedding <=> query_embedding). The pgvector `<=>`
-- operator is cosine distance, so ascending distance = descending similarity.
--
-- NOTE (Supabase): pgvector is installed in the `extensions` schema here, so the
-- operator is schema-qualified as OPERATOR(extensions.<=>). A plain `<=>` fails
-- function-body validation at CREATE time with "operator does not exist:
-- extensions.vector <=> extensions.vector" (the function's own SET search_path
-- does not apply during creation-time validation). search_path also includes
-- `extensions` for execution-time resolution.

create or replace function public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_domain text default null,
  filter_language text default null
)
returns table (
  chunk_id uuid,
  source_id uuid,
  chunk_index int,
  content text,
  token_count int,
  similarity float,
  source_title text,
  source_domain text,
  source_language text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    c.id          as chunk_id,
    c.source_id   as source_id,
    c.chunk_index as chunk_index,
    c.content     as content,
    c.token_count as token_count,
    1 - (c.embedding OPERATOR(extensions.<=>) query_embedding) as similarity,
    s.title       as source_title,
    s.domain      as source_domain,
    s.language    as source_language
  from public.ai_knowledge_chunks c
  join public.ai_knowledge_sources s on s.id = c.source_id
  where s.status = 'active'
    and c.embedding is not null
    and (filter_domain   is null or s.domain    = filter_domain)
    and (filter_language is null or s.language  = filter_language)
    and (1 - (c.embedding OPERATOR(extensions.<=>) query_embedding)) >= match_threshold
  order by c.embedding OPERATOR(extensions.<=>) query_embedding asc
  -- Clamp defensively even though the Edge Function validates 1..10.
  limit greatest(1, least(match_count, 50));
$$;

-- Lock down execution: the Edge Function calls this with the service role.
-- `authenticated` is also allowed because the function only ever returns
-- already-readable active-source content (same data RLS exposes to clients);
-- this lets a future client-side retrieval call it directly if needed.
revoke all on function public.match_knowledge_chunks(vector, float, int, text, text) from public;
grant execute on function public.match_knowledge_chunks(vector, float, int, text, text) to service_role;
grant execute on function public.match_knowledge_chunks(vector, float, int, text, text) to authenticated;

-- =========================================================================
-- Verify (optional)
-- =========================================================================
--   select proname, prosecdef, proconfig
--   from pg_proc
--   where proname = 'match_knowledge_chunks';
--
-- Smoke test with a zero vector (returns rows only if threshold is low):
--   select chunk_id, source_title, source_domain, round(similarity::numeric, 4)
--   from public.match_knowledge_chunks(
--     (select embedding from public.ai_knowledge_chunks
--       where embedding is not null limit 1),
--     0.0, 5, null, null
--   );
