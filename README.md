# Pounce-Board

Full-stack meta-framework for **pounce-ts** with file-based routing, middleware, and SSR.

## Status

⚠️ **Early Development** - Framework skeleton created, core implementation in progress.

## Features (Planned)

- 🗂️ **File-based Routing** - Filesystem-based routes with dynamic segments
- 🔄 **SSR-First** - Server-side rendering with automatic hydration
- 🎯 **Type-Safe API** - Full TypeScript inference for routes and API calls
- 🔌 **Middleware System** - Composable, per-route middleware stacks
- 🌐 **External API Proxies** - Type-safe integration with third-party APIs
- ⚡ **Hono Integration** - Built on Hono for performance and flexibility

## Quick Start

```bash
npm install pounce-board pounce-ts mutts
```

## Project Structure

```
routes/
├── index.tsx              # Home page (/)
├── index.ts               # Home API handlers
├── common.tsx             # Root layout
├── common.ts              # Root middleware
└── users/
    ├── [id]/
    │   ├── index.tsx      # User page (/users/:id)
    │   ├── index.ts       # User handlers
    │   └── common.ts      # User middleware
    └── types.d.ts         # Shared types
```

## Documentation

See the `docs/` directory for detailed documentation:

- [Architecture](./docs/ARCHITECTURE.md) - Clean architecture overview
- [Routing](./docs/ROUTING.md) - File-based routing guide
- [SSR & Hydration](./docs/SSR.md) - Server-side rendering details
- [External APIs](./docs/EXTERNAL_APIS.md) - Type-safe proxy guide
- [walkthrough.md](./walkthrough.md) - Complete walkthrough

## License

MIT
