-- Phase 2b.18 — Per-tenant FAQ responder toggle on tenant_ai_context.
-- Default OFF so a fresh tenant doesn't immediately auto-reply.
ALTER TABLE public.tenant_ai_context
  ADD COLUMN IF NOT EXISTS faq_responder_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenant_ai_context.faq_responder_enabled IS
  '2b.18: master switch for the always-on FAQ AI auto-reply. Off by default; practice owner enables in Settings → AI & Automation → Practice Brain.';
