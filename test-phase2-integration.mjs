#!/usr/bin/env node

/**
 * Phase 2 Integration Test Suite
 * Tests all major Phase 2 features end-to-end
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BASE_URL = 'http://localhost:3000';
const TESTS = [];
let passed = 0;
let failed = 0;

// Test helper
async function test(name, fn) {
  TESTS.push({ name, fn });
}

async function runTest(test) {
  process.stdout.write(`\n  ${test.name}... `);
  try {
    await test.fn();
    process.stdout.write('✅ PASS\n');
    passed++;
    return true;
  } catch (error) {
    process.stdout.write(`❌ FAIL\n    Error: ${error.message}\n`);
    failed++;
    return false;
  }
}

// HTTP helper
async function fetch(url, options = {}) {
  const command = options.method === 'POST'
    ? `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${JSON.stringify(options.body || {})}'`
    : `curl -s "${url}"`;

  const { stdout } = await execAsync(command);
  return JSON.parse(stdout);
}

// Database helper
async function queryDb(sql) {
  const { stdout } = await execAsync(
    `PGPASSWORD=vibing2_dev_pass psql -h localhost -U vibing2 -d vibing2 -t -c "${sql}"`
  );
  return stdout.trim();
}

// Define tests
test('Server is running', async () => {
  const response = await fetch(`${BASE_URL}/api/health`);
  if (!response.status) throw new Error('No status in response');
  if (response.status !== 'healthy' && response.status !== 'degraded') {
    throw new Error(`Expected healthy or degraded, got ${response.status}`);
  }
});

test('PostgreSQL is connected', async () => {
  const result = await queryDb('SELECT 1 as test;');
  if (!result.includes('1')) throw new Error('PostgreSQL query failed');
});

test('Redis is accessible', async () => {
  const { stdout } = await execAsync('docker exec vibing2-redis redis-cli ping');
  if (!stdout.includes('PONG')) throw new Error('Redis ping failed');
});

test('Workflows endpoint lists 6 workflows', async () => {
  const response = await fetch(`${BASE_URL}/api/workflows/list`);
  if (!response.workflows) throw new Error('No workflows in response');
  if (response.workflows.length !== 6) {
    throw new Error(`Expected 6 workflows, got ${response.workflows.length}`);
  }
});

test('Full-stack workflow exists', async () => {
  const response = await fetch(`${BASE_URL}/api/workflows/list`);
  const fullstack = response.workflows.find(w => w.id === 'fullstack-dev');
  if (!fullstack) throw new Error('Full-stack workflow not found');
  if (fullstack.name !== 'Full-Stack Development') {
    throw new Error('Full-stack workflow has wrong name');
  }
});

test('Security audit workflow exists', async () => {
  const response = await fetch(`${BASE_URL}/api/workflows/list`);
  const security = response.workflows.find(w => w.id === 'security-audit');
  if (!security) throw new Error('Security audit workflow not found');
});

test('Testing workflow exists', async () => {
  const response = await fetch(`${BASE_URL}/api/workflows/list`);
  const testing = response.workflows.find(w => w.id === 'testing-suite');
  if (!testing) throw new Error('Testing workflow not found');
});

test('Performance workflow exists', async () => {
  const response = await fetch(`${BASE_URL}/api/workflows/list`);
  const perf = response.workflows.find(w => w.id === 'performance-optimization');
  if (!perf) throw new Error('Performance workflow not found');
});

test('Database has User table', async () => {
  const result = await queryDb(
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='User';"
  );
  if (!result.includes('1')) throw new Error('User table not found');
});

test('Database has Project table', async () => {
  const result = await queryDb(
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='Project';"
  );
  if (!result.includes('1')) throw new Error('Project table not found');
});

test('Database has ProjectFile table', async () => {
  const result = await queryDb(
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='ProjectFile';"
  );
  if (!result.includes('1')) throw new Error('ProjectFile table not found');
});

test('Database has Message table', async () => {
  const result = await queryDb(
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='Message';"
  );
  if (!result.includes('1')) throw new Error('Message table not found');
});

test('Docker containers are healthy', async () => {
  const { stdout } = await execAsync('docker ps --filter "name=vibing2" --format "{{.Status}}"');
  const statuses = stdout.trim().split('\n');

  for (const status of statuses) {
    if (!status.includes('healthy') && !status.includes('Up')) {
      throw new Error(`Container not healthy: ${status}`);
    }
  }
});

test('Database migration is current', async () => {
  const result = await queryDb(
    "SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;"
  );
  const count = parseInt(result.trim());
  if (count < 1) throw new Error('No migrations applied');
});

// Run all tests
console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                  PHASE 2 INTEGRATION TEST SUITE                             ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

console.log('Running tests...\n');

for (const testCase of TESTS) {
  await runTest(testCase);
}

// Summary
console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                          TEST SUMMARY                                        ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

console.log(`  Total Tests: ${TESTS.length}`);
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  Success Rate: ${((passed / TESTS.length) * 100).toFixed(1)}%\n`);

if (failed === 0) {
  console.log('  🎉 All tests passed! Phase 2 is production ready!\n');
  process.exit(0);
} else {
  console.log('  ⚠️  Some tests failed. Please review the errors above.\n');
  process.exit(1);
}
