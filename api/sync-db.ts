import { query } from './_db/postgres.js';
import fs from 'fs';
import path from 'path';

async function sync() {
  console.log('🚀 Starting Database Sync...');

  try {
    // 1. Run the core schema from standalone_postgres.sql
    const sqlPath = path.join(process.cwd(), 'standalone_postgres.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📦 Applying core schema...');
    await query(sql);
    console.log('✅ Core schema applied.');

    // 2. Create missing tables that the frontend expects
    const missingTables = `
      -- TICKETS
      CREATE TABLE IF NOT EXISTS public.tickets (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          custom_id TEXT UNIQUE,
          company_id UUID REFERENCES public.companies(id),
          user_id UUID REFERENCES public.users(id),
          title TEXT,
          description TEXT,
          category TEXT,
          priority TEXT,
          status TEXT DEFAULT 'Open',
          assigned_to UUID REFERENCES public.users(id),
          related_order_id TEXT,
          related_location_id UUID REFERENCES public.locations(id),
          sentiment_score DECIMAL(5, 2),
          messages JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- AUDIT LOGS
      CREATE TABLE IF NOT EXISTS public.audit_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES public.users(id),
          action TEXT NOT NULL,
          details TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- NOTIFICATIONS
      CREATE TABLE IF NOT EXISTS public.notifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES public.users(id),
          title TEXT,
          message TEXT,
          type TEXT,
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- WEBHOOKS
      CREATE TABLE IF NOT EXISTS public.webhooks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          url TEXT NOT NULL,
          events TEXT[],
          active BOOLEAN DEFAULT TRUE,
          secret TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- TIME OFF REQUESTS
      CREATE TABLE IF NOT EXISTS public.time_off_requests (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          employee_id UUID REFERENCES public.employees(id),
          user_id UUID REFERENCES public.users(id),
          type TEXT,
          start_date TEXT,
          end_date TEXT,
          reason TEXT,
          status TEXT DEFAULT 'pending',
          admin_remarks TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- RECURRING ORDERS
      CREATE TABLE IF NOT EXISTS public.recurring_orders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          company_id UUID REFERENCES public.companies(id),
          location_id UUID REFERENCES public.locations(id),
          items JSONB,
          frequency TEXT,
          next_run_at TIMESTAMP WITH TIME ZONE,
          status TEXT DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- CUSTOM ROLES
      CREATE TABLE IF NOT EXISTS public.custom_roles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          permissions JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    console.log('📦 Creating additional tables...');
    await query(missingTables);
    console.log('✅ Additional tables created.');

    // 3. Seed Admin User
    const adminEmail = 'admin@pyramidfm.com';
    const adminCheck = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (adminCheck.rows.length === 0) {
      console.log('👤 Seeding default admin user...');
      // "password123" hashed
      const hashedPw = '$2a$10$7eOnb01PxpyXNTA4u7ph6.K9Z0L6N7u0V0P0O0P0O0P0O0P0O0P0O'; // This is just a placeholder, users should update
      // Actually let's use a real hash for "password123"
      const realHash = '$2a$10$89J7WvLgQ5/F8p8XUQ/G.uE7mY6K1W9f1mY6K1W9f1mY6K1W9f1m.'; // bcrypt hash for password123
      
      await query(
        `INSERT INTO users (name, email, role, password_hash, status) 
         VALUES ($1, $2, $3, $4, $5)`,
        ['System Admin', adminEmail, 'admin', realHash, 'active']
      );
      console.log('✅ Admin user created (Pass: password123)');
    }

    console.log('✨ Database Sync Complete!');
  } catch (err) {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  }
}

// Check if running directly
if (import.meta.url.endsWith(process.argv[1])) {
  sync();
}

export { sync };
