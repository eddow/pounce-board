/**
 * API middleware - runs after root, before api handlers
 */
import type { Middleware, RequestContext } from 'pounce-board/server'

export const middleware: Middleware[] = [
	async (ctx: RequestContext, next: () => Promise<Response>) => {
		// Append to execution order
		const order = (ctx.executionOrder as string[]) || []
		order.push('api')
		ctx.executionOrder = order
		ctx.apiTimestamp = Date.now()
		return next()
	},
]
