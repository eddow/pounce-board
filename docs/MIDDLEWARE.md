# Middleware System

Pounce-Board uses a **hierarchical middleware system** where middleware defined in `common.ts` files automatically applies to all descendant routes.

## File Convention

| File | Role |
|------|------|
| `routes/common.ts` | Root middleware (applies to all routes) |
| `routes/api/common.ts` | API middleware (applies to `/api/*`) |
| `routes/api/users/common.ts` | Users middleware (applies to `/api/users/*`) |

## Execution Order

Middleware runs in **ancestor → descendant order**:

```
Request: GET /api/users/123

Execution:
1. routes/common.ts         (root)
2. routes/api/common.ts     (api)
3. routes/api/users/common.ts (users)
4. routes/api/users/[id]/index.ts → get() handler
```

## Defining Middleware

Export a `middleware` array from `common.ts`:

```typescript
// routes/api/common.ts
import type { Middleware, RequestContext } from 'pounce-board/http/core.js'

export const middleware: Middleware[] = [
  async (ctx: RequestContext, next: () => Promise<Response>) => {
    // Pre-processing
    ctx.apiVersion = 'v1'
    
    const response = await next()
    
    // Post-processing (optional)
    return response
  },
]
```

## Context Propagation

Middleware can add properties to the `RequestContext`, which are available to all downstream middleware and handlers:

```typescript
// routes/common.ts
export const middleware: Middleware[] = [
  async (ctx, next) => {
    ctx.requestId = crypto.randomUUID()
    return next()
  },
]

// routes/api/users/[id]/index.ts
export async function get(ctx: RequestContext) {
  // ctx.requestId is available here
  return { status: 200, data: { id: ctx.params.id, requestId: ctx.requestId } }
}
```

## Middleware Patterns

### Authentication

```typescript
// routes/(protected)/common.ts
export const middleware: Middleware[] = [
  async (ctx, next) => {
    const token = ctx.request.headers.get('Authorization')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    ctx.user = await verifyToken(token)
    return next()
  },
]
```

### Rate Limiting

```typescript
// routes/api/common.ts
const rateLimiter = new Map<string, number>()

export const middleware: Middleware[] = [
  async (ctx, next) => {
    const ip = ctx.request.headers.get('x-forwarded-for') || 'unknown'
    const count = rateLimiter.get(ip) || 0
    
    if (count > 100) {
      return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429 })
    }
    
    rateLimiter.set(ip, count + 1)
    return next()
  },
]
```

### Logging

```typescript
// routes/common.ts
export const middleware: Middleware[] = [
  async (ctx, next) => {
    const start = performance.now()
    console.log(`→ ${ctx.request.method} ${ctx.request.url}`)
    
    const response = await next()
    
    const duration = performance.now() - start
    console.log(`← ${response.status} (${duration.toFixed(2)}ms)`)
    
    return response
  },
]
```

## Testing Middleware

See [`tests/integration/middleware-chain.spec.ts`](file:///home/fmdm/dev/ownk/pounce-board/tests/integration/middleware-chain.spec.ts) for comprehensive tests covering:

- Execution order verification
- Context propagation across middleware layers
- Middleware stack collection from ancestor directories
