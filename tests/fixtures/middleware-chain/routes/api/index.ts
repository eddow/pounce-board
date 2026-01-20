/**
 * API index handler - root + api middleware applies
 */
import type { RequestContext } from 'pounce-board/server'

export async function get(ctx: RequestContext) {
	return {
		status: 200,
		data: {
			route: '/api',
			executionOrder: ctx.executionOrder,
			rootTimestamp: ctx.rootTimestamp,
			apiTimestamp: ctx.apiTimestamp,
		},
	}
}
