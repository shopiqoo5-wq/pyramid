-- SEED DATA FOR PYRAMID FM LOCAL DEVELOPMENT
-- Generated from src/mockData/index.ts

-- 1. COMPANIES
INSERT INTO public.companies (id, name, gst_number, point_of_contact, credit_limit, available_credit, status) VALUES
('11111111-1111-4111-8111-111111111111', 'Alpha Corp (Gold Tier)', '27AABBCC1234F1Z1', 'John Doe', 50000.00, 45000.00, 'active'),
('22222222-2222-4222-8222-222222222222', 'Beta Industries (Standard)', '27XYZABC8765G2Y2', 'Jane Smith', 100000.00, 12000.00, 'active'),
('33333333-3333-4333-8333-333333333333', 'Gamma Enterprises (Platinum)', '29ASDFGH9876Q3W3', 'Robert Chen', 250000.00, 250000.00, 'active'),
('d4444444-6666-4666-8666-000000000004', 'Pyramid Workforce', '27PYRAMID1234F1Z1', 'Operations Manager', 0.00, 0.00, 'active')
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
('wh-1', 'Mumbai Primary Center', 'MUM-01', 'Bhiwandi Logistics Park', 'Maharashtra'),
('wh-2', 'Delhi Satellite Hub', 'DEL-02', 'Okhla Phase III', 'Delhi'),
('wh-3', 'Bangalore fulfillment', 'BLR-01', 'Peenya Industrial Area', 'Karnataka')
ON CONFLICT (id) DO NOTHING;

-- 4. LOCATIONS
INSERT INTO public.locations (id, company_id, name, address, state, default_warehouse_id) VALUES
('11111111-2222-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'HQ Mumbai', 'Bandra Kurla Complex', 'Maharashtra', 'wh-1'),
('11111111-2222-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Pune Factory', 'MIDC', 'Maharashtra', 'wh-1')
ON CONFLICT (id) DO NOTHING;

-- 5. STAFF / USERS (Note: In a real setup, these would be linked to Auth.Users)
-- We seed them into public.users for profile visibility.
-- Hashed passwords from mockData: master2026, admin123, pass123, emp123, sup123
INSERT INTO public.users (id, name, email, role, company_id) VALUES
('d1111111-3333-4333-8333-000000000001', 'Pyramid FMS Master', 'master@pyramidfms.com', 'admin', null),
('11111111-0000-4000-8000-000000000001', 'Admin Sameer', 'admin@pyramidfm.com', 'admin', null),
('11111111-0000-4000-8000-000000000002', 'John Doe', 'john@alphacorp.com', 'client_manager', '11111111-1111-4111-8111-111111111111'),
('d2222222-4444-4444-8444-000000000002', 'Sameer Employee', 'sameer@pyramidfm.com', 'client_staff', 'd4444444-6666-4666-8666-000000000004'),
('d3333333-5555-4555-8555-000000000003', 'Vikram Supervisor', 'vikram@pyramidfm.com', 'client_staff', 'd4444444-6666-4666-8666-000000000004')
ON CONFLICT (id) DO NOTHING;

-- 6. INVENTORY INITIAL STOCK
INSERT INTO public.inventory (product_id, warehouse_id, quantity, low_stock_threshold) VALUES
('11111111-1111-4000-8000-000000000001', 'wh-1', 150, 20),
('11111111-1111-4000-8000-000000000002', 'wh-1', 200, 50),
('11111111-1111-4000-8000-000000000003', 'wh-1', 500, 100)
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

-- 7. ATTENDANCE & WORK REPORTS (HYDRATION)
INSERT INTO public.attendance_records (id, employee_id, check_in, photo_url, type) VALUES
('att-001', 'e1111111-1111-4111-8111-000000000001', NOW() - INTERVAL '1 hour', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', 'in')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.work_reports (id, user_id, employee_id, remarks, image_url, status) VALUES
('rep-001', 'd2222222-4444-4444-8444-000000000002', 'e1111111-1111-4111-8111-000000000001', 'Main lobby area sanitized.', 'https://images.unsplash.com/photo-1584820927498-cafe8c160826?w=200&h=200&fit=crop', 'pending')
ON CONFLICT (id) DO NOTHING;
