import { type RequestContext } from 'pounce-board/http/core.js'

export async function get({ params, user, timestamp }: RequestContext) {
	return {
		status: 200,
		data: {
			id: params.id,
			name: `User ${params.id}`,
			role: 'Tester',
			contextUser: user,
			requestTimestamp: timestamp,
		},
	}
}
