# Pounce-Board Architecture

`pounce-board` follows a Clean Architecture approach, separating core logic from framework-specific adapters. This ensures that the core features (routing, http, ssr) are independent of the underlying server implementation.

## Directory Structure

```
src/
├── lib/               # Core Logic (Domain & Use Cases)
│   ├── http/          # HTTP abstractions (Request, Response, Proxy)
│   ├── router/        # Routing logic (Trie, Matching, Params)
│   └── ssr/           # Server-Side Rendering utilities
├── adapters/          # Framework Adapters (Infrastructure)
│   └── hono.ts        # Hono integration
├── cli/               # CLI tools
└── index.ts           # Public API
```

## Layers

### 1. Core (`src/lib/`)
The core contains everything needed to define an application without tying it to a specific server runtime.
- **`router/`**: Pure logic for route matching, tree building, and parameter extraction. It knows nothing about Hono or Express.
- **`http/`**:
    - `core.ts`: Types for Requests, Responses, and Middlewares.
    - `client.ts`: Universal `api()` client that works on both server (direct dispatch) and client (fetch/hydration).
    - `proxy.ts`: Logic for defining and using external API proxies.
- **`ssr/`**: Utilities for serializing and injecting data for hydration.

### 2. Adapters (`src/adapters/`)
Adapters glue the Core to a specific runtime.
- **`hono.ts`**: Maps Hono requests to `pounce-board`'s internal Request/Response types, handles route registration, and executes the Pounce middleware stack.

### 3. Public API (`src/index.ts`)
Exposes a unified surface area for consumers, re-exporting necessary parts from Lib and Adapters.
