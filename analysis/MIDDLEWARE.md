# Middleware Guide

## 1. Middleware Basics
Middleware functions:
- Run before route handlers
- Can modify the request context
- Can short-circuit the request
- Are defined in `common.ts`
- Apply to the current route and all descendants

## 2. Defining Middleware
```ts
// routes/users/common.ts
import type { Middleware } from "pounce/http";

export const middleware: Middleware[] = [
  async (ctx, next) => {
    // 1. Authentication middleware
    ctx.user = await getUserFromSession(ctx.request);
    if (!ctx.user) {
      return new Response("Unauthorized", { status: 401 });
    }
    return next();
  },

  async (ctx, next) => {
    // 2. Logging middleware
    console.log(`[${ctx.user.id}] ${ctx.request.method} ${ctx.request.url}`);
    return next();
  }
];
```

## 3. Middleware Context
The context object contains:
```ts
{
  request: Request;       // The original request
  params: Record<string, string>; // Route parameters
  user?: User;            // Added by auth middleware
  [key: string]: unknown; // Custom properties
}
```

## 4. Common Middleware Examples

### Authentication
```ts
export const authMiddleware: Middleware = async (ctx, next) => {
  const token = ctx.request.headers.get("authorization");
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    ctx.user = await verifyToken(token);
    return next();
  } catch (error) {
    return new Response("Forbidden", { status: 403 });
  }
};
```

### Rate Limiting
```ts
export const rateLimitMiddleware: Middleware = async (ctx, next) => {
  const ip = ctx.request.headers.get("x-forwarded-for") || "unknown";
  const key = `rate-limit:${ip}:${ctx.request.url}`;

  const current = await redis.incr(key);
  if (current > 100) {
    return new Response("Too Many Requests", { status: 429 });
  }

  await redis.expire(key, 60);
  return next();
};
```

### Input Validation
```ts
export const validationMiddleware = (schema: z.ZodSchema): Middleware => {
  return async (ctx, next) => {
    const result = schema.safeParse(ctx.params);
    if (!result.success) {
      return new Response(JSON.stringify(result.error), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Override params with validated data
    ctx.params = result.data;
    return next();
  };
};
```

### Caching
```ts
export const cacheMiddleware = (ttl: number): Middleware => {
  return async (ctx, next) => {
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
      await cache.set(cacheKey, body, ttl);
    }

    return response;
  };
};
```

## 5. Middleware Composition
Middleware runs in the order defined in `common.ts`. You can:
- Reorder middleware by changing the array order
- Conditionally include middleware
- Create reusable middleware stacks

### Example: Conditional Middleware
```ts
// routes/admin/common.ts
import { authMiddleware, adminMiddleware } from "~/middleware";

export const middleware = [
  authMiddleware,
  // Only apply admin middleware in production
  ...(process.env.NODE_ENV === "production" ? [adminMiddleware] : [])
];
```

## 6. Error Handling
Middleware can handle errors in several ways:

### Try/Catch Wrapper
```ts
export const errorHandlingMiddleware: Middleware = async (ctx, next) => {
  try {
    return await next();
  } catch (error) {
    console.error("Middleware error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
```

### Error Middleware
Add error-handling middleware at the end of the stack:
```ts
export const middleware = [
  authMiddleware,
  validationMiddleware,
  // Error handler (must be last)
  (ctx, next) => next().catch(error => {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  })
];
```

## 7. Testing Middleware
```ts
import { runMiddlewares } from "pounce/http";
import { middleware } from "./common";

test("auth middleware blocks unauthenticated requests", async () => {
  const response = await runMiddlewares(
    middleware,
    { request: new Request("http://test/users/123"), params: { id: "123" } },
    () => new Response("OK")
  );

  expect(response.status).toBe(401);
});
```
