import type { RequestContext } from 'pounce-board/server'

export async function get(ctx: RequestContext) {
	return {
		status: 200,
		data: { message: 'Welcome, Admin' }
	}
}
