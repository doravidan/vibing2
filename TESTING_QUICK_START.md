# Testing Quick Start Guide

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Test Environment

Create `.env.test` (or use `.env.local`):

```env
# Test Database
DATABASE_URL="postgresql://user:password@localhost:5432/vibing2_test"

# Auth (mock values for testing)
NEXTAUTH_SECRET="test-secret-for-testing"
NEXTAUTH_URL="http://localhost:3000"

# API Keys (mocked in tests)
ANTHROPIC_API_KEY="test-key"
```

### 3. Setup Test Database

```bash
# Create test database
createdb vibing2_test

# Run migrations
DATABASE_URL="postgresql://user:password@localhost:5432/vibing2_test" npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## Running Tests

### Quick Test Run

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage
```

### Specific Test Suites

```bash
# Unit tests (library functions)
pnpm test:unit

# API endpoint tests
pnpm test:api

# Integration tests
pnpm test:integration
```

### Watch Mode (for development)

```bash
pnpm test:watch
```

### CI Mode (for pipelines)

```bash
pnpm test:ci
```

## Understanding Test Output

### Success Output

```
PASS  __tests__/api/auth/signup.test.ts
  ✓ should create a new user with valid credentials (123ms)
  ✓ should reject signup when email already exists (45ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
Coverage:    87.5%
```

### Coverage Report

```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   87.12 |    84.23 |   89.45 |   86.89 |
 app/api/auth       |   90.12 |    87.50 |   91.23 |   89.78 |
 app/api/projects   |   85.34 |    82.11 |   88.67 |   84.92 |
 lib                |   95.23 |    91.45 |   96.12 |   94.87 |
--------------------|---------|----------|---------|---------|
```

## Common Test Patterns

### Testing an API Route

```typescript
import { POST } from '@/app/api/auth/signup/route';
import { cleanupDatabase, getResponseJson } from '@/__tests__/utils/test-helpers';

describe('POST /api/auth/signup', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  it('should create a new user', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!@#',
      }),
    });

    const response = await POST(request as any);
    const data = await getResponseJson(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

### Testing with Authentication

```typescript
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

const { auth } = require('@/auth');

// Mock authenticated user
auth.mockResolvedValue({
  user: {
    id: 'user-123',
    email: 'test@example.com',
  },
});
```

### Testing Database Operations

```typescript
import { createTestUser, createTestProject } from '@/__tests__/utils/test-helpers';

const user = await createTestUser();
const project = await createTestProject(user.id);
```

## Troubleshooting

### Database Connection Issues

```bash
# Verify PostgreSQL is running
pg_isadmin

# Check connection
psql -d vibing2_test

# Reset database
dropdb vibing2_test
createdb vibing2_test
npx prisma migrate deploy
```

### Test Failures

1. **Check database state**: Ensure cleanup is working
2. **Verify mocks**: Check mock implementations
3. **Inspect logs**: Look at test output for errors
4. **Run single test**: Isolate the failing test

```bash
# Run specific test file
pnpm test signup.test.ts

# Run specific test case
pnpm test --testNamePattern="should create a new user"
```

### Coverage Issues

```bash
# Generate detailed coverage report
pnpm test:coverage

# Open HTML coverage report
open coverage/lcov-report/index.html
```

## Best Practices

1. **Always cleanup**: Use `beforeEach` and `afterEach`
2. **Isolate tests**: Don't rely on test execution order
3. **Mock external services**: Don't make real API calls
4. **Use realistic data**: Test with production-like data
5. **Test edge cases**: Invalid inputs, errors, boundaries

## Test Structure

```
__tests__/
├── api/              # API route tests
├── lib/              # Library function tests
├── integration/      # End-to-end workflow tests
└── utils/            # Test helpers and mocks
```

## Next Steps

1. Read full coverage report: `TEST_COVERAGE_REPORT.md`
2. Add tests for new features
3. Maintain 80%+ coverage
4. Run tests before committing

---

**Need Help?** Check the main testing documentation or review existing test files for examples.
