import { getRequestListener } from '@hono/node-server'
import * as fs from 'fs'
import { Hono } from 'hono'
import { createServer } from 'http'
import * as path from 'path'
import { createPounceMiddleware } from 'pounce-board/adapters/hono.js'
import { api } from 'pounce-board/http/client.js'
import { createServer as createViteServer } from 'vite'

// Import route handlers
import * as indexRoute from './routes/index.js'

const port = Number(process.env.PORT) || 3000

async function startServer() {
	const app = new Hono()

	// Create Vite server in middleware mode
	const vite = await createViteServer({
		server: { middlewareMode: true },
		appType: 'custom',
	})

	// Pounce middleware for generic Hono handling
	app.use('*', createPounceMiddleware())

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
				await api(url.pathname).get()
			} catch (e) {
				console.error('SSR data collection failed', e)
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
