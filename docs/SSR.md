# Server-Side Rendering (SSR) & Hydration

`pounce-board` treats SSR as a first-class citizen with automatic data hydration.

## The `api()` Client

The core of the SSR strategy is the universal `api()` function defined in `src/lib/http/client.ts`. It abstracts the difference between server-side data fetching and client-side data fetching.

```typescript
import { api } from 'pounce-board';

const data = await api('/api/users').get();
```

### How it works

1. **Server Side**:
   - When running on the server, `api()` (optionally) can directly dispatch the request to the handler without a network call (TODO).
   - The fetched data is stored in a temporary map associated with the current request using `injectSSRData`.

2. **Hydration**:
   - The server renders the HTML and injects the stored data into `<script id="pounce-data-...">` tags.
   - The ID is deterministic, based on the request URL.

3. **Client Side (First Load)**:
   - When `api()` is called during hydration, it checks `getSSRData`.
   - If data exists in the script tag, it returns it immediately without a network request.

4. **Client Side (Navigation)**:
   - On subsequent navigations, `api()` falls back to a standard `fetch` call.

## URL Handling

`api()` supports multiple URL formats:
- **Absolute**: `https://api.example.com/v1` -> External fetch.
- **Site-Absolute**: `/api/users` -> Relative to current origin.
- **Site-Relative**: `./stats` -> Relative to current page.
- **Proxy Object**: If a proxy client (created with `defineProxy`) is passed, it returns it directly.
