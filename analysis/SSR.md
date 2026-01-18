# Server-Side Rendering Guide

## 1. Data Injection
Pounce injects API responses as script tags during SSR:

```html
<script type="application/json" id="api-response-user-123">
  {"id":"123","name":"John Doe"}
</script>
```

### Injection Process
1. During SSR, track all API calls made
2. Before sending HTML, inject responses as script tags
3. Client hydrates from these script tags

### Example Implementation
```ts
// Server-side rendering middleware
app.use(async (req, res, next) => {
  const apiResponses = new Map<string, unknown>();

  // Monkey-patch the API client during SSR
  const originalApi = api;
  api = (path) => {
    return {
      get: async (params) => {
        const response = await originalApi(path).get(params);
        apiResponses.set(`api-response-${path.replace(/\//g, "-")}`, response);
        return response;
      }
      // ... other methods
    };
  };

  // Render the app
  const html = await renderApp(req.url);

  // Inject responses
  const finalHtml = injectApiResponses(html, Object.fromEntries(apiResponses));

  res.send(finalHtml);
});
```

## 2. Client-Side Hydration
```tsx
// In your component
function useApi<T>(path: string, params?: Record<string, string>) {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    // Try SSR data first
    const ssrData = getSSRData<T>(`api-response-${path.replace(/\//g, "-")}`);
    if (ssrData) {
      setData(ssrData);
      return;
    }

    // Fall back to network request
    api(path).get(params).then(setData);
  }, [path, JSON.stringify(params)]);

  return data;
}
```

## 3. Best Practices
1. **Unique IDs**: Ensure script tag IDs are unique per API call
2. **Fallback**: Always implement network fallback for client-side navigation
3. **Serialization**: Make sure all injected data is serializable
4. **Security**: Sanitize script tag content to prevent XSS

## 4. Framework Integrations
### React Example
```tsx
export function UserProfile({ id }) {
  const user = useApi<User>(`/users/${id}`);
  return user ? <div>{user.name}</div> : <div>Loading...</div>;
}
```

### Svelte Example
```svelte
<script>
  import { onMount } from 'svelte';
  import { getSSRData } from 'pounce/ssr';

  let user = getSSRData(`api-response-users-${id}`);

  onMount(async () => {
    if (!user) {
      user = await api(`/users/${id}`).get();
    }
  });
</script>

{#if user}
  <h1>{user.name}</h1>
{:else}
  <p>Loading...</p>
{/if}
```
