/**
 * Root route handler - only root middleware applies
 */
import type { RequestContext } from 'pounce-board/server'

export async function get(ctx: RequestContext) {
	return {
		status: 200,
		data: {
			route: '/',
			executionOrder: ctx.executionOrder,
			rootTimestamp: ctx.rootTimestamp,
		},
	}
}
