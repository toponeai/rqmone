CREATE TABLE public.ai_core_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.ai_core_messages TO authenticated;
GRANT ALL ON public.ai_core_messages TO service_role;

ALTER TABLE public.ai_core_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own AI messages"
  ON public.ai_core_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own AI messages"
  ON public.ai_core_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own AI messages"
  ON public.ai_core_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX ai_core_messages_user_created_idx
  ON public.ai_core_messages (user_id, created_at);