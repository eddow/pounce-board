# Server Adapters

Pounce-Board is designed to be server-agnostic, running on top of modern JavaScript runtimes. It uses **adapters** to integrate with specific server frameworks.

## Hono Adapter

The Hono adapter allows you to use Pounce-Board's file-based routing and middleware system within a [Hono](https://hono.dev) application. This is the recommended way to use Pounce-Board.

### Installation

The Hono adapter is included in the core `pounce-board` package.

### Basic Usage

The easiest way to start is using `createPounceApp`, which gives you a Hono instance pre-configured with Pounce middleware.

```typescript
import { createPounceApp } from 'pounce-board/adapters/hono';

const app = createPounceApp({
  routesDir: './routes' // optional, default
});

export default app;
```

### Middleware Usage

If you want to add Pounce-Board to an existing Hono application, use `createPounceMiddleware`.

```typescript
import { Hono } from 'hono';
import { createPounceMiddleware } from 'pounce-board/adapters/hono';

const app = new Hono();

// Add global logging or other Hono middleware
app.use('*', async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`);
  await next();
});

// Mount Pounce-Board middleware
// It will attempt to match file-based routes first.
// If no Pounce route matches, it falls through to the next handler.
app.use('*', createPounceMiddleware({
  routesDir: './src/routes'
}));

// Fallback route (e.g. for serving static assets or 404s)
app.get('*', (c) => c.text('Not Found', 404));

export default app;
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `routesDir` | `string` | `'./routes'` | Path to your file-based routes directory relative to CWD. |

### How it Works

1.  **Lazy Loading**: The route tree is built lazily upon the first request to ensure fast startup.
2.  **Request Matching**: Incoming requests are matched against the file-system routes (e.g., `routes/users/[id]/index.ts`).
3.  **Middleware Execution**: If a match is found, Pounce-Board executes its own middleware stack (defined in `common.ts` files) and the final route handler.
4.  **Response**: The result is converted to a standard `Response` object and returned through Hono.
5.  **Fallthrough**: If no file-based route matches the request path, the middleware calls `next()`, allowing downstream Hono handlers to pick it up.
