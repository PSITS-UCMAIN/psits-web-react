# Test Execution Report
**Date**: 2026-05-20
**Report ID**: 2026-05-20-test-report1.md
**Time Generated**: 03:40:34+08:00

## Summary
Full test suite execution across server-side and client-side-ts workspaces revealed critical failures blocking production deployment. Server-side: 10/23 tests failed due to missing environment variables and database setup issues. Client-side-ts: 5/16 tests failed due to mock configuration errors. Build validation identified 20 TypeScript errors in client-side-ts requiring immediate attention.

## Tests Executed
- **server-side**: Full test suite (`npm run test`) — FAIL (10 failed, 6 passed, 7 skipped out of 23 tests)
- **server-side**: Build validation (`npm run build`) — PASS
- **client-side-ts**: Full test suite (`npm run test`) — FAIL (5 failed, 11 passed out of 16 tests)
- **client-side-ts**: Build validation (`npm run build`) — FAIL (20 TypeScript errors)
- **client-side-ts**: Lint validation (`npm run lint`) — FAIL (12 errors, 15 warnings)

## Key Findings
- Missing AWS_BUCKET_NAME environment variable blocks server route initialization and causes immediate failure on import
- MongoMemoryServer timeout (10s) insufficient for test database setup, causing 7 tests to be skipped
- Certificate controller tests all return 401 unauthorized instead of expected status codes, indicating authentication middleware misconfiguration in test environment
- Client-side axios mock broken: `axios.create is not a function` error in test setup
- MSW handler missing for `/api/certificates/eligible` endpoint causing network errors in component tests
- 20 TypeScript build errors in client-side-ts prevent production build: cart.tsx missing type definitions, MarkAttendanceModal type mismatches, MyOrders missing interface properties

## Top Failures

### server-side/tests/integration/certificate.controller.test.ts
**Failure**: All 10 certificate controller tests returning 401 instead of expected status codes (400, 403, 404, 429)
**Root cause**: Authentication middleware not properly mocked or bypassed in test environment
**First error**: `expected "spy" to be called with arguments: [ { attendeeId: Any<ObjectId> } ] Number of calls: 0`

### server-side/tests/unit/models/eligibleCertificate.model.test.ts
**Failure**: Hook timed out in 10000ms during beforeAll database connection
**Root cause**: MongoMemoryServer instance failed to start within timeout
**Error**: `GenericMMSError: Instance failed to start within 10000ms`

### server-side/tests/integration/authV2.integration.test.ts & events.route.ts
**Failure**: Suite failed to load due to missing environment variable
**Root cause**: AWS_BUCKET_NAME not set in test environment
**Error**: `Error: bucket is required` at multer-s3 initialization

### client-side-ts/src/features/certificates/api/certificateApi.test.ts
**Failure**: Suite failed to load with TypeError
**Root cause**: Axios mock not properly configured in test setup
**Error**: `TypeError: default.create is not a function` at auth.api.ts:15:25

### client-side-ts/src/features/certificates/components/CertificateEventList.test.tsx
**Failure**: Multiple test assertions failing with "Found multiple elements" error
**Root cause**: Tests using `getByText` instead of `getAllByText` for duplicate UI elements (toast notifications + card content)
**Error**: `TestingLibraryElementError: Found multiple elements with the text: Failed to load certificates`

## Repro Steps

### Server-side tests
```bash
cd server-side
npm run test
```

### Client-side-ts tests
```bash
cd client-side-ts
npm run test
```

### Build validation
```bash
# Server (passes)
cd server-side
npm run build

# Client (fails with 20 TypeScript errors)
cd client-side-ts
npm run build
```

### Lint validation
```bash
cd client-side-ts
npm run lint
```

## Artifacts & Logs
- `server-side/build-output.txt` - Successful build output
- `server-side/test-output.txt` - Full test execution log with failures
- `client-side-ts/build-output.txt` - TypeScript compilation errors
- `client-side-ts/test-output.txt` - Full test execution log with failures
- `client-side-ts/lint-output.txt` - ESLint errors and warnings

## Replicability Notes
- **Node/npm versions**: Not explicitly captured, using system defaults
- **OS**: Windows (PowerShell commands used)
- **DB state**: MongoMemoryServer used for isolated test database, no seed data required
- **Mock server**: MSW (Mock Service Worker) used for API mocking in client tests
- **Environment variables**: Tests require AWS_BUCKET_NAME to be set (currently missing)

## Recommendations

### Priority 1: Fix Build Blockers (Required for Deployment)
1. **Define CartItem interface** in `client-side-ts/src/lib/cart.tsx` with properties: id, name, price, qty, uid, image, color, size, course
2. **Add type guards** in `client-side-ts/src/features/admin/event-management/components/modals/MarkAttendanceModal.tsx` for QR payload parsing (lines 59-61)
3. **Complete OrderData interface** in `client-side-ts/src/pages/student/MyOrders.tsx` to include orderId and status properties

### Priority 2: Fix Test Infrastructure
4. **Add AWS_BUCKET_NAME** to test environment setup (e.g., `.env.test` or test setup file with mock value)
5. **Increase MongoMemoryServer timeout** in test setup from 10s to 30s or configure proper startup options
6. **Fix axios mock** in `client-side-ts/src/test/setup.ts` or test configuration to properly mock axios.create
7. **Add MSW handler** for `/api/certificates/eligible` endpoint in test setup
8. **Configure authentication bypass** for certificate controller tests or properly mock authentication middleware

### Priority 3: Code Quality Improvements (Technical Debt)
9. **Replace 12 explicit `any` types** with proper types from `features/events/types/event.types.ts`
10. **Fix 15 React hooks warnings** by adding missing dependencies or wrapping in useCallback
11. **Update test assertions** to use `getAllByText` instead of `getByText` where multiple elements are expected

## Coverage Summary
Coverage data not collected in this run. To generate coverage reports:
```bash
cd server-side && npm run test:coverage
cd client-side-ts && npm run test:coverage
```