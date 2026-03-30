-- ============================================
-- SEED: Sample Orders for Sharma Computers
-- ============================================

-- Orders from various channels
INSERT INTO orders (tenant_id, customer_id, order_number, status, total_amount, discount_amount, payment_method, source, notes, created_at) VALUES
-- Walk-in orders
('a1b2c3d4-e5f6-7890-abcd-111111111111', (SELECT id FROM customers WHERE phone='+919811001100'), 'SHR-2603-0001', 'delivered', 87500, 2000, 'UPI', 'walk-in', 'Full PC build - gaming setup', '2026-03-05 11:30:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', (SELECT id FROM customers WHERE phone='+919811003300'), 'SHR-2603-0002', 'delivered', 52000, 0, 'Cash', 'walk-in', 'RTX 4070 upgrade', '2026-03-08 14:15:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', (SELECT id FROM customers WHERE phone='+919811004400'), 'SHR-2603-0003', 'paid', 23200, 0, 'Card', 'walk-in', NULL, '2026-03-12 10:45:00+05:30'),

-- Voice Agent orders
('a1b2c3d4-e5f6-7890-abcd-111111111111', (SELECT id FROM customers WHERE phone='+919811002200'), 'SHR-2603-0004', 'delivered', 34000, 0, 'UPI', 'voice-agent', 'Customer called asking for best gaming CPU — sold 7800X3D', '2026-03-10 16:20:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', (SELECT id FROM customers WHERE phone='+919811005500'), 'SHR-2603-0005', 'shipped', 45000, 2000, 'UPI', 'voice-agent', 'RX 7800 XT — agent applied GPU Summer Sale discount', '2026-03-15 09:30:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', (SELECT id FROM customers WHERE phone='+919811001100'), 'SHR-2603-0006', 'confirmed', 15200, 0, 'Pending', 'voice-agent', 'RAM + SSD combo ordered via call', '2026-03-20 13:00:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', (SELECT id FROM customers WHERE phone='+919811003300'), 'SHR-2603-0007', 'quoted', 125000, 10000, NULL, 'voice-agent', 'Full PC build quote — gaming rig, waiting for confirmation', '2026-03-25 17:45:00+05:30'),

-- WhatsApp orders
('a1b2c3d4-e5f6-7890-abcd-111111111111', (SELECT id FROM customers WHERE phone='+919811002200'), 'SHR-2603-0008', 'delivered', 9800, 0, 'UPI', 'whatsapp', 'Corsair 32GB RAM — ordered via WhatsApp quote', '2026-03-07 12:00:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', (SELECT id FROM customers WHERE phone='+919811004400'), 'SHR-2603-0009', 'paid', 18500, 1500, 'UPI', 'whatsapp', 'Gigabyte B650 motherboard — comeback offer applied', '2026-03-18 15:30:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', (SELECT id FROM customers WHERE phone='+919811005500'), 'SHR-2603-0010', 'confirmed', 72000, 2000, 'Pending', 'whatsapp', 'RTX 4070 Ti Super — customer replied YES to quote', '2026-03-22 11:15:00+05:30'),

-- More walk-ins
('a1b2c3d4-e5f6-7890-abcd-111111111111', (SELECT id FROM customers WHERE phone='+919811001100'), 'SHR-2603-0011', 'delivered', 7800, 0, 'Cash', 'walk-in', 'Samsung 980 Pro 1TB', '2026-03-02 16:00:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', (SELECT id FROM customers WHERE phone='+919811003300'), 'SHR-2603-0012', 'cancelled', 27500, 0, NULL, 'walk-in', 'RTX 4060 — customer changed mind', '2026-03-14 10:00:00+05:30'),

-- Recent voice agent quotes
('a1b2c3d4-e5f6-7890-abcd-111111111111', (SELECT id FROM customers WHERE phone='+919811002200'), 'SHR-2603-0013', 'quoted', 98000, 0, NULL, 'voice-agent', 'RTX 4080 Super inquiry — quote sent on WhatsApp', '2026-03-28 14:30:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', (SELECT id FROM customers WHERE phone='+919811004400'), 'SHR-2603-0014', 'quoted', 35500, 0, NULL, 'voice-agent', 'i7-14700KF — customer comparing prices', '2026-03-29 10:00:00+05:30');

-- ============================================
-- SEED: Order Items (linking orders to products)
-- ============================================

-- Order 1: Full PC build (walk-in)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount) VALUES
((SELECT id FROM orders WHERE order_number='SHR-2603-0001'), (SELECT id FROM products WHERE sku='INT-14600KF'), 1, 23200, 0),
((SELECT id FROM orders WHERE order_number='SHR-2603-0001'), (SELECT id FROM products WHERE sku='NV-4060TI-8G'), 1, 37500, 0),
((SELECT id FROM orders WHERE order_number='SHR-2603-0001'), (SELECT id FROM products WHERE sku='MSI-B760M-WIFI'), 1, 12500, 0),
((SELECT id FROM orders WHERE order_number='SHR-2603-0001'), (SELECT id FROM products WHERE sku='COR-DDR5-16-5600'), 1, 5200, 0),
((SELECT id FROM orders WHERE order_number='SHR-2603-0001'), (SELECT id FROM products WHERE sku='SAM-980PRO-1T'), 1, 7800, 0);

-- Order 2: GPU upgrade (walk-in)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount) VALUES
((SELECT id FROM orders WHERE order_number='SHR-2603-0002'), (SELECT id FROM products WHERE sku='NV-4070-12G'), 1, 52000, 0);

-- Order 3: CPU only (walk-in)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount) VALUES
((SELECT id FROM orders WHERE order_number='SHR-2603-0003'), (SELECT id FROM products WHERE sku='INT-14600KF'), 1, 23200, 0);

-- Order 4: Gaming CPU via voice agent
INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount) VALUES
((SELECT id FROM orders WHERE order_number='SHR-2603-0004'), (SELECT id FROM products WHERE sku='AMD-7800X3D'), 1, 34000, 0);

-- Order 5: GPU via voice agent
INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount) VALUES
((SELECT id FROM orders WHERE order_number='SHR-2603-0005'), (SELECT id FROM products WHERE sku='AMD-7800XT-16G'), 1, 45000, 2000);

-- Order 6: RAM + SSD combo via voice agent
INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount) VALUES
((SELECT id FROM orders WHERE order_number='SHR-2603-0006'), (SELECT id FROM products WHERE sku='COR-DDR5-32-6000'), 1, 9800, 0),
((SELECT id FROM orders WHERE order_number='SHR-2603-0006'), (SELECT id FROM products WHERE sku='WD-SN770-1T'), 1, 5500, 0);

-- Order 8: RAM via WhatsApp
INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount) VALUES
((SELECT id FROM orders WHERE order_number='SHR-2603-0008'), (SELECT id FROM products WHERE sku='COR-DDR5-32-6000'), 1, 9800, 0);

-- Order 9: Motherboard via WhatsApp
INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount) VALUES
((SELECT id FROM orders WHERE order_number='SHR-2603-0009'), (SELECT id FROM products WHERE sku='GB-B650-AORUS'), 1, 18500, 1500);

-- Order 10: GPU via WhatsApp
INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount) VALUES
((SELECT id FROM orders WHERE order_number='SHR-2603-0010'), (SELECT id FROM products WHERE sku='NV-4070TIS-16G'), 1, 72000, 2000);

-- Order 11: SSD (walk-in)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount) VALUES
((SELECT id FROM orders WHERE order_number='SHR-2603-0011'), (SELECT id FROM products WHERE sku='SAM-980PRO-1T'), 1, 7800, 0);

-- ============================================
-- SEED: Call Logs (Voice Agent activity)
-- ============================================

INSERT INTO call_logs (tenant_id, twilio_call_sid, caller_phone, customer_id, started_at, ended_at, duration_secs, summary, outcome, created_at) VALUES
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'CA0001', '+919811002200', (SELECT id FROM customers WHERE phone='+919811002200'), '2026-03-10 16:15:00+05:30', '2026-03-10 16:22:00+05:30', 420, 'Customer asked for best gaming CPU under 35K. Recommended Ryzen 7 7800X3D. Customer agreed, order placed.', 'sale', '2026-03-10 16:15:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'CA0002', '+919811005500', (SELECT id FROM customers WHERE phone='+919811005500'), '2026-03-15 09:25:00+05:30', '2026-03-15 09:35:00+05:30', 600, 'Customer inquired about RX 7800 XT availability. Agent informed about GPU Summer Sale. Customer purchased.', 'sale', '2026-03-15 09:25:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'CA0003', '+919811001100', (SELECT id FROM customers WHERE phone='+919811001100'), '2026-03-20 12:50:00+05:30', '2026-03-20 13:05:00+05:30', 900, 'Customer wanted RAM upgrade + storage. Agent recommended 32GB DDR5 6000MHz + WD SN770 combo. Quote sent on WhatsApp.', 'sale', '2026-03-20 12:50:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'CA0004', '+919811003300', (SELECT id FROM customers WHERE phone='+919811003300'), '2026-03-25 17:30:00+05:30', '2026-03-25 17:55:00+05:30', 1500, 'Customer wanted full gaming PC build. Budget 1.2L. Agent ran PC Build Wizard — i7-14700KF + RTX 4070 Ti Super build. Quote sent.', 'quote_sent', '2026-03-25 17:30:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'CA0005', '+919811002200', (SELECT id FROM customers WHERE phone='+919811002200'), '2026-03-28 14:25:00+05:30', '2026-03-28 14:38:00+05:30', 780, 'Customer asked about RTX 4080 Super price and availability. Quote sent. Customer said will think about it.', 'quote_sent', '2026-03-28 14:25:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'CA0006', '+919811004400', (SELECT id FROM customers WHERE phone='+919811004400'), '2026-03-29 09:55:00+05:30', '2026-03-29 10:05:00+05:30', 600, 'Customer comparing i7-14700KF prices. Agent quoted 35,500. Customer said Lamington Road has it cheaper. Agent couldnt match.', 'quote_sent', '2026-03-29 09:55:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'CA0007', '+919876000001', NULL, '2026-03-11 11:00:00+05:30', '2026-03-11 11:03:00+05:30', 180, 'Unknown caller asked about laptop repair. Not in our scope. Redirected to shop.', 'handoff', '2026-03-11 11:00:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'CA0008', '+919876000002', NULL, '2026-03-16 15:00:00+05:30', '2026-03-16 15:04:00+05:30', 240, 'Caller asked about monitor prices. Agent searched inventory — no monitors in stock. Offered to check with shop.', 'handoff', '2026-03-16 15:00:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'CA0009', '+919876000003', NULL, '2026-03-19 18:30:00+05:30', '2026-03-19 18:32:00+05:30', 120, 'Missed call — customer hung up before agent could greet.', 'missed', '2026-03-19 18:30:00+05:30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'CA0010', '+919811005500', (SELECT id FROM customers WHERE phone='+919811005500'), '2026-03-27 12:00:00+05:30', '2026-03-27 12:08:00+05:30', 480, 'Customer called to check shipping status of RX 7800 XT order. Agent confirmed shipped. Customer satisfied.', 'info', '2026-03-27 12:00:00+05:30');
