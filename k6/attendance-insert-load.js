import http from 'k6/http';
import { check, sleep } from 'k6';

// Configure via environment variables
const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://jnsfklshpabogzvolzct.supabase.co';
const SERVICE_KEY = __ENV.SUPABASE_SERVICE_ROLE_KEY || '';

export const options = {
  stages: [
    { duration: '10s', target: 20 },  // ramp up
    { duration: '30s', target: 50 },  // sustain 50 VUs
    { duration: '10s', target: 100 }, // spike to 100
    { duration: '10s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Prefer': 'return=minimal',
  };

  // Insert an attendance log with contractor fields
  const payload = JSON.stringify({
    work_date: '2026-03-21',
    total_hours: (Math.random() * 8 + 1).toFixed(1),
    status: 'pending',
    source: 'bot',
    dunam_covered: (Math.random() * 500).toFixed(2),
    raw_transcript: `k6 stress test ${Date.now()}`,
  });

  const res = http.post(`${SUPABASE_URL}/rest/v1/attendance_logs`, payload, { headers });

  check(res, {
    'status is 201': (r) => r.status === 201,
    'no error': (r) => !r.body.includes('error'),
  });

  sleep(0.1);
}
