-- Enable the pg_net extension for making HTTP requests from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function to call the edge function when a new contact message is inserted
CREATE OR REPLACE FUNCTION public.notify_new_contact_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Build the payload matching the edge function's expected format
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'contact_messages',
    'schema', 'public',
    'record', jsonb_build_object(
      'id', NEW.id,
      'full_name', NEW.full_name,
      'email', NEW.email,
      'subject', NEW.subject,
      'message', NEW.message,
      'created_at', NEW.created_at
    )
  );
  
  -- Call the edge function asynchronously using pg_net
  PERFORM net.http_post(
    url := 'https://nuxixhoogohqligzgbdm.supabase.co/functions/v1/notify-new-message',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := payload
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction - message insertion should still succeed
  RAISE WARNING 'Failed to send notification for contact message %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create the trigger on contact_messages table
DROP TRIGGER IF EXISTS on_new_contact_message ON public.contact_messages;

CREATE TRIGGER on_new_contact_message
  AFTER INSERT ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_contact_message();