/**
 * Stress Testing Script
 * Tests system behavior under extreme load conditions
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 300 },  // Ramp up to 300 users
    { duration: '5m', target: 400 },  // Ramp up to 400 users
    { duration: '5m', target: 500 },  // Peak load at 500 users
    { duration: '10m', target: 500 }, // Stay at peak
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% of requests under 2s even under stress
    'errors': ['rate<0.2'],              // Error rate under 20% during stress
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Aggressive testing pattern
  const requests = [
    {
      method: 'GET',
      url: `${BASE_URL}/api/projects/list`,
      params: { headers: { 'Accept': 'application/json' } },
    },
    {
      method: 'POST',
      url: `${BASE_URL}/api/agent/stream`,
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Generate a complex application' }],
        projectType: 'dashboard',
      }),
      params: {
        headers: { 'Content-Type': 'application/json' },
        timeout: '10s',
      },
    },
  ];

  requests.forEach((req) => {
    const start = new Date();
    const res = req.method === 'GET'
      ? http.get(req.url, req.params)
      : http.post(req.url, req.body, req.params);
    const duration = new Date() - start;

    responseTime.add(duration);

    const success = check(res, {
      'status not 5xx': (r) => r.status < 500,
      'response time < 5s': (r) => duration < 5000,
    });

    if (!success || res.status >= 400) {
      errorRate.add(1);
    }
  });

  sleep(Math.random() * 2); // Random think time 0-2 seconds
}