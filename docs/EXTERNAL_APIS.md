# External API Proxies

`pounce-board` provides a type-safe way to consume external APIs using `defineProxy`.

## Defining a Proxy

Proxies are defined with a configuration object that describes the endpoints, methods, and optional transformations.

```typescript
import { defineProxy } from 'pounce-board';
import { z } from 'zod';

// 1. Fully typed: Return type is inferred from Zod schema (z.infer<T>)
const myApi = defineProxy({
  baseUrl: 'https://api.example.com',
  timeout: 5000,       // Default timeout (5000ms)
  endpoints: {
    getUser: {
      method: 'GET',
      path: '/users/[id]',
      schema: z.object({ id: z.string(), name: z.string() })
    }
  }
});

// usage: const user = await myApi.getUser({ id: '123' }) // user is typed { id: string, name: string }
```

## Features

- **Path Substitution**: Parameters like `[id]` in the path are automatically replaced by values passed to the function. `myApi.getUser({ id: '123' })` becomes `https://api.example.com/users/123`.
- **Query Params**: Additional parameters can be mapped to query strings.
- **Validation**: If a Zod `schema` is provided, the response is automatically validated.
   - **Type Inference**: The return type of the generated function is automatically inferred from `z.infer<Schema>`.
- **Transforms**: Use `transform` to reshape data before returning it. The return type is inferred from the transform function's return type.
- **Timeouts**: Configurable `timeout` (in ms) at global, proxy, and endpoint levels. Throws `ApiError` with status 408 on timeout.
- **Mocking**: In `NODE_ENV=development`, use `mock` to return fake data without hitting the real API.
- **Retries**: Configurable retry logic at multiple levels:
    1. **Endpoint Level**: `retries` in endpoint config.
    2. **Proxy Level**: `retries` and `retryDelay` in `defineProxy` config.
    3. **Global Level**: `config.retries` and `config.retryDelay` from `pounce-board/http`.
- **Global Config**: `request` option allows setting global headers (like Auth tokens) for all endpoints.

## Implementation Details

The proxy logic is located in `src/lib/http/proxy.ts`. It uses a Javascript `Proxy` object to intercept calls dynamically, making the API definition extremely lightweight.
