/**
 * Users middleware - runs after root and api middleware
 */
import type { Middleware, RequestContext } from 'pounce-board/server'

export const middleware: Middleware[] = [
	async (ctx: RequestContext, next: () => Promise<Response>) => {
		// Append to execution order
		const order = (ctx.executionOrder as string[]) || []
		order.push('users')
		ctx.executionOrder = order
		ctx.usersTimestamp = Date.now()
		ctx.user = { id: 'test-user', role: 'admin' }
		return next()
	},
]
