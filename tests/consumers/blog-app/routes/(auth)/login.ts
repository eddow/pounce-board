import type { RequestContext } from 'pounce-board/server'

export async function post({ request }: RequestContext) {
	try {
		const body = await request.json()
		if (body.username === 'admin' && body.password === 'password') {
			return {
				status: 200,
				data: { token: 'fake-jwt-token' },
			}
		}
		return { status: 401, error: 'Invalid credentials' }
	} catch {
		return { status: 400, error: 'Invalid JSON' }
	}
}
