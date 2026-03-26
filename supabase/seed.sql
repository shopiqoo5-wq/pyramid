-- SEED DATA FOR PYRAMID FM LOCAL DEVELOPMENT
-- Updated with valid UUIDs for all operational tables

-- 1. COMPANIES
INSERT INTO public.companies (id, name, gst_number, point_of_contact, credit_limit, available_credit) VALUES
('11111111-1111-4111-8111-111111111111', 'Alpha Corp (Gold Tier)', '27AABBCC1234F1Z1', 'John Doe', 50000.00, 45000.00),
('22222222-2222-4222-8222-222222222222', 'Beta Industries (Standard)', '27XYZABC8765G2Y2', 'Jane Smith', 100000.00, 12000.00),
('33333333-3333-4333-8333-333333333333', 'Gamma Enterprises (Platinum)', '29ASDFGH9876Q3W3', 'Robert Chen', 250000.00, 250000.00),
('d4444444-6666-4666-8666-000000000004', 'Pyramid Workforce', '27PYRAMID1234F1Z1', 'Operations Manager', 0.00, 0.00)
ON CONFLICT (id) DO NOTHING;

-- 2. PRODUCTS
INSERT INTO public.products (id, name, sku, description, image_url, uom, base_price, gst_rate, hsn_code, category, active) VALUES
('11111111-1111-4000-8000-000000000001', 'Floor Cleaner (5L)', 'FC-001', 'Industrial grade floor cleaner', 'https://images.unsplash.com/photo-1584820927498-cafe8c160826?w=400&h=400&fit=crop', 'Can', 250.00, 18.00, '3402', 'Cleaning Chemicals', true),
('11111111-1111-4000-8000-000000000002', 'Glass Cleaner (500ml)', 'GC-002', 'Streak-free glass cleaner spray', 'https://images.unsplash.com/photo-1585834892497-7e61da128913?w=400&h=400&fit=crop', 'Bottle', 85.00, 18.00, '3402', 'Cleaning Chemicals', true),
('11111111-1111-4000-8000-000000000003', 'Microfiber Cloth', 'MC-003', 'Pack of 5 premium microfiber cloths', 'https://images.unsplash.com/photo-1585429158300-844c802e3bcf?w=400&h=400&fit=crop', 'Pack', 120.00, 12.00, '6307', 'Accessories', true),
('11111111-1111-4000-8000-000000000004', 'Nitrile Gloves (Box of 100)', 'GL-004', 'Powder-free safety gloves', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=400&fit=crop', 'Box', 450.00, 5.00, '4015', 'Safety Gear', true),
('11111111-1111-4000-8000-000000000005', 'Hand Sanitizer (1L)', 'HS-005', '70% Alcohol based sanitizer', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop', 'Bottle', 180.00, 18.00, '3808', 'Personal Hygiene', true)
ON CONFLICT (id) DO NOTHING;

-- 3. WAREHOUSES
INSERT INTO public.warehouses (id, name, code, address, state) VALUES
('f1111111-1111-4111-8111-000000000001', 'Mumbai Primary Center', 'MUM-01', 'Bhiwandi Logistics Park', 'Maharashtra'),
('f1111111-1111-4111-8111-000000000002', 'Delhi Satellite Hub', 'DEL-02', 'Okhla Phase III', 'Delhi'),
('f1111111-1111-4111-8111-000000000003', 'Bangalore fulfillment', 'BLR-01', 'Peenya Industrial Area', 'Karnataka')
ON CONFLICT (id) DO NOTHING;

-- 4. LOCATIONS
INSERT INTO public.locations (id, company_id, name, address, state, default_warehouse_id) VALUES
('11111111-2222-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'HQ Mumbai', 'Bandra Kurla Complex', 'Maharashtra', 'f1111111-1111-4111-8111-000000000001'),
('11111111-2222-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Pune Factory', 'MIDC', 'Maharashtra', 'f1111111-1111-4111-8111-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 5. USERS (Note: Linked to Auth via ID)
INSERT INTO public.users (id, name, email, role, company_id) VALUES
('d1111111-3333-4333-8333-000000000001', 'Pyramid FMS Master', 'master@pyramidfms.com', 'admin', null),
('11111111-0000-4000-8000-000000000001', 'Admin Sameer', 'admin@pyramidfm.com', 'admin', null),
('11111111-0000-4000-8000-000000000002', 'John Doe', 'john@alphacorp.com', 'client_manager', '11111111-1111-4111-8111-111111111111'),
('d2222222-4444-4444-8444-000000000002', 'Sameer Employee', 'sameer@pyramidfm.com', 'client_staff', 'd4444444-6666-4666-8666-000000000004'),
('d3333333-5555-4555-8555-000000000003', 'Vikram Supervisor', 'vikram@pyramidfm.com', 'client_staff', 'd4444444-6666-4666-8666-000000000004')
ON CONFLICT (id) DO NOTHING;

-- 6. ATTENDANCE & WORK REPORTS
INSERT INTO public.attendance_records (id, employee_id, check_in, photo_url, type) VALUES
('a1111111-1111-4111-8111-000000000001', 'e1111111-1111-4111-8111-000000000001', NOW() - INTERVAL '1 hour', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', 'in')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.work_reports (id, user_id, employee_id, remarks, image_url, status) VALUES
('e1111111-1111-4111-8111-000000000001', 'd2222222-4444-4444-8444-000000000002', 'e1111111-1111-4111-8111-000000000001', 'Main lobby area sanitized.', 'https://images.unsplash.com/photo-1584820927498-cafe8c160826?w=200&h=200&fit=crop', 'pending')
ON CONFLICT (id) DO NOTHING;

-- 7. CUSTOM ROLES
INSERT INTO public.custom_roles (id, name, permissions, is_system) VALUES
('c1111111-1111-4111-8111-000000000001', 'Lead Janitor', '{inventory:read, attendance:write, reports:write}', false),
('c1111111-1111-4111-8111-000000000002', 'Site Supervisor', '{inventory:all, attendance:all, reports:all, roles:read}', true)
ON CONFLICT (id) DO NOTHING;

-- 8. WORK ASSIGNMENTS
INSERT INTO public.work_assignments (id, title, description, assigned_role, recurrence) VALUES
('81111111-1111-4111-8111-000000000001', 'Daily Lobby Sanitization', 'Disinfect door handles and kiosks', 'All', 'daily'),
('81111111-1111-4111-8111-000000000002', 'Washroom Deep Clean', 'Check all soap dispensers and floors', 'All', 'daily'),
('81111111-1111-4111-8111-000000000003', 'Inventory Stock Take', 'Monthly check of onsite cleaning supplies', 'Lead Janitor', 'monthly')
ON CONFLICT (id) DO NOTHING;

-- 9. SITE PROTOCOLS
INSERT INTO public.site_protocols (id, location_id, title, steps) VALUES
('91111111-1111-4111-8111-000000000001', '11111111-2222-4000-8000-000000000001', 'Bio-Hazard Response', '{"1. Secure perimeter", "2. Notify supervisor", "3. Apply PPE", "4. Sanitize area"}')
ON CONFLICT (id) DO NOTHING;

-- 10. SAMPLE ORDERS (For UI Vibe Check)
INSERT INTO public.orders (id, custom_id, company_id, location_id, placed_by, status, total_amount, gst_amount, net_amount) VALUES
('o1111111-1111-4111-8111-000000000001', 'ORD-20240326-001', '11111111-1111-4111-8111-111111111111', '11111111-2222-4000-8000-000000000001', '11111111-0000-4000-8000-000000000002', 'pending', 500.00, 90.00, 590.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, gst_amount, total) VALUES
('o1111111-1111-4111-8111-000000000001', '11111111-1111-4000-8000-000000000001', 2, 250.00, 90.00, 590.00)
ON CONFLICT (id) DO NOTHING;
