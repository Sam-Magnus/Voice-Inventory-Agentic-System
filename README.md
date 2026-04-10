# ShopFlow AI — Voice Inventory Agentic System

> An autonomous AI voice agent + inventory management SaaS for IT hardware retail shops. The AI handles incoming phone calls, converses in Hinglish/English, searches live inventory, recommends PC builds, generates quotes, and sends them via WhatsApp — so shops never miss a sale.

**Built for**: IT hardware shops in Nehru Place, Delhi
**Architecture**: Multi-tenant SaaS — one deployment serves multiple shops

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Dashboard — Inventory System](#dashboard--inventory-system)
  - [Inventory Management](#1-inventory-management)
  - [Product Detail](#2-product-detail)
  - [Customer Management](#3-customer-management)
  - [Order Management](#4-order-management)
  - [Order Detail](#5-order-detail)
  - [Offers & Promotions](#6-offers--promotions)
  - [Analytics Dashboard](#7-analytics-dashboard)
  - [Voice Agent Monitor](#8-voice-agent-monitor)
  - [Live Chat](#9-live-chat)
  - [Settings](#10-settings)
- [Voice AI Agent](#voice-ai-agent)
  - [Conversation Pipeline](#conversation-pipeline)
  - [LLM Integration](#llm-integration)
  - [Tool Calling System](#tool-calling-system)
  - [Sales Intelligence](#sales-intelligence)
  - [Voice Pipeline](#voice-pipeline)
  - [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Multi-Tenancy](#multi-tenancy)
- [Deployment](#deployment)
- [Running Locally](#running-locally)
- [Live URLs](#live-urls)

---

## System Overview

```
                         +-----------------------+
                         |   Customer calls      |
                         |   shop phone number   |
                         +-----------+-----------+
                                     |
                                     v
                         +-----------+-----------+
                         |       Twilio          |
                         |   (Phone Gateway)     |
                         +-----------+-----------+
                                     |
                              Webhook + WebSocket
                                     |
                                     v
+---------------------------+   +----+--------------------+   +------------------+
|                           |   |                         |   |                  |
|   Next.js Dashboard       |   |   FastAPI Voice Agent   |   |   WhatsApp API   |
|   (Vercel)                |   |   (Railway/Render)      +-->|   (Meta Cloud)   |
|                           |   |                         |   |                  |
|  - Inventory CRUD         |   |  - Deepgram STT         |   +------------------+
|  - Orders & Quotes        |   |  - LLM (Claude/Groq)    |
|  - Customer Management    |   |  - Tool Calling         |
|  - Analytics & Charts     |   |  - ElevenLabs TTS       |
|  - Call Logs & Transcripts|   |  - Sales Strategies     |
|  - Settings               |   |  - Quote Generator      |
|                           |   |  - PC Build Wizard      |
+-----------+---------------+   +----+--------------------+
            |                        |
            |    +-------------------+
            |    |
            v    v
    +-------+----+--------+
    |                      |
    |   Supabase           |
    |   (PostgreSQL)       |
    |                      |
    |  - Multi-tenant DB   |
    |  - Row Level Security|
    |  - Realtime Updates  |
    |  - Auth              |
    |                      |
    +----------------------+
```

**How it works:**

1. Customer calls the shop's Twilio number
2. Twilio sends the call to the FastAPI backend via webhook
3. Backend identifies which shop (tenant) by the called number
4. Audio streams bidirectionally via WebSocket (Twilio Media Streams)
5. Deepgram converts speech to text in real-time (Indian English)
6. LLM (Claude or Groq) processes the text with full inventory context
7. LLM calls tools: search inventory, check stock, build PCs, generate quotes
8. ElevenLabs converts response to speech, streamed back to caller
9. Quotes are optionally sent via WhatsApp
10. Everything is logged — call transcripts, tool usage, outcomes

---

## Architecture

```
Phone Call --> Twilio --> Webhook --> FastAPI (Railway)
                                         |
                                  Identify tenant by phone number
                                         |
                             Supabase: customer, inventory, offers
                                         |
                                  Deepgram STT --> text
                                         |
                                  Claude/Groq LLM + tools
                                         |
                        Tools: search_inventory | pc_build_wizard |
                               generate_quote | send_whatsapp |
                               web_search | transfer_to_human
                                         |
                              ElevenLabs TTS --> audio --> Twilio
```

```
Vercel (Next.js Dashboard) --------+
                                    +--> Supabase (PostgreSQL + Auth + Realtime)
Railway (FastAPI Voice Agent) -----+
```

The dashboard receives real-time updates (new orders, call logs, stock changes) via Supabase Realtime subscriptions.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) | Dashboard & management UI |
| **UI Components** | shadcn/ui + Tailwind CSS v3 | Component library & styling |
| **Charts** | Recharts | Analytics visualizations |
| **Backend** | FastAPI (Python 3.12) | Voice agent API server |
| **Database** | Supabase (PostgreSQL) | Multi-tenant data store + auth + realtime |
| **LLM** | Groq (Llama 4 Scout) / Claude API | Conversational AI with tool calling |
| **Speech-to-Text** | Deepgram Nova-2 | Real-time transcription (Indian English) |
| **Text-to-Speech** | ElevenLabs (Roger voice) | Natural voice synthesis |
| **Telephony** | Twilio Media Streams | Phone call handling + audio streaming |
| **Messaging** | WhatsApp Business API | Quote delivery to customers |
| **Web Search** | Tavily | External product research |
| **Deployment** | Vercel + Railway/Render | Frontend + backend hosting |

---

## Dashboard — Inventory System

The dashboard is a full-featured management interface built with Next.js 14, shadcn/ui components, and Supabase for data. It supports dark/light mode and is organized into three navigation groups: **Store**, **Insights**, and **System**.

### 1. Inventory Management

**Route:** `/inventory`

Full CRUD product management with real-time updates.

**Features:**
- **Product table** with columns: Product Name, Brand, Category, Price (INR), Stock Quantity, Status Badge, Actions
- **Status badges**: "In Stock" (green, qty > 5), "Low Stock" (yellow, 1-4), "Out of Stock" (red, 0)
- **Search**: Real-time search by product name (case-insensitive ilike)
- **Add Product**: Dialog with fields — name, brand, SKU, category (dropdown), description, cost price, selling price, MRP, stock quantity, warranty months, tags, color variants, specs (JSON)
- **CSV Bulk Import**: Upload CSV file to add multiple products at once. Required columns: `name`, `brand`, `selling_price`, `stock_quantity`. Optional: `sku`, `description`, `cost_price`, `mrp`, `warranty_months`, `category_id`, `specs` (JSON string)
- **Real-time**: Supabase Realtime subscription on `products` table — changes by other users appear instantly
- **Pagination**: Loads up to 100 products, ordered by `updated_at` descending

### 2. Product Detail

**Route:** `/inventory/[id]`

Deep-dive into a single product with pricing analysis.

**Layout** (3-column grid on desktop):
- **Specifications Card**: Renders the `specs` JSONB field as key-value pairs (e.g., "Chipset: B550", "RAM Slots: 4")
- **Pricing Card**: Cost price, selling price, MRP, calculated profit margin (`(selling - cost) / cost * 100`), total stock value (`selling * quantity`)
- **Stock Card**: Current quantity, minimum stock alert threshold, color variants list
- **Product Overview**: Name, brand, SKU, category, warranty period, created/updated dates
- **Edit Dialog**: Pre-filled form to update any product field

### 3. Customer Management

**Route:** `/customers`

Track customers across all channels (walk-in, phone, WhatsApp).

**Features:**
- **Customer table**: Name, Phone, Email, WhatsApp Opted-In (badge), Joined Date
- **Add Customer**: Name (required), Phone (required), Email (optional), WhatsApp opt-in checkbox
- **Search**: Searches across both name and phone number simultaneously (OR condition)
- **WhatsApp Badge**: Green "Yes" badge for opted-in customers, gray "No" for others

**Customer data model:**
```
name, phone (unique per tenant), email, whatsapp_opted_in (boolean),
notes (JSONB), created_at, updated_at
```

### 4. Order Management

**Route:** `/orders`

Manage orders from all sales channels with real-time status updates.

**Features:**
- **Status filter**: Dropdown to filter by — All, Quoted, Confirmed, Paid, Shipped, Delivered, Cancelled
- **Order table**: Order Number, Customer Name, Source (badge), Amount (INR), Status (badge), Status Update Dropdown, Date
- **Source badges**: Walk-in, Voice Agent, WhatsApp, Website — each with distinct styling
- **Status badges**: Color-coded — blue for active states, red for Cancelled/Returned
- **Inline status update**: Change order status directly from the table via dropdown
- **Real-time**: Supabase Realtime subscription for instant updates

**Order lifecycle:**
```
Quoted --> Confirmed --> Paid --> Shipped --> Delivered
                                                |
                                          Cancelled / Returned
```

### 5. Order Detail

**Route:** `/orders/[id]`

Comprehensive view of a single order with visual status timeline.

**Layout:**
- **Status Timeline**: Visual progress indicator with circles and connecting lines
  - Filled green circle = completed stage
  - Filled primary circle = current stage
  - Hollow circle = pending stage
  - Stages: Quoted → Confirmed → Paid → Shipped → Delivered
- **Line Items Table**: Product name, SKU, Quantity, Unit Price, Discount, Subtotal (`unit_price * quantity - discount`)
- **Customer Card**: Name, phone (with phone icon), email
- **Order Summary**: Source badge, payment method, discount amount, total amount
- **Notes Section**: Free-text notes displayed as a quote block

### 6. Offers & Promotions

**Route:** `/offers`

Create and manage promotional offers with redemption tracking.

**Features:**
- **Create Offer**: Title, description, discount type, discount value, start/end dates
- **Discount types**: 
  - **Percentage** (e.g., 10% off) — blue badge
  - **Flat Off** (e.g., INR 500 off) — purple badge
  - **Bundle** (e.g., buy GPU + PSU = 10% off) — amber badge
- **Status badges**: Active (green), Expired (red), Inactive (gray)
- **Redemption progress bar**: Shows usage count vs. limit with colored bar and percentage
- **Activate/Deactivate toggle**: Quick enable/disable for each offer
- **WhatsApp template link**: Optional template name for sending offers via WhatsApp

### 7. Analytics Dashboard

**Route:** `/analytics`

Comprehensive business intelligence with 8 visualization widgets.

**Stats Cards (Row 1 — Inventory):**
| Card | Metric | Source |
|------|--------|--------|
| Total Products | Count of active products | `products` table |
| In Stock | Sum of all stock quantities | `stock_quantity` column |
| Low Stock | Products with 0 < stock < 5 | Count with yellow highlight |
| Out of Stock | Products with stock = 0 | Count with red highlight |

**Stats Cards (Row 2 — Revenue):**
| Card | Metric | Source |
|------|--------|--------|
| Total Revenue | Sum of all order totals | `orders.total_amount` |
| Total Orders | Count of all orders | `orders` table |
| Avg Order Value | Revenue / Order count | Calculated |
| Inventory Value | Sum of (selling_price * stock_quantity) | `products` table |

**Charts:**

1. **Revenue Trend** (Line Chart)
   - Last 7 days, daily revenue
   - X-axis: weekday + date, Y-axis: INR (formatted as 20K, 80K)
   - Monotone curve interpolation

2. **Sales by Channel** (Donut/Pie Chart)
   - Breakdown: Walk-in, Voice Agent, WhatsApp
   - Colors: Indigo, Green, Amber
   - Inner/outer radius for donut effect

3. **Top Selling Categories** (Bar Chart)
   - Top 6 categories by product count
   - 10-color palette

4. **Order Funnel** (Horizontal Bar)
   - 4 stages: Quoted → Confirmed → Paid → Delivered
   - Shows conversion at each stage
   - Colors: Indigo → Cyan → Green → Emerald

5. **Voice Agent Performance** (Stats Grid)
   - Total Calls, Sales Closed (with conversion %), Handoffs
   - Conversion Rate, Unique Customers, WhatsApp Opted-In
   - Active Offers count, Voice Agent Orders

6. **Inventory Value by Category** (Horizontal Bar)
   - Top 8 categories by total inventory value
   - X-axis: INR in thousands

### 8. Voice Agent Monitor

**Route:** `/voice-agent`

Real-time monitoring of AI agent call activity.

**Stats Cards:**
- **Total Calls**: All-time call count
- **Conversions**: Sales count + conversion percentage
- **Avg Duration**: Average call length in MM:SS format

**Call Logs Table:**
- Columns: Time, Caller Phone, Customer Name, Duration, Outcome Badge, Summary
- Last 50 calls, ordered by `started_at` descending
- Outcome badges: Sale / Quote Sent / Info / Handoff (blue), Missed / Abandoned (red)
- Real-time WebSocket updates when new calls come in

**Transcript Dialog:**
- Click any call row to open full transcript
- Chat-bubble layout: customer messages (left, blue), agent messages (right, muted)
- Each message has a timestamp
- Summary displayed at the top

### 9. Live Chat

**Route:** `/voice-agent/chat`

Text-based interface to converse with the AI voice agent directly from the dashboard.

**Features:**
- **Chat interface**: User messages right-aligned (primary color), agent messages left-aligned (muted)
- **Suggested prompts** (clickable):
  - "RTX 4070 ka price kya hai?"
  - "32GB DDR5 RAM hai?"
  - "Gaming PC build, budget 80K"
  - "Samsung SSD stock mein hai?"
- **Tool badges**: When the agent uses tools (search_inventory, generate_quote, etc.), badges appear on the message
- **Auto-scroll**: Latest message always scrolled into view
- **Loading indicator**: Animated bouncing dots during agent response
- **Reset chat**: Clears session and starts fresh
- **Session ID**: Generated as `web-{timestamp}` for session persistence

**Backend connection**: Calls `POST /api/v1/chat` on the Voice Agent API

### 10. Settings

**Route:** `/settings`

Configure shop details and voice agent behavior.

**Shop Information:**
- Shop name, owner name, owner phone, shop direct phone, address

**Voice Agent Configuration:**
- **Greeting**: Custom greeting message (e.g., "Hello! Welcome to Sharma Computers...")
- **Business Hours**: Text input (e.g., "10 AM - 8 PM, Mon-Sat")
- **Upsell Level**: Dropdown — Low, Medium, High (controls aggressiveness of sales strategies)

**Integration Status:**
- Twilio (Voice): Shows connected phone number or "Not configured"
- WhatsApp: Shows "Connected" or "Not configured"

---

## Voice AI Agent

### Conversation Pipeline

```
1. Customer speaks
2. Deepgram STT converts speech to text (streaming, Indian English)
3. Prompt Builder assembles context:
   - Tenant info (shop name, settings, business hours)
   - Customer history (if recognized by phone)
   - Top 15 inventory products with stock status
   - Active offers and promotions
   - Sales strategies (upsell rules, cross-sell bundles)
   - Conversation history
4. LLM (Claude or Groq) generates response with optional tool calls
5. If tool calls present:
   a. Execute tools (search inventory, check stock, generate quote, etc.)
   b. Feed tool results back to LLM
   c. LLM generates final response incorporating tool results
6. ElevenLabs TTS converts text to speech
7. Audio streamed back to caller via Twilio
8. Loop continues until call ends
```

### LLM Integration

**Dual-LLM support** — seamlessly switch between providers:

| Provider | Model | Cost | Use Case |
|----------|-------|------|----------|
| **Groq** | Llama 4 Scout 17B | Free | Development & beta |
| **Anthropic** | Claude Sonnet 4 | Paid | Production (better reasoning) |

**Key implementation details:**
- Groq uses OpenAI-compatible API format
- Anthropic tool definitions are auto-converted to OpenAI function format
- `parallel_tool_calls=False` — sequential tool execution for reliability
- Normalized response format: `{ text, tool_calls: [{name, id, arguments}] }`
- Fallback: retries without tools on `tool_use_failed` errors
- Type coercion layer for Groq (sends strings instead of numbers/booleans)

### Tool Calling System

The agent has 8 tools at its disposal. Each tool is defined with a JSON schema and executed server-side.

#### search_inventory
Search the shop's product catalog with flexible filtering.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search terms (e.g., "RTX 4070", "gaming laptop") |
| `category` | string | No | Filter by category name |
| `brand` | string | No | Filter by brand |
| `max_price` | string | No | Maximum price in INR |
| `in_stock_only` | string | No | "true" to show only in-stock items |

**Returns:** `{ found: bool, count: int, products: [{ id, name, brand, selling_price, mrp, stock_quantity, specs, in_stock }] }` (top 5 matches)

**Search logic:** Tries exact name match first (ilike), then falls back to per-keyword OR query across name, brand, and description.

#### check_stock
Real-time stock check for a specific product.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product_name` | string | Yes* | Product name to search |
| `product_id` | string | Yes* | Product UUID |

*One of the two is required.

**Returns:** `{ available: bool, product_name, stock_quantity, selling_price }`

#### generate_quote
Create an itemized quote and save it as an order in the database.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_name` | string | No | Customer's name |
| `customer_phone` | string | No | Customer's phone number |
| `products` | array | Yes | Array of `{ product_id or product_name, quantity }` |

**Returns:** `{ success: bool, quote_id, order_number, line_items: [{ name, qty, price, subtotal }], total }`

**Side effects:**
- Creates or finds customer by phone number
- Creates order with `status="quoted"`, `source="voice-agent"`
- Creates order_items for each product
- Products can be resolved by UUID or by name (text search fallback)

#### pc_build_wizard
AI-powered PC build recommendations within a budget.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `budget` | string | Yes | Total budget in INR (e.g., "80000") |
| `use_case` | string | Yes | gaming, editing, office, streaming, general |
| `brand_preference` | string | No | Preferred brand |
| `gpu_preference` | string | No | NVIDIA or AMD |
| `specific_requirements` | string | No | Special requests |

**Budget allocation by use case:**

| Component | Gaming | Editing | Office | Streaming |
|-----------|--------|---------|--------|-----------|
| GPU | 35% | 30% | 15% | 25% |
| CPU | 25% | 30% | 30% | 30% |
| Motherboard | 12% | 12% | 15% | 12% |
| RAM | 10% | 15% | 15% | 15% |
| SSD | 8% | 8% | 15% | 8% |
| PSU | 5% | 5% | 5% | 5% |
| Cabinet | 3% | - | 3% | 3% |
| Cooler | 2% | - | 2% | 2% |

**Returns:** `{ success: bool, build: [{ component, product_name, price, ... }], total_cost }`

Each component searches with multiple search terms (e.g., GPU: "RTX 4070", "RTX 4060", "RX 7800") and applies a 1.5x budget flex for peripheral components (PSU, cabinet, cooler, motherboard).

#### send_whatsapp
Send a message to the customer via WhatsApp Business API.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_phone` | string | Yes | Phone number with country code |
| `message_type` | string | Yes | quote, offer, tracking, custom |
| `message_content` | string | Yes | Message text |

**Returns:** `{ success: bool, message: string }`

**Modes:**
- **Demo mode** (no creds configured): Logs message body, returns success
- **Live mode**: Sends via Meta WhatsApp Cloud API

#### transfer_to_human
Hand off the call to the shop owner or staff.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reason` | string | Yes | Why the transfer is needed |
| `priority` | string | No | "normal" or "urgent" |

**Returns:** `{ success: bool, action: "transferring", queue_position: int }`

**Handoff triggers:**
- Customer explicitly asks for a human
- Complex negotiation beyond agent's authority
- Technical questions outside agent's knowledge
- Complaints or disputes

#### web_search
Search the web for information not in the inventory (specs, benchmarks, comparisons).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |

**Returns:** `{ found: bool, results: [{ title, snippet, url }] }` (top 3 results)

**Modes:**
- **Stub mode** (no Tavily key): Returns helpful message suggesting to check manufacturer websites
- **Live mode**: Uses Tavily search API

#### hold_music
Play hold music while the customer waits (for call transfers or queue).

Currently stubbed — logs the request but doesn't stream actual audio. Production implementation will use yt-dlp + ffmpeg to stream mulaw audio into Twilio Media Streams.

### Sales Intelligence

The agent is equipped with configurable sales strategies that adapt based on the shop's `upsell_level` setting (low/medium/high).

**Upsell Rules (by component tier):**

| Trigger | Suggested Upgrade | Pitch |
|---------|-------------------|-------|
| RTX 4060 | RTX 4070 | "Sirf 8-10K zyada mein 40% better performance" |
| i5 CPU | i7 CPU | "Future-proof, 4 extra cores" |
| 16GB RAM | 32GB RAM | "Editing aur multitasking ke liye zaroori hai" |
| 512GB SSD | 1TB SSD | "Games aur files dono ke liye space chahiye" |

**Cross-sell Bundles:**
- CPU + Motherboard + RAM → 10% bundle discount
- GPU + PSU → Matching PSU recommendation
- Motherboard + NVMe SSD → Combo offer

**Out-of-stock Alternatives:**
- NVIDIA GPU → AMD equivalent (RTX 4070 → RX 7800 XT)
- AMD GPU → NVIDIA equivalent

**Negotiation Tactics:**
- "Price too high" → Highlight value, offer EMI/bundle discounts
- "Online is cheaper" → Emphasize warranty, instant availability, local support
- "Let me think" → Create urgency with stock levels, offer to hold item
- "Bulk order" → Escalate to human with bulk pricing authority

### Voice Pipeline

#### Speech-to-Text: Deepgram Nova-2

| Setting | Value |
|---------|-------|
| Model | nova-2 |
| Language | en-IN (Indian English) |
| Encoding | mulaw (mu-law) |
| Sample Rate | 8,000 Hz |
| Channels | 1 (mono) |
| Punctuation | Enabled |
| Interim Results | Enabled |
| Utterance End Detection | 1,200ms silence |
| VAD | Enabled |
| Smart Format | Enabled |

**Callbacks:** `on_transcript(text, is_final)`, `on_utterance_end()`

#### Text-to-Speech: ElevenLabs

| Setting | Value |
|---------|-------|
| Voice | Roger (CwhRBWXzGAHq8TQ4Fs17) — laid-back, casual |
| Model | eleven_turbo_v2_5 |
| Output Format | PCM 16kHz 16-bit |
| Stability | 0.5 |
| Similarity Boost | 0.75 |
| Speaker Boost | Enabled |

**Processing:** PCM 16kHz → downsample to 8kHz → convert to mu-law codec → stream chunks to Twilio

#### Telephony: Twilio

| Feature | Implementation |
|---------|---------------|
| Incoming Calls | TwiML webhook → start Media Stream |
| Audio Streaming | Bidirectional WebSocket (mu-law, 8kHz, mono) |
| Call Transfer | TwiML `<Dial>` to shop's direct number |
| Hold Queue | TwiML `<Enqueue>` with hold music |

### API Endpoints

#### Health Check
```
GET /health
```
Returns: `{ status: "healthy", version: "1.0.0" }`

#### Chat (Text)
```
POST /api/v1/chat
Content-Type: application/json

{
  "message": "RTX 4070 ka price kya hai?",
  "session_id": "web-1712345678",     // optional
  "caller_number": "+919876543210"     // optional
}
```
Response:
```json
{
  "reply": "RTX 4070 ka price hai ₹52,500...",
  "tools_used": ["search_inventory"],
  "session_id": "web-1712345678"
}
```

```
DELETE /api/v1/chat/{session_id}
```
Resets the conversation session.

#### Voice (Twilio Webhooks)
```
POST /api/v1/voice/incoming          # Twilio incoming call webhook
WebSocket /api/v1/voice/media-stream # Bidirectional audio stream
POST /api/v1/voice/status            # Call status callback
```

#### Queue
```
GET /api/v1/queue/status             # Current queue positions
```

---

## Database Schema

Multi-tenant PostgreSQL database hosted on Supabase with Row Level Security.

### Entity Relationship

```
tenants
  |-- tenant_users (dashboard access)
  |-- categories (product hierarchy)
  |-- products (inventory)
  |-- customers
  |     |-- orders
  |     |     |-- order_items
  |     |-- call_logs
  |           |-- agent_actions
  |-- offers
  |-- whatsapp_templates
  |-- call_queue
```

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **tenants** | Shop accounts | name, owner_name, twilio_phone, settings (JSONB), subscription_tier |
| **tenant_users** | Dashboard login | email, role (owner/staff/readonly), auth_user_id |
| **categories** | Product categories | name, slug, parent_id (self-join for hierarchy) |
| **products** | Inventory items | name, brand, sku, specs (JSONB), cost/selling/mrp prices, stock_quantity, warranty_months, tags (array), color_variants (JSONB) |
| **customers** | Customer contacts | name, phone (unique per tenant), email, whatsapp_opted_in |
| **orders** | Quotes & orders | order_number, status (enum), total_amount, source, payment_method |
| **order_items** | Line items | product_id, quantity, unit_price, discount |
| **offers** | Promotions | title, discount_type (percentage/flat/bundle), discount_value, date range |
| **call_logs** | Voice call records | twilio_call_sid, caller_phone, transcript (JSONB array), summary, outcome, duration_secs |
| **agent_actions** | Tool usage log | call_log_id, action_type, input/output data, duration_ms |
| **call_queue** | Call queuing | position, status (waiting/hold_music/connecting/connected/abandoned) |
| **whatsapp_templates** | Message templates | template_name, language, body_text, variables |

### Indexes
- GIN index on `products.name` for full-text search
- GIN index on `products.tags` for array containment queries
- Composite index on `products(tenant_id, is_active, stock_quantity)` for stock queries
- Index on `call_logs(tenant_id, started_at DESC)` for chronological call listing

---

## Multi-Tenancy

The system is designed to serve multiple shops from a single deployment.

### How Tenant Isolation Works

1. **Every table has `tenant_id`** — all data is scoped to a specific shop
2. **RLS policies** enforce isolation at the database level
3. **Voice agent** resolves tenant by matching the Twilio phone number that was called
4. **Dashboard** scopes data by the logged-in user's tenant via JWT
5. **System prompt** dynamically loads each tenant's name, inventory, offers, and settings

### Per-Tenant Configuration

Each shop customizes via the `tenants.settings` JSONB column:

```json
{
  "greeting": "Hello! Welcome to Sharma Computers!",
  "business_hours": "10 AM - 8 PM, Mon-Sat",
  "upsell_level": "medium",
  "hold_music_url": null,
  "voice_id": "CwhRBWXzGAHq8TQ4Fs17"
}
```

### What Each Shop Gets
- Their own Twilio phone number
- Their own WhatsApp Business connection
- Their own inventory, customers, orders, offers
- Their own call logs and analytics
- Customizable AI agent personality and sales aggressiveness

---

## Deployment

### Frontend (Vercel)

```bash
cd "Inventory System"
npx vercel deploy --prod --yes
```

> **Note:** GitHub integration doesn't work due to the space in the folder name "Inventory System". Deploy via CLI only.

### Backend (Docker — Railway or Render)

**Dockerfile:**
```dockerfile
FROM python:3.12-slim
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

**Railway** (recommended for production — supports persistent WebSockets):
```toml
[build]
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

**Render** (current — free tier, WebSocket limitations):
- Auto-deploys on push to `main` branch
- Sleeps after 15 minutes of inactivity

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `LLM_PROVIDER` | Yes | `groq` or `anthropic` |
| `GROQ_API_KEY` | If Groq | Groq API key |
| `GROQ_MODEL` | If Groq | Model name (e.g., `meta-llama/llama-4-scout-17b-16e-instruct`) |
| `ANTHROPIC_API_KEY` | If Anthropic | Anthropic API key |
| `ANTHROPIC_MODEL` | If Anthropic | Model name (e.g., `claude-sonnet-4-20250514`) |
| `DEEPGRAM_API_KEY` | Yes | Deepgram STT API key |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs TTS API key |
| `ELEVENLABS_VOICE_ID` | No | Voice ID (default: Roger) |
| `TWILIO_ACCOUNT_SID` | For calls | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | For calls | Twilio auth token |
| `WHATSAPP_PHONE_NUMBER_ID` | For WhatsApp | Meta WhatsApp phone ID |
| `WHATSAPP_ACCESS_TOKEN` | For WhatsApp | Meta WhatsApp token |
| `TAVILY_API_KEY` | For search | Tavily web search key |

---

## Running Locally

### Prerequisites
- Node.js 18+
- Python 3.12+
- Supabase account with project set up
- API keys (at minimum: Supabase + Groq or Anthropic)

### Dashboard (Next.js)

```bash
cd "Inventory System"
npm install
npm run dev
# --> http://localhost:3000
```

### Voice Agent (FastAPI)

```bash
cd "Voice Ai Agentic System"
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
# --> http://localhost:8000
# Chat: POST http://localhost:8000/api/v1/chat
```

### Test the Chat Endpoint

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What gaming PCs can you build for 80K?"}'
```

---

## Live URLs

| System | URL |
|--------|-----|
| Dashboard | https://voice-inventory-agentic-system.vercel.app |
| Voice API | https://shopflow-voice-agent.onrender.com |
| Live Chat | https://voice-inventory-agentic-system.vercel.app/voice-agent/chat |
| Health Check | https://shopflow-voice-agent.onrender.com/health |

> **Note:** Render free tier sleeps after 15 min inactivity. First request takes ~30s to wake up.

---

## Repository Structure

```
Voice-Inventory-Agentic-System/
├── Inventory System/              # Next.js 14 dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/            # Login, signup (Supabase Auth)
│   │   │   ├── (dashboard)/       # All dashboard pages
│   │   │   │   ├── inventory/     # Product list + CRUD + CSV import
│   │   │   │   ├── customers/     # Customer list + add
│   │   │   │   ├── orders/        # Order list + [id] detail
│   │   │   │   ├── offers/        # Promotions management
│   │   │   │   ├── analytics/     # Charts & stats
│   │   │   │   ├── voice-agent/   # Call logs + chat UI
│   │   │   │   └── settings/      # Shop & agent config
│   │   │   └── globals.css        # Theme (indigo/slate)
│   │   ├── components/
│   │   │   ├── layout/            # Sidebar, theme toggle
│   │   │   └── ui/                # shadcn components
│   │   ├── lib/supabase/          # Client wrappers
│   │   └── types/                 # TypeScript interfaces
│   └── vercel.json
│
├── Voice Ai Agentic System/       # FastAPI Python voice agent
│   ├── src/
│   │   ├── main.py                # App entry, CORS, routers
│   │   ├── config.py              # All settings (pydantic)
│   │   ├── agent/
│   │   │   ├── llm_client.py      # Groq/Claude dual LLM
│   │   │   ├── prompt_builder.py  # Dynamic system prompts
│   │   │   ├── sales_strategies.py # Upsell/cross-sell rules
│   │   │   ├── conversation.py    # State management
│   │   │   └── tools/             # 8 agent tools
│   │   ├── services/              # Business logic layer
│   │   ├── api/routes/            # HTTP endpoints
│   │   └── voice/                 # STT, TTS, telephony
│   ├── Dockerfile
│   └── requirements.txt
│
├── CLAUDE.md                      # Project context for AI assistants
└── README.md                      # This file
```

---

## License

Private repository. All rights reserved.

---

*Built with Claude Code by Anthropic*
