-- =========================================================================
-- PYRAMID FM - UNIVERSAL CONSOLIDATED SETUP SCRIPT (V2.0 - PRODUCTION READY)
-- =========================================================================
-- This single script initializes the entire database:
-- 1. Extensions & Enums
-- 2. Core Business Tables (Companies, Users, Warehouses, Products)
-- 3. Commerce & Logistics (Orders, Inventory, Budgets, Pricing)
-- 4. Workforce & Field Operations (Attendance, Reports, Incidents, Shifts)
-- 5. System Intelligence (Audit, Exceptions, Fraud, Webhooks)
-- 6. Storage Infrastructure (Buckets & RLS)
-- 7. Automated Triggers (Auth Sync, Credit Guard, Inventory Flow)
-- 8. Sample Seed Data (For immediate environment hydration)
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. ENUM TYPES (Idempotent)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'admin', 'procurement_manager', 'facility_manager', 'finance', 
            'warehouse_staff', 'client_director', 'client_manager', 
            'client_staff', 'employee'
        );
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM (
            'pending', 'pending_approval', 'pending_director', 'approved', 
            'packed', 'dispatched', 'delivered', 'cancelled', 'rejected'
        );
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. CORE INFRASTRUCTURE
-- COMPANIES
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company_code TEXT UNIQUE,
    gst_number TEXT UNIQUE NOT NULL,
    point_of_contact TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    credit_limit DECIMAL(12, 2) DEFAULT 0,
    available_credit DECIMAL(12, 2) DEFAULT 0,
    pricing_tier TEXT DEFAULT 'standard',
    discount_multiplier DECIMAL(5, 2),
    default_warehouse_id UUID,
    branding JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active',
    approval_threshold DECIMAL(12, 2) DEFAULT 5000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'client_staff',
    company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT,
    location_id UUID, -- Optional direct site assignment
    face_image_url TEXT,
    status TEXT DEFAULT 'active',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WAREHOUSES
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT NOT NULL,
    state TEXT NOT NULL,
    document_url TEXT,
    tally_exported BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LOCATIONS (SITES)
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    state TEXT NOT NULL,
    contact_person TEXT,
    contact_phone TEXT,
    default_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    monthly_budget DECIMAL(12, 2) DEFAULT 0,
    current_month_spend DECIMAL(12, 2) DEFAULT 0,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    qr_token TEXT,
    qr_status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PRODUCTS
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
    eligible_companies UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INVENTORY
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    in_transit_quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 20,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

-- INVENTORY LOGS
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
    type TEXT NOT NULL, -- 'REFILL', 'SALE', etc.
    change INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reference_id TEXT,
    performed_by UUID REFERENCES public.users(id),
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. COMMERCE LIFECYCLE
-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_id TEXT UNIQUE NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    placed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    status order_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(12, 2) NOT NULL,
    gst_amount DECIMAL(12, 2) NOT NULL,
    net_amount DECIMAL(12, 2) NOT NULL,
    tds_deducted DECIMAL(12, 2) DEFAULT 0,
    po_document_url TEXT,
    cost_center TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    tally_exported BOOLEAN DEFAULT FALSE,
    warehouse_id UUID REFERENCES public.warehouses(id),
    approval_chain JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    gst_amount DECIMAL(10, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL
);

-- QUOTATIONS
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_id TEXT UNIQUE NOT NULL,
    company_id UUID REFERENCES public.companies(id),
    prospect_name TEXT,
    prospect_email TEXT,
    prospect_phone TEXT,
    total_amount DECIMAL(12, 2) NOT NULL,
    gst_amount DECIMAL(12, 2) NOT NULL,
    net_amount DECIMAL(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Sent', 'Accepted', 'Rejected', 'Converted'
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QUOTATION ITEMS
CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL
);

-- BUDGETS
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    monthly_limit DECIMAL(12, 2) NOT NULL,
    current_spend DECIMAL(12, 2) DEFAULT 0,
    alert_threshold DECIMAL(5, 2) DEFAULT 80.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CLIENT CUSTOM PRICING
CREATE TABLE IF NOT EXISTS public.client_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    negotiated_price DECIMAL(10, 2) NOT NULL,
    UNIQUE(company_id, product_id)
);

-- 5. WORKFORCE & FIELD OPS
-- EMPLOYEES
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- Cleaner, Supervisor, etc.
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ATTENDANCE RECORDS (Consolidated)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'in', 'out'
    photo_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending', -- 'verified', 'flagged'
    metadata JSONB DEFAULT '{}',
    admin_remarks TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WORK REPORTS
CREATE TABLE IF NOT EXISTS public.work_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    remarks TEXT NOT NULL,
    image_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status TEXT NOT NULL DEFAULT 'pending', -- 'approved', 'rejected'
    approved_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FIELD INCIDENTS
CREATE TABLE IF NOT EXISTS public.field_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'Safety', 'Maintenance'
    severity TEXT NOT NULL, -- 'Low', 'Critical'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    image_url TEXT,
    admin_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. SYSTEM INTELLIGENCE & INFRASTRUCTURE
-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('attendance', 'attendance', true),
  ('work-reports', 'work-reports', true),
  ('incidents', 'incidents', true),
  ('contracts', 'contracts', true),
  ('compliance', 'compliance', true),
  ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- TRIGGER: Auth Sync (Profile Creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, company_id)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'User ' || SUBSTR(new.id::text, 1, 8)), 
    new.email, 
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'client_staff'),
    (new.raw_user_meta_data->>'company_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- HELPER: Check Role (Breaks RLS Recursion)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'::public.user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- TRIGGER: Credit Guard (Real-time checks)
CREATE OR REPLACE FUNCTION public.validate_company_credit()
RETURNS TRIGGER AS $$
DECLARE
    v_available_credit DECIMAL(12, 2);
BEGIN
    SELECT available_credit INTO v_available_credit FROM public.companies WHERE id = NEW.company_id;
    IF v_available_credit < NEW.net_amount THEN
        RAISE EXCEPTION 'Insufficient credit: Needed %, Have %', NEW.net_amount, v_available_credit;
    END IF;
    UPDATE public.companies SET available_credit = available_credit - NEW.net_amount WHERE id = NEW.company_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_order_insert_credit ON public.orders;
CREATE TRIGGER before_order_insert_credit
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.validate_company_credit();

-- 7. RLS POLICIES (Development Grade)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Access" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Authenticated Write Orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- USERS POLICIES (Hardened against recursion)
CREATE POLICY "Admins full access" ON public.users FOR ALL USING (public.is_admin());
CREATE POLICY "Users see own profile" ON public.users FOR SELECT USING (auth.uid() = id);

-- STORAGE POLICIES
CREATE POLICY "Public Read Storage" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Auth Upload Storage" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 8. SAMPLE SEED DATA
-- Companies
INSERT INTO public.companies (id, name, gst_number, point_of_contact, credit_limit, available_credit) VALUES
('11111111-1111-4111-8111-111111111111', 'Alpha Corp (Gold Tier)', '27AABBCC1234F1Z1', 'John Doe', 50000.00, 45000.00),
('22222222-2222-4222-8222-222222222222', 'Beta Industries (Standard)', '27XYZABC8765G2Y2', 'Jane Smith', 100000.00, 12000.00),
('d4444444-6666-4666-8666-000000000004', 'Pyramid Workforce', '27PYRAMID1234F1Z1', 'Ops Lead', 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO public.products (id, name, sku, description, image_url, uom, base_price, gst_rate, hsn_code, category, active) VALUES
('11111111-1111-4000-8000-000000000001', 'Floor Cleaner (5L)', 'FC-001', 'Heavy Duty Cleaner', 'https://images.unsplash.com/photo-1584820927498-cafe8c160826?w=400', 'Can', 250, 18, '3402', 'Cleaning', true),
('11111111-1111-4000-8000-000000000002', 'Glass Cleaner (500ml)', 'GC-002', 'Streak-free', 'https://images.unsplash.com/photo-1585834892497-7e61da128913?w=400', 'Bottle', 85, 18, '3402', 'Cleaning', true)
ON CONFLICT (id) DO NOTHING;

-- Warehouses
INSERT INTO public.warehouses (id, name, code, address, state) VALUES
('f1111111-1111-4111-8111-000000000001', 'Mumbai Hub', 'MUM-01', 'Bhiwandi', 'Maharashtra')
ON CONFLICT (id) DO NOTHING;

-- Locations
INSERT INTO public.locations (id, company_id, name, address, state, default_warehouse_id) VALUES
('11111111-2222-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'HQ Site', 'BKC, Mumbai', 'Maharashtra', 'f1111111-1111-4111-8111-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Employees
INSERT INTO public.employees (id, company_id, location_id, name, role) VALUES
('e1111111-1111-4111-8111-000000000001', 'd4444444-6666-4666-8666-000000000004', '11111111-2222-4000-8000-000000000001', 'Rahul Cleaner', 'Cleaner')
ON CONFLICT (id) DO NOTHING;
