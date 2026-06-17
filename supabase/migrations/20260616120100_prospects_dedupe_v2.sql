-- Dedupe across the whole prospects table by email AND by normalized channel link.

create or replace function public.jsonb_object_keys_count(j jsonb)
returns integer
language sql
immutable
as $$
  select coalesce(
    (select count(*)::int
     from jsonb_each_text(case when jsonb_typeof(j) = 'object' then j else '{}'::jsonb end)
     where value is not null and btrim(value) <> ''),
    0
  )
$$;

create or replace function public.prospects_normalize_channel(url text)
returns text
language sql
immutable
as $$
  select case
    when url is null or btrim(url) = '' then null
    else lower(regexp_replace(regexp_replace(btrim(url), '\?.*$', ''), '/$', ''))
  end
$$;

create or replace function public.prospects_dedupe_all()
returns table(removed integer, kept integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_count integer := 0;
  total_after integer := 0;
  pass_removed integer;
begin
  if auth.uid() is not null and not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Only admins can run dedupe';
  end if;

  -- Pass 1: by email
  with ranked as (
    select id,
           row_number() over (
             partition by lower(btrim(email))
             order by
               (case when channel_name is not null and channel_name <> '' then 1 else 0 end) desc,
               (case when last_fetched_at is not null then 1 else 0 end) desc,
               public.jsonb_object_keys_count(data) desc,
               last_fetched_at desc nulls last,
               created_at desc
           ) as rn
    from prospects
    where email is not null and btrim(email) <> ''
  ),
  dele as (
    delete from prospects where id in (select id from ranked where rn > 1)
    returning 1
  )
  select count(*)::int into pass_removed from dele;
  removed_count := removed_count + pass_removed;

  -- Pass 2: by normalized channel link
  with ranked as (
    select id,
           row_number() over (
             partition by public.prospects_normalize_channel(channel_link)
             order by
               (case when channel_name is not null and channel_name <> '' then 1 else 0 end) desc,
               (case when last_fetched_at is not null then 1 else 0 end) desc,
               public.jsonb_object_keys_count(data) desc,
               last_fetched_at desc nulls last,
               created_at desc
           ) as rn
    from prospects
    where public.prospects_normalize_channel(channel_link) is not null
  ),
  dele as (
    delete from prospects where id in (select id from ranked where rn > 1)
    returning 1
  )
  select count(*)::int into pass_removed from dele;
  removed_count := removed_count + pass_removed;

  select count(*)::int into total_after from prospects;
  removed := removed_count;
  kept := total_after;
  return next;
end;
$$;

grant execute on function public.prospects_normalize_channel(text) to authenticated, service_role;
grant execute on function public.jsonb_object_keys_count(jsonb) to authenticated, service_role;
grant execute on function public.prospects_dedupe_all() to authenticated, service_role;
