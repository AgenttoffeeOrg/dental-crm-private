# Technical Implementation Roadmap – Advanced Sales Intelligence

## 1. Data Architecture Assessment (Confidence: Medium)
- **Current schema flexibility**: Supabase/Postgres schema already stores structured CRM entities (`contacts`, `deals`, `activities`, `ai_artifacts`) and supports JSONB columns plus new tables, so extending without full restructuring is feasible.
- **Psychological profiles**: Introduce `contact_psych_profiles` (contact_id FK, snapshot JSONB, anxiety_level INT, trust_score INT, decision_style TEXT, recorded_at TIMESTAMPTZ). For change history, add `contact_psych_profile_history` with versioning metadata.
- **Conversation scripts & A/B tests**: Add `sales_scripts` (tenant scoped metadata), `sales_script_versions` (content, tone, target persona, baseline metrics), `sales_script_tests` (test cohort, variant ids, start/end). Include `sales_script_metrics` for aggregated results (variant_id, metric_date, opens, conversions, avg_duration, emotion_shift_score).
- **Performance tracking & attribution**: Extend `activities` with optional `script_version_id UUID` and `conversation_session_id UUID`. New table `conversion_attributions` capturing source variant, last touch activity, weighting.
- **Competitor intelligence**: Tables `competitors`, `competitor_price_points`, `competitor_touchpoints`. Link to tenant/location with effective dates.
- **Real-time conversation state machines**: Create `conversation_sessions` (session id, contact_id, channel, active_stage, started_at, last_event_at), `conversation_state_events` (session_id, event_type, payload JSONB, confidence), `conversation_state_transitions` (from_state, to_state, trigger, script_version_id).
- **Analytics database need**: Existing analytics tables (`analytics_threshold_alerts`, `analytics_saved_views`) show complex aggregations handled in primary DB; recommend staying within current Supabase instance + consider `pg_partman` or schema namespacing for separation. No separate warehouse immediately required; use read replicas for heavy analytics later.
- **RLS impact**: Current RLS relies on tenant and location fields (`automation_runs`, `contacts`). New tables must include `tenant_id` (and optional `location_id`) plus matching policies. Psychological profiles and competitor data must obey same `tenant_id` scoping. Real-time sessions should include `tenant_id` for RLS gating.

## 2. API & Endpoint Analysis (Confidence: Medium)
- **Reusable endpoints**:
  - Real-time coaching foundation: `/api/ai-assistant/chat` for AI prompts ```6:92:src/app/api/ai-assistant/chat/route.ts```.
  - Context building for recommendations: `ai-context-builder` service used indirectly via AI assistant.
  - Psychological updates: `/api/contacts` PATCH can be extended for profile flags ```196:327:src/app/api/contacts/route.ts```.
  - Bot handling: existing `/api/process-call-activity` proxies edge function for call analysis ```4:74:src/app/api/process-call-activity/route.ts```.
- **Missing endpoints**:
  - `/api/conversations/sessions` (CRUD for conversation sessions & state updates, WebSocket handshake support).
  - `/api/scripts` (manage sales scripts, versions, A/B tests, metrics ingestion).
  - `/api/psych-profiles` (dedicated service for psychological assessments & history).
  - `/api/competitors` (curation & retrieval for coaching context).
  - `/api/coaching/events` (ingest real-time events from telephony or bot connectors).
  - `/api/attribution` (write conversions & metrics).
- **Real-time capability**: Current API is REST/edge functions; for live coaching we need WebSocket server (Next.js 14 supports experimental `app/api/socket` with Edge runtime or integrate with Supabase Realtime). Evaluate supabase channel or dedicated Node service.
- **Authentication/Middleware**: Middleware ensures tenant membership ```32:63:src/middleware.ts```. For bots, need service tokens or client credentials with limited scope; update middleware to allow bot user-agents or signed JWT with `role = bot`. Possibly create `bot_clients` table with API keys.

## 3. Integration Requirements (Confidence: Medium)
- **Voice transcription**: Current pipeline relies on Supabase function. For real-time, evaluate Twilio Media Streams (fast) vs Deepgram/AssemblyAI streaming. Twilio already used for SMS; adopting Twilio Voice Intelligence reduces integration overhead.
- **Advanced NLP**: OpenAI handles summarisation; for emotion/anxiety detection consider Google Cloud Natural Language, AWS Comprehend, or open-source models via HuggingFace on managed inference. Recommendation: start with OpenAI emotion classification + fallback to `pyannote` or `emotion-embedding` (trade-off cost vs control).
- **Real-time communication**: Use WebSockets via Next.js or dedicated NestJS gateway; for call monitoring integrate with Twilio WebRTC or SIP events.
- **ML infrastructure**: Need pipeline for training inside Vercel/Node? Suggest external service (AWS Sagemaker or Modal Labs) for heavy jobs; store models in object storage.
- **State machine libraries**: xstate (JS) for client/server, durable `Temporal.io` if orchestrations complex (higher learning curve). Start with xstate for runtime coaching.
- **A/B testing**: LaunchDarkly (hosted) or open-source GrowthBook with Postgres backend; latter easier to self-host.

## 4. Workflow & Event System Compatibility (Confidence: Medium)
- **Event bus**: `events-unified.ts` already centralises numerous event types ```20:375:src/lib/events-unified.ts```. Add new enums: `CONVERSATION.STATE_CHANGED`, `SCRIPT.PERFORMANCE_RECORDED`, `PROFILE.UPDATED`, `COMPETITOR.MENTIONED`.
- **Automation engine**: Current automation listener maps events to workflows ```23:205:src/lib/automations/automation-event-listener.ts```. Supports linear triggers; needs enhancement for branching (script variants). Introduce dynamic node evaluation or integrate xstate per automation run.
- **AI context builder**: Built for deal/contact/global contexts ```93:257:src/lib/ai-context-builder.ts```. Extend to include psychological data, competitor intel, and real-time session snapshot. Might create `buildLiveSessionContext` or augment existing with hydration functions.
- **Automation runs**: Table tracks nodes and status; for state machine we need additional columns (`state_machine_version`, `current_state`, `session_id`) or separate `conversation_state` tables (see section 1). Without update, storing complex transitions in JSON arrays may bloat.

## 5. Migration Strategy (Confidence: Medium)
Provide high-level SQL (omit execution):
- **Conversation scripts**:
  ```sql
  CREATE TABLE sales_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    persona TEXT,
    created_by UUID REFERENCES app_users(id),
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE sales_script_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID NOT NULL REFERENCES sales_scripts(id) ON DELETE CASCADE,
    version INT NOT NULL,
    content TEXT NOT NULL,
    tone TEXT,
    target_segment TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- **Psychological profiles**: `contact_psych_profiles` and `_history` with RLS clones.
- **Script performance metrics**: `sales_script_metrics` aggregated by day/variant; use `NUMERIC` for rates.
- **Conversion attribution**: `conversion_attributions` with `deal_id`, `activity_id`, weighting.
- **Bot conversation states**: `conversation_sessions`, `conversation_state_events` etc.
- **Competitive intelligence**: `competitors`, `competitor_price_points`.
- **Rollbacks**: For each `CREATE TABLE`, supply `DROP TABLE` statements. Use transactions (`BEGIN; ... COMMIT;`) to ensure atomicity. Historical tables preserve data when removing features.

## 6. Architectural Changes Required (Confidence: Low)
- **Microservices**: Optional but recommended: `coaching-service` for WebSocket and real-time inference; `analytics-service` for heavy processing. Start monolith with modular boundaries, migrate when load increases.
- **Queues**: Introduce message broker (e.g., BullMQ with Redis or AWS SQS) for asynchronous NLP, metric aggregation, competitor scraping.
- **Caching**: Use Redis for script recommendations and session state caching; keep TTL short.
- **CDN**: Serve static script assets/documentation via CDN (e.g., Vercel static or CloudFront) if large.
- **Bot API gateway**: Provide dedicated path with API keys/JWT; optional microservice later.
- **WebSocket architecture**: Evaluate Supabase Realtime vs self-hosted `socket.io` on Edge; ensure multi-tenancy isolation.

## 7. AI/ML Infrastructure (Confidence: Medium)
- **OpenAI sufficiency**: Adequate for summarization/coaching; for advanced emotion detection may require specialized models (Hume AI, Affinidi). Consider multi-provider abstraction.
- **Training data storage**: Use Supabase storage bucket or S3 for anonymized transcripts, with encryption + retention policies.
- **Learning loops**: Build nightly job to aggregate metrics, push to feature store. Use asynchronous queue to avoid impacting live traffic.
- **Vector database**: Add pgvector extension in Supabase for script embeddings or integrate Pinecone/Qdrant for scalability.
- **Real-time inference**: Deploy lightweight models via serverless GPU (Modal, Replicate) for low-latency; fallback to precomputed heuristics when offline.

## 8. Performance Impact Analysis (Confidence: Low)
- **Response times**: Additional joins on contact context will increase load; index new FK columns (contact_id, tenant_id, session_id).
- **Database load**: Introduce partial indexes and materialized views for script metrics; consider archiving historical session events.
- **Real-time processing**: Streaming transcription requires dedicated process; ensure separation from Next.js request threads.
- **Resource usage**: Expect higher CPU for NLP tasks and memory for caching session state; plan horizontal scaling.
- **Scaling**: WebSockets increase connection count; evaluate `pusher` style managed service if large receptionist teams.

## 9. Implementation Dependencies & Sequence (Confidence: Medium)
- **Phase 0 (Foundations)**: Schema migrations, RLS policy updates, API authentication for bots. Required before other work.
- **Phase 1 (Data capture)**: Build conversation session endpoints + ingest pipelines. In parallel, implement psychological profile services.
- **Phase 2 (Coaching engine)**: Develop script service, A/B testing, baseline analytics. Depends on Phase 1.
- **Phase 3 (Real-time intelligence)**: Introduce WebSocket coaching, state machine runtime, integration with telephony.
- **Phase 4 (Learning loop)**: Aggregation jobs, ML training pipeline, competitor feed.
- **Quick wins**: Extend AI assistant context with psychological overlays; create manual script library UI.
- **Critical path**: Real-time session infra, script versioning, event bus extensions.

## 10. Technical Risks & Mitigation (Confidence: Medium)
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Real-time transcription latency | High | Use streaming APIs (Twilio Media Streams) and fallback to delayed summaries |
| Data privacy/HIPAA | High | Encrypt PHI at rest, add audit logs for profile data, ensure BAAs with vendors |
| RLS misconfiguration | Medium | Mirror existing policies, add unit/integration tests for new tables |
| Performance bottlenecks | Medium | Introduce caching/queueing, monitor with APM |
| Integration failures | Medium | Feature-flag external services, degrade gracefully |
| ML drift | Low | Implement model monitoring, periodic retraining schedule |

## 11. Code Refactoring Requirements (Confidence: Medium)
- **`conversation-analyzer.ts`**: Add plugin architecture for new signals (anxiety, competitor mentions) and pass script version IDs.
- **`ai-context-builder.ts`**: Introduce optional loaders for psych profiles, competitor snapshots, live session state; refactor to `composeContext()` functions.
- **New services**: `script-service`, `psych-profile-service`, `conversation-session-service`, `competitor-service` within `/src/lib/services`.
- **UI components**: Create live coaching panel (React) that subscribes to WebSocket; update contact detail view to show psych badges.
- **Database utilities**: Extend repository layer to fetch new tables, add transaction helpers for session events.

## 12. Development Effort Estimation (Confidence: Low)
| Feature | Est. Dev | Testing | Dependencies | Deployment |
| --- | --- | --- | --- | --- |
| Schema migrations & RLS | 5-7 days | SQL/RLS regression | DBA review | Low risk |
| Script management UI/API | 10-12 days | Unit + Playwright | Schema done | Medium |
| Real-time session service | 12-15 days | Load/WebSocket tests | Queue/telephony | High |
| Psychological profiling engine | 8-10 days | NLP validation | Integration with ML | Medium |
| Competitor intelligence ingestion | 7-9 days | Data quality checks | External feeds | Medium |
| Learning loop pipeline | 12-16 days | Integration + perf | Queue, storage | High |

## 13. Proof of Concept Recommendations (Confidence: Medium)
1. **Live coaching sandbox**: Integrate Twilio Media Streams with simple WebSocket service that emits emotion scores to a playground UI.
2. **Script A/B mini test**: Implement minimal `/api/scripts` with two variants and record conversion manually for a small cohort.
3. **Psych profile enrichment**: Use existing activity transcripts to infer anxiety score with OpenAI function call, display in contact card for internal testing.

## Vision Alignment & Additional Opportunities
- The roadmap focuses on delivering context-rich insights to every receptionist, aligning with the vision of elevating them into top-performing treatment coordinators.
- **Bot readiness**: Data model recommendations ensure bot clients can use the same session context; API gateway and state machine design keep future automation in mind.
- **Learning loop**: Metrics tables and ML pipeline steps build continuous improvement without overwhelming existing workflows.
- **Performance maintenance**: Proposed caching/queue layers segregate heavy processing from user interactions.
- **Additional workflow ideas**: Introduce empathy coaching modules, integrate patient-preference widgets in the scheduler, and build a “confidence score” dashboard to highlight where additional training or automation yields highest returns.

Overall confidence in feasibility is moderate; foundational schema and event systems provide a strong base, but real-time coaching will demand careful architectural extensions and operational readiness.
