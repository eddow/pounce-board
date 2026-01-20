import type { RequestContext } from 'pounce-board/server'

export async function get(_ctx: RequestContext) {
	return {
		status: 200,
		data: {
			name: 'Pounce Blog API',
			version: '1.0.0',
			endpoints: ['/posts', '/posts/:id', '/login'],
		},
	}
}
