import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './client.js'
import { defineProxy } from './proxy.js'

describe('api client proxy integration', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('should accept a proxy object directly', async () => {
		const myProxy = defineProxy({
			baseUrl: 'https://api.example.com',
			endpoints: {
				getUser: {
					method: 'GET',
					path: '/users/{id}',
					mock: (params) => ({ id: params.id, name: 'Mock User' }),
				},
			},
		})

		// Pass the object directly
		const resolvedProxy = api(myProxy) as any

		// Should return the exact same object
		expect(resolvedProxy).toBe(myProxy)

		// Force NODE_ENV to development for the mock to work
		const originalEnv = process.env.NODE_ENV
		process.env.NODE_ENV = 'development'
		try {
			const result = await resolvedProxy.getUser({ id: '123' })
			expect(result).toEqual({ id: '123', name: 'Mock User' })
		} finally {
			process.env.NODE_ENV = originalEnv
		}
	})

	it('should ignore invalid inputs', () => {
		// Just testing that it didn't break normal string/URL usage
		const url = 'http://example.com'
		const client = api(url)
		expect(client).toHaveProperty('get')
	})
})
