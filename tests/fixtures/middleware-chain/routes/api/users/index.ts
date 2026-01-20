/**
 * Users list handler - root + api + users middleware applies
 */
import type { RequestContext } from 'pounce-board/server'

export async function get(ctx: RequestContext) {
	return {
		status: 200,
		data: {
			route: '/api/users',
			executionOrder: ctx.executionOrder,
			rootTimestamp: ctx.rootTimestamp,
			apiTimestamp: ctx.apiTimestamp,
			usersTimestamp: ctx.usersTimestamp,
			user: ctx.user,
		},
	}
}
