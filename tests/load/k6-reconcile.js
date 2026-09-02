import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 },  // Ramp-up to 20 virtual users
    { duration: '30s', target: 50 },  // Sustained load at 50 VUs
    { duration: '10s', target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests must complete within 500ms
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api/v1';

export default function () {
  // 1. Healthcheck
  const healthRes = http.get('http://localhost:5000/health');
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });

  // 2. Login to acquire JWT token
  const payload = JSON.stringify({
    email: 'owner@acme.com',
    password: 'password123',
  });
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const loginRes = http.post(`${BASE_URL}/auth/login`, payload, params);
  const success = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== undefined,
  });

  if (success) {
    const token = loginRes.json('token');
    const authHeaders = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    // 3. Benchmark Reconciliations List
    const reconRes = http.get(`${BASE_URL}/reconciliations`, authHeaders);
    check(reconRes, {
      'reconciliations list status 200': (r) => r.status === 200,
    });

    // 4. Benchmark Exceptions List
    const excRes = http.get(`${BASE_URL}/exceptions`, authHeaders);
    check(excRes, {
      'exceptions list status 200': (r) => r.status === 200,
    });

    // 5. Benchmark Dashboard Analytics
    const dashRes = http.get(`${BASE_URL}/analytics/dashboard`, authHeaders);
    check(dashRes, {
      'dashboard analytics status 200': (r) => r.status === 200,
    });
  }

  sleep(1);
}
