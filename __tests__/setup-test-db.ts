import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Setup test database for integration tests
 *
 * This script:
 * 1. Creates a test database if it doesn't exist
 * 2. Runs Prisma migrations
 * 3. Seeds test data if needed
 */
async function setupTestDatabase() {
  console.log('🔧 Setting up test database...');

  try {
    // Run Prisma migrations
    console.log('📝 Running database migrations...');
    await execAsync('npx prisma migrate dev --name test_setup');
    console.log('✅ Migrations complete');

    // Generate Prisma Client
    console.log('🔨 Generating Prisma Client...');
    await execAsync('npx prisma generate');
    console.log('✅ Prisma Client generated');

    console.log('🎉 Test database setup complete!');
  } catch (error) {
    console.error('❌ Error setting up test database:', error);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupTestDatabase();
}

export { setupTestDatabase };
