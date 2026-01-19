import type { Middleware } from 'pounce-board/http/core.js'

export const middleware: Middleware[] = [
	async (ctx, next) => {
		const start = Date.now()
		const response = await next()
		const ms = Date.now() - start
		response.headers.set('X-Response-Time', `${ms}ms`)
		return response
	},
]
