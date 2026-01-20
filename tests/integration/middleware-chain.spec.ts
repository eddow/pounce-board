/**
 * Middleware Chain Integration Tests
 *
 * Tests verify that:
 * 1. Middleware runs in ancestor → descendant order
 * 2. Multiple `common.ts` files merge correctly
 * 3. Context mutations propagate through the chain
 * 4. Handlers receive all context additions from ancestor middleware
 */

import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { runMiddlewares } from '../../src/lib/http/core.js'
import { buildRouteTree, matchRoute } from '../../src/lib/router/index.js'

const FIXTURE_ROUTES = path.resolve(import.meta.dirname, '../fixtures/middleware-chain/routes')

describe('Middleware Chain Integration', () => {
	describe('Middleware Execution Order', () => {
		it('should run root middleware only for / route', async () => {
			const tree = await buildRouteTree(FIXTURE_ROUTES)
			const match = matchRoute('/', tree, 'GET')

			expect(match).not.toBeNull()
			expect(match!.middlewareStack).toHaveLength(1)

			// Execute full chain
			const request = new Request('http://localhost/')
			const response = await runMiddlewares(match!.middlewareStack, { request, params: {} }, match!.handler)
			const data = await response.json()

			expect(data.executionOrder).toEqual(['root'])
			expect(data.rootTimestamp).toBeDefined()
		})

		it('should run root → api middleware for /api route', async () => {
			const tree = await buildRouteTree(FIXTURE_ROUTES)
			const match = matchRoute('/api', tree, 'GET')

			expect(match).not.toBeNull()
			expect(match!.middlewareStack).toHaveLength(2)

			const request = new Request('http://localhost/api')
			const response = await runMiddlewares(match!.middlewareStack, { request, params: {} }, match!.handler)
			const data = await response.json()

			expect(data.executionOrder).toEqual(['root', 'api'])
			expect(data.rootTimestamp).toBeDefined()
			expect(data.apiTimestamp).toBeDefined()
			// Root runs before API
			expect(data.rootTimestamp).toBeLessThanOrEqual(data.apiTimestamp)
		})

		it('should run root → api → users middleware for /api/users route', async () => {
			const tree = await buildRouteTree(FIXTURE_ROUTES)
			const match = matchRoute('/api/users', tree, 'GET')

			expect(match).not.toBeNull()
			expect(match!.middlewareStack).toHaveLength(3)

			const request = new Request('http://localhost/api/users')
			const response = await runMiddlewares(match!.middlewareStack, { request, params: {} }, match!.handler)
			const data = await response.json()

			expect(data.executionOrder).toEqual(['root', 'api', 'users'])
			expect(data.rootTimestamp).toBeLessThanOrEqual(data.apiTimestamp)
			expect(data.apiTimestamp).toBeLessThanOrEqual(data.usersTimestamp)
		})

		it('should inherit all parent middleware for dynamic /api/users/:id route', async () => {
			const tree = await buildRouteTree(FIXTURE_ROUTES)
			const match = matchRoute('/api/users/123', tree, 'GET')

			expect(match).not.toBeNull()
			expect(match!.params).toEqual({ id: '123' })
			expect(match!.middlewareStack).toHaveLength(3)

			const request = new Request('http://localhost/api/users/123')
			const response = await runMiddlewares(
				match!.middlewareStack,
				{ request, params: match!.params },
				match!.handler
			)
			const data = await response.json()

			expect(data.route).toBe('/api/users/:id')
			expect(data.userId).toBe('123')
			expect(data.executionOrder).toEqual(['root', 'api', 'users'])
		})
	})

	describe('Context Propagation', () => {
		it('should propagate context.user from users middleware to handler', async () => {
			const tree = await buildRouteTree(FIXTURE_ROUTES)
			const match = matchRoute('/api/users', tree, 'GET')

			expect(match).not.toBeNull()

			const request = new Request('http://localhost/api/users')
			const response = await runMiddlewares(match!.middlewareStack, { request, params: {} }, match!.handler)
			const data = await response.json()

			expect(data.user).toEqual({ id: 'test-user', role: 'admin' })
		})

		it('should propagate context.user to deeply nested dynamic routes', async () => {
			const tree = await buildRouteTree(FIXTURE_ROUTES)
			const match = matchRoute('/api/users/456', tree, 'GET')

			expect(match).not.toBeNull()

			const request = new Request('http://localhost/api/users/456')
			const response = await runMiddlewares(
				match!.middlewareStack,
				{ request, params: match!.params },
				match!.handler
			)
			const data = await response.json()

			expect(data.user).toEqual({ id: 'test-user', role: 'admin' })
			expect(data.userId).toBe('456')
		})
	})

	describe('Middleware Stack Collection', () => {
		it('should collect middleware from all ancestor common.ts files', async () => {
			const tree = await buildRouteTree(FIXTURE_ROUTES)

			// Root has 1 middleware
			const rootMatch = matchRoute('/', tree, 'GET')
			expect(rootMatch!.middlewareStack).toHaveLength(1)

			// /api has root + api = 2
			const apiMatch = matchRoute('/api', tree, 'GET')
			expect(apiMatch!.middlewareStack).toHaveLength(2)

			// /api/users has root + api + users = 3
			const usersMatch = matchRoute('/api/users', tree, 'GET')
			expect(usersMatch!.middlewareStack).toHaveLength(3)

			// /api/users/123 inherits all 3 (no own common.ts in [id])
			const userDetailMatch = matchRoute('/api/users/123', tree, 'GET')
			expect(userDetailMatch!.middlewareStack).toHaveLength(3)
		})
	})
})
