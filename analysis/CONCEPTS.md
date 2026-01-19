# Core Concepts

## 1. File-Based Routing
Pounce uses the filesystem to define routes:
- `routes/users.ts` → `/users`
- `routes/users/[id].ts` → `/users/:id`
- Nested folders create nested routes

## 2. Route Components
Each route can have:
- `+page.tsx` – Frontend component
- `index.ts` – Backend handlers
- `types.d.ts` – Shared types
- `common.ts` – Middleware stack

## 3. API Calls

### URL Patterns
The `api()` function accepts URL strings with these prefixes:

1. **Relative to current page** (`.` or `..`):
   ```ts
   api(".").get({ id: "123" })          // Current route
   api("./data").get()                   // Sibling route
   api("../users").get()                 // Parent route
   ```

2. **Absolute from site root** (starts with `/`):
   ```ts
   api("/users/123").get()               // /users/123 on current domain
   api("/api/users").get()               // Your server's API
   ```

3. **Full external URLs** (starts with `http://` or `https://`):
   ```ts
   api("https://api.github.com/users/octocat").get()
   ```

### Proxy Objects for Complex External APIs

For external APIs that need custom transforms, headers, or validation, use `defineProxy`:

```ts
// routes/api/github.ts
import { defineProxy } from "pounce-board/http";

export const proxy = defineProxy({
  baseUrl: "https://api.github.com",
  endpoints: {
    getUser: { method: "GET", path: "/users/{id}" }
  }
});
```

**Usage with TypeScript import** (not URL `~`):
```ts
// Import using standard TypeScript module resolution
import { proxy as github } from "../routes/api/github";

// Call the typed endpoint
const user = await api(github).getUser({ id: "octocat" });
```

## 4. SSR Data Flow
1. Server renders page and makes API calls
2. Responses are injected as script tags:
   ```html
   <script type="application/json" id="api-response-user-123">
     {"id":"123","name":"John"}
   </script>
   ```
3. Client hydrates from script tags before making network requests

## 5. Middleware
- Defined in `common.ts`
- Runs sequentially before route handlers
- Can modify context or short-circuit requests
- Applies to current route and all descendants

## 6. Type Safety
- All API responses are fully typed
- Shared types between frontend and backend
- External APIs have generated types