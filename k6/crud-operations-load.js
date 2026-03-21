import http from 'k6/http';
import { check, sleep } from 'k6';

const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://jnsfklshpabogzvolzct.supabase.co';
const SERVICE_KEY = __ENV.SUPABASE_SERVICE_ROLE_KEY || '';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 30 },
    { duration: '10s', target: 0 },
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
    'Prefer': 'return=representation',
  };

  // Test 1: Read work_types
  const readRes = http.get(
    `${SUPABASE_URL}/rest/v1/work_types?select=id,name_he&is_active=eq.true`,
    { headers }
  );
  check(readRes, { 'read work_types 200': (r) => r.status === 200 });

  // Test 2: Read materials
  const matRes = http.get(
    `${SUPABASE_URL}/rest/v1/materials?select=id,name_he&is_active=eq.true`,
    { headers }
  );
  check(matRes, { 'read materials 200': (r) => r.status === 200 });

  // Test 3: Read clients with aliases
  const clientRes = http.get(
    `${SUPABASE_URL}/rest/v1/clients?select=id,name,client_aliases(alias)&is_active=eq.true`,
    { headers }
  );
  check(clientRes, { 'read clients 200': (r) => r.status === 200 });

  sleep(0.2);
}
