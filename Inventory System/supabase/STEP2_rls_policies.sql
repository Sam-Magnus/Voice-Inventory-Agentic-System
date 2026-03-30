-- ============================================
-- ROW LEVEL SECURITY POLICIES (Beta/Demo)
-- ============================================
-- For beta phase: permissive policies so dashboard works without tenant-scoped JWTs.
-- Voice Agent uses service_role key (bypasses RLS entirely).
-- TODO: Tighten to per-tenant JWT policies before production launch.

-- Helper function in PUBLIC schema (Supabase restricts writes to auth schema)
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID AS $$
    SELECT COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid,
        NULL
    );
$$ LANGUAGE sql STABLE;

-- TENANTS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to tenants" ON tenants FOR ALL USING (true) WITH CHECK (true);

-- TENANT USERS
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to tenant_users" ON tenant_users FOR ALL USING (true) WITH CHECK (true);

-- CATEGORIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to categories" ON categories FOR ALL USING (true) WITH CHECK (true);

-- PRODUCTS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to products" ON products FOR ALL USING (true) WITH CHECK (true);

-- CUSTOMERS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to customers" ON customers FOR ALL USING (true) WITH CHECK (true);

-- ORDERS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to orders" ON orders FOR ALL USING (true) WITH CHECK (true);

-- ORDER ITEMS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- OFFERS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to offers" ON offers FOR ALL USING (true) WITH CHECK (true);

-- WHATSAPP TEMPLATES
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to whatsapp_templates" ON whatsapp_templates FOR ALL USING (true) WITH CHECK (true);

-- CALL LOGS
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to call_logs" ON call_logs FOR ALL USING (true) WITH CHECK (true);

-- AGENT ACTIONS
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to agent_actions" ON agent_actions FOR ALL USING (true) WITH CHECK (true);

-- CALL QUEUE
ALTER TABLE call_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to call_queue" ON call_queue FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ENABLE REALTIME for key tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE call_queue;
