import 'dotenv/config';
import { init as initAdmin } from '@instantdb/admin';

const db = initAdmin({
  appId: process.env.NEXT_PUBLIC_INSTANTDB_APP_ID!,
  adminToken: process.env.INSTANTDB_ADMIN_TOKEN!,
});

async function checkAdmin() {
  try {
    console.log('Checking for admin user...');

    const result = await db.query({
      users: {
        $: {
          where: { email: 'admin' }
        }
      }
    });

    console.log('Query result:', JSON.stringify(result, null, 2));

    if (result?.data?.users && result.data.users.length > 0) {
      console.log('✅ Admin user exists!');
      console.log('User details:', result.data.users[0]);
    } else {
      console.log('❌ Admin user not found');
    }
  } catch (error) {
    console.error('Error checking admin user:', error);
    process.exit(1);
  }
}

checkAdmin();
