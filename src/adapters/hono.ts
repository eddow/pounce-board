/**
 * Hono adapter for pounce-board
 * Automatically integrates file-based routes with Hono
 */

import type { Context, MiddlewareHandler } from 'hono'
import { Hono } from 'hono'
import { runMiddlewares } from '../lib/http/core.js'
import { enableSSR } from '../lib/http/client.js'
import { buildRouteTree, matchRoute, type RouteTreeNode } from '../lib/router/index.js'
import { getCollectedSSRResponses, injectApiResponses } from '../lib/ssr/utils.js'
import { setRouteRegistry } from '../lib/http/client.js'

export interface PounceMiddlewareOptions {
	/** Path to routes directory. Defaults to './routes' */
	routesDir?: string
}

// Cached route tree (lazily initialized per routesDir)
const routeTreeCache = new Map<string, RouteTreeNode>()

/**
 * Create Hono middleware that handles pounce-board routes
 */
export function createPounceMiddleware(options?: PounceMiddlewareOptions): MiddlewareHandler {
	const routesDir = options?.routesDir ?? './routes'

	return async (c: Context, next: () => Promise<void>): Promise<Response | void> => {
		// Build route tree once (lazy init per routesDir)
		let routeTree = routeTreeCache.get(routesDir)
		if (!routeTree) {
			routeTree = await buildRouteTree(routesDir)
			routeTreeCache.set(routesDir, routeTree)
		}

		// Set route registry for SSR dispatch
		setRouteRegistry({
			match: (path, method) => matchRoute(path, routeTree!, method),
		})

		// Match the request path
		const method = c.req.method.toUpperCase()
		const url = new URL(c.req.url)
		const match = matchRoute(url.pathname, routeTree, method)

		const accept = c.req.header('Accept') || ''
		const prefersHtml = accept.includes('text/html')

		if (match) {
			// If it's a GET request and the client prefers HTML, we should NOT 
			// return the API handler response directly. Instead, we should 
			// fall through to allow SSR/HTML rendering.
			if (method === 'GET' && prefersHtml) {
				// Fall through
			} else {
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
