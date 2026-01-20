# Routing System

`pounce-board` uses a file-based routing system with support for dynamic segments, catch-all routes, and per-route middleware.

## File-Based Convention

The matching logic is implemented in `src/lib/router/`. Routes are defined by the file structure in the `routes/` directory.

- **Index Routes**: `routes/index.tsx` -> `/`
- **Static Routes**: `routes/about/index.tsx` -> `/about`
- **Named Routes**: `routes/users/list.tsx` -> `/users/list` (Short-hand for `routes/users/list/index.tsx`)
- **Dynamic Routes**: `routes/users/[id]/index.tsx` -> `/users/123`
- **Typed Routes**: `routes/users/[id:uuid]/index.tsx` -> `/users/123e4567-e89b...`
- **Catch-All Routes**: `routes/docs/[...slug]/index.tsx` -> `/docs/foo/bar`

## Matching Priority

The router matches URLs in the following order:
1. **Static Match**: Exact string match (e.g., `/users/settings`).
2. **Dynamic Match**: Single segment match (e.g., `/users/[id]`).
3. **Catch-All Match**: Wildcard match (e.g., `/users/[...slug]`).

## Middleware

Middleware is inherited from parent directories. A `common.ts` file in a directory applies its middleware to all routes within that directory and its subdirectories.

Example:
```
routes/
├── common.ts          # Applies to ALL routes
├── index.ts
└── admin/
    ├── common.ts      # Applies only to /admin/* routes
    └── index.ts
```


The matching result (`matchRoute` function in `src/lib/router/index.ts`) returns a `middlewareStack` containing all collected middleware in order.

## Layouts

Layouts are also inherited from parent directories. A `common.tsx` file in a directory wraps all routes within that directory and its subdirectories.

Example:
```tsx
// routes/common.tsx (Root Layout)
export default function Layout({ children }) {
  return <html>{children}</html>
}
```

The matching result returns a `layouts` array containing all collected layouts, ordered from root to leaf.

## Tests as Documentation

For the definitive behavior of route discovery and component matching, refer to the integration tests:

- **Component Discovery**: [tests/integration/component-discovery.spec.ts](file:///home/fmdm/dev/ownk/pounce-board/tests/integration/component-discovery.spec.ts)
- **Route Matching Logic**: [src/lib/router/index.spec.ts](file:///home/fmdm/dev/ownk/pounce-board/src/lib/router/index.spec.ts)
