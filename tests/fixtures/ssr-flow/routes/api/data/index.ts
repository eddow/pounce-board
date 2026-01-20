import type { RequestContext } from 'pounce-board/server'

export async function get(_ctx: RequestContext) {
	return {
		status: 200,
		data: { message: 'Hello from SSR!', timestamp: Date.now() }
	}
}
