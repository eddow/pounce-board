import { getRequestListener } from '@hono/node-server'
import { Hono } from 'hono'
import { createServer } from 'node:http'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createServer as createViteServer } from 'vite'
import { api, enableSSR } from 'pounce-board'
import { createPounceMiddleware } from 'pounce-board/server'

// Import route handlers
import * as indexRoute from './routes/index.js'

const port = Number(process.env.PORT) || 3000

async function startServer() {
	const app = new Hono()

	// Create Vite server in middleware mode
	const vite = await createViteServer({
		server: {
			middlewareMode: true,
			fs: {
				// Allow serving files from the workspace root (for pounce-ts, mutts, etc.)
				// TODO to have eal node_modules entrants
				allow: ['../../../..'],
			},
		},
		resolve: {
			alias: [
				{ find: 'pounce-board', replacement: path.resolve(process.cwd(), 'node_modules/pounce-board') },
			]
		},
		appType: 'custom',
	})

	// Pounce Middleware
	app.use('*', await createPounceMiddleware({
		routesDir: './routes',
	}))

	// API Routes
	app.get('/api/data', async (c) => {
		// Mock request context for the route handler
		const mockCtx = {
			request: c.req.raw,
			params: {},
		}
		const result = await indexRoute.get(mockCtx)
		return c.json(result.data)
	})

	// Fallback: HTML Rendering
	app.get('*', async (c) => {
		const url = new URL(c.req.url)

		// Trigger data collection for SSR hydration
		if (url.pathname.startsWith('/users/')) {
			try {
				enableSSR()
				await api(url.pathname).get()
			} catch (e) {
				console.error('[minimal-app] SSR data collection failed for', url.pathname, e)
			}
		}

		// Serve index.html
		let template = fs.readFileSync(path.resolve('./index.html'), 'utf-8')
		template = await vite.transformIndexHtml(c.req.url, template)
		return c.html(template)
	})

	// Combine Vite and Hono
	const honoListener = getRequestListener(app.fetch)

	const server = createServer(async (req, res) => {
		// 1. Try Vite middleware (assets, HMR)
		vite.middlewares(req, res, async () => {
			// 2. If Vite doesn't handle it, pass to Hono
			honoListener(req, res)
		})
	})

	server.listen(port, () => {
		console.log(`Server running at http://localhost:${port}`)
	})
}

startServer()
