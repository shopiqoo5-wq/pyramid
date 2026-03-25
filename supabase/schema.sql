-- =========================================================================
-- PYRAMID FM CORPORATE ORDERING PORTAL
-- CORE SUPABASE POSTGRESQL SCHEMA v1.0
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. BASE TABLES
-- =========================================================================

-- COMPANIES
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    gst_number TEXT UNIQUE NOT NULL,
    point_of_contact TEXT,
    credit_limit DECIMAL(12, 2) DEFAULT 0,
    available_credit DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ROLES ENUM
CREATE TYPE user_role AS ENUM ('admin', 'client_manager', 'client_staff', 'procurement');

-- USERS (Extends Supabase Auth Auth.Users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'client_staff',
    company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LOCATIONS (Client Delivery Points)
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    state TEXT NOT NULL,
    default_warehouse_id UUID, -- Foreign Key added later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WAREHOUSES (Pyramid FM Fulfilment Centers)
CREATE TABLE public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT NOT NULL,
    state TEXT NOT NULL
);

-- ADD LOCATION FK CONSTRAINT
ALTER TABLE public.locations
  ADD CONSTRAINT fk_default_warehouse
  FOREIGN KEY (default_warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;

-- =========================================================================
-- 2. PRODUCT & INVENTORY TABLES
-- =========================================================================

-- PRODUCTS
CREATE TABLE public.products (
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

-- CLIENT CUSTOM PRICING
CREATE TABLE public.client_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    negotiated_price DECIMAL(10, 2) NOT NULL,
    UNIQUE(company_id, product_id)
);

-- INVENTORY
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 20,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

-- FAVORITE PRODUCTS
CREATE TABLE public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    UNIQUE(user_id, product_id)
);

-- PRODUCT BUNDLES
CREATE TABLE public.product_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    active BOOLEAN DEFAULT TRUE
);

-- BUNDLE ITEMS
CREATE TABLE public.bundle_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_id UUID NOT NULL REFERENCES public.product_bundles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    UNIQUE(bundle_id, product_id)
);

-- =========================================================================
-- 3. COMMERCE & WORKFLOW TABLES
-- =========================================================================

-- ORDER STATUS ENUM
CREATE TYPE order_status AS ENUM ('pending', 'approved', 'packed', 'dispatched', 'delivered', 'cancelled');

-- BUDGETS
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
    monthly_limit DECIMAL(12, 2) NOT NULL,
    current_spend DECIMAL(12, 2) DEFAULT 0,
    alert_threshold DECIMAL(5, 2) DEFAULT 80, -- percentage
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ORDERS
CREATE TABLE public.orders (
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ORDER ITEMS
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL, -- Captured at time of order
    gst_amount DECIMAL(10, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL
);

-- RECURRING ORDERS (Subscriptions)
CREATE TABLE public.recurring_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    placed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    frequency_days INTEGER NOT NULL,
    next_delivery_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- active, paused, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RECURRING ORDER ITEMS
CREATE TABLE public.recurring_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recurring_order_id UUID NOT NULL REFERENCES public.recurring_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL
);

-- INVOICES
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
    invoice_number TEXT UNIQUE NOT NULL,
    pdf_url TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =========================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on core tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- ADMIN BYPASS
-- Assuming your users table has the 'role' column reliably mirroring auth.jwt()
-- In a real setup, often standard auth.uid() joins to users to get role.

-- 1. COMPANIES RLS
-- Admins can do everything. Users can only read their own company.
CREATE POLICY "Admins full access companies" ON public.companies 
  FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Users view own company" ON public.companies 
  FOR SELECT USING ( id = (SELECT company_id FROM public.users WHERE id = auth.uid()) );

-- 2. ORDERS RLS
-- Users view orders belonging to their company. Manager/Admin can create/update.
CREATE POLICY "Admins full access orders" ON public.orders 
  FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Users view own company orders" ON public.orders 
  FOR SELECT USING ( company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) );

CREATE POLICY "Managers can update company orders" ON public.orders 
  FOR UPDATE USING ( 
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'client_manager'
  );

-- 3. PRODUCTS RLS
-- Everyone can read products, except restricted ones
CREATE POLICY "Public read products" ON public.products 
  FOR SELECT USING ( 
    eligible_companies IS NULL OR 
    (SELECT company_id FROM public.users WHERE id = auth.uid()) = ANY(eligible_companies) OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Admin edits products
CREATE POLICY "Admin write products" ON public.products
  FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

-- =========================================================================
-- 5. TRIGGERS & FUNCTIONS
-- =========================================================================

-- Automatically update `updated_at` timestamps
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

-- =========================================================================
-- 6. AUTOMATION FUNCTIONS & CRON JOBS
-- =========================================================================

-- Function to process due recurring orders
CREATE OR REPLACE FUNCTION public.process_recurring_orders()
RETURNS void AS $$
DECLARE
    r_order public.recurring_orders%ROWTYPE;
    new_order_id UUID;
    v_total DECIMAL(12,2) := 0;
    v_gst DECIMAL(12,2) := 0;
    v_net DECIMAL(12,2) := 0;
BEGIN
    FOR r_order IN 
        SELECT * FROM public.recurring_orders 
        WHERE status = 'active' AND next_delivery_date <= CURRENT_DATE
    LOOP
        -- 1. Create the new Order record
        INSERT INTO public.orders (
            custom_id, company_id, location_id, placed_by, status, 
            total_amount, gst_amount, net_amount
        ) VALUES (
            'REC-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 4),
            r_order.company_id, r_order.location_id, r_order.placed_by, 'pending',
            0, 0, 0 -- Will update after items are inserted
        ) RETURNING id INTO new_order_id;
        
        -- Reset totals
        v_total := 0; v_gst := 0; v_net := 0;

        -- 2. Insert items and calculate totals
        INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, gst_amount, total)
        SELECT 
            new_order_id,
            roi.product_id,
            roi.quantity,
            p.base_price,
            (p.base_price * roi.quantity * (p.gst_rate / 100)),
            (p.base_price * roi.quantity) + (p.base_price * roi.quantity * (p.gst_rate / 100))
        FROM public.recurring_order_items roi
        JOIN public.products p ON p.id = roi.product_id
        WHERE roi.recurring_order_id = r_order.id
        RETURNING (unit_price * quantity), gst_amount, total INTO v_total, v_gst, v_net;

        -- 3. Update Order with final calculated totals
        UPDATE public.orders 
        SET total_amount = v_total, gst_amount = v_gst, net_amount = v_net
        WHERE id = new_order_id;

        -- 4. Advance the next_delivery_date
        UPDATE public.recurring_orders
        SET next_delivery_date = next_delivery_date + (frequency_days || ' days')::interval
        WHERE id = r_order.id;

    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enable pg_cron (requires Supabase Dashboard enabling first in extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run every day at midnight
SELECT cron.schedule(
  'process-recurring-orders-daily',
  '0 0 * * *',
  $$ SELECT public.process_recurring_orders(); $$
);

-- =========================================================================
-- 7. EXTERNAL INTEGRATIONS (WEBHOOKS)
-- =========================================================================

-- WEBHOOK ENDPOINTS
CREATE TABLE public.webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret_key TEXT,
    event TEXT NOT NULL DEFAULT 'order.created', -- order.created, order.delivered
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable pg_net for HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to fire Webhook on Order Creation
CREATE OR REPLACE FUNCTION public.fire_webhook_on_order()
RETURNS TRIGGER AS $$
DECLARE
    wh public.webhooks%ROWTYPE;
    payload JSONB;
BEGIN
    -- Build JSON payload
    payload := jsonb_build_object(
        'event', 'order.created',
        'timestamp', NOW(),
        'data', row_to_json(NEW)
    );

    FOR wh IN SELECT * FROM public.webhooks WHERE event = 'order.created' AND active = TRUE
    LOOP
        -- Execute Async HTTP Post Request using pg_net
        PERFORM net.http_post(
            url := wh.url,
            body := payload,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || COALESCE(wh.secret_key, '')
            )
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Webhook
CREATE TRIGGER on_order_created_webhook
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE PROCEDURE public.fire_webhook_on_order();

-- =========================================================================
-- 9. MISSION-CRITICAL AUTOMATION (TRIGGERS)
-- =========================================================================

-- A. AUTH SYNC: Create public.users profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'New User'), 
    new.email, 
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'client_staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- B. INVENTORY DEDUCTION: Update stock on order pack/dispatch
CREATE OR REPLACE FUNCTION public.process_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changes to 'packed' or 'dispatched', deduct inventory
  IF (NEW.status IN ('packed', 'dispatched') AND OLD.status = 'approved') THEN
    UPDATE public.inventory i
    SET quantity = i.quantity - oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id 
    AND i.product_id = oi.product_id;
    
    -- Log Activity
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (auth.uid(), 'inventory_deduction', jsonb_build_object('order_id', NEW.id, 'status', NEW.status));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_status_inventory
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.process_inventory_on_order();

-- C. CREDIT VALIDATION: Check available credit before order creation
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

CREATE TRIGGER before_order_insert_credit
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.validate_company_credit();

-- =========================================================================
-- 10. EXPANDED RLS POLICIES
-- =========================================================================

-- LOCATIONS: Users see locations for their company
CREATE POLICY "Users view own locations" ON public.locations
  FOR SELECT USING ( company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) );

-- INVENTORY: Admins full access, others read-only for eligible products
CREATE POLICY "Admins full access inventory" ON public.inventory
  FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Users read relevant inventory" ON public.inventory
  FOR SELECT USING ( product_id IN (SELECT id FROM public.products) );

-- INVOICES: Users view own company invoices
CREATE POLICY "Users view own company invoices" ON public.invoices
  FOR SELECT USING ( order_id IN (SELECT id FROM public.orders) );

-- WEBHOOKS: Admin only
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins only webhooks" ON public.webhooks
  FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

-- =========================================================================
-- 11. RPC FUNCTIONS
-- =========================================================================

-- Atomic Inventory Increment/Decrement
CREATE OR REPLACE FUNCTION public.increment_inventory(p_id UUID, w_id UUID, delta INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO public.inventory (product_id, warehouse_id, quantity)
  VALUES (p_id, w_id, delta)
  ON CONFLICT (product_id, warehouse_id)
  DO UPDATE SET quantity = public.inventory.quantity + delta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 12. ENTERPRISE MODULES (CONTRACTS, SUPPORT, WORKFORCE)
-- =========================================================================

-- CONTRACTS
CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL,
    value DECIMAL(12, 2),
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SUPPORT TICKETS
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_id TEXT UNIQUE NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    assigned_to UUID REFERENCES public.users(id),
    sentiment_score DECIMAL(3, 2),
    related_order_id UUID REFERENCES public.orders(id),
    related_location_id UUID REFERENCES public.locations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TICKET MESSAGES
CREATE TABLE public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id),
    message TEXT NOT NULL,
    is_staff BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WORKFORCE: ATTENDANCE
CREATE TABLE public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL, -- Logical ID (or linked to users)
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

-- APP EXCEPTIONS & FRAUD
CREATE TABLE public.app_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    related_entity_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.fraud_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    company_id UUID REFERENCES public.companies(id),
    reason TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for all new tables
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Admins only for most, users read their own)
CREATE POLICY "Admins full access contracts" ON public.contracts FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );
CREATE POLICY "Users view company contracts" ON public.contracts FOR SELECT USING ( company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) );

CREATE POLICY "Users manage own tickets" ON public.support_tickets FOR ALL USING ( user_id = auth.uid() );
CREATE POLICY "Admins full access tickets" ON public.support_tickets FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Admins only exceptions" ON public.app_exceptions FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Admins full access attendance" ON public.attendance_records FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );
CREATE POLICY "Users view own company attendance" ON public.attendance_records FOR SELECT USING ( location_id IN (SELECT id FROM public.locations) );

CREATE POLICY "Admins full access fraud" ON public.fraud_flags FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Users view own ticket messages" ON public.ticket_messages FOR ALL USING ( ticket_id IN (SELECT id FROM public.support_tickets) );
CREATE POLICY "Admins full access ticket messages" ON public.ticket_messages FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

-- COMPLIANCE DOCUMENTS
CREATE TABLE public.compliance_docs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    document_url TEXT NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.compliance_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access compliance" ON public.compliance_docs FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );
CREATE POLICY "Users view own compliance" ON public.compliance_docs FOR SELECT USING ( company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) );

-- RETURN REQUESTS
CREATE TABLE public.return_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own returns" ON public.return_requests FOR ALL USING ( company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) );
CREATE POLICY "Admins full access returns" ON public.return_requests FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

-- QR LOGINS (Dynamic tokens)
CREATE TABLE public.qr_logins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.qr_logins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active qr tokens" ON public.qr_logins FOR SELECT USING ( active = TRUE );
CREATE POLICY "Admins manage qr tokens" ON public.qr_logins FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

-- GLOBAL SETTINGS
CREATE TABLE public.global_settings (
    id TEXT PRIMARY KEY,
    settings JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view settings" ON public.global_settings FOR SELECT USING ( TRUE );
CREATE POLICY "Admins edit settings" ON public.global_settings FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

-- BATCHES
CREATE TABLE public.batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    order_ids UUID[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage batches" ON public.batches FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

-- FIELD INCIDENTS
CREATE TABLE public.field_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    location_id UUID REFERENCES public.locations(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.field_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users report incidents" ON public.field_incidents FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY "Users view own incidents" ON public.field_incidents FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY "Admins manage incidents" ON public.field_incidents FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

-- WORK REPORTS (Operational Evidence)
CREATE TABLE public.work_reports (
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

ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users report work" ON public.work_reports FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY "Users view own work reports" ON public.work_reports FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY "Admins manage work reports" ON public.work_reports FOR ALL USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );
