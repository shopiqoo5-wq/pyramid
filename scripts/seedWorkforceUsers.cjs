const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

function getMongoUri() {
  const envPath = path.join(process.cwd(), '.env.local');
  const text = fs.readFileSync(envPath, 'utf8');
  const m = text.match(/MONGODB_URI="([^"]+)"/);
  if (!m) throw new Error('MONGODB_URI not found in .env.local');
  return m[1];
}

async function main() {
  const uri = getMongoUri();
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  const users = db.collection('users');
  const employees = db.collection('employees');

  const companyId = 'd4444444-6666-4666-8666-000000000004';
  const locationId = '11111111-2222-4000-8000-000000000001';
  const now = new Date();

  const defs = [
    {
      name: 'Sameer Employee',
      email: 'sameer@pyramidfm.com',
      password: 'emp123',
      role: 'employee',
      phone: '9876543211',
      employeeRole: 'Cleaner',
    },
    {
      name: 'Vikram Supervisor',
      email: 'vikram@pyramidfm.com',
      password: 'sup123',
      role: 'employee',
      phone: '9876543212',
      employeeRole: 'Supervisor',
    },
  ];

  for (const u of defs) {
    const hash = await bcrypt.hash(u.password, 10);
    await users.findOneAndUpdate(
      { email: u.email },
      {
        $set: {
          name: u.name,
          email: u.email,
          password: hash,
          role: u.role,
          phone: u.phone,
          status: 'active',
          companyId,
          locationId,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: 'after' }
    );

    const savedUser = await users.findOne({ email: u.email });
    if (!savedUser || !savedUser._id) {
      throw new Error(`Unable to load seeded user for ${u.email}`);
    }
    const userId = String(savedUser._id);
    await employees.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          name: u.name,
          companyId,
          locationId,
          role: u.employeeRole,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
  }

  console.log('Seeded workforce users successfully.');
  console.log('sameer@pyramidfm.com / emp123');
  console.log('vikram@pyramidfm.com / sup123');
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

