-- ============================================
-- SEED DATA: Demo Nehru Place Hardware Shops
-- ============================================

-- TENANT 1: Sharma Computers
INSERT INTO tenants (id, name, slug, owner_name, owner_phone, owner_email, address, settings, subscription_tier)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-111111111111',
    'Sharma Computers',
    'sharma-computers',
    'Rajesh Sharma',
    '+919876543210',
    'rajesh@sharmacomputers.in',
    'Shop 42, Ground Floor, Nehru Place, New Delhi - 110019',
    '{"greeting": "Hello! Welcome to Sharma Computers, Nehru Place ka sabse trusted shop. Main aapki kaise madad kar sakta hoon?", "business_hours": "10 AM - 8 PM, Mon-Sat", "upsell_level": "high"}',
    'premium'
);

-- TENANT 2: Tech Galaxy
INSERT INTO tenants (id, name, slug, owner_name, owner_phone, owner_email, address, settings, subscription_tier)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-222222222222',
    'Tech Galaxy',
    'tech-galaxy',
    'Vikram Patel',
    '+919876543220',
    'vikram@techgalaxy.in',
    'Shop 78, First Floor, Nehru Place, New Delhi - 110019',
    '{"greeting": "Namaste! Tech Galaxy mein aapka swagat hai. Best deals on computer hardware. Bataiye kya chahiye?", "business_hours": "11 AM - 9 PM, Mon-Sun", "upsell_level": "medium"}',
    'mid'
);

-- ============================================
-- CATEGORIES (for Sharma Computers)
-- ============================================
INSERT INTO categories (id, tenant_id, name, slug, sort_order) VALUES
('c0000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'Processors', 'processors', 1),
('c0000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'Graphics Cards', 'graphics-cards', 2),
('c0000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'Motherboards', 'motherboards', 3),
('c0000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'RAM', 'ram', 4),
('c0000001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'Storage', 'storage', 5),
('c0000001-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'Power Supply', 'power-supply', 6),
('c0000001-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'Cabinets', 'cabinets', 7),
('c0000001-0000-0000-0000-000000000008', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'Monitors', 'monitors', 8),
('c0000001-0000-0000-0000-000000000009', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'Cooling', 'cooling', 9),
('c0000001-0000-0000-0000-000000000010', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 'Peripherals', 'peripherals', 10);

-- Categories for Tech Galaxy (same structure)
INSERT INTO categories (id, tenant_id, name, slug, sort_order) VALUES
('c0000002-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-222222222222', 'Processors', 'processors', 1),
('c0000002-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-222222222222', 'Graphics Cards', 'graphics-cards', 2),
('c0000002-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-222222222222', 'Motherboards', 'motherboards', 3),
('c0000002-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-222222222222', 'RAM', 'ram', 4),
('c0000002-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-222222222222', 'Storage', 'storage', 5);

-- ============================================
-- PRODUCTS: Sharma Computers (Realistic Nehru Place Pricing 2026)
-- ============================================

-- PROCESSORS
INSERT INTO products (tenant_id, category_id, name, brand, sku, specs, selling_price, mrp, cost_price, stock_quantity, warranty_months, tags) VALUES
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000001', 'Intel Core i5-14400F', 'Intel', 'INT-14400F', '{"cores": 10, "threads": 16, "base_clock": "2.5 GHz", "boost_clock": "4.7 GHz", "tdp": "65W", "socket": "LGA 1700"}', 15500, 16999, 13800, 12, 36, ARRAY['intel', 'processor', 'gaming', 'i5', '14th gen']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000001', 'Intel Core i5-14600KF', 'Intel', 'INT-14600KF', '{"cores": 14, "threads": 20, "base_clock": "3.5 GHz", "boost_clock": "5.3 GHz", "tdp": "125W", "socket": "LGA 1700"}', 23200, 25499, 20800, 8, 36, ARRAY['intel', 'processor', 'gaming', 'i5', '14th gen', 'overclockable']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000001', 'Intel Core i7-14700KF', 'Intel', 'INT-14700KF', '{"cores": 20, "threads": 28, "base_clock": "3.4 GHz", "boost_clock": "5.6 GHz", "tdp": "125W", "socket": "LGA 1700"}', 35500, 38999, 32000, 5, 36, ARRAY['intel', 'processor', 'gaming', 'editing', 'i7', '14th gen']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000001', 'Intel Core i9-14900K', 'Intel', 'INT-14900K', '{"cores": 24, "threads": 32, "base_clock": "3.2 GHz", "boost_clock": "6.0 GHz", "tdp": "125W", "socket": "LGA 1700"}', 52000, 57999, 47500, 3, 36, ARRAY['intel', 'processor', 'gaming', 'editing', 'streaming', 'i9', '14th gen']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000001', 'AMD Ryzen 5 7600X', 'AMD', 'AMD-7600X', '{"cores": 6, "threads": 12, "base_clock": "4.7 GHz", "boost_clock": "5.3 GHz", "tdp": "105W", "socket": "AM5"}', 18500, 20999, 16500, 10, 36, ARRAY['amd', 'processor', 'gaming', 'ryzen 5', '7000 series']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000001', 'AMD Ryzen 7 7800X3D', 'AMD', 'AMD-7800X3D', '{"cores": 8, "threads": 16, "base_clock": "4.2 GHz", "boost_clock": "5.0 GHz", "tdp": "120W", "socket": "AM5", "3d_vcache": "96MB"}', 34000, 37499, 30500, 4, 36, ARRAY['amd', 'processor', 'gaming', 'ryzen 7', '7000 series', '3d vcache']),

-- GRAPHICS CARDS
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000002', 'NVIDIA GeForce RTX 4060', 'NVIDIA', 'NV-4060-8G', '{"vram": "8GB GDDR6", "boost_clock": "2460 MHz", "tdp": "115W", "ray_tracing": true, "dlss": "3.0"}', 27500, 30999, 24500, 15, 36, ARRAY['nvidia', 'gpu', 'gaming', 'rtx 4060', '1080p']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000002', 'NVIDIA GeForce RTX 4060 Ti', 'NVIDIA', 'NV-4060TI-8G', '{"vram": "8GB GDDR6", "boost_clock": "2535 MHz", "tdp": "160W", "ray_tracing": true, "dlss": "3.0"}', 37500, 41999, 34000, 8, 36, ARRAY['nvidia', 'gpu', 'gaming', 'rtx 4060 ti', '1440p']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000002', 'NVIDIA GeForce RTX 4070', 'NVIDIA', 'NV-4070-12G', '{"vram": "12GB GDDR6X", "boost_clock": "2475 MHz", "tdp": "200W", "ray_tracing": true, "dlss": "3.0"}', 52000, 56999, 47000, 6, 36, ARRAY['nvidia', 'gpu', 'gaming', 'rtx 4070', '1440p', '4k']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000002', 'NVIDIA GeForce RTX 4070 Ti Super', 'NVIDIA', 'NV-4070TIS-16G', '{"vram": "16GB GDDR6X", "boost_clock": "2610 MHz", "tdp": "285W", "ray_tracing": true, "dlss": "3.0"}', 72000, 79999, 65000, 4, 36, ARRAY['nvidia', 'gpu', 'gaming', 'rtx 4070 ti super', '4k']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000002', 'NVIDIA GeForce RTX 4080 Super', 'NVIDIA', 'NV-4080S-16G', '{"vram": "16GB GDDR6X", "boost_clock": "2550 MHz", "tdp": "320W", "ray_tracing": true, "dlss": "3.0"}', 98000, 109999, 89000, 2, 36, ARRAY['nvidia', 'gpu', 'gaming', 'editing', 'rtx 4080 super', '4k']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000002', 'AMD Radeon RX 7600', 'AMD', 'AMD-7600-8G', '{"vram": "8GB GDDR6", "boost_clock": "2655 MHz", "tdp": "165W", "ray_tracing": true}', 24500, 27999, 21500, 10, 36, ARRAY['amd', 'gpu', 'gaming', 'rx 7600', '1080p']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000002', 'AMD Radeon RX 7800 XT', 'AMD', 'AMD-7800XT-16G', '{"vram": "16GB GDDR6", "boost_clock": "2430 MHz", "tdp": "263W", "ray_tracing": true}', 45000, 49999, 40000, 5, 36, ARRAY['amd', 'gpu', 'gaming', 'rx 7800 xt', '1440p']),

-- MOTHERBOARDS
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000003', 'MSI PRO B760M-A WiFi', 'MSI', 'MSI-B760M-WIFI', '{"socket": "LGA 1700", "form_factor": "Micro ATX", "ram_slots": 2, "max_ram": "64GB", "m2_slots": 2, "wifi": true}', 12500, 13999, 10800, 15, 36, ARRAY['msi', 'motherboard', 'intel', 'b760', 'wifi', 'matx']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000003', 'ASUS ROG STRIX B760-F Gaming WiFi', 'ASUS', 'ASUS-B760F-WIFI', '{"socket": "LGA 1700", "form_factor": "ATX", "ram_slots": 4, "max_ram": "128GB", "m2_slots": 3, "wifi": true}', 22000, 24999, 19500, 6, 36, ARRAY['asus', 'motherboard', 'intel', 'b760', 'wifi', 'atx', 'rog']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000003', 'Gigabyte B650 AORUS Elite AX', 'Gigabyte', 'GB-B650-AORUS', '{"socket": "AM5", "form_factor": "ATX", "ram_slots": 4, "max_ram": "128GB", "m2_slots": 2, "wifi": true}', 18500, 20999, 16000, 8, 36, ARRAY['gigabyte', 'motherboard', 'amd', 'b650', 'wifi', 'atx', 'aorus']),

-- RAM
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000004', 'Corsair Vengeance DDR5 16GB (2x8GB) 5600MHz', 'Corsair', 'COR-DDR5-16-5600', '{"type": "DDR5", "capacity": "16GB (2x8GB)", "speed": "5600 MHz", "cas_latency": "CL36", "rgb": false}', 5200, 5999, 4500, 25, 60, ARRAY['corsair', 'ram', 'ddr5', '16gb', '5600mhz']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000004', 'Corsair Vengeance DDR5 32GB (2x16GB) 6000MHz', 'Corsair', 'COR-DDR5-32-6000', '{"type": "DDR5", "capacity": "32GB (2x16GB)", "speed": "6000 MHz", "cas_latency": "CL30", "rgb": false}', 9800, 10999, 8500, 18, 60, ARRAY['corsair', 'ram', 'ddr5', '32gb', '6000mhz']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000004', 'G.Skill Trident Z5 RGB DDR5 32GB (2x16GB) 6400MHz', 'G.Skill', 'GSKILL-Z5-32-6400', '{"type": "DDR5", "capacity": "32GB (2x16GB)", "speed": "6400 MHz", "cas_latency": "CL32", "rgb": true}', 13500, 14999, 11800, 6, 60, ARRAY['gskill', 'ram', 'ddr5', '32gb', '6400mhz', 'rgb']),

-- STORAGE
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000005', 'Samsung 980 Pro 1TB NVMe', 'Samsung', 'SAM-980PRO-1T', '{"type": "NVMe M.2", "capacity": "1TB", "read_speed": "7000 MB/s", "write_speed": "5000 MB/s", "interface": "PCIe 4.0"}', 7800, 8999, 6800, 20, 60, ARRAY['samsung', 'ssd', 'nvme', '1tb', '980 pro']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000005', 'Samsung 990 Pro 2TB NVMe', 'Samsung', 'SAM-990PRO-2T', '{"type": "NVMe M.2", "capacity": "2TB", "read_speed": "7450 MB/s", "write_speed": "6900 MB/s", "interface": "PCIe 4.0"}', 16500, 18999, 14500, 8, 60, ARRAY['samsung', 'ssd', 'nvme', '2tb', '990 pro']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000005', 'WD Black SN770 1TB NVMe', 'Western Digital', 'WD-SN770-1T', '{"type": "NVMe M.2", "capacity": "1TB", "read_speed": "5150 MB/s", "write_speed": "4900 MB/s", "interface": "PCIe 4.0"}', 5500, 6499, 4700, 15, 60, ARRAY['wd', 'western digital', 'ssd', 'nvme', '1tb']),

-- POWER SUPPLY
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000006', 'Corsair RM750e 750W 80+ Gold', 'Corsair', 'COR-RM750E', '{"wattage": "750W", "efficiency": "80+ Gold", "modular": "Fully Modular", "fan": "135mm"}', 7800, 8999, 6800, 12, 84, ARRAY['corsair', 'psu', '750w', '80 plus gold', 'modular']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000006', 'Corsair RM850x 850W 80+ Gold', 'Corsair', 'COR-RM850X', '{"wattage": "850W", "efficiency": "80+ Gold", "modular": "Fully Modular", "fan": "135mm"}', 10500, 11999, 9200, 8, 120, ARRAY['corsair', 'psu', '850w', '80 plus gold', 'modular']),

-- CABINETS
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000007', 'Lian Li Lancool III Mesh', 'Lian Li', 'LL-LANCOOL3-MESH', '{"form_factor": "Mid Tower", "fans_included": 3, "front_io": "USB-C, 2x USB-A", "glass_panel": true, "airflow": "Mesh Front"}', 9500, 10999, 8200, 7, 12, ARRAY['lian li', 'cabinet', 'mid tower', 'mesh', 'airflow']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000007', 'NZXT H5 Flow', 'NZXT', 'NZXT-H5-FLOW', '{"form_factor": "Mid Tower", "fans_included": 2, "front_io": "USB-C, USB-A", "glass_panel": true, "airflow": "Perforated Front"}', 7500, 8499, 6500, 10, 12, ARRAY['nzxt', 'cabinet', 'mid tower', 'airflow']),

-- COOLING
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000009', 'Deepcool AK620 Air Cooler', 'Deepcool', 'DC-AK620', '{"type": "Air Cooler", "tdp": "260W", "fans": "2x 120mm", "height": "160mm"}', 4200, 4999, 3600, 12, 36, ARRAY['deepcool', 'cooler', 'air cooler', 'tower']),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'c0000001-0000-0000-0000-000000000009', 'NZXT Kraken 240 AIO', 'NZXT', 'NZXT-KRAKEN-240', '{"type": "AIO Liquid Cooler", "radiator": "240mm", "fans": "2x 120mm", "display": "1.54 inch LCD"}', 12500, 14999, 11000, 5, 72, ARRAY['nzxt', 'cooler', 'aio', 'liquid cooler', '240mm']);

-- ============================================
-- CUSTOMERS: Sharma Computers
-- ============================================
INSERT INTO customers (tenant_id, name, phone, email, whatsapp_opted_in) VALUES
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'Amit Kumar', '+919811001100', 'amit.kumar@gmail.com', true),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'Priya Verma', '+919811002200', 'priya.v@outlook.com', true),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'Rohan Singh', '+919811003300', NULL, true),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'Neha Gupta', '+919811004400', 'neha.g@yahoo.com', false),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'Sanjay Mehta', '+919811005500', NULL, true);

-- ============================================
-- OFFERS: Sharma Computers
-- ============================================
INSERT INTO offers (tenant_id, title, description, discount_type, discount_value, applicable_to, is_active, start_date, end_date) VALUES
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'GPU Summer Sale', 'Flat discount on all NVIDIA graphics cards', 'flat', 2000, '{"category_ids": ["c0000001-0000-0000-0000-000000000002"]}', true, '2026-03-01', '2026-04-30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'PC Build Combo Offer', '10% off on complete PC builds (5+ components)', 'percentage', 10, '{"min_items": 5}', true, '2026-03-15', '2026-05-15'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'RAM Upgrade Special', 'Buy any processor, get 15% off on DDR5 RAM', 'percentage', 15, '{"category_ids": ["c0000001-0000-0000-0000-000000000004"], "requires_category": "c0000001-0000-0000-0000-000000000001"}', true, '2026-03-01', '2026-06-30');
