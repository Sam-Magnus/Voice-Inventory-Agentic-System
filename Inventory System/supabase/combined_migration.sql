-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TENANTS (Multi-tenant root table)
-- ============================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_name TEXT NOT NULL,
    owner_phone TEXT NOT NULL,
    owner_email TEXT,
    address TEXT,
    whatsapp_phone_id TEXT,          -- Meta WhatsApp Business phone ID
    twilio_phone TEXT,                -- Twilio number assigned to this shop
    shop_direct_phone TEXT,           -- Shop's direct landline/mobile for handoffs
    settings JSONB DEFAULT '{}'::jsonb,
    -- settings: { greeting, business_hours, upsell_level, hold_music_url, voice_id }
    subscription_tier TEXT DEFAULT 'budget' CHECK (subscription_tier IN ('premium', 'mid', 'budget')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TENANT USERS (Dashboard access)
-- ============================================
CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'staff' CHECK (role IN ('owner', 'staff', 'readonly')),
    auth_user_id UUID,  -- Links to Supabase Auth
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_auth ON tenant_users(auth_user_id);
CREATE UNIQUE INDEX idx_tenant_users_email_tenant ON tenant_users(email, tenant_id);

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE UNIQUE INDEX idx_categories_slug_tenant ON categories(slug, tenant_id);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    specs JSONB DEFAULT '{}'::jsonb,
    -- specs example: { "vram": "16GB", "clock_speed": "2610MHz", "tdp": "285W" }
    color_variants JSONB DEFAULT '[]'::jsonb,
    -- color_variants example: ["Black", "White"]
    cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    mrp DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER DEFAULT 5,
    warranty_months INTEGER DEFAULT 12,
    is_active BOOLEAN DEFAULT true,
    tags TEXT[] DEFAULT '{}',
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(tenant_id, brand);
CREATE INDEX idx_products_active_stock ON products(tenant_id, is_active, stock_quantity);
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('english', name || ' ' || brand));
CREATE INDEX idx_products_tags ON products USING gin(tags);

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    whatsapp_opted_in BOOLEAN DEFAULT false,
    notes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_phone ON customers(tenant_id, phone);
CREATE UNIQUE INDEX idx_customers_phone_tenant ON customers(phone, tenant_id);

CREATE TRIGGER customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL,
    status TEXT DEFAULT 'quoted' CHECK (status IN (
        'quoted', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled', 'returned'
    )),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    payment_method TEXT,
    source TEXT DEFAULT 'walk-in' CHECK (source IN (
        'walk-in', 'voice-agent', 'whatsapp', 'website'
    )),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_number ON orders(order_number);

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
-- ============================================
-- OFFERS & PROMOTIONS
-- ============================================
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat', 'bundle')),
    discount_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    applicable_to JSONB DEFAULT '{}'::jsonb,
    -- applicable_to: { category_ids: [...], product_ids: [...], min_order: 5000 }
    whatsapp_template_name TEXT,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_tenant ON offers(tenant_id);
CREATE INDEX idx_offers_active ON offers(tenant_id, is_active);

CREATE TRIGGER offers_updated_at
    BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- WHATSAPP TEMPLATES
-- ============================================
CREATE TABLE whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'marketing' CHECK (category IN (
        'marketing', 'utility', 'authentication'
    )),
    language TEXT DEFAULT 'en',
    header_text TEXT,
    body_text TEXT NOT NULL,
    footer_text TEXT,
    buttons JSONB DEFAULT '[]'::jsonb,
    meta_template_id TEXT,  -- ID from Meta after approval
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_templates_tenant ON whatsapp_templates(tenant_id);

CREATE TRIGGER whatsapp_templates_updated_at
    BEFORE UPDATE ON whatsapp_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
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
