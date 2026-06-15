create extension if not exists pg_net with schema extensions;

create or replace function public.notify_admin_on_user_request()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text;
  v_name text;
begin
  select email, full_name into v_email, v_name
  from public.profiles
  where id = NEW.user_id;

  perform net.http_post(
    url := 'https://nuxixhoogohqligzgbdm.supabase.co/functions/v1/notify-user-activity',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'type', 'user_request',
      'data', jsonb_build_object(
        'user_email', v_email,
        'user_name', v_name,
        'request_type', NEW.request_type,
        'subject', NEW.subject,
        'message', NEW.message,
        'request_id', NEW.id,
        'attachment_urls', NEW.attachment_urls
      )
    )
  );

  return NEW;
exception when others then
  return NEW;
end;
$$;

drop trigger if exists trg_notify_admin_on_user_request on public.user_requests;
create trigger trg_notify_admin_on_user_request
after insert on public.user_requests
for each row execute function public.notify_admin_on_user_request();