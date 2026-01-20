import { type RequestContext } from 'pounce-board/server'

export async function get(_ctx: RequestContext) {
	return {
		status: 200,
		data: {
			message: 'Hello from Pounce-Board!',
			timestamp: new Date().toISOString(),
		},
	}
}
