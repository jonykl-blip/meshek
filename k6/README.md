# k6 Stress Tests

## Prerequisites
- Install k6: `brew install k6`

## Run
```bash
# Set environment variables
export SUPABASE_URL=https://jnsfklshpabogzvolzct.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run individual tests
k6 run k6/attendance-insert-load.js
k6 run k6/contractor-report-load.js
k6 run k6/crud-operations-load.js
```
