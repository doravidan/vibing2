#!/usr/bin/env node

/**
 * Performance Benchmark Test
 * Tests database performance and API response times
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const BASE_URL = 'http://localhost:3000';

// Measure execution time
async function measure(name, fn) {
  const start = Date.now();
  await fn();
  const duration = Date.now() - start;
  return { name, duration };
}

// HTTP request helper
async function fetch(url) {
  const { stdout } = await execAsync(`curl -s -w "\\n%{time_total}" "${url}"`);
  const lines = stdout.trim().split('\n');
  const time = parseFloat(lines[lines.length - 1]) * 1000; // Convert to ms
  return { time };
}

// Database query helper
async function queryDb(sql) {
  const start = Date.now();
  await execAsync(
    `PGPASSWORD=vibing2_dev_pass psql -h localhost -U vibing2 -d vibing2 -t -c "${sql}"`
  );
  return Date.now() - start;
}

console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                     PERFORMANCE BENCHMARK TEST                              ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

const results = [];

// Test 1: API Health Endpoint
console.log('Running benchmarks...\n');
process.stdout.write('  1. API Health Endpoint (10 requests)... ');
const healthTimes = [];
for (let i = 0; i < 10; i++) {
  const { time } = await fetch(`${BASE_URL}/api/health`);
  healthTimes.push(time);
}
const healthAvg = healthTimes.reduce((a, b) => a + b, 0) / healthTimes.length;
console.log(`✅ Avg: ${healthAvg.toFixed(0)}ms`);
results.push({ name: 'API Health Endpoint', avg: healthAvg, threshold: 100, unit: 'ms' });

// Test 2: Workflows List Endpoint
process.stdout.write('  2. Workflows List Endpoint (10 requests)... ');
const workflowTimes = [];
for (let i = 0; i < 10; i++) {
  const { time } = await fetch(`${BASE_URL}/api/workflows/list`);
  workflowTimes.push(time);
}
const workflowAvg = workflowTimes.reduce((a, b) => a + b, 0) / workflowTimes.length;
console.log(`✅ Avg: ${workflowAvg.toFixed(0)}ms`);
results.push({ name: 'Workflows List', avg: workflowAvg, threshold: 150, unit: 'ms' });

// Test 3: Database Simple Query
process.stdout.write('  3. Database Simple Query (20 queries)... ');
const dbSimpleTimes = [];
for (let i = 0; i < 20; i++) {
  const time = await queryDb('SELECT 1;');
  dbSimpleTimes.push(time);
}
const dbSimpleAvg = dbSimpleTimes.reduce((a, b) => a + b, 0) / dbSimpleTimes.length;
console.log(`✅ Avg: ${dbSimpleAvg.toFixed(0)}ms`);
results.push({ name: 'DB Simple Query', avg: dbSimpleAvg, threshold: 50, unit: 'ms' });

// Test 4: Database Table Count
process.stdout.write('  4. Database Table Count (20 queries)... ');
const dbCountTimes = [];
for (let i = 0; i < 20; i++) {
  const time = await queryDb('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\'public\';');
  dbCountTimes.push(time);
}
const dbCountAvg = dbCountTimes.reduce((a, b) => a + b, 0) / dbCountTimes.length;
console.log(`✅ Avg: ${dbCountAvg.toFixed(0)}ms`);
results.push({ name: 'DB Table Count', avg: dbCountAvg, threshold: 100, unit: 'ms' });

// Test 5: Redis Ping
process.stdout.write('  5. Redis Ping (50 pings)... ');
const redisTimes = [];
for (let i = 0; i < 50; i++) {
  const start = Date.now();
  await execAsync('docker exec vibing2-redis redis-cli ping > /dev/null');
  redisTimes.push(Date.now() - start);
}
const redisAvg = redisTimes.reduce((a, b) => a + b, 0) / redisTimes.length;
console.log(`✅ Avg: ${redisAvg.toFixed(0)}ms`);
results.push({ name: 'Redis Ping', avg: redisAvg, threshold: 50, unit: 'ms' });

// Test 6: Concurrent API Requests
process.stdout.write('  6. Concurrent API Requests (10 parallel)... ');
const concurrentStart = Date.now();
await Promise.all(
  Array(10).fill(0).map(() => fetch(`${BASE_URL}/api/workflows/list`))
);
const concurrentTime = Date.now() - concurrentStart;
console.log(`✅ Total: ${concurrentTime}ms (${(concurrentTime / 10).toFixed(0)}ms per request)`);
results.push({ name: 'Concurrent Requests (10)', avg: concurrentTime, threshold: 1000, unit: 'ms total' });

// Summary
console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                        PERFORMANCE RESULTS                                   ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

let allPassed = true;

for (const result of results) {
  const passed = result.avg <= result.threshold;
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const pct = ((result.avg / result.threshold) * 100).toFixed(0);

  console.log(`  ${status}  ${result.name}`);
  console.log(`         Average: ${result.avg.toFixed(1)}${result.unit}`);
  console.log(`         Threshold: ${result.threshold}${result.unit}`);
  console.log(`         Performance: ${pct}% of threshold`);
  console.log();

  if (!passed) allPassed = false;
}

// Overall Assessment
console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                      OVERALL ASSESSMENT                                      ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

if (allPassed) {
  console.log('  🎉 All performance benchmarks passed!');
  console.log('  🚀 System is performing within acceptable thresholds.\n');
  process.exit(0);
} else {
  console.log('  ⚠️  Some performance benchmarks failed.');
  console.log('  💡 Consider optimization or reviewing thresholds.\n');
  process.exit(1);
}
