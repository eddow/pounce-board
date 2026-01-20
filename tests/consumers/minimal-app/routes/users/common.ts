import type { Middleware, RequestContext } from 'pounce-board/server'

export const middleware: Middleware[] = [
	async (ctx: RequestContext, next: () => Promise<Response>) => {
		// Add a dummy user to context
		ctx.user = { id: 'admin', role: 'root' }
		ctx.timestamp = Date.now()
		return next()
	},
]
