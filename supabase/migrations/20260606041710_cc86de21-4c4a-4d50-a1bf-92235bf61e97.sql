
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON public.prospects USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_search_text_trgm ON public.prospects USING gin (search_text gin_trgm_ops);
ANALYZE public.prospects;
