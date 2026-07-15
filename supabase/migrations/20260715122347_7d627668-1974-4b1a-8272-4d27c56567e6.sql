
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL AND archived_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update their notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Inserts happen via SECURITY DEFINER functions / triggers only.

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: on new message, fan-out to other conversation participants.
CREATE OR REPLACE FUNCTION public.fanout_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, kind, title, body, link, actor_id, metadata)
  SELECT
    cp.user_id,
    'message.new',
    COALESCE(sender_name, 'Someone') || ' sent you a message',
    LEFT(NEW.body, 140),
    '/messages?c=' || NEW.conversation_id::text,
    NEW.sender_id,
    jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id <> NEW.sender_id
    AND cp.muted = false;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_insert_notify
AFTER INSERT ON public.messages
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL)
EXECUTE FUNCTION public.fanout_message_notification();
