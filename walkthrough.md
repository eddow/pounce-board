# Pounce-Board Project Walkthrough

> **Status:** Project specification complete, implementation not yet begun.

---

## Dependency Documentation

> [!IMPORTANT]
> **Read these LLM.md files before implementing:**
> - [pounce-ts/LLM.md](file:///home/fmdm/dev/ownk/pounce-ts/LLM.md) – UI framework, fine-grained reactivity, JSX transforms
> - [mutts/LLM.md](file:///home/fmdm/dev/ownk/mutts/LLM.md) – Reactivity system (**used both FE and BE**)
> - [bounce-ts/LLM.md](file:///home/fmdm/dev/ownk/bounce-ts/LLM.md) – Existing Pounce implementation (reference for patterns)

---

## Analysis Documents Reference

| Document | Purpose | Key Content |
|----------|---------|-------------|
| [README.md](file:///home/fmdm/dev/ownk/pounce-board/analysis/README.md) | Quick start | Feature list, basic examples |
| [CONCEPTS.md](file:///home/fmdm/dev/ownk/pounce-board/analysis/CONCEPTS.md) | Core concepts | Routing, API calls, SSR flow, middleware |
| [ARCHITECTURE.md](file:///home/fmdm/dev/ownk/pounce-board/analysis/ARCHITECTURE.md) | Full architecture | Diagrams, security, scalability, CI/CD, plugins |
| [API.md](file:///home/fmdm/dev/ownk/pounce-board/analysis/API.md) | API reference | `api()`, `getSSRData()`, `Middleware` type, `defineProxy()` |
| [SSR.md](file:///home/fmdm/dev/ownk/pounce-board/analysis/SSR.md) | SSR guide | Injection, hydration, framework integrations |
| [MIDDLEWARE.md](file:///home/fmdm/dev/ownk/pounce-board/analysis/MIDDLEWARE.md) | Middleware patterns | Auth, rate-limiting, validation, caching, composition |
| [EXTERNAL_APIS.md](file:///home/fmdm/dev/ownk/pounce-board/analysis/EXTERNAL_APIS.md) | External proxies | `defineProxy()`, transforms, mocking, auth |
| [IMPLEMENTATION.md](file:///home/fmdm/dev/ownk/pounce-board/analysis/IMPLEMENTATION.md) | Core implementation | HTTP core, client, SSR utils, proxy system, testing |
| [EXAMPLES.md](file:///home/fmdm/dev/ownk/pounce-board/analysis/EXAMPLES.md) | Full examples | Blog, E-commerce, Admin dashboard |
| [MIGRATION.md](file:///home/fmdm/dev/ownk/pounce-board/analysis/MIGRATION.md) | Migration guides | From Express, Next.js, SvelteKit, NestJS |
| [BEST_PRACTICES.md](file:///home/fmdm/dev/ownk/pounce-board/analysis/BEST_PRACTICES.md) | Best practices | Structure, types, security, testing, deployment |

---

## Overview

**Pounce-Board** is a full-stack meta-framework for **pounce-ts**—analogous to what SvelteKit is to Svelte.

```
┌─────────────────────────────────────────────────────────────┐
│                       pounce-board                          │
│  (Full-stack meta-framework)                                │
│  - File-based routing        - Middleware stacks            │
│  - SSR hydration             - External API proxies         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        pounce-ts                            │
│  (UI Component Framework)                                   │
│  - Fine-grained reactivity   - Direct DOM manipulation      │
│  - Two-way binding via JSX   - No Virtual DOM               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          mutts                              │
│  (Reactivity Foundation - Used FE + BE)                     │
│  - reactive(obj)             - effect(() => {...})          │
│  - memoize()                 - Destroyable, Mixins          │
└─────────────────────────────────────────────────────────────┘
```

### Core Features

| Feature | Description |
|---------|-------------|
| **File-based routing** | `routes/users/[id]/index.ts` → `/users/:id` |
| **Type-safe API calls** | Full TypeScript inference for API responses |
| **SSR data injection** | API responses embedded as `<script type="application/json">` tags |
| **Explicit middleware** | Per-route `common.ts` defines middleware stacks |
| **External API proxies** | `defineProxy()` for typed third-party API integration |
| **mutts reactivity BE** | Use reactive patterns on server-side too |

---

## Project Structure & File Conventions

> [!IMPORTANT]
> **No SvelteKit-style `+` prefixes!** File type determines role:
> - `.tsx` = **Frontend** (components, layouts)
> - `.ts` = **Backend** (handlers, middleware)

### Framework Source Structure

```
pounce-board/
├── src/
│   ├── lib/                       # Framework internals
│   │   ├── tsconfig.json          # Shared lib tsconfig
│   │   ├── http/
│   │   │   ├── core.ts            # Middleware runner, types
│   │   │   ├── client.ts          # API client (universal FE+BE)
│   │   │   └── proxy.ts           # External API proxy system
│   │   ├── ssr/
│   │   │   └── utils.ts           # SSR injection/hydration
│   │   └── router/
│   │       └── index.ts           # File-based router
│   ├── adapters/
│   │   ├── hono.ts
│   │   └── vercel.ts
│   └── cli/
│       └── index.ts               # Dev server, build commands
├── tsconfig.json                  # Root tsconfig
├── tsconfig.fe.json               # Frontend-specific config
└── tsconfig.be.json               # Backend-specific config
```

### Route File Conventions

| File | Role | Description |
|------|------|-------------|
| `index.tsx` | FE | Page component for folder path (e.g., `/users`) |
| `index.ts` | BE | API handlers for folder path (`get`, `post`, etc.) |
| `common.tsx` | FE | **Layout** component wrapping child routes |
| `common.ts` | BE | **Middleware** stack for route and descendants |
| `dashboard.tsx` | FE | Page component for `/dashboard` |
| `dashboard.ts` | BE | API handlers for `/dashboard` |
| `*.d.ts` | Shared | Types following same pattern: `index.d.ts`, `common.d.ts`, `dashboard.d.ts` |

### Route Examples

```
routes/
├── common.tsx                     # Root layout
├── common.ts                      # Root middleware (auth, etc.)
├── index.tsx                      # Home page (/)
├── index.ts                       # Home API handlers
│
├── users/
│   ├── common.tsx                 # Users layout
│   ├── common.ts                  # Users middleware
│   ├── index.tsx                  # Users list page (/users)
│   ├── index.ts                   # Users list handlers
│   ├── [id]/                      # Dynamic segment
│   │   ├── index.tsx              # User detail page (/users/123)
│   │   ├── index.ts               # User detail handlers
│   │   ├── edit.tsx               # Edit page (/users/123/edit)
│   │   └── edit.ts                # Edit handlers
│   └── types.d.ts                 # Shared User types
│
├── (auth)/                        # Route group (not in URL!)
│   ├── common.tsx                 # Auth layout (login/register share)
│   ├── common.ts                  # Auth middleware
│   ├── login.tsx                  # Login page (/login, NOT /auth/login)
│   ├── login.ts                   # Login handlers
│   ├── register.tsx               # Register page (/register)
│   └── register.ts                # Register handlers
│
└── dashboard/
    ├── common.tsx                 # Dashboard layout
    ├── common.ts                  # Dashboard auth middleware
    ├── index.tsx                  # Dashboard home (/dashboard)
    ├── index.ts                   # Dashboard handlers
    ├── settings.tsx               # Settings page (/dashboard/settings)
    └── settings.ts                # Settings handlers
```

### Route Groups `(folderName)`

Folders wrapped in parentheses are **not included in the URL** but allow shared layouts and middleware:

```
(auth)/login.tsx    →  /login      (not /auth/login)
(auth)/register.tsx →  /register   (not /auth/register)
(admin)/users.tsx   →  /users      (shares admin layout, not in URL)
```

### TypeScript Configuration

**`tsconfig.json`** (root):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "paths": {
      "~/lib/*": ["./src/lib/*"],
      "~/routes/*": ["./routes/*"]
    }
  },
  "references": [
    { "path": "./tsconfig.fe.json" },
    { "path": "./tsconfig.be.json" }
  ]
}
```

**`tsconfig.fe.json`** (Frontend):
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "pounce-ts",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "types": ["vite/client"]
  },
  "include": ["routes/**/*.tsx", "src/**/*.tsx"]
}
```

**`tsconfig.be.json`** (Backend):
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": ["routes/**/*.ts", "src/**/*.ts"],
  "exclude": ["**/*.tsx"]
}
```

### File Resolution Summary

| URL Path | FE Component | BE Handler | Layout Chain |
|----------|--------------|------------|--------------|
| `/` | `index.tsx` | `index.ts` | `common.tsx` |
| `/users` | `users/index.tsx` | `users/index.ts` | `common.tsx` → `users/common.tsx` |
| `/users/123` | `users/[id]/index.tsx` | `users/[id]/index.ts` | `common.tsx` → `users/common.tsx` |
| `/users/123/edit` | `users/[id]/edit.tsx` | `users/[id]/edit.ts` | `common.tsx` → `users/common.tsx` |
| `/login` | `(auth)/login.tsx` | `(auth)/login.ts` | `common.tsx` → `(auth)/common.tsx` |
| `/dashboard` | `dashboard/index.tsx` | `dashboard/index.ts` | `common.tsx` → `dashboard/common.tsx` |


## Key Concepts Summary

### mutts Reactivity (FE + BE)
```ts
import { reactive, effect, memoize } from 'mutts/reactive';

const state = reactive({ count: 0 });
effect(() => console.log(state.count)); // Re-runs on change
const doubled = memoize(() => state.count * 2);
```

### Route Handlers
```ts
// routes/users/[id]/index.ts
export async function get({ params, context }) {
  return { status: 200, data: { id: params.id } };
}
```

### Middleware
```ts
// routes/users/common.ts
export const middleware: Middleware[] = [
  async (ctx, next) => {
    ctx.user = await getUser(ctx.request);
    return next();
  }
];
```

### API Client
```ts
api(".")              // Relative
api("/users/123")     // Absolute
api("~/api/legacy")   // External proxy
```

### SSR Hydration
```tsx
const data = getSSRData<User>("api-response-user-123");
```

---

## pounce-ts Integration Notes

> [!WARNING]
> **Anti-patterns to avoid:**
> - `{condition && <Component>}` → Use `<Component if={condition}>`
> - `items.map(i => <Item />)` → Use `<for each={items}>{i => <Item />}</for>`
> - `const { value } = props` → Access props directly, don't destructure
> - `<Button onClick={() => state.val = x}>` → Let component handle via props

---

# Comprehensive TODO List

## Phase 1: Project Setup

### 1.1 Initialize Project
- [ ] Create `package.json` with proper metadata
- [ ] Configure TypeScript (`tsconfig.json`)
- [ ] Set up Biome for linting/formatting
- [ ] Configure Vite for development
- [ ] Set up test framework (Vitest)
- [ ] Create `sandbox/` folder for development
- [ ] Add `.gitignore`

### 1.2 Dependencies
- [ ] Add `mutts` as dependency
- [ ] Add `pounce-ts` as dependency
- [ ] Implement Hono adapter (primary integration)
- [ ] Add Zod for validation
- [ ] Add development dependencies (Vite, TypeScript, etc.)

---

## Phase 2: Core HTTP Layer

### 2.1 Core Types (`lib/http/core.ts`)
- [ ] Define `HttpMethod` type
- [ ] Define `RequestContext` interface
- [ ] Define `Middleware` type signature
- [ ] Define `RouteHandler` interface
- [ ] Define `RouteResponse` type (`{ status, data?, error?, headers? }`)

### 2.2 Middleware Runner
- [ ] Implement `runMiddlewares(stack, context, handler)`
- [ ] Handle middleware chain execution
- [ ] Handle short-circuit responses
- [ ] Handle error propagation
- [ ] Add timing/performance instrumentation hooks

### 2.3 Response Utilities
- [ ] Implement `createJsonResponse(data, status, headers)`
- [ ] Implement `createErrorResponse(error, status)`
- [ ] Implement response compression utilities
- [ ] Add security headers helper

---

## Phase 3: API Client

### 3.1 Core Client (`lib/http/client.ts`)
- [ ] Implement `api(path)` factory function
- [ ] Implement relative path resolution (`"."`)
- [ ] Implement absolute path handling (`"/users/123"`)
- [ ] Implement external proxy prefix (`"~/api/..."`)

### 3.2 HTTP Methods
- [ ] Implement `.get<T>(params?)`
- [ ] Implement `.post<T>(body)`
- [ ] Implement `.put<T>(body)`
- [ ] Implement `.del<T>(params?)`
- [ ] Implement `.patch<T>(body)`

### 3.3 SSR Awareness
- [ ] Implement `enableSSR()` mode flag
- [ ] Implement server-side direct function call (no network)
- [ ] Implement client-side script tag reading (first load)
- [ ] Implement client-side fetch (navigation)
- [ ] Track API calls during SSR for injection

### 3.4 Error Handling
- [ ] Implement typed error responses
- [ ] Add retry logic (optional)
- [ ] Add timeout handling
- [ ] Add request/response interceptors

---

## Phase 4: SSR System

### 4.1 Server-Side Injection (`lib/ssr/utils.ts`)
- [ ] Implement `injectApiResponses(html, responses)`
- [ ] Generate unique script tag IDs
- [ ] Handle JSON serialization safely (XSS prevention)
- [ ] Support streaming responses (optional)

### 4.2 Client-Side Hydration
- [ ] Implement `getSSRData<T>(id)`
- [ ] Handle missing script tags gracefully
- [ ] Implement one-time consumption (prevent memory leaks)
- [ ] Add debug logging for hydration misses

### 4.3 SSR Integration
- [ ] Create SSR context for tracking API calls
- [ ] Integrate with pounce-ts rendering
- [ ] Handle async component data fetching
- [ ] Document SSR patterns and gotchas

---

## Phase 5: External API Proxies

### 5.1 Proxy Definition (`lib/http/proxy.ts`)
- [ ] Implement `defineProxy(config)` function
- [ ] Support `baseUrl` configuration
- [ ] Support global `request` transforms
- [ ] Support per-endpoint configuration

### 5.2 Endpoint Features
- [ ] Implement `path` with `{param}` substitution
- [ ] Implement `method` (GET, POST, PUT, DELETE, PATCH)
- [ ] Implement `transform(response, params)` for response mapping
- [ ] Implement `prepare(body)` for request mapping
- [ ] Implement `params(input)` for query parameter mapping
- [ ] Implement `onError(error)` for custom error handling
- [ ] Implement `schema` for Zod validation
- [ ] Implement `raw` flag for non-JSON responses
- [ ] Implement `mock(params)` for development mocking

### 5.3 Advanced Features
- [ ] Support file uploads (FormData)
- [ ] Support streaming responses
- [ ] Support request retries
- [ ] Support request caching
- [ ] Type inference from endpoint definitions

---

## Phase 6: File-Based Router

### 6.1 Route Scanner (`lib/router/index.ts`)
- [ ] Scan `routes/` directory structure
- [ ] Parse dynamic segments (`[id]`, `[...slug]`)
- [ ] Build route tree from filesystem
- [ ] Support `import.meta.glob` for Vite
- [ ] Support Node.js file scanning fallback

### 6.2 Route Matching
- [ ] Implement path-to-route matching
- [ ] Handle dynamic segments extraction
- [ ] Handle catch-all segments
- [ ] Handle route priority/ordering

### 6.3 Handler Loading
- [ ] Load `index.ts` for backend handlers
- [ ] Load `index.tsx` for frontend components
- [ ] Load `common.ts` for middleware
- [ ] Load `types.d.ts` for shared types
- [ ] Handle hot module replacement in dev

### 6.4 Middleware Inheritance
- [ ] Collect middleware from parent directories
- [ ] Merge middleware stacks correctly
- [ ] Cache compiled middleware stacks
- [ ] Document middleware order guarantees

---

## Phase 7: Server Adapters

### 7.1 Hono Integration (Automated)
- [ ] Implement `createHonoMiddleware()` connecting pounce router to Hono
- [ ] Automate route table registration
- [ ] Automate middleware stack registration
- [ ] Handle request/response conversion


### 7.5 Vercel Adapter (`adapters/vercel.ts`)
- [ ] Implement serverless function handler
- [ ] Handle edge function support
- [ ] Support ISR (Incremental Static Regeneration)
- [ ] Handle environment variables

### 7.6 Additional Adapters (Future)
- [ ] Netlify adapter
- [ ] Cloudflare Workers adapter
- [ ] Deno adapter
- [ ] Bun adapter

---

## Phase 8: CLI Tooling

### 8.1 Development Server (`cli/dev.ts`)
- [ ] Implement `pounce dev` command
- [ ] Integrate Vite for HMR
- [ ] Handle API route hot reloading
- [ ] Display route table on startup
- [ ] Add port configuration

### 8.2 Build Command (`cli/build.ts`)
- [ ] Implement `pounce build` command
- [ ] Bundle client-side code
- [ ] Compile server-side code
- [ ] Generate route manifest
- [ ] Optimize for production

### 8.3 Preview Command (`cli/preview.ts`)
- [ ] Implement `pounce preview` command
- [ ] Serve production build locally
- [ ] Simulate production environment

### 8.4 Code Generation (`cli/generate.ts`)
- [ ] Implement `pounce generate route <name>`
- [ ] Implement `pounce generate middleware <name>`
- [ ] Implement `pounce generate proxy <name>`
- [ ] Generate type definitions from OpenAPI specs

---

## Phase 9: Type System

### 9.1 Route Types
- [ ] Generate types for route parameters
- [ ] Generate types for query parameters
- [ ] Infer handler return types
- [ ] Share types between client and server

### 9.2 API Client Types
- [ ] Type `api(path)` return based on path
- [ ] Infer response types from handlers
- [ ] Support generic type parameters
- [ ] Handle error types

### 9.3 Middleware Types
- [ ] Type context extensions properly
- [ ] Support generic middleware factories
- [ ] Type-safe context access in handlers

### 9.4 External Proxy Types
- [ ] Infer types from `defineProxy()` config
- [ ] Generate `.d.ts` from OpenAPI specs
- [ ] Support Zod schema inference

---

## Phase 10: Testing Architecture

### Test Structure Overview

```
pounce-board/
├── src/
│   ├── lib/
│   │   ├── http/
│   │   │   ├── core.ts
│   │   │   ├── core.spec.ts          # ← Colocated unit test
│   │   │   ├── client.ts
│   │   │   ├── client.spec.ts        # ← Colocated unit test
│   │   │   ├── proxy.ts
│   │   │   └── proxy.spec.ts         # ← Colocated unit test
│   │   ├── ssr/
│   │   │   ├── utils.ts
│   │   │   └── utils.spec.ts         # ← Colocated unit test
│   │   └── router/
│   │       ├── index.ts
│   │       └── index.spec.ts         # ← Colocated unit test
│   └── adapters/
│       ├── hono.ts
│       └── hono.spec.ts              # ← Colocated unit test
│
├── tests/                            # ← E2E + Integration tests
│   ├── e2e/                          # ← Playwright tests
│   │   ├── navigation.spec.ts
│   │   ├── ssr-hydration.spec.ts
│   │   ├── forms.spec.ts
│   │   ├── api-routes.spec.ts
│   │   └── error-handling.spec.ts
│   │
│   ├── integration/                  # ← Integration tests (Vitest)
│   │   ├── middleware-chain.spec.ts
│   │   ├── route-loading.spec.ts
│   │   └── ssr-flow.spec.ts
│   │
│   └── consumers/                    # ← Test consumer apps
│       ├── minimal-app/              # Minimal pounce-board app
│       │   ├── routes/
│       │   │   ├── index.ts
│       │   │   ├── index.tsx
│       │   │   └── users/
│       │   │       └── [id]/
│       │   │           ├── index.ts
│       │   │           ├── index.tsx
│       │   │           └── common.ts

│       │   ├── package.json          # Uses pounce-board as dep
│       │   └── vite.config.ts
│       │
│       ├── blog-app/                 # Blog example as test
│       │   └── ...
│       │
│       └── e-commerce-app/           # E-commerce example as test
│           └── ...
│
├── vitest.config.ts                  # Unit + Integration config
├── playwright.config.ts              # E2E config
└── package.json
```

### 10.1 Unit Tests (Vitest - Colocated `.spec.ts` files)

Tests live **next to their source files** for easy discovery and maintenance.

**Configuration (`vitest.config.ts`):**
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/tests/**', '**/node_modules/**']
    }
  }
});
```

**Unit Test TODOs:**

#### `lib/http/core.spec.ts`
- [ ] Test `runMiddlewares()` executes chain in order
- [ ] Test middleware can short-circuit with Response
- [ ] Test context mutations propagate through chain
- [ ] Test error propagation from handler
- [ ] Test error propagation from middleware
- [ ] Test empty middleware stack calls handler directly

#### `lib/http/client.spec.ts`
- [ ] Test `api(".")` relative path resolution
- [ ] Test `api("/abs")` absolute path handling
- [ ] Test `api("~/proxy")` external proxy prefix detection
- [ ] Test `.get()`, `.post()`, `.put()`, `.del()`, `.patch()` methods
- [ ] Test SSR mode returns cached data
- [ ] Test client mode fetches from network
- [ ] Test error response typing

#### `lib/http/proxy.spec.ts`
- [ ] Test `defineProxy()` creates callable endpoints
- [ ] Test `{param}` path substitution
- [ ] Test `prepare()` transforms request body
- [ ] Test `transform()` transforms response
- [ ] Test `params()` adds query parameters
- [ ] Test `onError()` handles failures
- [ ] Test `schema` validates with Zod
- [ ] Test `mock()` returns mock data in dev
- [ ] Test `raw` flag returns Response object

#### `lib/ssr/utils.spec.ts`
- [ ] Test `injectApiResponses()` adds script tags
- [ ] Test script tag IDs are unique
- [ ] Test JSON is properly escaped (XSS prevention)
- [ ] Test `getSSRData()` reads from script tags
- [ ] Test `getSSRData()` returns null for missing tags
- [ ] Test one-time consumption removes data

#### `lib/router/index.spec.ts`
- [ ] Test route tree building from filesystem
- [ ] Test `[id]` dynamic segment parsing
- [ ] Test `[...slug]` catch-all parsing
- [ ] Test route matching priority
- [ ] Test middleware inheritance collection
- [ ] Test handler file loading

---

### 10.2 Integration Tests (Vitest - `/tests/integration/`)

Tests that verify multiple modules working together.

**Configuration (extends `vitest.config.ts`):**
```ts
// vitest.config.ts (add to test.include)
include: ['src/**/*.spec.ts', 'tests/integration/**/*.spec.ts'],
```

**Integration Test TODOs:**

#### `tests/integration/middleware-chain.spec.ts`
- [ ] Test parent middleware runs before child middleware
- [ ] Test grandparent → parent → child order
- [ ] Test middleware from multiple `common.ts` files merge
- [ ] Test auth middleware blocks unauthorized requests
- [ ] Test context additions available in handlers

#### `tests/integration/route-loading.spec.ts`
- [ ] Test `index.ts` handlers are loaded
- [ ] Test `index.tsx` components are loaded
- [ ] Test `types.d.ts` types are available
- [ ] Test `common.ts` middleware is attached
- [ ] Test HMR reloads routes in development

#### `tests/integration/ssr-flow.spec.ts`
- [ ] Test SSR renders component with data
- [ ] Test API responses are injected as script tags
- [ ] Test client hydrates from script tags
- [ ] Test client falls back to fetch on miss
- [ ] Test SSR context tracks all API calls

---

### 10.3 E2E Tests (Playwright - `/tests/e2e/`)

Browser-based tests using consumer apps.

**Configuration (`playwright.config.ts`):**
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: [
    {
      command: 'npm run dev',
      cwd: './tests/consumers/minimal-app',
      port: 3100,
      reuseExistingServer: !process.env.CI
    }
  ],
  use: {
    baseURL: 'http://localhost:3100'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } }
  ]
});
```

**E2E Test TODOs:**

#### `tests/e2e/navigation.spec.ts`
- [ ] Test initial page load renders correctly
- [ ] Test client-side navigation between routes
- [ ] Test dynamic route params (`/users/123`)
- [ ] Test navigation preserves state
- [ ] Test back/forward browser navigation
- [ ] Test 404 handling for unknown routes

#### `tests/e2e/ssr-hydration.spec.ts`
- [ ] Test page has SSR content before JS loads
- [ ] Test hydration doesn't cause flicker
- [ ] Test script tags contain expected data
- [ ] Test interactive after hydration
- [ ] Test hydration with multiple data sources

#### `tests/e2e/forms.spec.ts`
- [ ] Test form submission via POST
- [ ] Test form with file upload
- [ ] Test validation error display
- [ ] Test success redirect
- [ ] Test optimistic UI updates

#### `tests/e2e/api-routes.spec.ts`
- [ ] Test GET endpoint returns JSON
- [ ] Test POST endpoint accepts body
- [ ] Test PUT/PATCH updates resource
- [ ] Test DELETE removes resource
- [ ] Test middleware runs on API routes
- [ ] Test typed error responses

#### `tests/e2e/error-handling.spec.ts`
- [ ] Test 404 page display
- [ ] Test 500 error page display
- [ ] Test API error response format
- [ ] Test network failure handling
- [ ] Test timeout handling

---

### 10.4 Consumer Test Apps (`/tests/consumers/`)

**Real applications** that use pounce-board as a dependency, ensuring the package works correctly when consumed.

#### `tests/consumers/minimal-app/`
Bare-minimum app to test basic functionality:
- [ ] Create `package.json` with `pounce-board` dependency
- [ ] Create single route with handler + page
- [ ] Create dynamic route `/users/[id]`
- [ ] Create middleware example
- [ ] Create SSR data loading example

#### `tests/consumers/blog-app/`
Full blog implementation (from [EXAMPLES.md](file:///home/fmdm/dev/ownk/pounce-board/analysis/EXAMPLES.md)):
- [ ] Posts CRUD routes
- [ ] Authentication middleware
- [ ] SSR with initial data
- [ ] External API proxy for comments

#### `tests/consumers/e-commerce-app/`
E-commerce implementation (from [EXAMPLES.md](file:///home/fmdm/dev/ownk/pounce-board/analysis/EXAMPLES.md)):
- [ ] Product catalog routes
- [ ] Cart management
- [ ] External payment API proxy
- [ ] Complex middleware chains

---

### 10.5 Test Commands

**`package.json` scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest --project unit",
    "test:integration": "vitest --project integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:coverage": "vitest --coverage",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

---

### 10.6 Test Utilities

**Create shared test utilities:**

#### `tests/utils/mock-request.ts`
- [ ] `createMockRequest(method, url, body?)` – Create mock Request
- [ ] `createMockContext(overrides)` – Create mock RequestContext
- [ ] `createMockResponse(data, status)` – Create mock Response

#### `tests/utils/test-server.ts`
- [ ] `startTestServer(routes)` – Spin up temporary server
- [ ] `stopTestServer()` – Clean shutdown
- [ ] `makeRequest(path, options)` – Make request to test server

#### `tests/utils/fixtures.ts`
- [ ] Sample user data
- [ ] Sample post data
- [ ] Sample middleware factories
- [ ] Sample route handlers

---

## Phase 11: Documentation

### 11.1 API Documentation
- [ ] Document all public APIs
- [ ] Add JSDoc comments
- [ ] Generate API reference docs

### 11.2 Guides
- [ ] Getting Started guide
- [ ] Routing guide
- [ ] Middleware guide
- [ ] SSR guide
- [ ] External APIs guide
- [ ] Deployment guide

### 11.3 Examples
- [ ] Minimal example
- [ ] Blog example (from analysis)
- [ ] E-commerce example (from analysis)
- [ ] Admin dashboard example (from analysis)

### 11.4 Migration Guides
- [ ] From Express
- [ ] From Next.js
- [ ] From SvelteKit
- [ ] From NestJS

---

## Phase 12: Advanced Features (Future)

### 12.1 Plugin System
- [ ] Define plugin interface
- [ ] Implement plugin registration
- [ ] Support middleware plugins
- [ ] Support route plugins
- [ ] Support client extensions

### 12.2 Real-time Features
- [ ] WebSocket integration
- [ ] Server-Sent Events support
- [ ] Real-time subscriptions

### 12.3 Performance
- [ ] Response caching middleware
- [ ] Database query caching
- [ ] Bundle optimization
- [ ] Code splitting strategies

### 12.4 Security
- [ ] CSRF protection middleware
- [ ] Rate limiting middleware
- [ ] Security headers middleware
- [ ] Input sanitization utilities

### 12.5 Observability
- [ ] Request logging
- [ ] Performance metrics
- [ ] Error tracking integration
- [ ] Distributed tracing

---

## Phase 13: Release & Maintenance

### 13.1 Package Publishing
- [ ] Finalize `package.json`
- [ ] Set up npm publishing
- [ ] Create CHANGELOG.md
- [ ] Version management (SemVer)

### 13.2 CI/CD
- [ ] GitHub Actions for tests
- [ ] Automated npm publishing
- [ ] Documentation deployment

### 13.3 Community
- [ ] README.md for npm
- [ ] Contributing guide
- [ ] Issue templates
- [ ] Discussion forum setup

---

## Quick Reference: What Lives Where

| Concept | pounce-board | pounce-ts | mutts |
|---------|--------------|-----------|-------|
| Reactivity | Uses for BE caching | Uses for FE rendering | Provides core system |
| Components | `index.tsx` files | `h()`, JSX runtime | - |
| Routing | File-based router | - | - |
| HTTP Handlers | `index.ts` files | - | - |
| Middleware | `common.ts` stacks | - | - |
| SSR | Injection/hydration | Rendering | - |
| External APIs | `defineProxy()` | - | - |
| Props/State | - | Reactive proxies | `reactive()`, `effect()` |
