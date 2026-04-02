import mongoose from 'mongoose';
import { User } from '../src/models/Schemas';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

async function createAdmin() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env.local');
    return;
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);

  const adminEmail = 'master@pyramidfms.com';
  const plainPassword = 'master2026';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const adminData = {
    name: 'Admin Master',
    email: adminEmail,
    password: hashedPassword,
    role: 'admin',
    status: 'active',
  };

  try {
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      console.log(`User ${adminEmail} already exists. Updating password...`);
      await User.updateOne({ email: adminEmail }, { password: hashedPassword });
    } else {
      console.log(`Creating new admin user: ${adminEmail}...`);
      await User.create(adminData);
    }
    console.log('✅ Admin user provisioned successfully.');
    console.log('---');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${plainPassword}`);
    console.log('---');
  } catch (error: any) {
    console.error('❌ Error provisioning admin:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin().catch(console.error);
