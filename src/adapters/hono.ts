/**
 * Hono adapter for pounce-board
 * Automatically integrates file-based routes with Hono
 */

import type { Context, MiddlewareHandler } from 'hono'
import { Hono } from 'hono'
import { runMiddlewares } from '../lib/http/core.js'
import { enableSSR } from '../lib/http/client.js'
import { buildRouteTree, matchRoute, type RouteTreeNode, collectNamedRoutes } from '../lib/router/index.js'
import { getCollectedSSRResponses, injectApiResponses, withSSRContext } from '../lib/ssr/utils.js'
import { setRouteRegistry, setNamedRoutes } from '../lib/http/client.js'

export interface PounceMiddlewareOptions {
	/** Path to routes directory. Defaults to './routes' */
	routesDir?: string
	/** Custom module importer (e.g. vite.ssrLoadModule) */
	importFn?: (path: string) => Promise<any>
}

// Cached route tree (lazily initialized per routesDir)
interface CachedRoutes {
	tree: RouteTreeNode
	namedRoutes: Record<string, string>
}
const routeTreeCache = new Map<string, CachedRoutes>()

/**
 * Create Hono middleware that handles pounce-board routes
 */
export function createPounceMiddleware(options?: PounceMiddlewareOptions): MiddlewareHandler {
	const routesDir = options?.routesDir ?? './routes'

	return async (c: Context, next: () => Promise<void>): Promise<Response | void> => {
		return (await withSSRContext(async () => {
			// Build route tree once (lazy init per routesDir)
			let cached = routeTreeCache.get(routesDir)
			if (!cached) {
				const tree = await buildRouteTree(routesDir, options?.importFn)
				const namedRoutes = collectNamedRoutes(tree)
				cached = { tree, namedRoutes }
				routeTreeCache.set(routesDir, cached)
			}

			// Set route registry for SSR dispatch
			setRouteRegistry({
				match: (path, method) => {
					const m = matchRoute(path, cached!.tree, method)
					if (m && m.handler) {
						return {
							handler: m.handler,
							middlewareStack: m.middlewareStack,
							params: m.params,
						}
					}
					return null
				},
			})

			// Set named routes for server-side resolution
			setNamedRoutes(cached.namedRoutes)

			// Match the request path
			const method = c.req.method.toUpperCase()
			const url = new URL(c.req.url)
			const match = matchRoute(url.pathname, cached.tree, method)

			const accept = c.req.header('Accept') || ''
			const prefersHtml = accept.includes('text/html')

			if (match) {
				// If it's a GET request and the client prefers HTML, we should NOT 
				// return the API handler response directly. Instead, we should 
				// fall through to allow SSR/HTML rendering.
				if (method === 'GET' && prefersHtml) {
					// Fall through
				} else if (match.handler) {
					// Build request context
					const ctx = {
						request: c.req.raw,
						params: match.params,
					}

					// Execute middleware stack and handler
					const response = await runMiddlewares(match.middlewareStack, ctx, match.handler)

					// Return the pounce-board response directly
					return response
				}
			}

			// No route matched - proceed to next Hono handler
			// Enable SSR for potential HTML rendering downstream
			enableSSR()
			await next()

			// Handle SSR injection for HTML responses
			const contentType = c.res.headers.get('Content-Type')
			if (contentType && contentType.includes('text/html')) {
				const html = await c.res.text()
				const ssrData = getCollectedSSRResponses()

				// Inject named routes map for client-side usage
				ssrData['pounce-named-routes'] = {
					id: 'pounce-named-routes',
					data: cached!.namedRoutes
				}

				// Inject script tags into the HTML body
				const finalHtml = injectApiResponses(html, ssrData)

				// Create new response with injected HTML
				c.res = new Response(finalHtml, {
					status: c.res.status,
					headers: c.res.headers,
				})
				// Content-Length needs to be recalculated or removed
				c.res.headers.delete('Content-Length')
			}
		}, c.req.url)).result
	}
}

/**
 * Create a Hono app with pounce-board integration
 */
export function createPounceApp(options?: PounceMiddlewareOptions): Hono {
	const app = new Hono()
	app.use('*', createPounceMiddleware(options))
	return app
}

/**
 * Clear the route tree cache (useful for testing or HMR)
 */
export function clearRouteTreeCache(): void {
	routeTreeCache.clear()
}
