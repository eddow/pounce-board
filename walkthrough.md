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

### API Client: Frontend vs Backend Behavior

> [!IMPORTANT]
> **Core Principle**: The `api()` function provides a **universal interface** that works identically in frontend and backend code, but uses **different transport mechanisms** depending on the context.

#### URL Resolution

The `api()` function accepts three URL patterns:

```ts
api(".")                 // Relative to current page
api("/api/users")        // Site-absolute (from root)
api("https://...")       // Full external URL
```

#### Frontend (Client-Side) Behavior

When called in browser/client code:
```tsx
// In a component (client-side)
const users = await api("/api/users").get();

// Execution:
// 1. Makes HTTP fetch to: http://localhost:5173/api/users
// 2. Receives JSON response from network
// 3. Returns parsed data
```

**Hydration Optimization**: On initial page load, `api()` checks for SSR-injected data in `<script>` tags before making network requests.

#### Backend/SSR (Server-Side) Behavior

When called during server-side rendering:
```tsx
// Same component code, but running on server
const users = await api("/api/users").get();

// Execution (NO NETWORK):
// 1. Route resolution: /api/users → routes/api/users/index.ts
// 2. Dynamic import of route handler module
// 3. Run middleware stack for the route
// 4. Call the exported `get` function directly
// 5. Inject response into HTML as <script> tag for hydration
// 6. Return data to component
```

**Key Points:**
- **Zero network overhead**: Server-to-server calls are direct function calls
- **Same middleware**: SSR calls run through the same middleware stack as HTTP requests
- **Automatic hydration**: Responses are automatically injected for client reuse

#### Example: Full SSR Flow

```tsx
// routes/dashboard/index.tsx
import { api } from 'pounce-board/http';

export default function Dashboard() {
  // This runs on server (SSR) first, then on client
  const stats = await api("/api/stats").get();
  
  return <div>Total: {stats.total}</div>;
}
```

**Server execution** (during SSR):
```
1. Server renders Dashboard component
2. api("/api/stats").get() is called
3. Direct import: routes/api/stats/index.ts
4. Call exported `get({ params, context })`
5. Inject: <script id="pounce-data-L2FwaS9zdGF0cw">{"total":42}</script>
6. HTML sent to browser with data embedded
```

**Client execution** (after hydration):
```
1. Component hydrates
2. api("/api/stats").get() is called again
3. Checks for <script id="pounce-data-L2FwaS9zdGF0cw">
4. Finds it, reads {"total":42}, removes tag
5. Returns cached data (no network request!)
```

**Client execution** (subsequent navigation):
```
1. User navigates to a different page, then back
2. api("/api/stats").get() is called
3. No <script> tag found (was removed after first use)
4. Falls back to fetch: GET http://localhost:5173/api/stats
5. Returns fresh data from network
```

### SSR Hydration

```tsx
// Manual access to hydration data (rarely needed)
const data = getSSRData<User>("api-response-user-123");
```

Most of the time, you don't need `getSSRData()` directly - just use `api()` and it handles hydration automatically.


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
- [ ] Add Arktype for validation
- [ ] Add development dependencies (Vite, TypeScript, etc.)

### 1.3 Build Setup
- [ ] All the tsconfig.xxx.json, all the vite plugins &c. should be confgured automatically - each with one import
- [ ] The server shouldn't have to be configured manually - all the route/middleware/... initialisation should be centralised by pounce-board, perhaps just exported from pounce-board so that it can be augmented

---

## Phase 2: Core HTTP Layer

### 2.1 Core Types (`lib/http/core.ts`)
- [x] Define `HttpMethod` type
- [x] Define `RequestContext` interface
- [x] Define `Middleware` type signature
- [x] Define `RouteHandler` interface
- [x] Define `RouteResponse` type (`{ status, data?, error?, headers? }`)

### 2.2 Middleware Runner
- [x] Implement `runMiddlewares(stack, context, handler)`
- [x] Handle middleware chain execution
- [x] Handle short-circuit responses
- [x] Handle error propagation
- [x] Add timing/performance instrumentation hooks

### 2.3 Response Utilities
- [x] Implement `createJsonResponse(data, status, headers)`
- [x] Implement `createErrorResponse(error, status)`
- [x] Implement response compression utilities
- [x] Add security headers helper
- [x] Audit global state for concurrency safety (e.g. `client.ts` singletons)

---


## Phase 3: API Client

### 3.1 Core Client (`lib/http/client.ts`)
- [x] Implement `api(path)` factory function
- [x] Implement relative path resolution (`"."`)
- [x] Implement absolute path handling (`"/users/123"`)
- [x] Implement external proxy support (object-based)
- [x] Support advanced API syntaxes:
    - `api("/path").get(...)` (Standard)
    - `api(".").get(...)` (Relative)
    - `get("/path", ...)` (Directly imported method)
    - `api.get("/path", ...)` (Functional proxy)

### 3.2 HTTP Methods
- [x] Implement `.get<T>(params?)`
- [x] Implement `.post<T>(body)`
- [x] Implement `.put<T>(body)`
- [x] Implement `.del<T>(params?)`
- [x] Implement `.patch<T>(body)`

### 3.3 SSR Awareness
- [x] Implement `enableSSR()` mode flag
- [x] Implement server-side direct function call (no network)
- [x] Implement client-side script tag reading (first load)
- [x] Implement client-side fetch (navigation)
- [x] Track API calls during SSR for injection

### 3.4 Error Handling
- [x] Implement typed error responses
- [x] Add retry logic
- [x] Add timeout handling
- [x] Add request/response interceptors
- [x] Finish the reflexion of [INTERCEPTORS.md](./analysis/INTERCEPTORS.md)
- [x] Make sure interceptors are usable on BE (for SSR but also for proxies, functionality forwarding, ...)

### 3.5 SSR modules
- [x] Analyse integration with pure-glyf: bundle the CSS directly as include it in generated html
- [ ] Use previous analyse to allow custom data bundlers
---

## Phase 4: SSR Integration (Phased)

### 4.1 Phase 1: Basic Node/SSR Support (`pounce-ts`)
- [x] Implement `renderToString(element, scope)` in `pounce-ts/server`
- [x] Support `linkedom` as an optional server-side dependency
- [x] Verify synchronous component rendering in Node

### 4.2 Phase 2: Async Data Tracking
- [x] Implement SSR Promise Tracker in `pounce-board/lib/http/context`
- [x] Update `api()` client to register pending SSR requests
- [x] Implement `renderToStringAsync` in `pounce-ts/server`
- [x] Verify components wait for data before final HTML generation

### 4.3 Phase 3: Pounce-Board Integration
- [x] Update Hono adapter to use `renderToStringAsync`
- [x] Update CLI dev server to match routes and render components
- [x] Integrate layouts (`common.tsx`) into the SSR render chain
- [x] Resolve framework instance isolation via `vite.ssrLoadModule`

### 4.4 Phase 4: Documentation and Testing
- [x] Update documentation with SSR usage patterns and async data fetching
- [x] Add integration tests for async SSR
- [x] Verify that hydrated components match server-rendered markup

---

## Phase 5: External API Proxies

## Phase 5: External API Proxy Utilities

> [!NOTE]
> Proxies are **code utilities** for calling external APIs, not HTTP routes or forwarders.

### 5.1 Proxy Configuration (`lib/http/proxy.ts`)
- [x] Implement `defineProxy(config)` function
- [x] Support `baseUrl` configuration
- [x] Support global `request` transforms
- [x] Support per-endpoint configuration

### 5.2 Endpoint Features
- [x] Implement `path` with `{param}` substitution
- [x] Implement `method` (GET, POST, PUT, DELETE, PATCH)
- [x] Implement `transform(response, params)` for response mapping
- [x] Implement `prepare(body)` for request mapping
- [x] Implement `params(input)` for query parameter mapping
- [x] Implement `onError(error)` for custom error handling
- [x] Implement `schema` for Zod validation
- [x] Implement `raw` flag for non-JSON responses
- [x] Implement `mock(params)` for development mocking

### 5.3 Advanced Features
- [x] Support file uploads (FormData)
- [ ] Support streaming responses
- [x] Support request retries
- [x] Support request caching
- [x] Type inference from endpoint definitions

---

## Phase 6: File-Based Router

### 6.1 Route Scanner (`lib/router/index.ts`)
- [x] Scan `routes/` directory structure
- [x] Parse dynamic segments (`[id]`, `[...slug]`)
- [x] Build route tree from filesystem
- [x] Support `import.meta.glob` for Vite
- [x] Support Node.js file scanning fallback

### 6.2 Route Matching
- [x] Implement path-to-route matching
- [x] Handle dynamic segments extraction
- [x] Handle catch-all segments
- [x] Handle route priority/ordering

### 6.3 Handler Loading
- [x] Load `index.ts` for backend handlers
- [x] Load `index.tsx` for frontend components
- [x] Load `common.ts` for middleware
- [x] Load `common.tsx` a layout
- [ ] Load `types.d.ts` for shared types
- [ ] Handle hot module replacement in dev

### 6.4 Middleware Inheritance
- [x] Collect middleware from parent directories
- [x] Merge middleware stacks correctly
- [ ] Cache compiled middleware stacks
- [ ] Document middleware order guarantees

---

## Phase 7: Server Adapters

### 7.1 Hono Integration (Automated)
- [x] Implement `createHonoMiddleware()` connecting pounce router to Hono
- [x] Automate route table registration
- [x] Automate middleware stack registration
- [x] Handle request/response conversion



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
- [x] Implement `pounce dev` command
- [x] Integrate Vite for HMR (using middleware mode)
- [x] Handle API route hot reloading (via route tree cache clearing)
- [x] Display route table on startup (Basic version implemented)
- [x] Add port configuration

### 8.2 Build Command (`cli/build.ts`)
- [x] Implement `pounce build` command
- [x] Bundle client-side code
- [x] Compile server-side code
- [x] Generate route manifest
- [x] Optimize for production

### 8.3 Preview Command (`cli/preview.ts`)
- [x] Implement `pounce preview` command
- [x] Serve production build locally
- [x] Simulate production environment
- [x] Support bundled deployment for consumers

### 8.4 Hot Module Replacement (HMR) Flow
- The dev server (`cli/dev.ts`) initiates a Vite watcher on the project root.
- When a file in `routes/` changes:
    1. The watcher event triggers `clearRouteTreeCache()`.
    2. The **next request** hitting `hono.ts` middleware finds an empty cache.
    3. `buildRouteTree()` runs again, rescanning the directory.
    4. `importFn` calls `vite.ssrLoadModule(path)`.
    5. Vite sees the file modified and returns the fresh module.
- **Result:** New routes appear, and modified handlers update instantly without server restart.

### 8.5 Consumer Lifecycle
- [ ] Support `npm run dev` for interactive development
- [ ] Support `npm run build` for bundled production assets
- [ ] Support environment-specific configurations

---

## Phase 9: Type System

### 9.1 Route Types
- [x] Generate types for route parameters
- [ ] Generate types for query parameters
- [ ] Infer handler return types
- [ ] Share types between client and server

### 9.2 API Client Types
- [x] Type `api(path)` return based on path
- [ ] Infer response types from handlers
- [ ] Support generic type parameters
- [ ] Handle error types

### 9.3 Middleware Types
- [ ] Type context extensions properly
- [ ] Support generic middleware factories
- [ ] Type-safe context access in handlers

### 9.4 External Proxy Types
- [x] Infer types from `defineProxy()` config
- [ ] Generate `.d.ts` from OpenAPI specs
- [x] Support Zod schema inference

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
- [x] Test `runMiddlewares()` executes chain in order
- [x] Test middleware can short-circuit with Response
- [x] Test context mutations propagate through chain
- [x] Test error propagation from handler
- [x] Test error propagation from middleware
- [x] Test empty middleware stack calls handler directly

#### `lib/http/client.spec.ts`
- [x] Test `api(".")` relative path resolution
- [x] Test `api("/abs")` absolute path handling
- [x] Test `.get()`, `.post()`, `.put()`, `.del()`, `.patch()` methods
- [x] Test SSR mode returns cached data
- [x] Test client mode fetches from network
- [x] Test error response typing

#### `lib/http/proxy.spec.ts`
- [x] Test `defineProxy()` creates callable endpoints
- [x] Test `{param}` path substitution
- [x] Test `prepare()` transforms request body
- [x] Test `transform()` transforms response
- [x] Test `params()` adds query parameters
- [x] Test `onError()` handles failures
- [x] Test `schema` validates with Zod
- [x] Test `mock()` returns mock data in dev
- [x] Test `raw` flag returns Response object

#### `lib/ssr/utils.spec.ts`
- [x] Test `injectApiResponses()` adds script tags
- [x] Test script tag IDs are unique
- [x] Test JSON is properly escaped (XSS prevention)
- [x] Test `getSSRData()` reads from script tags
- [x] Test `getSSRData()` returns null for missing tags
- [x] Test one-time consumption removes data

#### `lib/router/index.spec.ts`
- [x] Test route tree building from filesystem
- [x] Test `[id]` dynamic segment parsing
- [x] Test `[...slug]` catch-all parsing
- [x] Test route matching priority
- [x] Test middleware inheritance collection
- [x] Test handler file loading

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
- [x] Test parent middleware runs before child middleware
- [x] Test grandparent → parent → child order
- [x] Test middleware from multiple `common.ts` files merge
- [x] Test auth middleware blocks unauthorized requests
- [x] Test context additions available in handlers

#### `tests/integration/route-scanner.spec.ts`
- [x] Test `index.ts` handlers are loaded
- [x] Test `index.tsx` components are loaded (Backend router only tracks API handlers currently)
- [x] Test `types.d.ts` types are available (Verified ignored by route scanner)
- [x] Test `common.ts` middleware is attached
- [x] Test HMR reloads routes in development

#### `tests/integration/ssr-flow.spec.ts` (and `client-hydration.spec.ts`)
- [x] Test SSR renders component with data
- [x] Test API responses are injected as script tags
- [x] Test client hydrates from script tags (Verified in `client-hydration.spec.ts`)
- [x] Test client falls back to fetch on miss (Verified in `client-hydration.spec.ts`)
- [x] Test SSR context tracks all API calls (Verified in `ssr-flow.spec.ts`)

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
- [x] Test page has SSR content before JS loads
- [x] Test hydration doesn't cause flicker
- [x] Test script tags contain expected data (Verified in `minimal-app.spec.ts`)
- [ ] Test interactive after hydration
- [ ] Test hydration with multiple data sources

#### `tests/e2e/forms.spec.ts`
- [ ] Test form submission via POST
- [ ] Test form with file upload
- [ ] Test validation error display
- [ ] Test success redirect
- [ ] Test optimistic UI updates

#### `tests/e2e/api-routes.spec.ts`
- [x] Test GET endpoint returns JSON
- [x] Test POST endpoint accepts body
- [x] Test PUT/PATCH updates resource
- [x] Test DELETE removes resource
- [x] Test middleware runs on API routes
- [x] Test typed error responses

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
- [x] Create `package.json` with `pounce-board` dependency
- [x] Create single route with handler + page
- [x] Create dynamic route `/users/[id]`
- [x] Create middleware example
- [x] Create SSR data loading example

#### `tests/consumers/blog-app/`
Full blog implementation (from [EXAMPLES.md](file:///home/fmdm/dev/ownk/pounce-board/analysis/EXAMPLES.md)):
- [x] Posts CRUD routes
- [x] Authentication middleware
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

---

## Questions to Deepen

### Scoped Interceptors

The current `api()` interceptor implementation is **global**: every interceptor runs on every request. This raises a design question:

> **Can interceptors be scoped per-host or per-folder (like `common.ts` middleware)?**

#### Summary: Interceptors vs Middleware

| Aspect | Request Interceptor | Response Interceptor | `common.ts` Middleware |
|--------|---------------------|----------------------|------------------------|
| **Runs on** | Client + SSR dispatch | Client + SSR dispatch | Server only |
| **Applies to** | Outgoing requests | Incoming responses | Incoming requests |
| **Scope** | Global | Global | Per-route (inherited) |
| **Typical use** | Auth tokens, logging | Error transforms, caching | Auth guards, context |

**Key insight**: `common.ts` middleware is both scoped *and* inherited (parent middleware applies to children). Interceptors lack this – they're all-or-nothing.

**Possible enhancements**:
1. **Per-request options**: `api('/path', { interceptors: [...] })` – override/extend for a single call.
2. **Pattern-based registry**: Interceptors declare `{ match: /^https:\/\/external\.com/ }`.
3. **Route-linked interceptors**: Define FE interceptors per route folder, mirroring BE inheritance.

This is a design space to explore if conditional interceptors are frequently needed.
