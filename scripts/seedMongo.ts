import mongoose from 'mongoose';
import * as Models from '../src/models/Schemas';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://user:pass@cluster0.mongodb.net/pyramid_fm';

const MOCK_DATA = {
  products: [
    { name: 'Surface Cleaner - 5L', sku: 'SC-001', category: 'Cleaning Chemicals', uom: 'Can', basePrice: 450, gstRate: 18, hsnCode: '3402' },
    { name: 'Microfiber Mop Head', sku: 'MH-042', category: 'Cleaning Tools', uom: 'Pcs', basePrice: 120, gstRate: 12, hsnCode: '9603' },
  ],
  users: [
    { name: 'Admin User', email: 'admin@pyramid.com', password: 'password123', role: 'admin', status: 'active' },
    { name: 'Site Manager', email: 'manager@client.com', password: 'password123', role: 'client_manager', companyId: 'comp-nexus', status: 'active' },
  ],
  // Add more as needed...
};

async function seed() {
  console.log('Seeding MongoDB with initial data...');
  await mongoose.connect(MONGODB_URI);
  
  await Models.Product.deleteMany({});
  await Models.Product.insertMany(MOCK_DATA.products);

  await Models.User.deleteMany({});
  await Models.User.insertMany(MOCK_DATA.users);

  console.log('Seeding complete.');
  await mongoose.disconnect();
}

seed().catch(console.error);
