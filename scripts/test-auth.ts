import 'dotenv/config';
import { getUserByEmail, verifyPassword } from '@/lib/db-helpers';

async function testAuth() {
  try {
    console.log('Testing authentication with username: admin, password: admin');

    // Test getting user by email (username)
    const user = await getUserByEmail('admin');

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
    });

    // Test password verification
    const isValid = await verifyPassword('admin', user.password);

    if (isValid) {
      console.log('✅ Password verification successful!');
      console.log('\nAuthentication flow is working correctly.');
    } else {
      console.log('❌ Password verification failed');
    }
  } catch (error) {
    console.error('Error testing auth:', error);
    process.exit(1);
  }
}

testAuth();
