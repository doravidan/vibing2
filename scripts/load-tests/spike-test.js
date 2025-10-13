/**
 * Spike Testing Script
 * Tests system behavior during sudden traffic spikes
 */

import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '10s', target: 10 },    // Baseline load
    { duration: '1m', target: 10 },     // Stay at baseline
    { duration: '10s', target: 500 },   // Spike to 500 users
    { duration: '3m', target: 500 },    // Stay at spike
    { duration: '10s', target: 10 },    // Scale down
    { duration: '1m', target: 10 },     // Recovery period
    { duration: '10s', target: 1000 },  // Extreme spike
    { duration: '2m', target: 1000 },   // Sustain extreme load
    { duration: '10s', target: 10 },    // Final scale down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'], // 95% under 3s during spikes
    'errors': ['rate<0.3'],              // Error rate under 30% during spikes
    'http_req_failed': ['rate<0.4'],     // Failed requests under 40%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Simulate mixed traffic patterns
  const scenario = Math.random();

  if (scenario < 0.6) {
    // 60% - Light requests
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      'health check ok': (r) => r.status === 200,
    });
  } else if (scenario < 0.9) {
    // 30% - Medium requests
    const res = http.get(`${BASE_URL}/api/projects/list`);
    check(res, {
      'project list ok': (r) => r.status === 200 || r.status === 401,
    });
  } else {
    // 10% - Heavy requests
    const res = http.post(
      `${BASE_URL}/api/agent/stream`,
      JSON.stringify({
        messages: [{ role: 'user', content: 'Generate application' }],
        projectType: 'blog',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: '5s',
      }
    );

    const success = check(res, {
      'ai generation initiated': (r) => r.status === 200 || r.status === 429,
    });

    if (!success) {
      errorRate.add(1);
    }
  }
}