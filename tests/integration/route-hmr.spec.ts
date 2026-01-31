import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest'
import { createPounceMiddleware, clearRouteTreeCache } from '../../src/adapters/hono.js'
import { Hono } from 'hono'

const TEST_ROUTES_DIR = path.resolve(import.meta.dirname, '../../sandbox/hmr-test-routes')

describe('Route HMR Integration', () => {
	// Setup: Create a temporary routes directory
	beforeEach(async () => {
		await fs.mkdir(TEST_ROUTES_DIR, { recursive: true })
		// Create a basic index route
		await fs.writeFile(
			path.join(TEST_ROUTES_DIR, 'index.ts'),
			`export function get() { return { status: 200, data: { msg: 'initial' } } }`
		)
	})

	// Teardown: Remove temporary directory
	afterEach(async () => {
		await fs.rm(TEST_ROUTES_DIR, { recursive: true, force: true })
		clearRouteTreeCache()
	})

	it('should pick up new routes after cache clear', async () => {
		// 1. Initialize app with middleware pointing to test dir
		const app = new Hono()
		app.use('*', createPounceMiddleware({ routesDir: TEST_ROUTES_DIR }))

		// 2. Verify initial route works
		const res1 = await app.request('http://localhost/')
		expect(res1.status).toBe(200)
		const data1 = await res1.json()
		expect(data1).toEqual({ msg: 'initial' })

		// 3. Add a new route file dynamically
		// We use a different file name to ensure it's a "new" route
		await fs.writeFile(
			path.join(TEST_ROUTES_DIR, 'new-route.ts'),
			`export function get() { return { status: 200, data: { msg: 'dynamic' } } }`
		)

		// 4. Request the new route BEFORE cache clear -> Should 404 (handled by next())
		// Note: The middleware calls next() if no route matches. 
		// Since we have no other handlers, Hono returns 404 by default.
		const res2 = await app.request('http://localhost/new-route')
		expect(res2.status).toBe(404)

		// 5. Clear the cache (simulating the watcher event)
		clearRouteTreeCache()

		// 6. Request the new route AFTER cache clear -> Should 200
		const res3 = await app.request('http://localhost/new-route')
		expect(res3.status).toBe(200)
		const data3 = await res3.json()
		expect(data3).toEqual({ msg: 'dynamic' })
	})

	it('should re-import modules after cache clear', async () => {
		// Mock importFn to track calls
		const mockImport = vi.fn().mockImplementation(async (p) => {
			// Return a static module structure
			return {
				get: () => ({ status: 200, data: { msg: 'ok' } })
			}
		})

		const app = new Hono()
		app.use('*', createPounceMiddleware({ 
			routesDir: TEST_ROUTES_DIR,
			importFn: mockImport
		}))

		// 1. Initial request -> Should trigger import
		const res1 = await app.request('http://localhost/')
		expect(res1.status).toBe(200)
		expect(mockImport).toHaveBeenCalled()
		const callCountAfterFirst = mockImport.mock.calls.length

		// 2. Second request -> Should NOT trigger new import (cached)
		const res2 = await app.request('http://localhost/')
		expect(res2.status).toBe(200)
		expect(mockImport.mock.calls.length).toBe(callCountAfterFirst)

		// 3. Clear cache
		clearRouteTreeCache()

		// 4. Third request -> Should trigger import AGAIN
		const res3 = await app.request('http://localhost/')
		expect(res3.status).toBe(200)
		expect(mockImport.mock.calls.length).toBeGreaterThan(callCountAfterFirst)
	})
})
