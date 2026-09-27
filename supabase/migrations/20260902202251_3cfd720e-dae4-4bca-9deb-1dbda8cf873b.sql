CREATE TABLE IF NOT EXISTS public.engine_events (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL DEFAULT 'info',
  worker_id text,
  message text NOT NULL
);
CREATE INDEX IF NOT EXISTS engine_events_at_idx ON public.engine_events (at DESC);
GRANT ALL ON public.engine_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.engine_events_id_seq TO service_role;
ALTER TABLE public.engine_events ENABLE ROW LEVEL SECURITY;