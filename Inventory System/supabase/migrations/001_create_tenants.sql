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
