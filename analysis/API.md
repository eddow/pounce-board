# API Reference

## 1. HTTP Client
### `api(path: string)`
Creates an API client for a specific path.

**Parameters:**
- `path`: Relative (`.`) or absolute (`/users`) path

**Returns:**
An object with HTTP methods (`get`, `post`, etc.)

**Example:**
```ts
const user = await api("./users/[id]").get({ id: "123" });
```

### Method Signatures
#### `get<T>(params?: Record<string, string>): Promise<T>`
Makes a GET request.

#### `post<T>(body: unknown): Promise<T>`
Makes a POST request.

#### `put<T>(body: unknown): Promise<T>`
Makes a PUT request.

#### `del<T>(params?: Record<string, string>): Promise<T>`
Makes a DELETE request.

## 2. SSR Utilities
### `getSSRData<T>(id: string): T | null`
Retrieves data injected during SSR.

**Parameters:**
- `id`: The script tag ID (typically `api-response-{path}`)

**Example:**
```ts
const user = getSSRData<User>("api-response-user-123");
```

### `injectApiResponses(html: string, responses: Record<string, { id: string; data: unknown }>): string`
Injects API responses into HTML during SSR.

## 3. Middleware
### `Middleware` Type
```ts
type Middleware = (
  context: {
    request: Request;
    params: Record<string, string>;
    [key: string]: unknown; // Custom context properties
  },
  next: () => Promise<Response>
) => Promise<Response>;
```

### `runMiddlewares(middlewareStack: Middleware[], context: Omit<MiddlewareContext, 'next'>, handler: () => Promise<Response>): Promise<Response>`
Executes a middleware stack.

## 4. Route Handlers
### Handler Functions
Each HTTP method exports a function:
```ts
export async function get({ params, context }: {
  params: Record<string, string>;
  context: Record<string, unknown>;
}) {
  return {
    status: number;
    data?: unknown;
    error?: string;
  };
}
```

## 5. External API Proxies
### `defineProxy(config: ProxyConfig)`
Creates a typed proxy for external APIs.

**Example:**
```ts
// routes/api/legacy.ts
import { defineProxy } from "pounce/http";

export default defineProxy({
  baseUrl: "https://legacy-api.example.com",
  endpoints: {
    getUser: {
      method: "GET",
      path: "/users/{id}",
      transform: (data) => ({
        ...data,
        legacyId: data.id
      })
    }
  }
});
```

**Usage:**
```ts
const user = await api("~/api/legacy").getUser({ id: "123" });
```
