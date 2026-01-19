# Implementation Guide

## 1. Core Modules

### HTTP Core (`lib/http/core.ts`)
```ts
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface RequestContext {
  request: Request;
  params: Record<string, string>;
  [key: string]: unknown;
}

export type Middleware = (
  context: RequestContext,
  next: () => Promise<Response>
) => Promise<Response>;

export interface RouteHandler {
  (context: RequestContext): Promise<{
    status: number;
    data?: unknown;
    error?: string;
    headers?: Record<string, string>;
  }>;
}

export function runMiddlewares(
  middlewareStack: Middleware[],
  context: Omit<RequestContext, "next">,
  handler: RouteHandler
): Promise<Response> {
  const run = async (index: number): Promise<Response> => {
    if (index >= middlewareStack.length) {
      const result = await handler(context);
      return new Response(
        result.data ? JSON.stringify(result.data) : result.error,
        {
          status: result.status,
          headers: {
            "Content-Type": "application/json",
            ...result.headers
          }
        }
      );
    }

    const middleware = middlewareStack[index];
    return middleware(context, () => run(index + 1));
  };

  return run(0);
}
```

### API Client (`lib/http/client.ts`)
```ts
const ssrMode = { enabled: false };
const ssrResponses: Record<string, unknown> = {};

export function enableSSR() {
  ssrMode.enabled = true;
}

// Deterministic ID generation for SSR data
export function getSSRId(url: string | URL): string {
  const path = typeof url === "string" ? url : url.pathname + url.search;
  // Simple hash or base64 could work, but keeping it readable for now
  // Using btoa for base64 encoding of the path to be safe characters
  return `pounce-data-${typeof btoa !== 'undefined' ? btoa(path) : Buffer.from(path).toString('base64')}`;
}

export function getSSRData<T>(id: string): T | null {
  return ssrResponses[id] as T || null;
}

export function injectSSRData(id: string, data: unknown) {
  ssrResponses[id] = data;
}

// Single API client for all use cases
// Single API client for all use cases
export function api(input: string | URL | object) {
  // If input is a proxy object, return it directly
  if (typeof input === "object" && input !== null && !(input instanceof URL)) {
    return input as any;
  }

  // Normalize input to URL
  let url: URL;
  
  if (typeof input === "string") {
    if (input.startsWith("http")) {
       // Absolute URL
       url = new URL(input);
    } else if (input.startsWith("/")) {
       // Site-absolute
       url = new URL(input, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    } else if (input.startsWith(".")) {
       // Site-relative
       const base = typeof window !== "undefined" ? window.location.href : "http://localhost";
       url = new URL(input, base);
    } else {
       // Fallback for simple paths
       url = new URL(input, "http://localhost"); 
    }
  } else {
    url = input as URL;
  }

  const id = getSSRId(url);

  return {
    get: <T>(params?: Record<string, string>) => {
      if (params) {
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      }

      // 1. Server-Side: Direct function call (mock for now or real dispatcher)
      if (ssrMode.enabled) {
         // Logic to dispatch directly to handler without network
         // For now, returning mock/empty
         const result = { mock: true } as T;
         injectSSRData(id, result);
         return Promise.resolve(result);
      }

      // 2. Client-Side: Hydration
      const ssrData = getSSRData<T>(id);
      if (ssrData) return Promise.resolve(ssrData);

      // 3. Client-Side: Network fetch
      return fetch(url).then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json() as Promise<T>;
      });
    },

    post: <T>(body: unknown) => {
      // POST usually skips SSR cache
      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }).then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json() as Promise<T>;
      });
    },
    
    // ... put, delete, patch
  };
}
```

### SSR Utilities (`lib/ssr/utils.ts`)
```ts
export function injectApiResponses(
  html: string,
  responses: Record<string, { id: string; data: unknown }>
): string {
  const scripts = Object.entries(responses).map(([id, { data }]) =>
    `<script type="application/json" id="${id}">${JSON.stringify(data)}</script>`
  );

  return html.replace("</head>", `${scripts.join("\n")}</head>`);
}

export function getSSRData<T>(id: string): T | null {
  if (typeof document === "undefined") return null;
  const script = document.getElementById(id);
  return script ? JSON.parse(script.textContent || "null") : null;
}
```

### Proxy System (`lib/http/proxy.ts`)
```ts
type ProxyConfig = {
  baseUrl: string;
  request?: RequestInit | ((init: RequestInit) => RequestInit | Promise<RequestInit>);
  endpoints: Record<string, {
    method: string;
    path: string;
    transform?: (data: unknown, params?: Record<string, string>) => unknown;
    prepare?: (body: unknown) => unknown;
    params?: (input: Record<string, unknown>) => Record<string, string>;
    onError?: (error: unknown) => never;
    schema?: unknown;
    raw?: boolean;
    mock?: (params: Record<string, string>) => unknown;
  }>;
};

export function defineProxy(config: ProxyConfig) {
  return new Proxy({}, {
    get(_, endpointName: string) {
      const endpoint = config.endpoints[endpointName];
      if (!endpoint) throw new Error(`Endpoint ${endpointName} not found`);

      return async (params: Record<string, unknown> = {}) => {
        // Handle mock in development
        if (process.env.NODE_ENV === "development" && endpoint.mock) {
          return endpoint.mock(params as Record<string, string>);
        }

        try {
          // Prepare URL
          let path = endpoint.path;
          for (const [key, value] of Object.entries(params)) {
            path = path.replace(`{${key}}`, encodeURIComponent(value as string));
          }

          const url = new URL(path, config.baseUrl);

          // Add query params
          if (endpoint.params) {
            const queryParams = endpoint.params(params);
            Object.entries(queryParams).forEach(([k, v]) => {
              url.searchParams.set(k, v);
            });
          }

          // Prepare request init
          let init: RequestInit = {
            method: endpoint.method,
            headers: {
              "Content-Type": "application/json",
              ...(typeof config.request === "function"
                ? await config.request({})
                : config.request)
            }
          };

          // Prepare body
          if (["POST", "PUT", "PATCH"].includes(endpoint.method) && params) {
            init.body = JSON.stringify(
              endpoint.prepare ? endpoint.prepare(params) : params
            );
          }

          // Make request
          const response = await fetch(url, init);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          // Handle response
          if (endpoint.raw) return response;

          const data = await response.json();


          if (endpoint.schema) {
            // Implement schema validation here
          }

          // Transform response
          return endpoint.transform
            ? endpoint.transform(data, params as Record<string, string>)
            : data;
        } catch (error) {
          if (endpoint.onError) {
            return endpoint.onError(error);
          }
          throw error;
        }
      };
    }
  }) as Record<string, (params?: Record<string, unknown>) => Promise<unknown>>;
}
```

## 2. Server Integration (Automated Hono)

Pounce-Board automatically integrates with Hono. Users do not manually wire up routes.

### Automated Entry Point (`lib/adapters/hono.ts`)
```ts
import { Hono } from "hono";
import { runMiddlewares } from "../http/core";
import { enableSSR, injectApiResponses } from "../ssr/utils";

export function createPounceMiddleware() {
  return async (c, next) => {
    // 1. Enable SSR context
    enableSSR();

    // 2. Resolve route based on c.req.path
    const route = resolveRoute(c.req.path); // Internal router resolution
    
    if (!route) {
        return next(); // 404 handled by Hono or next middleware
    }

    // 3. Execute Pounce Middleware Stack
    const response = await runMiddlewares(
        route.middlewareStack,
        {
            request: c.req.raw,
            params: route.params,
            // Hono context can be passed if needed
        },
        route.handler
    );

    // 4. Handle SSR Injection if HTML response
    if (response.headers.get("Content-Type")?.includes("text/html")) {
        const html = await response.text();
        const responses = getCollectedSSRResponses();
        return c.html(injectApiResponses(html, responses));
    }

    return response;
  };
}

// Usage in user app (hidden in framework files usually)
const app = new Hono();
app.use("*", createPounceMiddleware());
export default app;
```

## 3. Frontend Integration

### React Example
```tsx
// components/UserProfile.tsx
import { api } from "pounce/http/client";
import { api, getSSRData, getSSRId } from "pounce/http/client";
import { useQuery } from "@tanstack/react-query";

export function UserProfile({ id }) {
  const ssrId = getSSRId(`./users/${id}`);
  const initialData = getSSRData<User>(ssrId);

  const { data: user } = useQuery({
    queryKey: ["user", id],
    queryFn: () => api("./users/[id]").get({ id }),
    initialData
  });

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Svelte Example
```svelte
<!-- components/UserProfile.svelte -->
<script>
  import { onMount } from "svelte";
  import { api } from "pounce/http/client";
  import { api, getSSRData, getSSRId } from "pounce/http/client";

  export let id;

  let user = getSSRData(getSSRId(`./users/${id}`));

  onMount(async () => {
    if (!user) {
      user = await api("./users/[id]").get({ id });
    }
  });
</script>

{#if user}
  <h1>{user.name}</h1>
  <p>{user.email}</p>
{:else}
  <p>Loading...</p>
{/if}
```

## 4. Type Generation

### Shared Types (`routes/users/[id]/types.d.ts`)
```ts
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface GetUserResponse {
  status: number;
  data?: User;
  error?: string;
}
```

### TypeScript Configuration
Add this to your `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "~/routes/*": ["src/routes/*"],
      "~/lib/*": ["src/lib/*"]
    }
  }
}
```

### Type Generation for External APIs
```ts
// scripts/generate-types.ts
import { defineProxy } from "pounce/http";
import { writeFileSync } from "fs";

// Generate types from OpenAPI spec
async function generateTypes() {
  const proxy = defineProxy({
    baseUrl: "https://api.example.com",
    endpoints: {
      // ... your endpoints
    }
  });

  // Extract types and write to file
  const types = `
    // Generated types for external API
    namespace ExternalAPI {
      ${Object.entries(proxy).map(([name, fn]) => {
        // Infer types from the proxy functions
        return `export type ${name} = ...;`;
      }).join("\n")}
    }
  `;

  writeFileSync("src/routes/api/external.d.ts", types);
}

generateTypes();
```

## 5. Testing

### Middleware Testing
```ts
import { runMiddlewares } from "pounce/http/core";
import { middleware } from "../routes/users/common";

test("auth middleware blocks unauthenticated requests", async () => {
  const response = await runMiddlewares(
    middleware,
    {
      request: new Request("http://test/users/123"),
      params: { id: "123" }
    },
    () => new Response("OK")
  );

  expect(response.status).toBe(401);
});
```

### API Client Testing
```ts
import { api } from "pounce/http/client";
import { enableSSR, getSSRData } from "pounce/ssr/utils";

test("SSR data injection", () => {
  enableSSR();
  api("./test").get({ id: "123" });

  const data = getSSRData("api-response-test");
  expect(data).toEqual({ mock: true });
});
```

### Route Handler Testing
```ts
import { get } from "../routes/users/[id]";

test("get user handler", async () => {
  const response = await get({
    request: new Request("http://test/users/123"),
    params: { id: "123" },
    user: { id: "test-user" }
  });

  expect(response.status).toBe(200);
  expect(response.data.id).toBe("123");
});
```

## 6. Deployment Considerations

### Server Requirements
- Node.js 18+
- TypeScript 5+
- Support for dynamic imports

### Environment Variables
```
NODE_ENV=production
LEGACY_API_KEY=your_key_here
```

### Performance Optimizations
1. **Middleware Caching**:
   ```ts
   // Cache middleware results
   const cache = new Map<string, unknown>();

   export const cacheMiddleware: Middleware = async (ctx, next) => {
     const key = `${ctx.request.url}-${JSON.stringify(ctx.params)}`;
     if (cache.has(key)) {
       return new Response(JSON.stringify(cache.get(key)), {
         headers: { "Content-Type": "application/json" }
       });
     }

     const response = await next();
     if (response.status === 200) {
       const data = await response.clone().json();
       cache.set(key, data);
     }
     }

     return response;
   };
   ```

2. **Compression**:
   ```ts
   import compression from "compression";
   app.use(compression());
   ```

3. **Static Assets**:
   ```ts
   app.use(express.static("public", { maxAge: "1y" }));
   ```

### Monitoring
```ts
// Logging middleware
export const loggingMiddleware: Middleware = async (ctx, next) => {
  const start = Date.now();
  const response = await next();
  const duration = Date.now() - start;

  console.log({
    method: ctx.request.method,
    path: ctx.request.url,
    params: ctx.params,
    status: response.status,
    duration,
    user: ctx.user?.id
  });

  return response;
};
```

### Security
1. **CORS**:
   ```ts
   app.use(cors({
     origin: process.env.ALLOWED_ORIGINS?.split(",") || []
   }));
   ```

2. **CSRF Protection**:
   ```ts
   import csurf from "csurf";
   app.use(csurf());
   ```

3. **Helmet**:
   ```ts
   import helmet from "helmet";
   app.use(helmet());
   ```

## 7. Migration Guide

### From Express API
1. Move routes to `routes/` directory
2. Convert route handlers to Pounce format
3. Add `common.ts` for middleware
4. Update frontend to use `api()` client

### From Next.js
1. Replace `pages/api` with `routes/`
2. Convert `getServerSideProps` to SSR injection
3. Replace `fetch` calls with `api()`
4. Move middleware to `common.ts` files

### From SvelteKit
1. Replace `+page.server.ts` load functions with SSR injection
2. Convert endpoints to Pounce route handlers
3. Update stores to use `api()` client
4. Move hooks to `common.ts` middleware
