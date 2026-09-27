CREATE OR REPLACE FUNCTION public.lead_engine_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'channels', (SELECT count(*) FROM public.youtube_channels),
    'leads', (SELECT count(*) FROM public.youtube_channels WHERE qualification_status = 'contact_found'),
    'qualified', (SELECT count(*) FROM public.youtube_channels WHERE lead_score >= 50),
    'bands', (SELECT coalesce(jsonb_object_agg(priority_band, c), '{}'::jsonb) FROM (
        SELECT priority_band, count(*) c FROM public.youtube_channels
        WHERE priority_band IS NOT NULL GROUP BY priority_band) b),
    'phones', (SELECT count(*) FROM public.lead_contacts WHERE contact_type = 'phone'),
    'emails', (SELECT count(*) FROM public.lead_contacts WHERE contact_type = 'email'),
    'queuedSearch', (SELECT count(*) FROM public.discovery_jobs WHERE job_type='search' AND status IN ('queued','retry')),
    'queuedContact', (SELECT count(*) FROM public.discovery_jobs WHERE job_type='contact' AND status IN ('queued','retry')),
    'runningJobs', (SELECT count(*) FROM public.discovery_jobs WHERE status IN ('claimed','running')),
    'deadJobs', (SELECT count(*) FROM public.discovery_jobs WHERE status IN ('dead_letter','failed')),
    'segNew', (SELECT count(*) FROM public.search_segments WHERE status='new'),
    'segActive', (SELECT count(*) FROM public.search_segments WHERE status IN ('active','productive')),
    'segExhausted', (SELECT count(*) FROM public.search_segments WHERE status IN ('exhausted','low_yield','blocked','error')),
    'callingLeads', (SELECT count(*) FROM public.calling_leads),
    'seenTotal', (SELECT coalesce(sum(channels_found),0) FROM public.search_segments WHERE channels_found > 0),
    'uniqTotal', (SELECT coalesce(sum(unique_channels),0) FROM public.search_segments WHERE channels_found > 0)
  );
$$;

REVOKE ALL ON FUNCTION public.lead_engine_counts() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lead_engine_counts() TO service_role;