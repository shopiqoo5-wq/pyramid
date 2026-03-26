-- =========================================================================
-- PYRAMID FM - FINAL CONSOLIDATED SETUP SCRIPT (SCHEMA + TRIGGERS + RLS)
-- =========================================================================
-- Copy and paste this script into the Supabase SQL Editor (Dashboard > SQL Editor)
-- to initialize the entire database for both Core and Operational modules.
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'client_manager', 'client_staff', 'procurement');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'approved', 'packed', 'dispatched', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. CORE TABLES
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
    default_warehouse_id UUID, -- References warehouses
    branding JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USERS (Extends Supabase Auth Auth.Users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'client_staff',
    company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT,
    face_image_url TEXT,
    last_login_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WAREHOUSES
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT NOT NULL,
    state TEXT NOT NULL
);

-- LOCATIONS
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
    eligible_companies UUID[] -- Array of company IDs for visibility masking
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

-- 4. COMMERCE TABLES
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

-- RECURRING ORDERS
CREATE TABLE IF NOT EXISTS public.recurring_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    placed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    frequency_days INTEGER NOT NULL DEFAULT 30,
    next_delivery_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RECURRING ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.recurring_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recurring_order_id UUID NOT NULL REFERENCES public.recurring_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL
);

-- FAVORITE PRODUCTS
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    UNIQUE(company_id, product_id)
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

-- PRODUCT BUNDLES
CREATE TABLE IF NOT EXISTS public.product_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    active BOOLEAN DEFAULT TRUE
);

-- BUNDLE ITEMS
CREATE TABLE IF NOT EXISTS public.bundle_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_id UUID NOT NULL REFERENCES public.product_bundles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    UNIQUE(bundle_id, product_id)
);

-- INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
    invoice_number TEXT UNIQUE NOT NULL,
    pdf_url TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RETURN REQUESTS
CREATE TABLE IF NOT EXISTS public.return_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested',
    image_url TEXT,
    requested_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. OPERATIONAL TABLES (Workforce & Field Ops)
-- EMPLOYEES
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    company_id UUID REFERENCES public.companies(id),
    location_id UUID REFERENCES public.locations(id),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'active'
);

-- ATTENDANCE RECORDS
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    location_id UUID REFERENCES public.locations(id),
    type TEXT NOT NULL, -- 'in', 'out'
    photo_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    admin_remarks TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WORK REPORTS
CREATE TABLE IF NOT EXISTS public.work_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    location_id UUID REFERENCES public.locations(id),
    remarks TEXT NOT NULL,
    image_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES public.users(id), -- Supervisor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FIELD INCIDENTS
CREATE TABLE IF NOT EXISTS public.field_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    location_id UUID REFERENCES public.locations(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    image_url TEXT,
    admin_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TIME OFF REQUESTS
CREATE TABLE IF NOT EXISTS public.time_off_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES public.employees(id),
    type TEXT, -- 'Sick', 'Vacation', 'Unpaid'
    start_date DATE,
    end_date DATE,
    reason TEXT,
    status TEXT DEFAULT 'pending',
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
    assigned_employee_id UUID REFERENCES public.employees(id),
    location_id UUID REFERENCES public.locations(id),
    recurrence TEXT DEFAULT 'daily',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SITE PROTOCOLS
CREATE TABLE IF NOT EXISTS public.site_protocols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    steps TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SUBMITTED CHECKLISTS
CREATE TABLE IF NOT EXISTS public.submitted_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_tasks TEXT[] DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, submission_date)
);

-- 6. SYSTEM & LOGGING TABLES
-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    type TEXT DEFAULT 'standard', -- 'security', 'system', 'standard'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- APP EXCEPTIONS
CREATE TABLE IF NOT EXISTS public.app_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    related_entity_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FRAUD FLAGS
CREATE TABLE IF NOT EXISTS public.fraud_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    company_id UUID REFERENCES public.companies(id),
    reason TEXT NOT NULL,
    severity TEXT NOT NULL,
    risk_level TEXT DEFAULT 'safe',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WEBHOOKS
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret_key TEXT,
    event TEXT NOT NULL DEFAULT 'order.created',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CONTRACTS
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL,
    value DECIMAL(12, 2),
    renewal_terms TEXT,
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_id TEXT UNIQUE NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    assigned_to UUID REFERENCES public.users(id),
    sentiment_score DECIMAL(3, 2),
    related_order_id UUID REFERENCES public.orders(id),
    related_location_id UUID REFERENCES public.locations(id),
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TICKET MESSAGES
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id),
    message TEXT NOT NULL,
    is_staff BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COMPLIANCE DOCS
CREATE TABLE IF NOT EXISTS public.compliance_docs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'GST', 'Agreement', etc.
    category TEXT NOT NULL, -- 'Legal', 'Tax', etc.
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.users(id),
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QR LOGINS
CREATE TABLE IF NOT EXISTS public.qr_logins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'active',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GLOBAL SETTINGS
CREATE TABLE IF NOT EXISTS public.global_settings (
    id TEXT PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BATCHES
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    productId UUID NOT NULL REFERENCES public.products(id),
    batch_number TEXT NOT NULL,
    manufacture_date DATE,
    expiry_date DATE,
    quantity INTEGER NOT NULL DEFAULT 0,
    warehouse_id UUID REFERENCES public.warehouses(id),
    status TEXT NOT NULL DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TRIGGERS & FUNCTIONS
-- Update TIMESTAMP
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_company_modtime BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_user_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_order_modtime BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_ticket_modtime BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- AUTH SYNC: Create public.users profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, company_id)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'New User'), 
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

-- CREDIT VALIDATION
CREATE OR REPLACE FUNCTION public.validate_company_credit()
RETURNS TRIGGER AS $$
DECLARE
    v_available_credit DECIMAL(12, 2);
BEGIN
    SELECT available_credit INTO v_available_credit 
    FROM public.companies 
    WHERE id = NEW.company_id;

    IF v_available_credit < NEW.net_amount THEN
        RAISE EXCEPTION 'Insufficient credit for this transaction. Required: %, Available: %', NEW.net_amount, v_available_credit;
    END IF;

    -- Update available credit
    UPDATE public.companies 
    SET available_credit = available_credit - NEW.net_amount 
    WHERE id = NEW.company_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_order_insert_credit ON public.orders;
CREATE TRIGGER before_order_insert_credit
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.validate_company_credit();

-- INVENTORY DEDUCTION
CREATE OR REPLACE FUNCTION public.process_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status IN ('packed', 'dispatched') AND OLD.status = 'approved') THEN
    UPDATE public.inventory i
    SET quantity = i.quantity - oi.quantity,
        available_quantity = available_quantity - oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id 
    AND i.product_id = oi.product_id;
    
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (auth.uid(), 'inventory_deduction', 'Order ' || NEW.custom_id || ' status changed to ' || NEW.status);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_order_status_inventory ON public.orders;
CREATE TRIGGER on_order_status_inventory
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.process_inventory_on_order();

-- ATOMIC INVENTORY RPC
CREATE OR REPLACE FUNCTION public.increment_inventory(p_id UUID, w_id UUID, delta INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO public.inventory (product_id, warehouse_id, quantity, available_quantity)
  VALUES (p_id, w_id, delta, delta)
  ON CONFLICT (product_id, warehouse_id)
  DO UPDATE SET 
    quantity = public.inventory.quantity + delta,
    available_quantity = public.inventory.available_quantity + delta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
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
ALTER TABLE public.field_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_order_items ENABLE ROW LEVEL SECURITY;

-- ADMIN POLICIES (Bypass for admin role)
CREATE POLICY "Admin full access companies" ON public.companies FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );
CREATE POLICY "Admin full access users" ON public.users FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );
CREATE POLICY "Admin full access products" ON public.products FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );
CREATE POLICY "Admin full access orders" ON public.orders FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );
CREATE POLICY "Admin full access inventory" ON public.inventory FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

-- PUBLIC READ (Vibe check/Registration)
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (TRUE);
CREATE POLICY "Public read settings" ON public.global_settings FOR SELECT USING (TRUE);
CREATE POLICY "Public read qr" ON public.qr_logins FOR SELECT USING (active = TRUE);

-- USER SPECIFIC
CREATE POLICY "Users view own profile" ON public.users FOR SELECT USING ( id = auth.uid() );
CREATE POLICY "Users view ELIGIBLE company" ON public.companies FOR SELECT USING ( id = (SELECT company_id FROM public.users WHERE id = auth.uid()) );
CREATE POLICY "Users view company locations" ON public.locations FOR SELECT USING ( company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) );
CREATE POLICY "Users view company orders" ON public.orders FOR SELECT USING ( company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) );
CREATE POLICY "Users manage own tickets" ON public.support_tickets FOR ALL USING ( user_id = auth.uid() );
CREATE POLICY "Users report incidents" ON public.field_incidents FOR INSERT WITH CHECK ( user_id = auth.uid() );
CREATE POLICY "Users view own incidents" ON public.field_incidents FOR SELECT USING ( user_id = auth.uid() );
CREATE POLICY "Users view own audit logs" ON public.audit_logs FOR SELECT USING ( user_id = auth.uid() );
