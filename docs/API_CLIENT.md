# API Client

The universal `api()` client in pounce-board handles all data fetching, supporting SSR dispatch, hydration, and client-side navigation.

## Usage

```typescript
import { api } from 'pounce-board';

// Fetch data
const data = await api('/users/123').get();
const created = await api('/users').post({ name: 'Alice' });
```

## Interceptors

Global request and response interceptors allow you to add cross-cutting logic like authentication, logging, or error handling. Pounce-board uses a router-like system for interceptors, allowing you to scope them to specific paths or URLs.

### Registration

Use the `intercept` function to register middleware. Interceptors run in the order they are defined for matching URLs.

```typescript
import { intercept } from 'pounce-board';

// Match all requests
intercept('**', async (req, next) => {
  req.headers.set('X-App-Version', '1.0.0');
  const res = await next(req);
  console.log(`${req.method} ${req.url} - ${res.status}`);
  return res;
});

// Match specific path prefix (e.g. /api/protected/**)
intercept('/api/protected/**', async (req, next) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.set('Authorization', `Bearer ${token}`);
  }
  return next(req);
});
```

### Middleware Signature

Interceptors follow a `(req, next) => Promise<PounceResponse>` signature.

```typescript
type InterceptorMiddleware = (
  req: Request,
  next: (req: Request) => Promise<PounceResponse>
) => Promise<PounceResponse>;
```

- **`req`**: The standard `Request` object. You can modify it or clone it before passing to `next`.
- **`next`**: Call this to proceed to the next interceptor or the final fetch/handler.
- **Return**: You must return a `PounceResponse` (or a standard `Response`).

### Modifying Responses

Pounce-board uses `PounceResponse` (extending `Response`) which allows body modification and caching.

```typescript
intercept('/api/**', async (req, next) => {
  const res = await next(req);
  
  // You can read the body multiple times
  const data = await res.json(); 
  
  if (data.error) {
    // Modify body using setJson (only available on PounceResponse)
    res.setJson({ ...data, userMessage: 'Something went wrong' });
  }
  
  return res;
});
```

### Path Matching

- **`**`**: Matches all requests.
- **`*`**: Matches single path segment (not recursive).
- **`/path`**: Matches exact pathname.
- **`/path/**`**: Matches pathname prefix.
- **`https://...`**: Matches exact full URL.
- **`RegExp`**: Full regex power for complex patterns.

### Unregistering Interceptors

`intercept()` returns an unregister function:

```typescript
const unregister = intercept('**', loggingMiddleware);

// Later, remove the interceptor
unregister();
```

### Behavior

| Aspect            | Description                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| **Execution Order** | Interceptors run in the order they are registered (FIFO).                  |
| **SSR Aware**      | Interceptors run during SSR dispatch, not just `fetch`. Headers propagate. |
| **Async Support**  | Interceptors can be `async` for token refresh, etc.                        |

## Timeouts

A global timeout can be configured and overridden per-request:

```typescript
import { config, api } from 'pounce-board';

config.timeout = 5000; // 5 seconds globally

await api('/slow', { timeout: 30000 }).get(); // 30 seconds for this request
```

## Retries

The API client supports automatic retries for failed requests (5xx status codes or network timeouts/errors).

```typescript
import { config, api } from 'pounce-board';

// Global configuration
config.retries = 3; 
config.retryDelay = 1000; // 1 second between retries

// Per-request override
await api('/unstable', { retries: 5, retryDelay: 500 }).get();
```

- **Retriable errors**: Requests are retried if the response status is `>= 500` or `408` (Timeout), or if a network error occurs.
- **SSR support**: Retries also work during SSR dispatch for internal API calls.

## File Uploads

The `api()` client supports `FormData` for file uploads. When a `FormData` object is passed as the body, the client automatically omits the `application/json` content-type, allowing the browser to set the correct multipart boundary.

```typescript
import { api } from 'pounce-board';

const formData = new FormData();
formData.append('profile_pic', fileInput.files[0]);
formData.append('username', 'alice');

// The client detects FormData and handles headers correctly
const response = await api('/user/profile').post(formData);
```

File uploads work across both frontend navigation and SSR dispatch. However, for SSR file uploads, ensure your server environment (like Node.js or edge runtimes) correctly handles multipart parsing.
