/**
 * Unit tests for Hono adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Hono } from 'hono'
import * as path from 'node:path'
import { createPounceMiddleware, clearRouteTreeCache } from './hono.js'

// Test routes directory (uses minimal-app routes)
const TEST_ROUTES_DIR = path.resolve(__dirname, '../../tests/consumers/minimal-app/routes')

describe('Hono Adapter', () => {
	beforeEach(() => {
		clearRouteTreeCache()
	})

	afterEach(() => {
		clearRouteTreeCache()
	})

	describe('createPounceMiddleware', () => {
		it('should match static route GET /', async () => {
			const app = new Hono()
			app.use('*', createPounceMiddleware({ routesDir: TEST_ROUTES_DIR }))

			const res = await app.request('http://localhost/')
			expect(res.status).toBe(200)

			const data = await res.json()
			expect(data.message).toBe('Hello from Pounce-Board!')
			expect(data.timestamp).toBeDefined()
		})

		it('should match dynamic route GET /users/:id', async () => {
			const app = new Hono()
			app.use('*', createPounceMiddleware({ routesDir: TEST_ROUTES_DIR }))

			const res = await app.request('http://localhost/users/42')
			expect(res.status).toBe(200)

			const data = await res.json()
			expect(data.id).toBe('42')
			expect(data.name).toBe('User 42')
			expect(data.role).toBe('Tester')
		})

		it('should fall through to next handler when no route matches', async () => {
			const app = new Hono()
			app.use('*', createPounceMiddleware({ routesDir: TEST_ROUTES_DIR }))
			app.get('/fallback', (c) => c.text('Fallback handler'))

			const res = await app.request('http://localhost/fallback')
			expect(res.status).toBe(200)
			expect(await res.text()).toBe('Fallback handler')
		})

		it('should return 404 for unmatched routes with no fallback', async () => {
			const app = new Hono()
			app.use('*', createPounceMiddleware({ routesDir: TEST_ROUTES_DIR }))

			const res = await app.request('http://localhost/does-not-exist')
			// Hono returns 404 by default when no handler matches
			expect(res.status).toBe(404)
		})

		it('should cache route tree for same routesDir', async () => {
			const app = new Hono()
			app.use('*', createPounceMiddleware({ routesDir: TEST_ROUTES_DIR }))

			// First request builds the tree
			await app.request('http://localhost/')
			// Second request should use cached tree
			const res = await app.request('http://localhost/')

			expect(res.status).toBe(200)
		})
	})
})
