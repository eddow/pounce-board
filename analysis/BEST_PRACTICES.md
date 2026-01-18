# Best Practices

## 1. Project Structure
```
src/
├── routes/
│   ├── [feature]/
│   │   ├── [subfeature]/
│   │   │   ├── index.tsx
│   │   │   ├── index.ts
│   │   │   ├── types.d.ts
│   │   │   └── common.ts
│   │   └── common.ts
│   └── api/
│       ├── [service]/
│       │   └── index.ts
│       └── common.ts
├── lib/
│   ├── utils/
│   ├── constants/
│   └── types/
├── components/
├── stores/
└── styles/
```

## 2. Type Safety
- Always define types in `types.d.ts`
- Use generics for API responses
- Validate external API responses with Zod

```ts
// routes/users/[id]/types.d.ts
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export type GetUserResponse = {
  status: number;
  data?: User;
  error?: string;
};
```

## 3. Middleware Organization
- Keep middleware focused on single responsibilities
- Order middleware from most general to most specific
- Document each middleware's purpose

```ts
// routes/users/common.ts
/**
 * 1. Authentication - Verifies user session
 * 2. Rate Limiting - Prevents abuse
 * 3. Logging - Tracks access
 */
export const middleware: Middleware[] = [
  authMiddleware,
  rateLimitMiddleware,
  loggingMiddleware
];
```

## 4. API Design
- Use consistent response formats
- Version your APIs
- Document all endpoints

```ts
// Good response format
return {
  status: 200,
  data: { /* payload */ },
  pagination: { /* if applicable */ }
};
```

## 5. Performance
- Implement caching at multiple levels
- Use compression for API responses
- Optimize database queries

```ts
// Caching middleware
export const cacheMiddleware: Middleware = async (ctx, next) => {
  const cacheKey = `cache:${ctx.request.url}`;
  const cached = await cache.get(cacheKey);

  if (cached) {
    return new Response(cached, {
      headers: { "Content-Type": "application/json" }
    });
  }

  const response = await next();

  if (response.status === 200) {
    const cloned = response.clone();
    const body = await cloned.text();
    await cache.set(cacheKey, body, 3600); // Cache for 1 hour
  }

  return response;
};
```

## 6. Security
- Always validate input
- Sanitize outputs
- Implement CSRF protection
- Use HTTPS
- Keep dependencies updated

```ts
// Input validation middleware
export const validateInput = (schema: z.ZodSchema): Middleware => {
  return async (ctx, next) => {
    const result = schema.safeParse(ctx.params);
    if (!result.success) {
      return new Response(JSON.stringify(result.error), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Override with validated data
    ctx.params = result.data;
    return next();
  };
};
```

## 7. Testing
- Test middleware in isolation
- Mock external dependencies
- Test both happy and error paths
- Include integration tests

```ts
// Middleware test example
test("auth middleware blocks unauthenticated requests", async () => {
  const response = await runMiddlewares(
    [authMiddleware],
    { request: new Request("http://test"), params: {} },
    () => new Response("OK")
  );

  expect(response.status).toBe(401);
});
```

## 8. Documentation
- Document all routes and their parameters
- Document middleware behavior
- Keep examples in code comments
- Generate OpenAPI/Swagger docs

```ts
/**
 * GET /users/{id}
 *
 * Returns a user by ID
 *
 * @param id - User ID (UUID)
 * @returns User object or 404 if not found
 *
 * Example:
 * ```ts
 * const user = await api("./users/[id]").get({ id: "123" });
 * ```
 */
export async function get({ params }) {
  // ...
}
```

## 9. Error Handling
- Use consistent error formats
- Don't expose sensitive error details
- Log errors for debugging
- Provide helpful error messages to clients

```ts
// Error middleware
export const errorMiddleware: Middleware = async (ctx, next) => {
  try {
    return await next();
  } catch (error) {
    console.error(`Error handling ${ctx.request.url}:`, error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        code: "SERVER_ERROR",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
```

## 10. Deployment
- Use environment variables for configuration
- Implement health checks
- Set up proper logging
- Monitor performance
- Implement CI/CD pipelines

```ts
// Health check endpoint
export async function get() {
  const dbStatus = await checkDatabaseConnection();
  const cacheStatus = await checkCacheConnection();

  return {
    status: dbStatus && cacheStatus ? 200 : 503,
    data: {
      status: dbStatus && cacheStatus ? "healthy" : "unhealthy",
      database: dbStatus ? "connected" : "disconnected",
      cache: cacheStatus ? "connected" : "disconnected",
      timestamp: new Date().toISOString()
    }
  };
};
```
