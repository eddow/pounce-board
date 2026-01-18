# Pounce-Board Cheatsheet

## Dependencies

> [!IMPORTANT]
> Before working on pounce-board, read these LLM.md files:
> - [pounce-ts/LLM.md](file:///home/fmdm/dev/ownk/pounce-ts/LLM.md) – UI framework with fine-grained reactivity
> - [mutts/LLM.md](file:///home/fmdm/dev/ownk/mutts/LLM.md) – Reactivity system (used both FE and BE)
> - [bounce-ts/LLM.md](file:///home/fmdm/dev/ownk/bounce-ts/LLM.md) – Existing Pounce implementation reference

## Overview
pounce-board is to pounce-ts what SvelteKit is to Svelte. A full-stack meta-framework providing:
- File-based routing
- Type-safe API client
- SSR data injection
- Explicit middleware stacks
- External API proxies

## Key Concepts

### mutts (Backend + Frontend)
The `mutts` library provides reactivity used on **both sides**:
- `reactive(obj)` – Create reactive proxies
- `effect(() => {...})` – Run side effects on dependency changes
- `memoize(() => ...)` – Computed values

### File Structure

> [!IMPORTANT]
> **No `+` prefixes!** Extension determines role:
> - `.tsx` = Frontend (components, layouts)
> - `.ts` = Backend (handlers, middleware)

```
routes/
├── common.tsx                # Root layout
├── common.ts                 # Root middleware
├── index.tsx                 # Page: /
├── index.ts                  # Handlers: /
├── users/
│   ├── common.tsx            # Users layout
│   ├── common.ts             # Users middleware
│   ├── index.tsx             # Page: /users
│   ├── index.ts              # Handlers: /users
│   ├── [id]/
│   │   ├── index.tsx         # Page: /users/123
│   │   └── index.ts          # Handlers: /users/123
│   └── types.d.ts            # Shared types
├── (auth)/                   # Route group (not in URL!)
│   ├── login.tsx             # Page: /login
│   └── login.ts              # Handlers: /login
└── dashboard/
    ├── settings.tsx          # Page: /dashboard/settings
    └── settings.ts           # Handlers: /dashboard/settings
```

### Middleware Inheritance
Middleware in `common.ts` applies to **all children** automatically.

### API Unity
```ts
api(".")              // Relative (same route)
api("/users/123")     // Absolute
api("~/api/legacy")   // External proxy
```

### SSR Hydration
- **Server:** Injects data as `<script id="pounce-data-...">` tags
- **Client (First Load):** Reads from script tags (zero-latency)
- **Client (Navigation):** Standard fetch

## Gotchas

- pounce-ts props are **reactive proxies** – do NOT destructure outside effects
- Use `<for each={items}>` not `items.map()`
- Use `<div if={condition}>` not `{condition && <div>}`
- Middleware is per-route, NOT global chain
- It looks like react but it is definitively not!