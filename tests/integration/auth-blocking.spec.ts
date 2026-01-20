import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { runMiddlewares } from 'pounce-board/server'
import { buildRouteTree, matchRoute } from 'pounce-board/server'

const FIXTURE_ROUTES = path.resolve(import.meta.dirname, '../fixtures/auth-blocking/routes')

describe('Auth Middleware Blocking', () => {
	it('should block unauthorized requests with 401', async () => {
		const tree = await buildRouteTree(FIXTURE_ROUTES)
		const match = matchRoute('/admin', tree, 'GET')

		expect(match).not.toBeNull()

		// Request without Authorization header
		const request = new Request('http://localhost/admin')
		const response = await runMiddlewares(match!.middlewareStack, { request, params: {} }, match!.handler!)

		expect(response.status).toBe(401)
		const data = await response.json()
		expect(data.error).toBe('Unauthorized')
	})

	it('should allow authorized requests with 200', async () => {
		const tree = await buildRouteTree(FIXTURE_ROUTES)
		const match = matchRoute('/admin', tree, 'GET')

		expect(match).not.toBeNull()

		// Request with correct Authorization header
		const request = new Request('http://localhost/admin', {
			headers: { 'Authorization': 'Bearer secret-token' }
		})
		const response = await runMiddlewares(match!.middlewareStack, { request, params: {} }, match!.handler!)

		expect(response.status).toBe(200)
		const data = await response.json()
		expect(data.message).toBe('Welcome, Admin')
	})
})
