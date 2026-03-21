import http from 'k6/http';
import { check, sleep } from 'k6';

const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://jnsfklshpabogzvolzct.supabase.co';
const SERVICE_KEY = __ENV.SUPABASE_SERVICE_ROLE_KEY || '';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  };

  // Read attendance_logs with joins (simulates contractor report query)
  const res = http.get(
    `${SUPABASE_URL}/rest/v1/attendance_logs?select=id,work_date,total_hours,dunam_covered,profiles(full_name),areas(name,client_id,clients(name)),work_types(name_he)&status=eq.approved&work_date=gte.2026-03-01&work_date=lte.2026-03-31&limit=1000`,
    { headers }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response is array': (r) => {
      try { return Array.isArray(JSON.parse(r.body)); } catch { return false; }
    },
  });

  sleep(0.5);
}
