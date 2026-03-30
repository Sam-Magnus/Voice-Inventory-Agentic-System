-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================
-- All tables are isolated by tenant_id.
-- Dashboard users access via Supabase Auth JWT (contains tenant_id).
-- Voice Agent uses service_role key (bypasses RLS).

-- Helper function to extract tenant_id from JWT
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
    SELECT COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid
    );
$$ LANGUAGE sql STABLE;

-- TENANTS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT USING (id = auth.tenant_id());
CREATE POLICY "Owners can update their tenant" ON tenants
    FOR UPDATE USING (id = auth.tenant_id());

-- TENANT USERS
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their tenant's users" ON tenant_users
    FOR SELECT USING (tenant_id = auth.tenant_id());

-- CATEGORIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON categories
    FOR ALL USING (tenant_id = auth.tenant_id());

-- PRODUCTS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON products
    FOR ALL USING (tenant_id = auth.tenant_id());

-- CUSTOMERS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON customers
    FOR ALL USING (tenant_id = auth.tenant_id());

-- ORDERS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON orders
    FOR ALL USING (tenant_id = auth.tenant_id());

-- ORDER ITEMS (via order's tenant)
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation via order" ON order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM orders WHERE orders.id = order_items.order_id
            AND orders.tenant_id = auth.tenant_id()
        )
    );

-- OFFERS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON offers
    FOR ALL USING (tenant_id = auth.tenant_id());

-- WHATSAPP TEMPLATES
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON whatsapp_templates
    FOR ALL USING (tenant_id = auth.tenant_id());

-- CALL LOGS
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON call_logs
    FOR ALL USING (tenant_id = auth.tenant_id());

-- AGENT ACTIONS (via call_log's tenant)
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation via call_log" ON agent_actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM call_logs WHERE call_logs.id = agent_actions.call_log_id
            AND call_logs.tenant_id = auth.tenant_id()
        )
    );

-- CALL QUEUE
ALTER TABLE call_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON call_queue
    FOR ALL USING (tenant_id = auth.tenant_id());

-- ============================================
-- ENABLE REALTIME for key tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE call_queue;
