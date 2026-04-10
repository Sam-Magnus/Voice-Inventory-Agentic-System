# Voice-Inventory-Agentic-System — Project Context

> **For Claude Code**: This file gives you full project context. Read it before starting any work. This is a multi-tenant SaaS product — not a personal app.

---

## What This Is

An autonomous AI voice agent + inventory management SaaS for IT hardware shops in **Nehru Place, Delhi**. The AI picks up every incoming phone call, converses in Hinglish/English, searches live inventory, generates quotes, and sends them on WhatsApp — so shops never miss a sale.

**Business model**: Sell to multiple shops (multi-tenant). Each shop gets their own phone number, WhatsApp, inventory, and dashboard.

---

## Live URLs

| System | URL |
|--------|-----|
| Dashboard (Vercel) | https://voice-inventory-agentic-system.vercel.app |
| Voice API (Render) | https://shopflow-voice-agent.onrender.com |
| Live Chat Demo | https://voice-inventory-agentic-system.vercel.app/voice-agent/chat |
| Supabase Project | https://dqncgmiyjntspzrryvzk.supabase.co |

**Note**: Render free tier sleeps after 15 min inactivity. First request takes ~30s to wake up.

---

## Tech Stack

| Layer | Current (Temporary) | Production Target |
|-------|---------------------|-------------------|
| **LLM** | Groq (Llama 4 Scout) — FREE | Claude API (Anthropic) |
| **Backend Host** | Render free tier | Railway ($5/month) |
| **Frontend** | Vercel (production) | Vercel (keep) |
| **STT** | Deepgram Nova-2 | Deepgram Nova-2 (keep) |
| **TTS** | ElevenLabs Roger voice (free premade) | ElevenLabs (keep) |
| **Database** | Supabase (keep) | Supabase (keep) |
| **Telephony** | NOT YET LIVE | Twilio (~$1/number) |
| **WhatsApp** | Demo mode (logs only) | Meta Cloud API |
| **Web Search** | Stub (no Tavily key) | Tavily |

---

## Repository Structure

```
Voice-Inventory-Agentic-System/
├── Inventory System/          ← Next.js 14 dashboard
├── Voice Ai Agentic System/   ← FastAPI Python voice agent
├── CLAUDE.md                  ← This file
└── README.md
```

### Inventory System (Next.js 14 + Tailwind v3 + shadcn/ui)

```
src/
├── app/
│   ├── (auth)/               — login, signup (Supabase Auth)
│   ├── (dashboard)/
│   │   ├── layout.tsx        — sidebar + header with theme toggle
│   │   ├── inventory/        — product list + CRUD + CSV import + [id] detail page
│   │   ├── customers/        — customer list
│   │   ├── orders/           — order list + [id] detail
│   │   ├── offers/           — offers list with discount/bundle badges
│   │   ├── analytics/        — recharts: revenue line, channel pie, category bar
│   │   ├── voice-agent/      — call logs table + transcript dialog + "Try Live Chat" button
│   │   │   └── chat/         — live chat UI (bubbles, tool badges, suggested queries)
│   │   └── settings/
│   ├── globals.css            — indigo/slate theme (primary: hsl(234 89% 57%))
│   └── layout.tsx             — ThemeProvider (next-themes), Toaster richColors
├── components/
│   ├── layout/
│   │   ├── app-sidebar.tsx   — Lucide icons, nav groups (Store/Insights/System)
│   │   └── theme-toggle.tsx  — dark/light mode
│   └── ui/                   — shadcn components (base-ui variant)
├── lib/supabase/             — client.ts, server.ts, admin.ts
├── types/database.ts         — TypeScript interfaces (Product, Order, Customer, CallLog, etc.)
└── vercel.json               — { "framework": "nextjs" }
```

### Voice AI Agentic System (FastAPI Python)

```
src/
├── main.py                   — FastAPI, CORS *, routers: health/voice/queue/chat
├── config.py                 — pydantic-settings (llm_provider, all API keys)
├── agent/
│   ├── llm_client.py         — Dual LLM: routes Groq or Anthropic. Groq uses OpenAI-compatible API.
│   ├── prompt_builder.py     — Per-call system prompt: tenant + customer history + inventory + offers
│   ├── sales_strategies.py   — Upsell rules by component tier, cross-sell bundles, negotiation
│   ├── conversation.py       — Conversation state management
│   └── tools/
│       ├── __init__.py       — Tool registry + execute_tool() with TYPE COERCION (critical for Groq)
│       ├── inventory_search.py
│       ├── pc_build_wizard.py
│       ├── quote_generator.py
│       ├── whatsapp_sender.py
│       ├── human_handoff.py  — stub (logs, returns mock queue)
│       └── hold_music.py     — stub (logs but doesn't stream)
├── services/
│   ├── inventory_service.py  — search_products(): exact ilike first, fallback per-keyword OR query
│   ├── customer_service.py   — get_customer_purchases(): orders first (with order), then flatten items
│   ├── offer_service.py
│   ├── whatsapp_service.py   — demo mode: logs if no WhatsApp creds, returns success
│   └── search_service.py     — stub: returns helpful msg if no Tavily key
├── api/routes/
│   ├── chat.py               — POST /api/v1/chat (in-memory sessions), DELETE to reset
│   ├── voice.py              — Twilio webhooks (NOT LIVE yet)
│   ├── queue.py
│   └── health.py
└── voice/
    ├── stt/deepgram_client.py    — Nova-2, mulaw 8kHz, en-IN
    ├── tts/elevenlabs_client.py  — Roger voice, PCM 16kHz → mulaw 8kHz
    └── telephony/twiml_builder.py
```

---

## Database (Supabase — LIVE)

**Project**: `dqncgmiyjntspzrryvzk.supabase.co`

**Tables**: tenants, tenant_users, categories, products, customers, orders, order_items, offers, whatsapp_templates, call_logs, agent_actions, call_queue

**RLS**: Currently permissive (`USING (true)`) for beta — must tighten before production launch.

**Demo Tenant**: Sharma Computers — ID `a1b2c3d4-e5f6-7890-abcd-111111111111`

**Seed data**: 2 shops, 28 products (real Nehru Place pricing), 5 customers, 8 offers, 14 orders, 10 call logs

**Migrations run**: supabase/migrations/001–006 + supabase/STEP1–5 SQL files (all already applied to live DB)

---

## API Keys & Config Location

All in `Voice Ai Agentic System/.env`:

```env
SUPABASE_URL=https://dqncgmiyjntspzrryvzk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
LLM_PROVIDER=groq
GROQ_API_KEY=...
GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
ANTHROPIC_API_KEY=...        # set but credits needed to use
ANTHROPIC_MODEL=claude-sonnet-4-20250514
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=CwhRBWXzGAHq8TQ4Fs17   # Roger — free premade voice
TWILIO_ACCOUNT_SID=         # empty — not live yet
TWILIO_AUTH_TOKEN=          # empty
WHATSAPP_PHONE_NUMBER_ID=   # empty — demo mode active
WHATSAPP_ACCESS_TOKEN=      # empty
TAVILY_API_KEY=             # empty — web search stubbed
```

Inventory System env: `Inventory System/.env.local` (Supabase anon key + Vercel public vars)

---

## Phase Status

### Phase 1: Foundation — DONE
- Supabase project + all migrations + RLS
- Next.js scaffold with Supabase Auth
- Inventory CRUD (products, categories, CSV import)

### Phase 2: Dashboard — DONE
- Customer management + purchase history
- Order management with status timeline
- Offers system (discount/flat/bundle types)
- Analytics dashboard (recharts graphs, stat cards)

### Phase 3: Voice Agent Core — DONE
- FastAPI scaffold + all routes
- Groq LLM integration (Llama 4 Scout) — temporary free substitute
- Claude API integration — code ready, needs credits
- Chat endpoint (`/api/v1/chat`) — fully working
- Tool calling pipeline with Groq type coercion
- search_inventory, check_stock, pc_build_wizard, generate_quote, send_whatsapp, web_search, human_handoff tools
- Live Chat UI in dashboard (voice-agent/chat)
- Deepgram STT client (code ready, awaits real call)
- ElevenLabs TTS client (code ready, awaits real call)
- Twilio TwiML builders (code ready, awaits phone number)

### Phase 4: Agent Intelligence — DONE
- PC Build Wizard (budget allocation by use case, multi-term component search)
- Quote generation (resolves by product_id OR product_name text search)
- WhatsApp sender (demo mode logs message, real mode needs creds)
- Sales strategies: upsell tiers, cross-sell bundles, negotiation tactics
- Web search stub (returns helpful message until Tavily key added)
- Human handoff stub (logs request, real transfer needs Twilio)

### Phase 5: WhatsApp + Hold Music — NOT DONE
- WhatsApp Business API (need phone number ID + access token from client shop)
- Template message setup in Meta Business Manager
- Hold music streaming (yt-dlp + ffmpeg → mulaw → Twilio stream) — currently stubbed
- Queue management from DB (currently returns hardcoded values)

### Phase 6: Deploy — PARTIALLY DONE
- Frontend: Deployed to Vercel via `npx vercel deploy --prod --yes` (GitHub integration doesn't work — space in folder name)
- Backend: Deployed to Render free tier (Docker container)
- GitHub: Code pushed to Sam-Magnus account
- NOT deployed to Railway yet (trial exhausted)
- NOT connected to Twilio (real phone calls not live)

---

## What Needs to Be Done to Finish

### Immediate (when budget allows)

1. **Switch Groq → Claude API**
   - Add Anthropic credits to account
   - In `.env`: set `LLM_PROVIDER=anthropic`
   - Test: same tool call pipeline, better reasoning, no type coercion needed

2. **Switch Render → Railway**
   - Railway supports persistent WebSockets (required for Twilio Media Streams)
   - Render free tier closes WebSocket connections — voice calls will break on Render
   - `railway.toml` already configured at repo root

3. **Get Twilio phone number** (~$1/month for Indian +91 number)
   - Fill `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` in `.env`
   - Set webhook URL in Twilio console: `https://<railway-url>/api/v1/voice/incoming`
   - Test actual phone call end-to-end

4. **Add Tavily API key** (web search for agent)
   - Set `TAVILY_API_KEY` in `.env`
   - Agent will automatically use real web search

### Per Client Shop Onboarding

5. **WhatsApp Business API**
   - Client needs Meta Business Manager account
   - Get `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` per shop
   - Create message templates in Meta console
   - Test quote-sending flow

### Production Hardening

6. **Tighten RLS policies**
   - Currently: `USING (true)` — any authenticated user sees all data
   - Should be: `USING (tenant_id = auth.jwt() ->> 'tenant_id')`
   - Re-enable Supabase Auth check on root `page.tsx` (currently bypassed)

7. **Add Deepgram + ElevenLabs real-call testing**
   - Test STT with actual mulaw audio from Twilio
   - Test TTS timing and latency end-to-end

8. **Hold music**
   - Implement yt-dlp + ffmpeg streaming in `hold_music.py`
   - Stream mulaw audio into Twilio media stream while customer is on hold

9. **Multi-tenant testing**
   - Provision second Twilio number for Tech Galaxy shop
   - Verify each number resolves to correct shop's inventory

---

## Critical Gotchas — Do NOT Break These

### shadcn/ui uses base-ui, NOT radix-ui
The installed version uses `render` prop instead of `asChild`:
```tsx
// WRONG (radix-ui style):
<DialogTrigger asChild><Button>Open</Button></DialogTrigger>

// CORRECT (base-ui style):
<DialogTrigger render={<Button />}>Open</DialogTrigger>
```

### Tailwind v3 syntax only (NOT v4)
The project uses Tailwind CSS v3. Do NOT use v4 syntax:
```tsx
// WRONG (Tailwind v4):
className="w-(--sidebar-width)"

// CORRECT (Tailwind v3):
className="w-[var(--sidebar-width)]"
```

### Groq tool calling quirks
Groq (Llama) sends wrong types in tool arguments. The `execute_tool()` in `tools/__init__.py` has a type coercion layer:
- `"true"` → `True` (string → boolean)
- `"100000"` → `100000` (string → int)
- `'["item1", "item2"]'` → `["item1", "item2"]` (JSON string → array)

All number/boolean parameters in tool schemas use `"type": "string"` to prevent Groq validation errors.

### Supabase query builder is mutable
Do NOT reuse a query object across multiple `.ilike()` / `.or_()` calls. Each attempt in `search_products()` creates a **fresh** query object to avoid filter accumulation.

### Vercel deployment
Deploy via CLI, not GitHub integration:
```bash
cd "Inventory System"
npx vercel deploy --prod --yes
```
GitHub integration breaks because of the space in the folder name "Inventory System".

### ElevenLabs voice
Use Roger voice ID `CwhRBWXzGAHq8TQ4Fs17` (free premade). Rachel and other default voices require paid subscription.

### Groq model name
Current model: `meta-llama/llama-4-scout-17b-16e-instruct`. Check Groq docs if this changes — model names update frequently.

---

## Architecture Summary

```
Phone Call → Twilio → Webhook → FastAPI (Railway)
                                     ↓
                              Identify tenant by Twilio phone number
                                     ↓
                         Supabase: lookup customer, inventory, offers
                                     ↓
                         Deepgram STT → text
                                     ↓
                         Claude/Groq LLM + tools
                                     ↓
                    Tools: search_inventory | pc_build_wizard |
                           generate_quote | send_whatsapp |
                           web_search | transfer_to_human
                                     ↓
                         ElevenLabs TTS → audio → Twilio
```

```
Vercel (Next.js Dashboard) ──────┐
                                  ├──→ Supabase (PostgreSQL + Auth + Realtime)
Railway (FastAPI Voice Agent) ───┘
```

Dashboard gets real-time call log updates via Supabase Realtime subscriptions.

---

## Running Locally

### Inventory System
```bash
cd "Inventory System"
npm install
npm run dev
# → http://localhost:3000
```

### Voice AI Agent
```bash
cd "Voice Ai Agentic System"
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
# → http://localhost:8000
# Chat: POST http://localhost:8000/api/v1/chat
```

---

## Git & Deployment

- **GitHub**: Sam-Magnus/Voice-Inventory-Agentic-System (main branch)
- **Vercel**: Auto-deploys from GitHub are NOT set up. Deploy manually via CLI.
- **Render**: Connected to GitHub repo, auto-deploys on push to main. Docker build from `Voice Ai Agentic System/Dockerfile`.

---

## Reminders

> **REMINDER**: LLM is currently Groq (Llama 4 Scout) — a free temporary substitute. Switch to Claude API (Anthropic) when credits are available. Set `LLM_PROVIDER=anthropic` in `.env`.

> **REMINDER**: Backend is deployed on Render free tier — it sleeps after 15 min and has no persistent WebSockets. Move to Railway when budget allows (needed for Twilio real-time calls).

---

## Context Commands

### `/save-context`

**When the user says `/save-context`**, analyze the current conversation and persist the context into the `## Saved Context` section at the bottom of this file.

**Extract:**
- Task — what we were working on (one line)
- Decisions — architectural choices, patterns, library picks, naming conventions
- Current State — done / in progress / blocked
- Files Touched — relative paths + what changed
- Next Steps — ordered
- Key Notes — gotchas, constraints, patterns that would be lost without saving

**Template (preferred, not rigid):**
```markdown
### Session: [YYYY-MM-DD HH:MM] — [Brief Title]
**Task:** ...
**Decisions:** ...
**Current State:** Done: ... | In Progress: ... | Blocked: ...
**Files Touched:** `path` — what changed
**Next Steps:** 1. ... 2. ...
**Key Notes:** ...
---
```

If the conversation doesn't fit this template (debugging session, brainstorm, multi-topic), use **whatever format captures full context best** — prose, annotated code, decision trees, Q&A. Goal: zero context loss, not structural conformity.

**Deduplication & Smart Merging (CRITICAL):**
- Read existing `claude.md` FIRST. Compare before writing.
- NEVER duplicate. Only write what is genuinely NEW.
- If an existing entry is outdated (e.g., "In Progress" → "Done"), **update in-place** — don't append a near-duplicate.
- If continuing the same task on the same day, **merge into the existing session** — new session header only when topic or day changes.
- Treat this file as a **living document, not an append-only log**. Consolidate, merge, prune stale info.

**Token Efficiency (CRITICAL):**
- Complete but compact. Zero info loss, minimum token footprint.
- Write like paying per character. Shorthand, abbreviations, dense prose, compact lists.
- Compress: two bullets → one? Paragraph → sentence? Bulleted file list → comma-separated? Do it.
- If Saved Context exceeds ~200 lines, consolidate older sessions into a single `### Archive Summary` block and remove individual old entries.

**Rules:**
- All paths relative to `E:\Himashray Github\Voice-Inventory-Agentic-System\`
- Superseded context: update in-place or mark `[SUPERSEDED by Session YYYY-MM-DD]`
- Skip pleasantries, reasoning chains, failed attempts (unless the failure itself is important context)

---

### `/get-context [scope]`

**When the user says `/get-context`**, read the `## Saved Context` section from this file and return context based on scope:

| Command | Behavior |
|---------|----------|
| `/get-context full` | Return ALL saved sessions, newest first. For starting major new phases or returning after absence. |
| `/get-context latest` | Return only the most recent session. For continuing where we left off. |
| `/get-context [keyword]` | Search all sessions, return only entries relevant to that keyword/topic (e.g., `auth`, `database`, `voice-agent`). |
| `/get-context summary` | Condensed unified state snapshot across ALL sessions — what's done, in progress, pending. No per-session breakdown. |
| `/get-context fetch` | **Interactive mode.** User describes what they need in plain language. Read `claude.md`, extract matches, report: "Here's what I fetched: [summary]." User validates. If not enough, fetch deeper/broader. Repeat until user says "that's enough." Each round is additive — don't re-dump previous rounds. |

**Rules:**
- After retrieving: internalize the context, confirm understanding in 2-3 sentences, ask if continuing or starting fresh.
- Keyword search with no match: say so, suggest related keywords from available context.
- No saved context: say so clearly.
- NEVER hallucinate context not in the file.
- Interactive fetch: report before acting. If ask is vague, ask ONE clarifying question before fetching.

---

### General Rules (Both Commands)

- Operate ONLY on `E:\Himashray Github\Voice-Inventory-Agentic-System\CLAUDE.md`
- Track ONLY context for files within `E:\Himashray Github\Voice-Inventory-Agentic-System\` and subfolders
- Keep file clean and well-structured — working document, not a log dump
- Create `## Saved Context` section on first `/save-context` if it doesn't exist
- Token efficiency is #1 priority — every word must earn its place

---

## Saved Context

### Session: 2026-04-02 — Multi-Client Scaling, Template vs Custom Boundary

**Task:** Defined what's shared (template) vs per-client (custom), scaling strategy for 10+ clients, added context commands to CLAUDE.md.

**Decisions:**
- Phase 5 (WhatsApp + Hold Music) — do NOT pre-build. Per-client config, not code. Build during each onboarding.
- **Template boundary defined:** Phases 1–4 + deployment = the reusable product. Zero client-specific code written. Everything remaining is data/config per client.
- `save-context` / `get-context` are plain-text triggers (not `/` prefixed — reserved for CLI built-ins).

**Template (shared, DONE):** DB schema w/ `tenant_id`, dashboard (all pages), voice agent pipeline, all tools, `prompt_builder.py` (dynamically loads per-tenant data), CSV import, deployment configs.

**Per-client (NOT done, by design):** Twilio number, WhatsApp creds + message templates (Meta approval), inventory data (CSV import), tenant settings (hours, upsell, name), hold music preference. No code changes needed per client — just data/config.

**Current State:**
- Done: Phases 1–4, Phase 6 partial (Vercel + Render live). CLAUDE.md with full context + commands.
- Not Done: Phase 5 (deferred to onboarding), Twilio/Railway/Claude API (budget-gated).
- No client-specific customization done — intentionally. Product is ready; customization happens at onboarding.

---

### CLIENT ONBOARDING REMINDER

> **Read this when setting up the product for a new client.**

**Code change needed BEFORE first multi-client deploy:**
Move WhatsApp creds from `.env` (single set) into `tenants` table:
```
tenants.whatsapp_phone_id
tenants.whatsapp_access_token
```
Update `Voice Ai Agentic System/src/services/whatsapp_service.py` to read creds from tenant record instead of env vars (~10 lines). Same for Tavily key if per-client web search quotas are needed.

**Per-client onboarding checklist (~15 min):**
1. Insert row in `tenants` table (name, phone, settings JSONB with business_hours, upsell_level)
2. Create `tenant_users` entry → client can log into dashboard
3. Buy Twilio number ($1) → set webhook to `https://<host>/api/v1/voice/incoming` → save number to tenant record
4. Client does CSV import of their inventory via dashboard
5. Client provides WhatsApp Business creds (Meta Business Manager) → save to tenant record
6. Test: call the number → agent answers with client's shop name, inventory, offers

---
