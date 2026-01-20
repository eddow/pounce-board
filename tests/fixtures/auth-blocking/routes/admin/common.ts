import type { Middleware } from 'pounce-board/server'

export const middleware: Middleware[] = [
	async (ctx, next) => {
		const auth = ctx.request.headers.get('Authorization')
		if (auth !== 'Bearer secret-token') {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			})
		}
		return next()
	}
]
