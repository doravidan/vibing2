import 'dotenv/config';
import { init as initAdmin, id, tx } from '@instantdb/admin';
import bcrypt from 'bcryptjs';

// Initialize without schema to allow auto-creation of attributes
const db = initAdmin({
  appId: process.env.NEXT_PUBLIC_INSTANTDB_APP_ID!,
  adminToken: process.env.INSTANTDB_ADMIN_TOKEN!,
});

async function seedAdmin() {
  try {
    console.log('Creating admin user...');

    const userId = id();
    const hashedPassword = await bcrypt.hash('admin', 10);

    // Create admin user directly with transaction
    await db.transact([
      tx.users[userId].update({
        email: 'admin',
        password: hashedPassword,
        name: 'Admin',
        plan: 'PREMIUM',
        tokenBalance: 1000000,
        contextUsed: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    ]);

    console.log('Admin user created successfully!');
    console.log('Email: admin');
    console.log('Password: admin');
    console.log('User ID:', userId);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

seedAdmin();
