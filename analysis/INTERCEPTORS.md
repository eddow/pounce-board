# Interceptor Standardization: Route-Centric Middleware

> **Status**: Implementation Phase
> **Ref**: Router-like Interceptor System

## Core Concept

The interceptor system will be standardized as **Client-Side Middleware** managed by a **Router**. 
Instead of separate request/response arrays, we define **Interceptor Routes** that apply middleware pairs to matching outgoing requests.

## 1. The Interceptor Router

We introduce a registry that matches outgoing URLs to middleware chains. This effectively acts as a router for *outgoing* traffic.

```typescript
// Registration API
import { intercept } from 'pounce-board';

// 1. Match specific path
intercept('/api/users', authMiddleware);

// 2. Match external domains (Proxy pattern)
intercept('https://api.stripe.com/**', stripeAuthMiddleware);

// 3. Match everything (Global logging)
intercept('**', loggerMiddleware);
```

## 2. The Middleware Signature

Interceptors are "Middleware Pairs" expressed as a single async function, inspired by Koa/Hono. This gives access to both the request (before `next`) and the response (after `next`) in a single closure.

```typescript
type InterceptorMiddleware = (
    req: Request, 
    next: (req: Request) => Promise<PounceResponse>
) => Promise<PounceResponse>;

// Example: Auth & Error Handling
const authMiddleware: InterceptorMiddleware = async (req, next) => {
    // PRE: Request Interception
    req.headers.set('Authorization', getToken());

    // NEXT: Proceed down the chain (or to network)
    const res = await next(req);

    // POST: Response Interception
    if (res.status === 401) {
        await refreshToken();
        return next(req); // Retry
    }

    return res;
};
```

## 3. PounceResponse: Smart Caching

To make response interception robust, we need a `PounceResponse` class that extends the standard `Response`. 
Standard `Response` bodies can only be read once. `PounceResponse` solves this:

```typescript
class PounceResponse extends Response {
    private _bodyCache: any = null;

    /**
     * Reads JSON, caches it, and returns it. 
     * Subsequent calls return the cached object.
     */
    override async json<T = any>(): Promise<T> {
        if (this._bodyCache) return this._bodyCache;
        this._bodyCache = await super.json();
        return this._bodyCache;
    }

    /**
     * Modify the JSON body. 
     * Useful for transforms or injecting default values.
     */
    setJson(data: any): void {
        this._bodyCache = data;
        // Re-serialize for downstream consumers if they mistakenly use .text() or .blob()? 
        // Or just override .text() to use the cache too.
    }
}
```

## 4. Route-Aware & Scoped Interceptors

To support interceptors that are active only for specific routes (solving code-splitting and scoping issues), we utilize a dynamic registration pattern.

### 4.2 Route-Based Static Exports
Instead of binding interceptors to UI components (which is incorrect as API calls can happen from anywhere), we bind them to the **Route Module**.

**Concept:**
Route modules export an `interceptor` function. The application (or router) registers this middleware when the route bundle is loaded. Once loaded, the interceptor remains active for requests to that domain, regardless of the current page.

**Pattern:** `routes/admin.tsx`
```typescript
import { intercept } from 'pounce-board';

// Pattern A: Implicit Registration (Side-effect)
// Executes when the "Admin" chunk is loaded by the browser.
intercept('/api/admin/**', async (req, next) => {
    req.headers.set('X-Admin-Scope', 'true');
    return next(req);
});

export default function AdminLayout() { ... }
```

**Pattern B: Exported Definition (Framework Managed)**
Future integration with a Router could allow:
```typescript
import { InterceptorMiddleware } from 'pounce-board';

// The router detects this export and registers it for this route's scope
export const interceptor: InterceptorMiddleware = async (req, next) => {
    // ...
};
```

---

## 5. Critique & Alternatives

### 5.1 The Problem with Export Scanning

> [!WARNING]
> **Pattern B** (Framework-Managed Exports) has a fundamental flaw: **To discover `export const interceptor`, the bundler/router must execute (or statically analyze) every route file at startup.**

This defeats the purpose of code-splitting. If the user never visits `/admin`, we still load and parse `routes/admin.tsx` just to check for an `interceptor` export.

**Severity:** High. This is a **bundle size and cold-start performance** problem.

---

### 5.2 Alternatives

#### Alternative A: Dedicated `interceptor.ts` Files (Convention-Based)
Instead of exporting from the route component, use a **dedicated file** per scope:
```
routes/
  admin/
    index.tsx          # UI Component
    interceptor.ts     # Interceptor for ~/api/admin/**
  users/
    index.tsx
```

**How it works:**
1. At build time (Vite plugin, esbuild, etc.), scan the filesystem for `interceptor.ts` files.
2. Generate a manifest: `{ "admin": () => import("./routes/admin/interceptor.ts") }`.
3. At runtime, lazy-load the interceptor *only when the first matching API call is made*.

**Pros:**
- Code-splitting preserved.
- Clear convention.

**Cons:**
- Requires build tooling.
- Interceptor is not immediately active on page load (first API call triggers lazy load).

---

#### Alternative B: Centralized `interceptors.ts` (Explicit Registration)
A single file explicitly registers all interceptors:
```typescript
// interceptors.ts
import { intercept } from 'pounce-board';

// Global
intercept('**', loggingMiddleware);

// Scoped (loaded immediately, but logic is minimal)
intercept('/api/admin/**', adminAuthMiddleware);
intercept('/api/billing/**', billingMiddleware);
```

**Pros:**
- Simple. No magic.
- All interceptors visible in one place.

**Cons:**
- No code-splitting for interceptor logic (all loaded upfront).
- Can become unwieldy in large apps.

---

#### Alternative C: Lazy Interceptors (On-Demand Loading)
The `intercept()` function accepts a **factory** instead of a middleware function:
```typescript
// Lazy loading: the actual middleware code is not loaded until first match
intercept('/api/admin/**', () => import('./interceptors/admin').then(m => m.default));
```

**How it works:**
1. On first API call matching `/api/admin/**`, the factory is invoked.
2. The middleware chunk is loaded.
3. The middleware is then executed and cached for future calls.

**Pros:**
- Code-splitting preserved.
- Works with existing `intercept()` API (minor extension).

**Cons:**
- First matching request has latency (chunk load).
- Slightly more complex API.

---

#### Alternative D: Path-Based Lazy Evaluation (`common.tsx`)
Interceptors are defined in `common.tsx` files (similar to `layout.tsx` for UI). They are **only evaluated when an API call is made** to a matching path.

**Structure:**
```
routes/
  common.tsx           # Global interceptor (evaluated for ALL API calls)
  admin/
    common.tsx         # Admin interceptor (evaluated for /api/admin/**)
    dashboard.tsx      # Optional: dashboard-specific interceptor
  users/
    common.tsx
```

**How it works:**
1. When `api('/api/admin/stats').get()` is called:
   - Resolve path segments: `['admin', 'stats']`
   - Lazy-load `routes/common.tsx`, then `routes/admin/common.tsx`
   - If `routes/admin/dashboard.tsx` exists and has an `interceptor` export, load it too
   - Execute the interceptor chain
2. Interceptors are cached after first load (same chunks are not re-fetched).

**Pros:**
- Code-splitting preserved (lazy on first API call to that domain).
- Mirrors the routing structure developers already understand.
- No upfront parsing of all route files.

**Cons:**
- Requires a build step to generate the path→chunk manifest.
- First API call to a new domain has latency (chunk load).
- Slightly more complex runtime logic.

---

### 5.3 Recommendation

| Approach | Code-Splitting | Simplicity | Build Tooling |
|----------|----------------|------------|---------------|
| B (Centralized) | ❌ | ✅ Best | None |
| C (Lazy Factory) | ✅ | ⚠️ Moderate | None |
| D (Path-Based) | ✅ | ⚠️ Moderate | Required |

**Pragmatic Choice:**
> [!TIP]
> **Start with Alternative B (Centralized)**. It's the simplest, requires no tooling, and interceptor logic is typically small (token injection, logging, error transforms). You can always migrate to C or D later if bundle size becomes a concern.

**Why B isn't "backward":**
The complex file-based routing is for **UI code**, which has significant bundle impact. Interceptors are typically <1KB of logic. The overhead of centralizing them is minimal compared to the complexity of path-based lazy evaluation.

**When to consider D:**
- If you have **heavy, domain-specific interceptor logic** (e.g., a complex admin auth flow with its own dependencies).
- If you're already building a router plugin for other features (hot-reloading, prefetching).

**Pattern A (Side-Effect in Route)** remains valid for cases where:
- The interceptor is tightly coupled to a specific route.
- The route is guaranteed to be loaded when the API call is needed (e.g., the route's component makes the call).

---

## 6. Final Decision

> [!IMPORTANT]
> **We will use Alternative B (Centralized Registration).**

**Rationale:**
1. **Simplicity over elegance**: Interceptor logic is typically <1KB. The overhead of lazy-loading is not justified.
2. **Debuggability**: A single `interceptors.ts` file is easy to audit, test, and reason about.
3. **Zero tooling**: No Vite plugins, no manifests, no build-time magic.
4. **Escape hatch exists**: If a specific interceptor grows large, it can be refactored to use a lazy factory (Alternative C) without changing the registration pattern.

---

## 7. Pattern Matching: Regex vs. Potent Routing

### Current Implementation
The current `matchPattern()` function supports:
- `**` (match all)
- `*` (match single segment)
- `/path/**` (prefix match)
- `/exact/path` (exact match)
- `RegExp` (full regex power)

### Do We Need Params/Query Matching?

**Arguments FOR potent routing (`/users/:id`, `?role=admin`):**
- Consistency with server-side routing patterns.
- Enables interceptors like: "Add admin headers only when `?admin=true` is present".

**Arguments AGAINST potent routing:**
- **Complexity**: Requires a full path parser (radix tree, path-to-regexp).
- **Rare use case**: Interceptors typically apply to *domains* (`/api/admin/**`), not individual resources (`/users/123`).
- **Regex covers edge cases**: For the rare case of query matching, `intercept(/\?.*admin=true/, handler)` works.

### Recommendation

> [!TIP]
> **Keep it simple: Glob + Regex is sufficient.**

| Pattern Type | Example | Supported |
|--------------|---------|-----------|
| Prefix | `/api/admin/**` | ✅ |
| Exact | `/api/login` | ✅ |
| Regex | `/\/users\/\d+/` | ✅ |
| Params | `/users/:id` | ❌ (use regex) |
| Query | `?role=admin` | ❌ (use regex) |

**Why not params?**
- Params are useful when you need to *extract* values (e.g., `ctx.params.id`).
- Interceptors don't need to extract—they just need to *match*. Regex handles this.

**If we ever need params:**
Consider adding a `path-to-regexp` conversion utility:
```typescript
import { pathToRegexp } from 'path-to-regexp';
intercept(pathToRegexp('/users/:id'), handler);
```
This keeps the core simple while enabling power users.

