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

-- Fix the Role Enum for legacy databases
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'employee';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client_director';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client_staff';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'procurement_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'facility_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'warehouse_staff';


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

-- REPAIR: Ensure all USERS columns exist for legacy compatibility
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS face_image_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location_id UUID;


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

-- REPAIR: Ensure all LOCATIONS columns exist (QR Management)
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS qr_token TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS qr_status TEXT DEFAULT 'active';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS monthly_budget DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS current_month_spend DECIMAL(12, 2) DEFAULT 0;


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

-- DAILY CHECKLISTS
CREATE TABLE IF NOT EXISTS public.daily_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    completed_tasks TEXT[] DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TIME OFF REQUESTS (Leave & Absence)
CREATE TABLE IF NOT EXISTS public.time_off_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'Sick', 'Vacation', 'Unpaid'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'approved', 'rejected'
    admin_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CUSTOM ROLES
CREATE TABLE IF NOT EXISTS public.custom_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WORK ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.work_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_role TEXT,
    assigned_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    recurrence TEXT NOT NULL, -- 'daily', 'weekly', 'one-off'
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SITE PROTOCOLS
CREATE TABLE IF NOT EXISTS public.site_protocols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EMPLOYEE SHIFTS
CREATE TABLE IF NOT EXISTS public.employee_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    role TEXT,
    status TEXT DEFAULT 'Scheduled', -- 'In Progress', 'Completed', 'Cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    type TEXT DEFAULT 'standard',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EXCEPTIONS
CREATE TABLE IF NOT EXISTS public.exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    related_entity_id TEXT,
    status TEXT DEFAULT 'active',
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FRAUD FLAGS
CREATE TABLE IF NOT EXISTS public.fraud_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    risk_level TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COMPLIANCE DOCS
CREATE TABLE IF NOT EXISTS public.compliance_docs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.users(id),
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_id TEXT UNIQUE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    attachments TEXT[] DEFAULT '{}',
    sentiment_score DECIMAL(3, 2),
    assigned_to UUID REFERENCES public.users(id),
    related_order_id UUID,
    related_location_id UUID REFERENCES public.locations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TICKET MESSAGES
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id),
    message TEXT NOT NULL,
    image_url TEXT,
    is_staff BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WEBHOOKS
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret_key TEXT,
    event TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
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

-- TRIGGER: Auth Sync (Atomic Profile & Employee Creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT := COALESCE(new.raw_user_meta_data->>'role', 'client_staff');
  v_company_id UUID := (new.raw_user_meta_data->>'company_id')::UUID;
  v_employee_id UUID := uuid_generate_v4();
BEGIN
  -- 1. Atomic Profile Sync
  INSERT INTO public.users (id, name, email, role, company_id)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'User ' || SUBSTR(new.id::text, 1, 8)), 
    new.email, 
    v_role::user_role,
    v_company_id
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    updated_at = NOW();

  -- 2. Auto-create Employee Record if Role is 'employee'
  IF v_role = 'employee' THEN
    INSERT INTO public.employees (id, user_id, company_id, name, role)
    VALUES (v_employee_id, new.id, v_company_id, COALESCE(new.raw_user_meta_data->>'name', 'Worker'), 'Staff')
    ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_employee_id;
  ELSE
    v_employee_id := NULL;
  END IF;

  -- 3. Injected Metadata Sync (Atomic JWT Claims)
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', v_role,
      'company_id', v_company_id,
      'employee_id', v_employee_id
    )
  WHERE id = new.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- HELPER: Check Role (Breaks RLS Recursion via JWT Metadata)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Check JWT metadata (High performance, No recursion)
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- 2. Fallback to auth schema check (Bypasses public.users RLS)
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data ->> 'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

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

-- =========================================================================
-- 7. PRODUCTION-READY SECURITY FABRIC (HARDENED V4.0)
-- =========================================================================

-- Enable RLS Globals
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public') LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(t) || ' ENABLE ROW LEVEL SECURITY;';
  END LOOP;
END $$;

-- 7.1. HIGH-PERFORMANCE SECURITY HELPERS (JWT First)
CREATE OR REPLACE FUNCTION public.get_role() RETURNS TEXT AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.get_employee_id() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'employee_id')::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.get_my_company() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'company_id')::UUID;
$$ LANGUAGE sql STABLE;


-- 7.2. IDENTITY GUARD (No-Spoof Auto-Mapping)
CREATE OR REPLACE FUNCTION public.auto_link_identity()
RETURNS TRIGGER AS $$
DECLARE
    v_meta_employee_id UUID := public.get_employee_id();
BEGIN
    -- 1. Security Check: Block non-admins from spoofing IDs
    IF NEW.employee_id IS NOT NULL AND NEW.employee_id != v_meta_employee_id AND public.get_role() != 'admin' THEN
        RAISE EXCEPTION 'Security Violation: Cannot submit data for another identity.';
    END IF;

    -- 2. Performance: Use JWT metadata directly if available
    IF NEW.employee_id IS NULL THEN
        IF v_meta_employee_id IS NULL AND public.get_role() != 'admin' THEN
            RAISE EXCEPTION 'Authorization Error: No Employee ID found in secure session.';
        END IF;
        NEW.employee_id := v_meta_employee_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Map Triggers (Clean & Rebuild)
DROP TRIGGER IF EXISTS tr_guard_attendance ON public.attendance_records;
CREATE TRIGGER tr_guard_attendance BEFORE INSERT ON public.attendance_records FOR EACH ROW EXECUTE PROCEDURE public.auto_link_identity();

DROP TRIGGER IF EXISTS tr_guard_reports ON public.work_reports;
CREATE TRIGGER tr_guard_reports BEFORE INSERT ON public.work_reports FOR EACH ROW EXECUTE PROCEDURE public.auto_link_identity();


-- 7.3. HARDENED POLICIES (Consolidated & Minimal)
-- Clean all legacy policies first
DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Companies & Products
CREATE POLICY "Auth View Companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin All Companies" ON public.companies FOR ALL TO authenticated USING (public.get_role() = 'admin');

CREATE POLICY "Auth View Products" ON public.products FOR SELECT TO authenticated 
  USING (eligible_companies = '{}' OR public.get_my_company() = ANY(eligible_companies) OR public.get_role() = 'admin');
CREATE POLICY "Admin All Products" ON public.products FOR ALL TO authenticated USING (public.get_role() = 'admin');

-- Attendance & Work Reports (Identity Scoped)
CREATE POLICY "Employee Own Attendance" ON public.attendance_records FOR ALL TO authenticated 
  USING (employee_id = public.get_employee_id() OR public.get_role() = 'admin')
  WITH CHECK (employee_id = public.get_employee_id() OR public.get_role() = 'admin');

CREATE POLICY "Employee Own Reports" ON public.work_reports FOR ALL TO authenticated 
  USING (employee_id = public.get_employee_id() OR public.get_role() = 'admin')
  WITH CHECK (employee_id = public.get_employee_id() OR public.get_role() = 'admin');

-- Field Operations (Incidents & Shifts)
CREATE POLICY "Incident Control" ON public.field_incidents FOR ALL TO authenticated 
  USING (user_id = auth.uid() OR public.get_role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR public.get_role() = 'admin');

-- Commerce & Logistics (Company Scoped)
CREATE POLICY "Company Sites" ON public.locations FOR ALL TO authenticated 
  USING (company_id = public.get_my_company() OR public.get_role() = 'admin');

CREATE POLICY "Company Orders" ON public.orders FOR ALL TO authenticated 
  USING (company_id = public.get_my_company() OR public.get_role() = 'admin');

CREATE POLICY "Order Continuity" ON public.order_items FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.company_id = public.get_my_company() OR public.get_role() = 'admin')));

-- Support Infrastructure
CREATE POLICY "Ticket Access" ON public.tickets FOR ALL TO authenticated 
  USING (company_id = public.get_my_company() OR user_id = auth.uid() OR public.get_role() = 'admin');

CREATE POLICY "Message Stream" ON public.ticket_messages FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND (t.company_id = public.get_my_company() OR t.user_id = auth.uid() OR public.get_role() = 'admin')));

-- System Intel (Admin strictly restricted)
CREATE POLICY "Admin Audit" ON public.audit_logs FOR ALL TO authenticated USING (public.get_role() = 'admin');
CREATE POLICY "Admin Fraud" ON public.fraud_flags FOR ALL TO authenticated USING (public.get_role() = 'admin');

-- 8. SAMPLE SEED DATA
-- Companies
INSERT INTO public.companies (id, name, company_code, gst_number, point_of_contact, credit_limit, available_credit) VALUES
('11111111-1111-4111-8111-111111111111', 'Alpha Corp (Gold Tier)', 'ALPHA', '27AABBCC1234F1Z1', 'John Doe', 50000, 45000),
('22222222-2222-4222-8222-222222222222', 'Beta Industries (Standard)', 'BETA', '27XYZABC8765G2Y2', 'Jane Smith', 100000, 12000),
('33333333-3333-4333-8333-333333333333', 'Gamma Enterprises (Platinum)', 'GAMMA', '29ASDFGH9876Q3W3', 'Robert Chen', 250000, 250000),
('d4444444-6666-4666-8666-000000000004', 'Pyramid Workforce', 'PYRAMID', '27PYRAMID1234F1Z1', 'Operations Manager', 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO public.products (id, name, sku, description, image_url, uom, base_price, gst_rate, hsn_code, category, active) VALUES
('11111111-1111-4000-8000-000000000001', 'Floor Cleaner (5L)', 'FC-001', 'Heavy Duty Cleaner', 'https://images.unsplash.com/photo-1584820927498-cafe8c160826?w=400', 'Can', 250, 18, '3402', 'Cleaning', true),
('11111111-1111-4000-8000-000000000002', 'Glass Cleaner (500ml)', 'GC-002', 'Streak-free', 'https://images.unsplash.com/photo-1585834892497-7e61da128913?w=400', 'Bottle', 85, 18, '3402', 'Cleaning', true),
('11111111-1111-4000-8000-000000000003', 'Microfiber Cloth', 'MC-003', 'Premium Pack', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400', 'Pack', 120, 12, '6307', 'Accessories', true),
('11111111-1111-4000-8000-000000000004', 'Nitrile Gloves (Box)', 'GL-004', 'Powder-free', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400', 'Box', 450, 5, '4015', 'Safety', true),
('11111111-1111-4000-8000-000000000005', 'Hand Sanitizer (1L)', 'HS-005', 'Alcohol based', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400', 'Bottle', 180, 18, '3808', 'Hygiene', true)
ON CONFLICT (id) DO NOTHING;

-- Warehouses
INSERT INTO public.warehouses (id, name, code, address, state) VALUES
('f1111111-1111-4111-8111-000000000001', 'Mumbai Hub', 'MUM-01', 'Bhiwandi', 'Maharashtra')
ON CONFLICT (id) DO NOTHING;

-- Locations
INSERT INTO public.locations (id, company_id, name, address, state, default_warehouse_id) VALUES
('11111111-2222-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'HQ Site', 'BKC, Mumbai', 'Maharashtra', 'f1111111-1111-4111-8111-000000000001'),
('11111111-2222-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Alpha Branch', 'Cyber City, Gurugram', 'Haryana', 'f1111111-1111-4111-8111-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Employees
INSERT INTO public.employees (id, user_id, company_id, location_id, name, role) VALUES
('e1111111-1111-4111-8111-000000000001', 'd2222222-4444-4444-8444-000000000002', 'd4444444-6666-4666-8666-000000000004', '11111111-2222-4000-8000-000000000001', 'Sameer Kumar', 'Cleaner'),
('e2222222-2222-4222-8222-000000000002', 'd3333333-5555-4555-8555-000000000003', 'd4444444-6666-4666-8666-000000000004', '11111111-2222-4000-8000-000000000001', 'Vikram Singh', 'Supervisor')
ON CONFLICT (id) DO NOTHING;

-- USERS
INSERT INTO public.users (id, name, email, role, phone, status, company_id) VALUES
('d1111111-3333-4333-8333-000000000001', 'Pyramid FMS Master', 'master@pyramidfms.com', 'admin', '9999988888', 'active', NULL),
('11111111-0000-4000-8000-000000000001', 'Admin Sameer', 'admin@pyramidfm.com', 'admin', '9876543210', 'active', NULL),
('11111111-0000-4000-8000-000000000002', 'John Doe', 'john@alphacorp.com', 'client_manager', '9123456780', 'active', '11111111-1111-4111-8111-111111111111'),
('d2222222-4444-4444-8444-000000000002', 'Sameer Employee', 'sameer@pyramidfm.com', 'employee', '9876543211', 'active', 'd4444444-6666-4666-8666-000000000004'),
('d3333333-5555-4555-8555-000000000003', 'Vikram Supervisor', 'vikram@pyramidfm.com', 'employee', '9876543212', 'active', 'd4444444-6666-4666-8666-000000000004')
ON CONFLICT (id) DO NOTHING;

-- Inventory
INSERT INTO public.inventory (id, product_id, warehouse_id, quantity, available_quantity) VALUES
(uuid_generate_v4(), '11111111-1111-4000-8000-000000000001', 'f1111111-1111-4111-8111-000000000001', 150, 150),
(uuid_generate_v4(), '11111111-1111-4000-8000-000000000002', 'f1111111-1111-4111-8111-000000000001', 200, 200)
ON CONFLICT (id) DO NOTHING;
