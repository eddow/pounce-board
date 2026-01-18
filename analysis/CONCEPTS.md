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
Three ways to make API calls:
1. **Relative calls** (same route):
   ```ts
   api(".").get({ id: "123" })
   ```
2. **Absolute calls** (other routes):
   ```ts
   api("/users/123").get()
   ```
3. **External APIs**:
   ```ts
   api("~/api/legacy").getUser({ id: "123" })
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