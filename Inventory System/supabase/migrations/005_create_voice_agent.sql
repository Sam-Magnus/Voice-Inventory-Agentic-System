-- ============================================
-- CALL LOGS
-- ============================================
CREATE TABLE call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    twilio_call_sid TEXT,
    caller_phone TEXT NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_secs INTEGER,
    transcript JSONB DEFAULT '[]'::jsonb,
    -- transcript: [{ role: "customer"|"agent", text: "...", ts: "..." }, ...]
    summary TEXT,
    outcome TEXT CHECK (outcome IN (
        'sale', 'quote_sent', 'info', 'handoff', 'missed', 'abandoned'
    )),
    quote_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_logs_tenant ON call_logs(tenant_id);
CREATE INDEX idx_call_logs_caller ON call_logs(tenant_id, caller_phone);
CREATE INDEX idx_call_logs_outcome ON call_logs(tenant_id, outcome);
CREATE INDEX idx_call_logs_date ON call_logs(tenant_id, started_at DESC);

-- ============================================
-- AGENT ACTIONS (tool usage log)
-- ============================================
CREATE TABLE agent_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    -- 'inventory_search', 'stock_check', 'quote_generate', 'whatsapp_send',
    -- 'web_search', 'handoff', 'hold_music', 'pc_build'
    input_data JSONB DEFAULT '{}'::jsonb,
    output_data JSONB DEFAULT '{}'::jsonb,
    duration_ms INTEGER,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_actions_call ON agent_actions(call_log_id);

-- ============================================
-- CALL QUEUE
-- ============================================
CREATE TABLE call_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    caller_phone TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'waiting' CHECK (status IN (
        'waiting', 'hold_music', 'connecting', 'connected', 'abandoned'
    )),
    hold_music_choice TEXT,
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    connected_at TIMESTAMPTZ
);

CREATE INDEX idx_call_queue_tenant ON call_queue(tenant_id, status);
