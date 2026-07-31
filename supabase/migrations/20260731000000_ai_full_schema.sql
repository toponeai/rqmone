-- ─────────────────────────────────────────────────────────────────────────────
-- AI Core Full Schema
-- Tables: ai_conversations, ai_messages, ai_agents, ai_plans, ai_plan_tasks,
--         ai_prompt_templates, ai_logs, ai_rate_limits
-- ─────────────────────────────────────────────────────────────────────────────

-- ── AI Agents (defined first; conversations FK → agents) ──────────────────

CREATE TABLE public.ai_agents (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  description    text        NOT NULL DEFAULT '',
  system_prompt  text        NOT NULL,
  model          text        NOT NULL DEFAULT 'google/gemini-2.5-flash',
  provider       text        NOT NULL DEFAULT 'lovable-gateway',
  tools          text[]      NOT NULL DEFAULT '{}',
  is_active      boolean     NOT NULL DEFAULT true,
  metadata       jsonb       NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_agents_user_all"
  ON public.ai_agents
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX ai_agents_user_id_idx ON public.ai_agents (user_id);

-- ── AI Conversations ──────────────────────────────────────────────────────

CREATE TABLE public.ai_conversations (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id     uuid        REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  title        text        NOT NULL DEFAULT 'New Conversation',
  model        text        NOT NULL DEFAULT 'google/gemini-2.5-flash',
  provider     text        NOT NULL DEFAULT 'lovable-gateway',
  metadata     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conversations_user_all"
  ON public.ai_conversations
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX ai_conversations_user_id_idx ON public.ai_conversations (user_id);
CREATE INDEX ai_conversations_created_at_idx ON public.ai_conversations (created_at DESC);

-- ── AI Messages ───────────────────────────────────────────────────────────

CREATE TABLE public.ai_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  parts           jsonb       NOT NULL DEFAULT '[]',
  tokens_used     integer,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_messages_via_conversation"
  ON public.ai_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

CREATE INDEX ai_messages_conversation_id_idx ON public.ai_messages (conversation_id);
CREATE INDEX ai_messages_created_at_idx ON public.ai_messages (created_at ASC);

-- ── AI Plans ──────────────────────────────────────────────────────────────

CREATE TABLE public.ai_plans (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid        REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  title           text        NOT NULL,
  description     text        NOT NULL DEFAULT '',
  goal            text        NOT NULL DEFAULT '',
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','in_progress','completed','failed','cancelled')),
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_plans_user_all"
  ON public.ai_plans
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX ai_plans_user_id_idx ON public.ai_plans (user_id);
CREATE INDEX ai_plans_status_idx ON public.ai_plans (status);
CREATE INDEX ai_plans_created_at_idx ON public.ai_plans (created_at DESC);

-- ── AI Plan Tasks ─────────────────────────────────────────────────────────

CREATE TABLE public.ai_plan_tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid        NOT NULL REFERENCES public.ai_plans(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text        NOT NULL DEFAULT '',
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','in_progress','completed','failed','skipped')),
  sort_order  integer     NOT NULL DEFAULT 0,
  result      jsonb,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_plan_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_plan_tasks_via_plan"
  ON public.ai_plan_tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_plans p
      WHERE p.id = ai_plan_tasks.plan_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_plans p
      WHERE p.id = ai_plan_tasks.plan_id
        AND p.user_id = auth.uid()
    )
  );

CREATE INDEX ai_plan_tasks_plan_id_idx  ON public.ai_plan_tasks (plan_id);
CREATE INDEX ai_plan_tasks_sort_idx     ON public.ai_plan_tasks (plan_id, sort_order);

-- ── AI Prompt Templates ───────────────────────────────────────────────────

CREATE TABLE public.ai_prompt_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  description text        NOT NULL DEFAULT '',
  template    text        NOT NULL,
  variables   text[]      NOT NULL DEFAULT '{}',
  category    text        NOT NULL DEFAULT 'general',
  is_public   boolean     NOT NULL DEFAULT false,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_templates_select"
  ON public.ai_prompt_templates
  FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL OR is_public = true);

CREATE POLICY "ai_templates_modify"
  ON public.ai_prompt_templates
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX ai_prompt_templates_user_id_idx  ON public.ai_prompt_templates (user_id);
CREATE INDEX ai_prompt_templates_category_idx ON public.ai_prompt_templates (category);

-- ── AI Logs ───────────────────────────────────────────────────────────────

CREATE TABLE public.ai_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid        REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  event_type      text        NOT NULL,
  provider        text,
  model           text,
  tokens_in       integer,
  tokens_out      integer,
  latency_ms      integer,
  error           text,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_logs_user_select"
  ON public.ai_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ai_logs_user_insert"
  ON public.ai_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX ai_logs_user_id_idx    ON public.ai_logs (user_id);
CREATE INDEX ai_logs_created_at_idx ON public.ai_logs (created_at DESC);
CREATE INDEX ai_logs_event_type_idx ON public.ai_logs (event_type);

-- ── AI Rate Limits ────────────────────────────────────────────────────────

CREATE TABLE public.ai_rate_limits (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start   timestamptz NOT NULL,
  requests_count integer     NOT NULL DEFAULT 0,
  tokens_used    integer     NOT NULL DEFAULT 0,
  UNIQUE (user_id, window_start)
);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_rate_limits_user"
  ON public.ai_rate_limits
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX ai_rate_limits_user_window_idx ON public.ai_rate_limits (user_id, window_start);

-- ── Atomic rate-limit increment ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_ai_rate_limit(
  p_user_id     uuid,
  p_window_start timestamptz,
  p_tokens      integer DEFAULT 0
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  INSERT INTO public.ai_rate_limits (user_id, window_start, requests_count, tokens_used)
  VALUES (p_user_id, p_window_start, 1, p_tokens)
  ON CONFLICT (user_id, window_start)
  DO UPDATE SET
    requests_count = ai_rate_limits.requests_count + 1,
    tokens_used    = ai_rate_limits.tokens_used + p_tokens;
$$;

GRANT EXECUTE ON FUNCTION public.increment_ai_rate_limit(uuid, timestamptz, integer)
  TO authenticated, service_role;

-- ── updated_at triggers ───────────────────────────────────────────────────

CREATE TRIGGER ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER ai_plans_updated_at
  BEFORE UPDATE ON public.ai_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER ai_plan_tasks_updated_at
  BEFORE UPDATE ON public.ai_plan_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER ai_prompt_templates_updated_at
  BEFORE UPDATE ON public.ai_prompt_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ── Grants ────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agents           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_plans            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_plan_tasks       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_prompt_templates TO authenticated;
GRANT SELECT, INSERT                 ON public.ai_logs             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_rate_limits      TO authenticated;

GRANT ALL ON public.ai_agents           TO service_role;
GRANT ALL ON public.ai_conversations    TO service_role;
GRANT ALL ON public.ai_messages         TO service_role;
GRANT ALL ON public.ai_plans            TO service_role;
GRANT ALL ON public.ai_plan_tasks       TO service_role;
GRANT ALL ON public.ai_prompt_templates TO service_role;
GRANT ALL ON public.ai_logs             TO service_role;
GRANT ALL ON public.ai_rate_limits      TO service_role;
