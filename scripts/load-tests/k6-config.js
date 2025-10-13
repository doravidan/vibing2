/**
 * k6 Load Testing Configuration
 * Comprehensive performance testing for vibing2 platform
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const aiStreamLatency = new Trend('ai_stream_latency');
const dbQueryDuration = new Trend('db_query_duration');
const cacheHitRate = new Rate('cache_hits');
const successfulRequests = new Counter('successful_requests');
const activeUsers = new Gauge('active_users');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '3m', target: 100 },   // Stay at 100 users
    { duration: '1m', target: 50 },    // Ramp down to 50 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    'http_req_failed': ['rate<0.05'],                  // Error rate under 5%
    'api_latency': ['p(95)<300'],                      // API 95% under 300ms
    'ai_stream_latency': ['p(95)<5000'],              // AI streaming 95% under 5s
    'errors': ['rate<0.1'],                           // Overall error rate under 10%
  },
  ext: {
    loadimpact: {
      projectID: 'vibing2-performance',
      name: 'Vibing2 Platform Load Test',
    },
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || '';

const testUsers = [
  { email: 'test1@example.com', password: 'Test123!@#' },
  { email: 'test2@example.com', password: 'Test456!@#' },
  { email: 'test3@example.com', password: 'Test789!@#' },
];

const projectTypes = [
  'portfolio', 'landing-page', 'blog', 'e-commerce',
  'dashboard', 'chat-app', 'todo-app', 'documentation',
];

const testPrompts = [
  'Create a modern landing page with hero section',
  'Build a responsive dashboard with charts',
  'Design a blog with dark mode support',
  'Implement a real-time chat interface',
  'Create an e-commerce product page',
];

// Helper functions
function authenticateUser() {
  const user = randomItem(testUsers);
  const loginRes = http.post(
    `${BASE_URL}/api/auth/signin`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'session token received': (r) => r.cookies['next-auth.session-token'] !== undefined,
  });

  return loginRes.cookies['next-auth.session-token'];
}

// Test scenarios
export default function () {
  const sessionToken = authenticateUser();
  activeUsers.add(1);

  group('API Performance Tests', () => {
    // Test 1: Project List API
    group('Project List', () => {
      const start = new Date();
      const res = http.get(`${BASE_URL}/api/projects/list`, {
        headers: {
          'Cookie': `next-auth.session-token=${sessionToken}`,
        },
      });
      const duration = new Date() - start;

      apiLatency.add(duration);

      const success = check(res, {
        'status is 200': (r) => r.status === 200,
        'response has projects': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body.projects);
          } catch {
            return false;
          }
        },
        'response time < 500ms': (r) => duration < 500,
      });

      if (success) {
        successfulRequests.add(1);
      } else {
        errorRate.add(1);
      }
    });

    // Test 2: AI Generation Streaming
    group('AI Generation', () => {
      const prompt = randomItem(testPrompts);
      const projectType = randomItem(projectTypes);

      const start = new Date();
      const res = http.post(
        `${BASE_URL}/api/agent/stream`,
        JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          projectType: projectType,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `next-auth.session-token=${sessionToken}`,
          },
          timeout: '30s',
        }
      );
      const duration = new Date() - start;

      aiStreamLatency.add(duration);

      const success = check(res, {
        'status is 200': (r) => r.status === 200,
        'response is streaming': (r) => r.headers['content-type']?.includes('text/event-stream'),
        'response time < 10s': (r) => duration < 10000,
      });

      if (success) {
        successfulRequests.add(1);
      } else {
        errorRate.add(1);
      }
    });

    // Test 3: Project Save
    group('Project Save', () => {
      const projectData = {
        name: `Test Project ${randomString(8)}`,
        type: randomItem(projectTypes),
        files: [
          {
            path: '/src/index.js',
            content: 'console.log("Hello World");',
          },
          {
            path: '/src/styles.css',
            content: 'body { margin: 0; }',
          },
        ],
      };

      const start = new Date();
      const res = http.post(
        `${BASE_URL}/api/projects/save`,
        JSON.stringify(projectData),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `next-auth.session-token=${sessionToken}`,
          },
        }
      );
      const duration = new Date() - start;

      dbQueryDuration.add(duration);

      const success = check(res, {
        'status is 200': (r) => r.status === 200,
        'project saved': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.projectId !== undefined;
          } catch {
            return false;
          }
        },
        'response time < 1s': (r) => duration < 1000,
      });

      if (success) {
        successfulRequests.add(1);

        // Test project load (cache test)
        const projectId = JSON.parse(res.body).projectId;
        const loadRes = http.get(
          `${BASE_URL}/api/projects/${projectId}`,
          {
            headers: {
              'Cookie': `next-auth.session-token=${sessionToken}`,
            },
          }
        );

        const cacheHit = check(loadRes, {
          'load successful': (r) => r.status === 200,
          'fast response': (r) => r.timings.duration < 100, // Likely cached
        });

        cacheHitRate.add(cacheHit ? 1 : 0);
      } else {
        errorRate.add(1);
      }
    });

    // Test 4: File Operations
    group('File Operations', () => {
      const fileOps = [
        { op: 'read', path: '/src/main.js' },
        { op: 'write', path: '/src/new-file.js', content: 'export default {};' },
        { op: 'delete', path: '/src/old-file.js' },
      ];

      fileOps.forEach((op) => {
        const start = new Date();
        const res = http.post(
          `${BASE_URL}/api/files/${op.op}`,
          JSON.stringify({
            path: op.path,
            content: op.content,
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Cookie': `next-auth.session-token=${sessionToken}`,
            },
          }
        );
        const duration = new Date() - start;

        check(res, {
          [`${op.op} successful`]: (r) => r.status === 200 || r.status === 201,
          [`${op.op} fast`]: (r) => duration < 200,
        });
      });
    });
  });

  group('WebSocket Performance', () => {
    // Note: k6 WebSocket support requires additional configuration
    // This is a placeholder for WebSocket testing
    console.log('WebSocket testing requires k6 WebSocket extension');
  });

  activeUsers.add(-1);
  sleep(1); // Think time between iterations
}

// Lifecycle hooks
export function setup() {
  console.log('Setting up load test...');

  // Verify endpoint is accessible
  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) {
    throw new Error('Target system is not accessible');
  }

  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = Date.now() - data.startTime;
  console.log(`Test completed in ${duration}ms`);
}