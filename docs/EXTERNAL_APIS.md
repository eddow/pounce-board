# External API Proxies

`pounce-board` provides a type-safe way to consume external APIs using `defineProxy`.

## Defining a Proxy

Proxies are defined with a configuration object that describes the endpoints, methods, and optional transformations.

```typescript
import { defineProxy } from 'pounce-board';
import { z } from 'zod';

const myApi = defineProxy({
  baseUrl: 'https://api.example.com',
  endpoints: {
    getUser: {
      method: 'GET',
      path: '/users/{id}',
      schema: z.object({ id: z.string(), name: z.string() })
    }
  }
});
```

## Features

- **Path Substitution**: Parameters like `{id}` in the path are automatically replaced by values passed to the function. `myApi.getUser({ id: '123' })` becomes `https://api.example.com/users/123`.
- **Query Params**: Additional parameters can be mapped to query strings.
- **Validation**: If a Zod `schema` is provided, the response is automatically validated.
- **Transforms**: Use `transform` to reshape data before returning it.
- **Mocking**: In `NODE_ENV=development`, use `mock` to return fake data without hitting the real API.
- **Global Config**: `request` option allows setting global headers (like Auth tokens) for all endpoints.

## Implementation Details

The proxy logic is located in `src/lib/http/proxy.ts`. It uses a Javascript `Proxy` object to intercept calls dynamically, making the API definition extremely lightweight.
