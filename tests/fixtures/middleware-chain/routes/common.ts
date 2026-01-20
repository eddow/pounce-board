/**
 * Root middleware - runs first for all routes
 */
import type { Middleware, RequestContext } from 'pounce-board/server'

export const middleware: Middleware[] = [
	async (ctx: RequestContext, next: () => Promise<Response>) => {
		// Track middleware execution order
		ctx.executionOrder = ['root']
		ctx.rootTimestamp = Date.now()
		return next()
	},
]
