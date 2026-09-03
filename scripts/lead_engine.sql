-- =====================================================================
-- YouTube Lead Discovery Engine — schema, queue, quota router, cron
-- Run this ONCE in the Supabase SQL editor of project nuxixhoogohqligzgbdm.
-- Safe to re-run (idempotent).
-- Integrates with the existing public.calling_leads table (not modified).
-- =====================================================================

-- ---------------------------------------------------------------- 1. API projects
CREATE TABLE IF NOT EXISTS public.youtube_api_projects (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  api_key_secret_name text NOT NULL UNIQUE,
  enabled             boolean NOT NULL DEFAULT true,
  search_calls_used   integer NOT NULL DEFAULT 0,
  search_calls_limit  integer NOT NULL DEFAULT 100,
  read_units_used     integer NOT NULL DEFAULT 0,
  read_units_limit    integer NOT NULL DEFAULT 10000,
  quota_day           date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Los_Angeles')::date,
  last_used_at        timestamptz,
  cooldown_until      timestamptz,
  health_status       text NOT NULL DEFAULT 'healthy',  -- healthy|cooling|exhausted|error|disabled
  error_count         integer NOT NULL DEFAULT 0,
  priority            integer NOT NULL DEFAULT 100,
  created_at          timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.youtube_api_projects (name, api_key_secret_name, priority)
SELECT 'Project ' || i, 'YOUTUBE_API_KEY_' || i, 100 - i
FROM generate_series(1, 7) AS i
ON CONFLICT (api_key_secret_name) DO NOTHING;

-- ---------------------------------------------------------------- 2. Search frontier
CREATE TABLE IF NOT EXISTS public.search_segments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_signature   text NOT NULL UNIQUE,
  niche              text NOT NULL,
  query              text NOT NULL,
  normalized_query   text NOT NULL,
  intent             text NOT NULL DEFAULT 'primary',
  region_code        text NOT NULL DEFAULT '',
  language           text NOT NULL DEFAULT '',
  order_type         text NOT NULL DEFAULT 'relevance',
  strategy           text NOT NULL DEFAULT 'channel',  -- channel|video|commercial|creator|scale
  status             text NOT NULL DEFAULT 'new',      -- new|active|productive|low_yield|exhausted|blocked|error
  priority           double precision NOT NULL DEFAULT 50,
  page_token         text,
  pages_completed    integer NOT NULL DEFAULT 0,
  channels_found     integer NOT NULL DEFAULT 0,
  unique_channels    integer NOT NULL DEFAULT 0,
  qualified_channels integer NOT NULL DEFAULT 0,
  contacts_found     integer NOT NULL DEFAULT 0,
  phones_found       integer NOT NULL DEFAULT 0,
  duplicate_count    integer NOT NULL DEFAULT 0,
  error_count        integer NOT NULL DEFAULT 0,
  quota_cost         integer NOT NULL DEFAULT 0,
  last_error         text,
  last_searched_at   timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS search_segments_pick_idx
  ON public.search_segments (status, priority DESC, created_at);

CREATE TABLE IF NOT EXISTS public.search_jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id          uuid REFERENCES public.search_segments(id) ON DELETE CASCADE,
  search_signature    text NOT NULL,
  page_fingerprint    text NOT NULL UNIQUE,   -- signature + page token
  query               text NOT NULL,
  region_code         text NOT NULL DEFAULT '',
  language            text NOT NULL DEFAULT '',
  order_type          text NOT NULL DEFAULT 'relevance',
  strategy            text NOT NULL DEFAULT 'channel',
  page_token          text,
  api_project_id      uuid REFERENCES public.youtube_api_projects(id),
  status              text NOT NULL DEFAULT 'running',
  channels_discovered integer NOT NULL DEFAULT 0,
  quota_cost          integer NOT NULL DEFAULT 0,
  started_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  last_error          text
);
CREATE INDEX IF NOT EXISTS search_jobs_segment_idx ON public.search_jobs (segment_id, started_at DESC);

-- ---------------------------------------------------------------- 3. Canonical channels
CREATE TABLE IF NOT EXISTS public.youtube_channels (
  channel_id              text PRIMARY KEY,
  title                   text NOT NULL DEFAULT '',
  url                     text NOT NULL DEFAULT '',
  custom_url              text,
  description             text,
  thumbnail               text,
  subscriber_count        bigint NOT NULL DEFAULT 0,
  total_views             bigint NOT NULL DEFAULT 0,
  video_count             integer NOT NULL DEFAULT 0,
  country                 text,
  language                text,
  channel_created_at      timestamptz,
  last_upload_at          timestamptz,
  upload_frequency        double precision,
  recent_views            bigint,
  commercial_intent_score integer NOT NULL DEFAULT 0,
  monetization_likelihood text NOT NULL DEFAULT 'Low',      -- High|Medium|Low
  lead_score              integer NOT NULL DEFAULT 0,
  priority_band           text NOT NULL DEFAULT 'D',        -- A+|A|B|C|D
  qualification_status    text NOT NULL DEFAULT 'discovered',
  -- discovered|queued|processing|enriched|qualified|rejected|contact_found|duplicate|failed|retry
  attempts                integer NOT NULL DEFAULT 0,
  last_error              text,
  first_discovered_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at            timestamptz NOT NULL DEFAULT now(),
  last_enriched_at        timestamptz
);
CREATE INDEX IF NOT EXISTS youtube_channels_status_idx ON public.youtube_channels (qualification_status, lead_score DESC);
CREATE INDEX IF NOT EXISTS youtube_channels_band_idx ON public.youtube_channels (priority_band, first_discovered_at DESC);
CREATE INDEX IF NOT EXISTS youtube_channels_discovered_idx ON public.youtube_channels (first_discovered_at DESC);

CREATE TABLE IF NOT EXISTS public.youtube_channel_sources (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id         text NOT NULL REFERENCES public.youtube_channels(channel_id) ON DELETE CASCADE,
  keyword            text NOT NULL DEFAULT '',
  search_signature   text NOT NULL DEFAULT '',
  region             text NOT NULL DEFAULT '',
  language           text NOT NULL DEFAULT '',
  discovery_strategy text NOT NULL DEFAULT 'channel',
  discovered_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, search_signature)
);
CREATE INDEX IF NOT EXISTS channel_sources_channel_idx ON public.youtube_channel_sources (channel_id);

-- ---------------------------------------------------------------- 4. Contacts
CREATE TABLE IF NOT EXISTS public.lead_contacts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id       text NOT NULL REFERENCES public.youtube_channels(channel_id) ON DELETE CASCADE,
  contact_type     text NOT NULL,        -- phone|email|website|social|booking
  contact_value    text NOT NULL,
  normalized_value text NOT NULL,
  phone_class      text,                 -- business|mobile|office|unknown|invalid
  country_code     text,
  confidence       integer NOT NULL DEFAULT 50,
  source_url       text,
  source_type      text,                 -- about|rss|video|website|link
  first_seen_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, contact_type, normalized_value)
);
CREATE UNIQUE INDEX IF NOT EXISTS lead_contacts_phone_unique
  ON public.lead_contacts (normalized_value) WHERE contact_type = 'phone';
CREATE INDEX IF NOT EXISTS lead_contacts_channel_idx ON public.lead_contacts (channel_id);

CREATE TABLE IF NOT EXISTS public.lead_contact_links (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.lead_contacts(id) ON DELETE CASCADE,
  channel_id text NOT NULL REFERENCES public.youtube_channels(channel_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, channel_id)
);

-- ---------------------------------------------------------------- 5. Job queue
CREATE TABLE IF NOT EXISTS public.discovery_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        text NOT NULL,                 -- search|enrich|contact
  status          text NOT NULL DEFAULT 'queued',-- queued|claimed|running|completed|retry|failed|dead_letter
  priority        double precision NOT NULL DEFAULT 50,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key      text UNIQUE,
  attempts        integer NOT NULL DEFAULT 0,
  max_attempts    integer NOT NULL DEFAULT 4,
  worker_id       text,
  locked_at       timestamptz,
  lock_expires_at timestamptz,
  next_run_at     timestamptz NOT NULL DEFAULT now(),
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS discovery_jobs_claim_idx
  ON public.discovery_jobs (status, job_type, priority DESC, next_run_at);
CREATE INDEX IF NOT EXISTS discovery_jobs_lease_idx ON public.discovery_jobs (status, lock_expires_at);

-- ---------------------------------------------------------------- 6. Observability
CREATE TABLE IF NOT EXISTS public.api_usage (
  id               bigserial PRIMARY KEY,
  project_id       uuid REFERENCES public.youtube_api_projects(id),
  endpoint         text NOT NULL,
  quota_cost       integer NOT NULL DEFAULT 0,
  success          boolean NOT NULL DEFAULT true,
  error            text,
  job_id           uuid,
  search_signature text,
  channel_id       text,
  duration_ms      integer,
  worker_id        text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_usage_created_idx ON public.api_usage (created_at DESC);

CREATE TABLE IF NOT EXISTS public.market_performance (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region           text NOT NULL DEFAULT '',
  language         text NOT NULL DEFAULT '',
  niche            text NOT NULL DEFAULT '',
  searches         integer NOT NULL DEFAULT 0,
  unique_channels  integer NOT NULL DEFAULT 0,
  qualified_leads  integer NOT NULL DEFAULT 0,
  contacts         integer NOT NULL DEFAULT 0,
  phones           integer NOT NULL DEFAULT 0,
  quota_cost       integer NOT NULL DEFAULT 0,
  lead_yield       double precision NOT NULL DEFAULT 0,
  contact_yield    double precision NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'new',
  last_searched_at timestamptz,
  UNIQUE (region, language, niche)
);

-- ---------------------------------------------------------------- 7. Engine settings (singleton)
CREATE TABLE IF NOT EXISTS public.engine_settings (
  id            integer PRIMARY KEY DEFAULT 1,
  autopilot     boolean NOT NULL DEFAULT false,
  paused_reason text,
  target_leads  integer NOT NULL DEFAULT 20000,
  config        jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT engine_settings_singleton CHECK (id = 1)
);

INSERT INTO public.engine_settings (id, config) VALUES (1, jsonb_build_object(
  'niches', jsonb_build_array(),
  'markets', jsonb_build_array(
     jsonb_build_object('region','US','language','en'),
     jsonb_build_object('region','GB','language','en'),
     jsonb_build_object('region','CA','language','en'),
     jsonb_build_object('region','AU','language','en'),
     jsonb_build_object('region','IN','language','en'),
     jsonb_build_object('region','AE','language','en'),
     jsonb_build_object('region','SG','language','en')),
  'strategies', jsonb_build_array('channel','video','commercial','creator','scale'),
  'orders', jsonb_build_array('relevance','viewCount'),
  'minSubscribers', 1000,
  'minRecentViews', 0,
  'minLeadScore', 25,
  'maxSearchJobsPerTick', 2,
  'maxContactJobsPerTick', 12,
  'contactConcurrency', 6,
  'weights', jsonb_build_object('audience',25,'activity',20,'views',20,'commercial',15,'contact',10,'monetization',10)
)) ON CONFLICT (id) DO NOTHING;

-- worker single-flight lease
CREATE TABLE IF NOT EXISTS public.engine_locks (
  name       text PRIMARY KEY,
  worker_id  text,
  expires_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- 8. Grants + RLS (read-only for the dashboard)
GRANT SELECT ON public.youtube_api_projects, public.search_segments, public.search_jobs,
  public.youtube_channels, public.youtube_channel_sources, public.lead_contacts,
  public.lead_contact_links, public.discovery_jobs, public.api_usage,
  public.market_performance, public.engine_settings TO authenticated;
GRANT ALL ON public.youtube_api_projects, public.search_segments, public.search_jobs,
  public.youtube_channels, public.youtube_channel_sources, public.lead_contacts,
  public.lead_contact_links, public.discovery_jobs, public.api_usage,
  public.market_performance, public.engine_settings, public.engine_locks TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.api_usage_id_seq TO service_role;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['youtube_api_projects','search_segments','search_jobs','youtube_channels',
    'youtube_channel_sources','lead_contacts','lead_contact_links','discovery_jobs','api_usage',
    'market_performance','engine_settings','engine_locks']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    BEGIN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t || '_select', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------- 9. Atomic quota reservation
CREATE OR REPLACE FUNCTION public.reserve_api_quota(_search_calls integer, _read_units integer)
RETURNS TABLE (project_id uuid, secret_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  today date := (now() AT TIME ZONE 'America/Los_Angeles')::date;
  rec record;
BEGIN
  UPDATE public.youtube_api_projects
     SET search_calls_used = 0, read_units_used = 0, quota_day = today,
         health_status = CASE WHEN enabled THEN 'healthy' ELSE 'disabled' END,
         cooldown_until = NULL, error_count = 0
   WHERE quota_day < today;

  SELECT * INTO rec
    FROM public.youtube_api_projects
   WHERE enabled
     AND (cooldown_until IS NULL OR cooldown_until <= now())
     AND search_calls_used + _search_calls <= search_calls_limit
     AND read_units_used + _read_units <= read_units_limit
   ORDER BY (search_calls_limit - search_calls_used) DESC,
            (read_units_limit - read_units_used) DESC,
            priority DESC, last_used_at NULLS FIRST
   FOR UPDATE SKIP LOCKED
   LIMIT 1;

  IF rec IS NULL THEN RETURN; END IF;

  UPDATE public.youtube_api_projects
     SET search_calls_used = search_calls_used + _search_calls,
         read_units_used   = read_units_used + _read_units,
         last_used_at = now()
   WHERE id = rec.id;

  project_id := rec.id; secret_name := rec.api_key_secret_name;
  RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION public.release_api_quota(_project uuid, _search_calls integer, _read_units integer)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.youtube_api_projects
     SET search_calls_used = GREATEST(0, search_calls_used - _search_calls),
         read_units_used   = GREATEST(0, read_units_used - _read_units)
   WHERE id = _project;
$$;

CREATE OR REPLACE FUNCTION public.mark_api_project(_project uuid, _status text, _cooldown_seconds integer)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.youtube_api_projects
     SET health_status = _status,
         error_count = CASE WHEN _status = 'healthy' THEN 0 ELSE error_count + 1 END,
         search_calls_used = CASE WHEN _status = 'exhausted' THEN search_calls_limit ELSE search_calls_used END,
         read_units_used   = CASE WHEN _status = 'exhausted' THEN read_units_limit ELSE read_units_used END,
         cooldown_until = CASE WHEN _cooldown_seconds > 0
                               THEN now() + make_interval(secs => _cooldown_seconds) ELSE NULL END
   WHERE id = _project;
$$;

-- ---------------------------------------------------------------- 10. Queue helpers
CREATE OR REPLACE FUNCTION public.recover_expired_jobs()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  WITH x AS (
    UPDATE public.discovery_jobs
       SET status = CASE WHEN attempts >= max_attempts THEN 'dead_letter' ELSE 'queued' END,
           worker_id = NULL, locked_at = NULL, lock_expires_at = NULL
     WHERE status IN ('claimed','running') AND lock_expires_at < now()
     RETURNING 1)
  SELECT count(*) INTO n FROM x;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.claim_jobs(_worker text, _job_type text, _limit integer, _lease_seconds integer)
RETURNS SETOF public.discovery_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE public.discovery_jobs d
     SET status = 'running', worker_id = _worker, locked_at = now(),
         lock_expires_at = now() + make_interval(secs => _lease_seconds),
         attempts = d.attempts + 1
   WHERE d.id IN (
     SELECT id FROM public.discovery_jobs
      WHERE status IN ('queued','retry') AND job_type = _job_type AND next_run_at <= now()
      ORDER BY priority DESC, next_run_at
      FOR UPDATE SKIP LOCKED
      LIMIT _limit)
   RETURNING d.*;
END $$;

-- single-flight worker lease
CREATE OR REPLACE FUNCTION public.acquire_engine_lock(_name text, _worker text, _seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  INSERT INTO public.engine_locks (name, worker_id, expires_at)
  VALUES (_name, _worker, now() + make_interval(secs => _seconds))
  ON CONFLICT (name) DO UPDATE
     SET worker_id = EXCLUDED.worker_id, expires_at = EXCLUDED.expires_at
   WHERE public.engine_locks.expires_at < now()
  RETURNING true INTO ok;
  RETURN COALESCE(ok, false);
END $$;

CREATE OR REPLACE FUNCTION public.release_engine_lock(_name text, _worker text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.engine_locks SET expires_at = now() - interval '1 second'
   WHERE name = _name AND worker_id = _worker;
$$;

REVOKE ALL ON FUNCTION public.reserve_api_quota(integer,integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_api_quota(uuid,integer,integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_api_project(uuid,text,integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_jobs(text,text,integer,integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.recover_expired_jobs() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.acquire_engine_lock(text,text,integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_engine_lock(text,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_api_quota(integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_api_quota(uuid,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_api_project(uuid,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_jobs(text,text,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.recover_expired_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION public.acquire_engine_lock(text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_engine_lock(text,text) TO service_role;

-- ---------------------------------------------------------------- 11. Autopilot cron (runs without a browser)
-- Requires pg_cron + pg_net (available on Supabase).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('lead-engine-tick');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'lead-engine-tick',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nuxixhoogohqligzgbdm.supabase.co/functions/v1/lead-engine-worker',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"source":"cron"}'::jsonb,
    timeout_milliseconds := 5000
  );
  $cron$
);
