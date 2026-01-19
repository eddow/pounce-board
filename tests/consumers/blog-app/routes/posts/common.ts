import type { Middleware } from 'pounce-board/http/core.js'

export const middleware: Middleware[] = [
	async (ctx, next) => {
		// Example: Add a header specifically for posts routes
		const response = await next()
		response.headers.set('X-Resource', 'Posts')
		return response
	},
]
