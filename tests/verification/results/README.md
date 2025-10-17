# Verification Test Results

This directory contains results from all verification tests.

## How to Run Tests

### SQL Tests (Section A)
1. Open Supabase SQL Editor
2. Copy test file from `tests/verification/sql/`
3. Execute and save results here

### API Tests (Sections B-G)
```bash
npm run test:verification:api
```

### E2E Tests (Sections B-K)
```bash
npm run test:e2e:verification
```

### Performance Tests (Section J)
```bash
npm run test:performance
```

## Results Format

- `a*_*.txt` - SQL test results
- `*_api.json` - API test results
- `*_e2e.json` - E2E test results
- `*.log` - Test execution logs

