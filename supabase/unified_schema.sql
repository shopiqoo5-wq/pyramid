-- =========================================================================
-- PYRAMID FM - UNIFIED SETUP SCRIPT (SCHEMA + SEED)
-- =========================================================================
-- Copy and paste this script into the Supabase SQL Editor (Dashboard > SQL Editor)
-- to initialize the entire database for both Core and Operational modules.
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 2. SCHEMA DEFINITIONS (Base Tables)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    gst_number TEXT UNIQUE NOT NULL,
    point_of_contact TEXT,
    credit_limit DECIMAL(12, 2) DEFAULT 0,
    available_credit DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'client_manager', 'client_staff', 'procurement');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'client_staff',
    company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT NOT NULL,
    state TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    state TEXT NOT NULL,
    default_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    uom TEXT NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 18,
    hsn_code TEXT,
    category TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    eligible_companies UUID[]
);

CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 20,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

-- 3. OPERATIONAL TABLES (Mobile & Workforce)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    company_id UUID REFERENCES public.companies(id),
    location_id UUID REFERENCES public.locations(id),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL,
    location_id UUID REFERENCES public.locations(id),
    type TEXT NOT NULL,
    photo_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.work_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    employee_id UUID NOT NULL,
    location_id UUID REFERENCES public.locations(id),
    remarks TEXT NOT NULL,
    image_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.custom_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.work_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_role TEXT,
    assigned_employee_id UUID,
    recurrence TEXT DEFAULT 'daily',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.site_protocols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    steps TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.submitted_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL,
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_tasks TEXT[] DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, submission_date)
);

-- 4. COMMERCE TABLES
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_id TEXT UNIQUE NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    location_id UUID NOT NULL REFERENCES public.locations(id),
    placed_by UUID NOT NULL REFERENCES public.users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(12, 2) NOT NULL,
    gst_amount DECIMAL(12, 2) NOT NULL,
    net_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    gst_amount DECIMAL(10, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL
);

-- 5. SEED DATA
-- Companies
INSERT INTO public.companies (id, name, gst_number, point_of_contact, credit_limit, available_credit) VALUES
('11111111-1111-4111-8111-111111111111', 'Alpha Corp (Gold Tier)', '27AABBCC1234F1Z1', 'John Doe', 50000.00, 45000.00),
('22222222-2222-4222-8222-222222222222', 'Beta Industries (Standard)', '27XYZABC8765G2Y2', 'Jane Smith', 100000.00, 12000.00)
ON CONFLICT (id) DO NOTHING;

-- Warehouses
INSERT INTO public.warehouses (id, name, code, address, state) VALUES
('f1111111-1111-4111-8111-000000000001', 'Mumbai Primary Center', 'MUM-01', 'Bhiwandi Logistics Park', 'Maharashtra')
ON CONFLICT (id) DO NOTHING;

-- Locations
INSERT INTO public.locations (id, company_id, name, address, state, default_warehouse_id) VALUES
('11111111-2222-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'HQ Mumbai', 'Bandra Kurla Complex', 'Maharashtra', 'f1111111-1111-4111-8111-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO public.products (id, name, sku, description, image_url, uom, base_price, gst_rate, hsn_code, category) VALUES
('11111111-1111-4000-8000-000000000001', 'Floor Cleaner (5L)', 'FC-001', 'Industrial grade floor cleaner', 'https://images.unsplash.com/photo-1584820927498-cafe8c160826?w=400&h=400&fit=crop', 'Can', 250.00, 18.00, '3402', 'Cleaning Chemicals')
ON CONFLICT (id) DO NOTHING;

-- Operational Seeds
INSERT INTO public.custom_roles (id, name, permissions, is_system) VALUES
('c1111111-1111-4111-8111-000000000001', 'Lead Janitor', '{inventory:read, attendance:write, reports:write}', false),
('c1111111-1111-4111-8111-000000000002', 'Site Supervisor', '{inventory:all, attendance:all, reports:all, roles:read}', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.work_assignments (id, title, description, assigned_role, recurrence) VALUES
('81111111-1111-4111-8111-000000000001', 'Daily Lobby Sanitization', 'Disinfect door handles and kiosks', 'All', 'daily'),
('81111111-1111-4111-8111-000000000002', 'Washroom Deep Clean', 'Check all soap dispensers and floors', 'All', 'daily')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.site_protocols (id, location_id, title, steps) VALUES
('91111111-1111-4111-8111-000000000001', '11111111-2222-4000-8000-000000000001', 'Bio-Hazard Response', '{"1. Secure perimeter", "2. Notify supervisor", "3. Apply PPE", "4. Sanitize area"}')
ON CONFLICT (id) DO NOTHING;

-- 6. SECURITY SETTINGS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submitted_checklists ENABLE ROW LEVEL SECURITY;

-- Anonymous Read access for setup/vibe check
DROP POLICY IF EXISTS "Public read everything" ON public.products;
CREATE POLICY "Public read everything" ON public.products FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read assignments" ON public.work_assignments;
CREATE POLICY "Public read assignments" ON public.work_assignments FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read protocols" ON public.site_protocols;
CREATE POLICY "Public read protocols" ON public.site_protocols FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read roles" ON public.custom_roles;
CREATE POLICY "Public read roles" ON public.custom_roles FOR SELECT USING (TRUE);
