# Minimal App Consumer Test

This is a bare-bones consumer application used for:

1.  **Unit Testing Reference**: The routes in this app are referenced by `src/lib/router/index.spec.ts` and `src/adapters/hono.spec.ts`.
2.  **Basic Sanity Checks**: Verifying the simplest possible Hono integration.

## Routes

- `routes/index.ts`: Simple GET returning JSON
- `routes/users/[id]/index.ts`: Dynamic route example
