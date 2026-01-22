import { getRequestListener } from '@hono/node-server'
import { Hono } from 'hono'
import * as fs from 'node:fs'
import { createServer } from 'node:http'
import * as path from 'node:path'
import { createServer as createViteServer } from 'vite'
import { createPounceMiddleware } from '../adapters/hono.js'
import { api, enableSSR } from '../lib/http/client.js'
import { fileURLToPath } from 'node:url'
import { matchRoute, buildRouteTree } from '../lib/router/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface DevServerOptions {
	port?: number
	routesDir?: string
	entryHtml?: string
}

/**
 * Run the pounce-board development server.
 * 
 * This server integrates Hono with Vite in middleware mode to provide:
 * - Automated pounce-board route discovery and API handling.
 * - Hot Module Replacement (HMR) for frontend components.
 * - Automated SSR data injection and hydration.
 *
 * @param options Server configuration options
 */
export async function runDevServer(options: DevServerOptions = {}) {
	enableSSR()
	const port = options.port ?? 3000
	const routesDir = options.routesDir ?? './routes'
	const entryHtml = options.entryHtml ?? './index.html'

	const app = new Hono()

	// 1. Initialize Vite in middleware mode
	const vite = await createViteServer({
		server: { 
			middlewareMode: true,
			fs: {
				allow: [
					path.resolve('.'),
					path.resolve(__dirname, '../../../mutts'),
					path.resolve(__dirname, '../../../pounce-ts'),
				]
			}
		},
		appType: 'custom',
		resolve: {
			alias: {
				'pounce-ts/jsx-runtime': path.resolve(__dirname, '../../../pounce-ts/src/runtime/jsx-runtime.ts'),
				'pounce-ts/jsx-dev-runtime': path.resolve(__dirname, '../../../pounce-ts/src/runtime/jsx-dev-runtime.ts'),
				'pounce-ts': path.resolve(__dirname, '../../../pounce-ts/src/lib'),
				'mutts': path.resolve(__dirname, '../../../mutts/src'),
			}
		},
		optimizeDeps: {
			exclude: ['mutts', 'pounce-ts']
		},
		ssr: {
			noExternal: ['mutts', 'pounce-ts']
		}
	})

	// 2. Attach Pounce-Board middleware
	// This handles API routes and SSR data injection
	app.use('*', createPounceMiddleware({ 
		routesDir,
		importFn: (p) => vite.ssrLoadModule(p)
	}))

	// 3. Fallback HTML handler (standard SSR flow)
	app.get('*', async (c) => {
		const url = new URL(c.req.url)

		// Import SSR utilities dynamically to avoid circular deps
		const { withSSRContext, injectApiResponses, getCollectedSSRResponses } = await import('../lib/ssr/utils.js')

		// Run all SSR operations within a proper context
		const origin = `${url.protocol}//${url.host}`
		const { result, context } = await withSSRContext(async () => {
			// Try to call the API handler for the same path to pre-populate hydration data
			try {
				await api(url.pathname).get().catch(() => {
					/* ignore if no GET handler */
				})
			} catch (e) {
				console.debug(`[pounce dev] SSR pre-fetch skipped for ${url.pathname}`)
			}

			// Serve the transformed index.html
			const indexPath = path.resolve(entryHtml)
			if (!fs.existsSync(indexPath)) {
				return c.text(`Entry HTML not found: ${indexPath}`, 404)
			}

			let template = fs.readFileSync(indexPath, 'utf-8')
			template = await vite.transformIndexHtml(c.req.url, template)
			
			// 1. Resolve route tree (it's built in middleware, but we need it here)
			const routesDir = options.routesDir ?? './routes'
			const routeTree = await buildRouteTree(routesDir, (p) => vite.ssrLoadModule(p)) // In dev we can rebuild or use cache
			
			// 2. Match the route
			const match = matchRoute(url.pathname, routeTree, 'GET')
			
			if (match && match.component) {
				// 3. Load framework utilities from the SAME Vite instance as the components
				const { renderToStringAsync, withSSR } = await vite.ssrLoadModule('pounce-ts/server')
				const { h } = await vite.ssrLoadModule('pounce-ts')
				const { flushSSRPromises } = await vite.ssrLoadModule('pounce-board/server')

				if (typeof match.component !== 'function') {
					console.warn(
						`[pounce dev] Skipping SSR for ${url.pathname}: default export is ${typeof match.component}, not a function.`
					)
					return template
				}

				// 4. Render the component with layouts
				const renderedHtml = await withSSR(async () => {
					console.debug(`[pounce dev] Rendering component: ${match.component.name || 'anonymous'} (type: ${typeof match.component})`)
					let app = h(match.component, { params: match.params })
					if (match.layouts) {
						for (let i = match.layouts.length - 1; i >= 0; i--) {
							const layout = match.layouts[i]
							console.debug(`[pounce dev] Wrapping with layout: ${layout.name || 'anonymous'} (type: ${typeof layout})`)
							if (typeof layout === 'object') {
								console.debug(`[pounce dev] Layout object keys: ${Object.keys(layout).join(', ')}`)
							}
							app = h(layout, { params: match.params }, app)
						}
					}

					return await renderToStringAsync(app as any, undefined, {
						collectPromises: flushSSRPromises
					})
				})

				// 5. Inject into root div
				template = template.replace('<div id="root"></div>', `<div id="root">${renderedHtml}</div>`)
			}
			
			return template
		}, origin)

		// If result is a Response (error case), return it directly
		if (result instanceof Response) {
			return result
		}

		// Build SSR data map from context's collected responses
		const ssrData: Record<string, { id: string; data: unknown }> = {}
		for (const [id, data] of context.ssr.responses.entries()) {
			ssrData[id] = { id, data }
		}
		const finalHtml = injectApiResponses(result, ssrData)

		return c.html(finalHtml)
	})

	// 4. Create Node.js HTTP server with Vite middleware
	const honoListener = getRequestListener(app.fetch)

	const server = createServer(async (req, res) => {
		// Try Vite middleware first (handles HMR, static assets, etc.)
		vite.middlewares(req, res, async () => {
			// If Vite doesn't handle it, pass to Hono
			honoListener(req, res)
		})
	})

	// 5. Start the server
	console.log(`\n  🚀 Pounce-Board dev server starting...`)
	
	server.listen(port, () => {
		console.log(`  http://localhost:${port}\n`)
	})
}
