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
