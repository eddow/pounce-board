/**
 * User detail handler - inherits all parent middleware
 */
import type { RequestContext } from 'pounce-board/server'

export async function get(ctx: RequestContext) {
	return {
		status: 200,
		data: {
			route: '/api/users/:id',
			userId: ctx.params.id,
			executionOrder: ctx.executionOrder,
			rootTimestamp: ctx.rootTimestamp,
			apiTimestamp: ctx.apiTimestamp,
			usersTimestamp: ctx.usersTimestamp,
			user: ctx.user,
		},
	}
}
