import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
import * as Schemas from '../src/models/Schemas';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const MONGODB_URI = process.env.MONGODB_URI!;

async function migrate() {
  console.log('Starting Migration from Supabase to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  
  const tables = [
    { name: 'companies', model: Schemas.Company },
    { name: 'products', model: Schemas.Product },
    { name: 'locations', model: Schemas.Location },
    { name: 'warehouses', model: Schemas.Warehouse },
    { name: 'users', model: Schemas.User },
    { name: 'employees', model: Schemas.Employee },
    { name: 'attendance_records', model: Schemas.Attendance },
    { name: 'work_reports', model: Schemas.WorkReport },
    { name: 'field_incidents', model: Schemas.Incident },
    { name: 'orders', model: Schemas.Order },
    { name: 'tickets', model: Schemas.Ticket },
  ];

  for (const { name, model } of tables) {
    console.log(`Migrating ${name}...`);
    const { data: supabaseData, error } = await supabase.from(name).select('*');
    if (error) {
       console.error(`Error fetching ${name}:`, error.message);
       continue;
    }

    if (supabaseData && supabaseData.length > 0) {
      // Basic Snake to Camel conversion if needed, but Mongoose will handle schema
      await model.deleteMany({});
      await model.insertMany(supabaseData.map((d: any) => {
         const cleaned = { ...d };
         // Map Supabase 'id' (UUID) to MongoDB 'id' or handle _id
         if (d.id) cleaned._id = d.id; // Preserve UUIDs as strings if possible
         return cleaned;
      }));
      console.log(`Migrated ${supabaseData.length} records for ${name}.`);
    }
  }

  console.log('Migration Complete.');
  await mongoose.disconnect();
}

migrate().catch(console.error);
