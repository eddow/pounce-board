# Pounce-Board CLI

The Pounce-Board CLI provides tools for development, building, and previewing your application.

## Installation

The CLI is included with the `pounce-board` package. You can run it using `npx`:

```bash
npx pounce <command>
```

## Commands

### `dev`

Starts the development server with Hot Module Replacement (HMR) and automated route discovery.

**Usage:**
```bash
pounce dev [options]
```

**Options:**
- `--port <port>`: Port to listen on (default: `3000`)
- `--routes <dir>`: Directory containing pounce-board routes (default: `./routes`)
- `--html <path>`: Path to the entry HTML file (default: `./index.html`)

**Example:**
```bash
pounce dev --port 4000 --routes ./src/routes
```

### `build` (Coming Soon)

Builds the application for production.

### `preview` (Coming Soon)

Previews the production build locally.

---

## Features

- **Automated Glue**: Automatically sets up Hono with Vite integration.
- **SSR Ready**: Automatically enables SSR mode and handles data injection into HTML.
- **Zero Config**: Works out of the box with standard directory structures.
