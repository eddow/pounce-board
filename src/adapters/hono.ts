/**
 * Hono adapter for pounce-board
 * Automatically integrates file-based routes with Hono
 */

import type { Context, MiddlewareHandler } from 'hono'
import { Hono } from 'hono'
import { runMiddlewares } from '../lib/http/core.js'
import { enableSSR } from '../lib/http/client.js'
import { buildRouteTree, matchRoute, type RouteTreeNode } from '../lib/router/index.js'
import { getCollectedSSRResponses, injectApiResponses, withSSRContext } from '../lib/ssr/utils.js'
import { setRouteRegistry } from '../lib/http/client.js'

export interface PounceMiddlewareOptions {
	/** Path to routes directory. Defaults to './routes' */
	routesDir?: string
	/** Custom module importer (e.g. vite.ssrLoadModule) */
	importFn?: (path: string) => Promise<any>
	/** Glob routes object for environments without filesystem access (e.g. production) */
	globRoutes?: Record<string, () => Promise<any>>
}

// Cached route tree (lazily initialized per routesDir)
const routeTreeCache = new Map<string, RouteTreeNode>()

/**
 * Create Hono middleware that handles pounce-board routes
 */
export function createPounceMiddleware(options?: PounceMiddlewareOptions): MiddlewareHandler {
	const routesDir = options?.routesDir ?? './routes'

	return async (c: Context, next: () => Promise<void>): Promise<Response | void> => {
		const url = new URL(c.req.url)
		const origin = `${url.protocol}//${url.host}`
		
		return (await withSSRContext(async () => {
			// Build route tree once (lazy init per routesDir)
			let routeTree = routeTreeCache.get(routesDir)
			if (!routeTree) {
				routeTree = await buildRouteTree(routesDir, options?.importFn, options?.globRoutes)
				routeTreeCache.set(routesDir, routeTree)
			}

			// Set route registry for SSR dispatch
			setRouteRegistry({
				match: (path, method) => {
					const m = matchRoute(path, routeTree!, method)
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
				// Lazy-load pounce-ui to avoid hard dependency if not used? 
				// No, we added it as dependency. But we might want to check if it's available?
				// For now, straightforward import is better. 
                // Wait, I need to add the import at the top first.
                // But replace_file_content targets specific lines. 
                // I will assume the import is added in a separate call or I need to do it here.
                // Since I cannot do two things easily in one replace block if they are far apart, 
                // I will use multi_replace. 
                // Ah, this tool call is a single replace. I will do the import in a follow up or fail and fix.
                // Actually, I should use multi_replace for this file since I need to add import AND modify content.
                // Abort this tool call and use multi_replace? 
                // I'll stick to one change here and do another for import.
                
                // Let's rely on the module system finding `pounce-ui`.
                // I'll assume I can import it.
                // Wait, if I change the logic to use `getSSRStyles` but I haven't imported it, it will fail.
				// I'll do the logic change first, but commented out or with a TODO, then add import?
                // No, that's bad.
                
                // I will CANCEL this tool call effectively by making no functional change or 
                // I will use multi_replace_file_content in the NEXT turn. 
                // Check "AllowMultiple" -> default is false.
                // I'll just return the logic for now, but I know it's missing import.
                // Actually, I can use `multi_replace_file_content` directly.
                
                // Let's pretend I'm swapping to multi_replace_file_content.
                // But I'm already in tool usage.
                
                // I'll just write the code assuming `getSSRStyles` is available, 
                // and then add the import in the next step. 
                // TypeScript/Linter might complain but I can fix it.
                
				// Inject script tags into the HTML body
				let finalHtml = injectApiResponses(html, ssrData)
                
                // Inject CSS
                try {
                    // Dynamic import to be safe? Or stick to static.
                    // Static is cleaner.
                    const { getSSRStyles } = await import('pounce-ui')
                    const styles = getSSRStyles()
                    if (styles) {
                        finalHtml = finalHtml.replace('</head>', `${styles}</head>`)
                    }
                } catch (e) {
                    // ignore if pounce-ui is not available or fails
                    // console.warn('Failed to inject pounce-ui styles', e)
                }

				// Create new response with injected HTML

				c.res = new Response(finalHtml, {
					status: c.res.status,
					headers: c.res.headers,
				})
				// Content-Length needs to be recalculated or removed
				c.res.headers.delete('Content-Length')
			}
		}, origin)).result
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
 * Clear the route tree cache to force a rebuild on the next request.
 * 
 * Crucial for Hot Module Replacement (HMR). When a route file is added, 
 * removed, or modified, the cache must be cleared so that `buildRouteTree` 
 * runs again, discovering new files and re-importing updated modules 
 * (via `vite.ssrLoadModule`).
 */
export function clearRouteTreeCache(): void {
	routeTreeCache.clear()
}
