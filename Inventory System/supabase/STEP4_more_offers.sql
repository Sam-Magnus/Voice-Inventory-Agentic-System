-- Additional offers for Sharma Computers
INSERT INTO offers (tenant_id, title, description, discount_type, discount_value, applicable_to, is_active, start_date, end_date) VALUES
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'Refer a Friend — Both Get ₹500 Off', 'Existing customer and referred friend both get ₹500 off their next purchase', 'flat', 500, '{"type": "referral"}', true, '2026-03-01', '2026-04-30'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'Comeback 15% Off', '15% off for returning customers who havent purchased in 3+ months', 'percentage', 15, '{"type": "winback"}', true, '2026-02-01', '2026-03-31'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'New Year Monitor Sale', '20% off on all monitors — limited time clearance', 'percentage', 20, '{"category_ids": ["c0000001-0000-0000-0000-000000000008"]}', false, '2026-01-01', '2026-01-07'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'Storage Blowout — Buy 2 Get 10% Off', 'Buy any 2 SSDs and get 10% off the total', 'percentage', 10, '{"category_ids": ["c0000001-0000-0000-0000-000000000005"], "min_items": 2}', true, '2026-03-15', '2026-05-15'),
('a1b2c3d4-e5f6-7890-abcd-111111111111', 'First Order ₹1000 Off', 'New customers get ₹1000 off their first order above ₹10,000', 'flat', 1000, '{"type": "first_order", "min_order": 10000}', true, '2026-01-01', '2026-12-31');
