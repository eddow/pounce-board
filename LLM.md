# Pounce-Board LLM Cheatsheet

## Core Philosophy
- **Automated Integration**: Unlike bounce-ts which requires manual setup, pounce-board automatically wires routes, middleware, and Hono integration
- **File-based Conventions**: Route structure determines behavior (`.ts` = backend, `.tsx` = frontend, `common.ts` = middleware)
- **Type Safety First**: Shared `.d.ts` files between client/server are mandatory
- **Universal API Client**: Single `api()` function works with absolute, site-absolute, and site-relative URLs

## Status & Caveats (Updated 2026-01-20)
- **Status**: Core routing, Hono integration, and SSR injection are implemented and tested. Package exports refactored to support conditional loading.
- **Caveat**: `walkthrough.md` may lag behind code. Verified tests are the source of truth.
- **Drift**: Some test files referenced in plans might have different names (e.g., `route-scanner.spec.ts` vs `route-loading.spec.ts`).

## Package Entry Points
- **Universal**: `import { ... } from 'pounce-board'` - Types, API client (adapts to env), universal utilities.
- **Server-Only**: `import { ... } from 'pounce-board/server'` - Router, Hono adapters, middleware runner.
- **Client-Only**: `import { ... } from 'pounce-board/client'` - Hydration utilities, client-side specifics.
- **Automatic Resolution**: `pounce-board` automatically resolves to client or server build based on specific environment (browser vs node) via `package.json` exports.


## Routing & File Conventions
- **No `+page` prefix**: Use `index.tsx` for pages, `[name].tsx` for named pages
- **Dynamic Segments**: `[id]` for single params, `[...slug]` for catch-all
- **Route Groups**: `(auth)/login.tsx` → `/login` (parentheses not in URL)
- **Middleware Inheritance**: `common.ts` middleware applies to all descendant routes automatically

## Data Fetching & SSR
- **Unified `api()` client**: Works on server and client
  - **Server**: Direct handler dispatch (no network)
  - **Client (first load)**: Reads from `<script id="pounce-data-{base64}">` tags
  - **Client (navigation)**: Standard fetch
- **SSR ID Generation**: Deterministic base64-encoded path for hydration keys
- **Hydration**: Data injected via script tags, not global window object
- **Interceptors**: `config.interceptors.request/response` arrays. **Unique**: These run during SSR dispatch (not just `fetch`), so headers set by interceptors are visible to handlers.

## Hono Integration
- **Fully Automated**: `createPounceMiddleware()` handles all route registration
- **No Manual Wiring**: Unlike Express/Fastify, routes are discovered and mounted automatically
- **File Scanning**: Uses `import.meta.glob` (Vite) or fs scanning (Node)

## External API Proxies
- **Type-Safe Proxies**: `defineProxy()` creates typed API clients
- **Path Substitution**: `{param}` in paths replaced with runtime values
- **Transform Pipeline**: `prepare()` → request → `transform()` → response
- **Development Mocking**: `mock()` function returns fake data in dev mode

## Testing Strategy
- **Colocated Unit Tests**: `.spec.ts` files next to source
- **Integration Tests**: `tests/integration/` (e.g., `route-scanner.spec.ts`, `ssr-flow.spec.ts`)
- **E2E Tests**: `tests/e2e/` using Playwright
- **Consumer Tests**: `tests/consumers/` for real-app validation
- **Tests as Documentation**: Reliable source of truth. If docs and tests disagree, trust the tests.
  - Search in files for <<< @vocab "Test as Documentation" >>> to find tests that verify specific behaviors.

## Key Differences from Bounce-TS
1. **Automated vs Manual**: Pounce-board auto-discovers routes, bounce-ts requires explicit registration
2. **Framework vs Library**: Pounce-board is opinionated meta-framework, bounce-ts is flexible library  
3. **SSR Built-in**: First-class SSR support vs bolt-on
4. **Middleware System**: Per-route middleware inheritance vs global middleware