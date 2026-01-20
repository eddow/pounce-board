import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSSRData, getCollectedSSRResponses } from '../ssr/utils.js'
import {
	api,
	clearInterceptors,
	clearRouteRegistry,
	config,
	del,
	disableSSR,
	enableSSR,
	get,
	intercept,
	patch,
	post,
	put,
	type RouteRegistry,
	setRouteRegistry,
} from './client.js'
import { PounceResponse } from './response.js'
import { ApiError } from './core.js'

describe('api client SSR integration', () => {
	beforeEach(() => {
		disableSSR()
		clearSSRData()
		clearRouteRegistry()
	})

	describe('server-side', () => {
		afterEach(() => {
			clearRouteRegistry()
			disableSSR()
		})

		it('should dispatch to handler and return data when SSR is enabled', async () => {
			const mockHandler = vi.fn().mockResolvedValue({
				status: 200,
				data: { success: true },
			})

			const mockRegistry: RouteRegistry = {
				match: vi.fn().mockReturnValue({
					handler: mockHandler,
					middlewareStack: [],
					params: {},
				}),
			}

			setRouteRegistry(mockRegistry)
			enableSSR()

			const result = await api('http://localhost/api/test').get()
			expect(result).toEqual({ success: true })
			expect(mockHandler).toHaveBeenCalled()
		})
	})

	describe('client-side (browser simulation)', () => {
		beforeEach(() => {
			vi.stubGlobal('document', {
				getElementById: vi.fn(),
			})
			disableSSR()
		})

		afterEach(() => {
			vi.unstubAllGlobals()
		})

		it('should pick up data from the DOM script tags', async () => {
			const url = 'http://localhost/api/user'
			const id = `pounce-data-${btoa('/api/user')}`
			const data = { name: 'Alice' }

			const mockScript = {
				textContent: JSON.stringify(data),
				remove: vi.fn(),
			}

			;(document.getElementById as any).mockReturnValue(mockScript)

			const result = await api(url).get()
			expect(result).toEqual(data)
			expect(mockScript.remove).toHaveBeenCalled()
		})

		it('should fall back to fetch if no script tag is found', async () => {
			const url = 'http://localhost/api/fetch'
			;(document.getElementById as any).mockReturnValue(null)

			const mockFetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ fetched: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)
			vi.stubGlobal('fetch', mockFetch)

			const result = await api(url).get()
			expect(result).toEqual({ fetched: true })
			expect(mockFetch).toHaveBeenCalledWith(new URL(url), expect.anything())
		})
	})

	describe('advanced syntaxes (server pendant)', () => {
		beforeEach(() => {
			vi.stubGlobal('document', {
				getElementById: vi.fn().mockReturnValue(null),
			})
			// Mock window.location for site-relative resolution to work
			vi.stubGlobal('window', {
				location: {
					href: 'http://localhost/current/page',
					origin: 'http://localhost',
				},
			})
		})

		afterEach(() => {
			vi.unstubAllGlobals()
		})

		it('should support functional proxy syntax: api.get() targeting current URL', async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)
			vi.stubGlobal('fetch', mockFetch)

			const result = await api.get()
			expect(result).toEqual({ success: true })
			// api(".") resolves to current href
			expect(mockFetch).toHaveBeenCalledWith(new URL('http://localhost/current/page'), expect.anything())
		})

		it('should support direct method exports: get() targeting current URL', async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ exported: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)
			vi.stubGlobal('fetch', mockFetch)

			const result = await get()
			expect(result).toEqual({ exported: true })
			expect(mockFetch).toHaveBeenCalledWith(new URL('http://localhost/current/page'), expect.anything())
		})

		it('should handle query parameters in functional proxy', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		)
			vi.stubGlobal('fetch', mockFetch)

			await api.get({ q: 'search' })
			const expectedUrl = new URL('http://localhost/current/page')
			expectedUrl.searchParams.set('q', 'search')
			expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.anything())
		})

		it('should support post with body via functional proxy', async () => {
			const body = { id: 1 }
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ created: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)
			vi.stubGlobal('fetch', mockFetch)

			const result = await post(body)
			expect(result).toEqual({ created: true })
			expect(mockFetch).toHaveBeenCalledWith(
				new URL('http://localhost/current/page'),
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify(body),
				})
			)
			const headers = mockFetch.mock.calls[0][1].headers as Headers
			expect(headers.get('Content-Type')).toBe('application/json')
		})

		it('should support post with FormData via functional proxy', async () => {
			const formData = new FormData()
			formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt')

			const mockFetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ uploaded: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)
			vi.stubGlobal('fetch', mockFetch)

			const result = await post(formData)
			expect(result).toEqual({ uploaded: true })
			expect(mockFetch).toHaveBeenCalledWith(
				new URL('http://localhost/current/page'),
				expect.objectContaining({
					method: 'POST',
					body: formData,
				})
			)
			const headers = mockFetch.mock.calls[0][1].headers
			// FormData should have a multipart/form-data Content-Type header (set by the browser/Request)
			if (headers instanceof Headers) {
				expect(headers.get('Content-Type')).toContain('multipart/form-data')
			} else {
				expect((headers as any)['Content-Type']).toContain('multipart/form-data')
			}
		})
	})
})

describe('HTTP methods', () => {
	beforeEach(() => {
		disableSSR()
		vi.stubGlobal('document', {
			getElementById: vi.fn().mockReturnValue(null),
		})
		vi.stubGlobal('window', {
			location: {
				href: 'http://localhost/test',
				origin: 'http://localhost',
			},
		})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	describe('.put()', () => {
		it('should send PUT request with JSON body', async () => {
			const body = { name: 'Updated', value: 42 }
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ updated: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)
			vi.stubGlobal('fetch', mockFetch)

			const result = await api('/resource').put(body)

			expect(result).toEqual({ updated: true })
			expect(mockFetch).toHaveBeenCalledWith(
				new URL('http://localhost/resource'),
				expect.objectContaining({
					method: 'PUT',
					body: JSON.stringify(body),
				})
			)
			const headers = mockFetch.mock.calls[0][1].headers as Headers
			expect(headers.get('Content-Type')).toBe('application/json')
		})

		it('should support put() direct export', async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)
			vi.stubGlobal('fetch', mockFetch)

			await put({ data: 'test' })

			expect(mockFetch).toHaveBeenCalledWith(
				new URL('http://localhost/test'),
				expect.objectContaining({ method: 'PUT' })
			)
		})
	})

	describe('.del()', () => {
		it('should send DELETE request', async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ deleted: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)
			vi.stubGlobal('fetch', mockFetch)

			const result = await api('/resource/123').del()

			expect(result).toEqual({ deleted: true })
			expect(mockFetch).toHaveBeenCalledWith(
				new URL('http://localhost/resource/123'),
				expect.objectContaining({ method: 'DELETE' })
			)
		})

		it('should include query params in DELETE request', async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ deleted: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)
			vi.stubGlobal('fetch', mockFetch)

			await api('/resource').del({ force: 'true', cascade: 'false' })

			const expectedUrl = new URL('http://localhost/resource')
			expectedUrl.searchParams.set('force', 'true')
			expectedUrl.searchParams.set('cascade', 'false')
			expect(mockFetch).toHaveBeenCalledWith(
				expectedUrl,
				expect.objectContaining({ method: 'DELETE' })
			)
		})

		it('should support del() direct export', async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)
			vi.stubGlobal('fetch', mockFetch)

			await del({ id: '123' })

			const expectedUrl = new URL('http://localhost/test')
			expectedUrl.searchParams.set('id', '123')
			expect(mockFetch).toHaveBeenCalledWith(
				expectedUrl,
				expect.objectContaining({ method: 'DELETE' })
			)
		})
	})

	describe('.patch()', () => {
		it('should send PATCH request with JSON body', async () => {
			const body = { status: 'active' }
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ patched: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)
			vi.stubGlobal('fetch', mockFetch)

			const result = await api('/resource/456').patch(body)

			expect(result).toEqual({ patched: true })
			expect(mockFetch).toHaveBeenCalledWith(
				new URL('http://localhost/resource/456'),
				expect.objectContaining({
					method: 'PATCH',
					body: JSON.stringify(body),
				})
			)
			const headers = mockFetch.mock.calls[0][1].headers as Headers
			expect(headers.get('Content-Type')).toBe('application/json')
		})

		it('should support patch() direct export', async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			)
			vi.stubGlobal('fetch', mockFetch)

			await patch({ field: 'value' })

			expect(mockFetch).toHaveBeenCalledWith(
				new URL('http://localhost/test'),
				expect.objectContaining({ method: 'PATCH' })
			)
		})
	})
})

describe('Error handling', () => {
	beforeEach(() => {
		disableSSR()
		vi.stubGlobal('document', {
			getElementById: vi.fn().mockReturnValue(null),
		})
		vi.stubGlobal('window', {
			location: {
				href: 'http://localhost/test',
				origin: 'http://localhost',
			},
		})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('should throw ApiError for non-OK GET response', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(null, {
				status: 404,
				statusText: 'Not Found',
			})
		)
		vi.stubGlobal('fetch', mockFetch)

		try {
			await api('/missing').get()
			expect.fail('Should have thrown ApiError')
		} catch (e) {
			expect(e).toBeInstanceOf(ApiError)
			const err = e as ApiError
			expect(err.status).toBe(404)
			expect(err.statusText).toBe('Not Found')
			expect(err.url).toBe('http://localhost/missing')
		}
	})

	it('should capture JSON error data in ApiError', async () => {
		const errorBody = { message: 'Invalid request', code: 'VAL_ERR' }
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(errorBody), {
				status: 400,
				statusText: 'Bad Request',
				headers: { 'Content-Type': 'application/json' },
			})
		)
		vi.stubGlobal('fetch', mockFetch)

		try {
			await api('/api/resource').post({ data: 'invalid' })
			expect.fail('Should have thrown ApiError')
		} catch (e) {
			expect(e).toBeInstanceOf(ApiError)
			const err = e as ApiError
			expect(err.status).toBe(400)
			expect(err.data).toEqual(errorBody)
		}
	})

	it('should throw ApiError for non-OK PUT response', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(null, { status: 403, statusText: 'Forbidden' })
		)
		vi.stubGlobal('fetch', mockFetch)

		await expect(api('/resource').put({ data: 'test' })).rejects.toThrow(ApiError)
	})

	it('should throw ApiError for non-OK DELETE response', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(null, { status: 500, statusText: 'Internal Server Error' })
		)
		vi.stubGlobal('fetch', mockFetch)

		await expect(api('/resource').del()).rejects.toThrow(ApiError)
	})

	it('should throw ApiError for non-OK PATCH response', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(null, { status: 422, statusText: 'Unprocessable Entity' })
		)
		vi.stubGlobal('fetch', mockFetch)

		await expect(api('/resource').patch({ bad: 'patch' })).rejects.toThrow(ApiError)
	})
})

describe('Path resolution', () => {
	beforeEach(() => {
		disableSSR()
		vi.stubGlobal('document', {
			getElementById: vi.fn().mockReturnValue(null),
		})
		vi.stubGlobal('window', {
			location: {
				href: 'http://localhost/users/123/edit',
				origin: 'http://localhost',
			},
		})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('should resolve absolute paths (starting with /)', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		)
		vi.stubGlobal('fetch', mockFetch)

		await api('/api/users').get()

		expect(mockFetch).toHaveBeenCalledWith(new URL('http://localhost/api/users'), expect.anything())
	})

	it('should resolve site-relative paths (starting with ./)', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		)
		vi.stubGlobal('fetch', mockFetch)

		await api('./permissions').get()

		// Relative to http://localhost/users/123/edit -> http://localhost/users/123/permissions
		expect(mockFetch).toHaveBeenCalledWith(new URL('http://localhost/users/123/permissions'), expect.anything())
	})

	it('should resolve parent-relative paths (../)', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		)
		vi.stubGlobal('fetch', mockFetch)

		await api('../profile').get()

		// Relative to http://localhost/users/123/edit -> http://localhost/users/profile
		expect(mockFetch).toHaveBeenCalledWith(new URL('http://localhost/users/profile'), expect.anything())
	})

	it('should handle full URLs (https://)', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ external: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		)
		vi.stubGlobal('fetch', mockFetch)

		await api('https://external.com/api/data').get()

		expect(mockFetch).toHaveBeenCalledWith(new URL('https://external.com/api/data'), expect.anything())
	})

	it('should treat paths without prefix as site-absolute', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		)
		vi.stubGlobal('fetch', mockFetch)

		await api('users').get()

		expect(mockFetch).toHaveBeenCalledWith(new URL('http://localhost/users'), expect.anything())
	})
})



describe('SSR server-side dispatch', () => {
    let mockScope: any
    let runWithContext: any
    let createScope: any

    beforeAll(async () => {
        const ctxModule = await import('../http/context.js')
        runWithContext = ctxModule.runWithContext
        createScope = ctxModule.createScope
    })

	beforeEach(() => {
		clearSSRData()
		clearRouteRegistry()
		disableSSR()
	})

	afterEach(() => {
		clearRouteRegistry()
		disableSSR()
		vi.unstubAllGlobals()
	})

	it('should dispatch GET directly to handler without network', async () => {
		const mockHandler = vi.fn().mockResolvedValue({
			status: 200,
			data: { id: 123, name: 'Test User' },
		})

		const mockRegistry: RouteRegistry = {
			match: vi.fn().mockReturnValue({
				handler: mockHandler,
				middlewareStack: [],
				params: { id: '123' },
			}),
		}

		setRouteRegistry(mockRegistry)
		enableSSR()

		const result = await api('/users/123').get()

		expect(result).toEqual({ id: 123, name: 'Test User' })
		expect(mockHandler).toHaveBeenCalled()
		expect(mockRegistry.match).toHaveBeenCalledWith('/users/123', 'GET')
	})

	it('should dispatch POST with body to handler', async () => {
		const mockHandler = vi.fn().mockResolvedValue({
			status: 201,
			data: { created: true, id: 456 },
		})

		const mockRegistry: RouteRegistry = {
			match: vi.fn().mockReturnValue({
				handler: mockHandler,
				middlewareStack: [],
				params: {},
			}),
		}

		setRouteRegistry(mockRegistry)
		enableSSR()

		const body = { name: 'New Item' }
		const result = await api('/items').post(body)

		expect(result).toEqual({ created: true, id: 456 })
		expect(mockHandler).toHaveBeenCalled()
		// Verify the body was passed in the request
		const callContext = mockHandler.mock.calls[0][0]
		const requestBody = await callContext.request.json()
		expect(requestBody).toEqual(body)
	})

	it('should dispatch POST with FormData to handler in SSR', async () => {
		const mockHandler = vi.fn().mockResolvedValue({
			status: 201,
			data: { uploaded: true },
		})

		const mockRegistry: RouteRegistry = {
			match: vi.fn().mockReturnValue({
				handler: mockHandler,
				middlewareStack: [],
				params: {},
			}),
		}

		setRouteRegistry(mockRegistry)
		enableSSR()

		const formData = new FormData()
		formData.append('foo', 'bar')
		
		const result = await api('/upload').post(formData)

		expect(result).toEqual({ uploaded: true })
		expect(mockHandler).toHaveBeenCalled()
		
		const callContext = mockHandler.mock.calls[0][0]
		// In a real Request, the body is converted to a ReadableStream
		expect(callContext.request.body).toBeDefined()
		expect(callContext.request.body).not.toBeNull()
	})

	it('should dispatch PUT with body to handler', async () => {
		const mockHandler = vi.fn().mockResolvedValue({
			status: 200,
			data: { updated: true },
		})

		const mockRegistry: RouteRegistry = {
			match: vi.fn().mockReturnValue({
				handler: mockHandler,
				middlewareStack: [],
				params: { id: '789' },
			}),
		}

		setRouteRegistry(mockRegistry)
		enableSSR()

		const result = await api('/items/789').put({ status: 'active' })

		expect(result).toEqual({ updated: true })
		expect(mockRegistry.match).toHaveBeenCalledWith('/items/789', 'PUT')
	})

	it('should dispatch DELETE to handler', async () => {
		const mockHandler = vi.fn().mockResolvedValue({
			status: 200,
			data: { deleted: true },
		})

		const mockRegistry: RouteRegistry = {
			match: vi.fn().mockReturnValue({
				handler: mockHandler,
				middlewareStack: [],
				params: { id: '999' },
			}),
		}

		setRouteRegistry(mockRegistry)
		enableSSR()

		const result = await api('/items/999').del()

		expect(result).toEqual({ deleted: true })
		expect(mockRegistry.match).toHaveBeenCalledWith('/items/999', 'DELETE')
	})

	it('should dispatch PATCH with body to handler', async () => {
		const mockHandler = vi.fn().mockResolvedValue({
			status: 200,
			data: { patched: true },
		})

		const mockRegistry: RouteRegistry = {
			match: vi.fn().mockReturnValue({
				handler: mockHandler,
				middlewareStack: [],
				params: {},
			}),
		}

		setRouteRegistry(mockRegistry)
		enableSSR()

		const result = await api('/resource').patch({ field: 'value' })

		expect(result).toEqual({ patched: true })
		expect(mockRegistry.match).toHaveBeenCalledWith('/resource', 'PATCH')
	})

	it('should run middleware stack during SSR dispatch', async () => {
		const executionOrder: string[] = []

		const middleware1 = vi.fn(async (_ctx, next) => {
			executionOrder.push('middleware1-before')
			const response = await next()
			executionOrder.push('middleware1-after')
			return response
		})

		const middleware2 = vi.fn(async (_ctx, next) => {
			executionOrder.push('middleware2-before')
			const response = await next()
			executionOrder.push('middleware2-after')
			return response
		})

		const mockHandler = vi.fn().mockImplementation(async () => {
			executionOrder.push('handler')
			return { status: 200, data: { result: 'ok' } }
		})

		const mockRegistry: RouteRegistry = {
			match: vi.fn().mockReturnValue({
				handler: mockHandler,
				middlewareStack: [middleware1, middleware2],
				params: {},
			}),
		}

		setRouteRegistry(mockRegistry)
		enableSSR()

		await api('/test').get()

		expect(executionOrder).toEqual([
			'middleware1-before',
			'middleware2-before',
			'handler',
			'middleware2-after',
			'middleware1-after',
		])
	})

	it('should inject SSR data for later hydration', async () => {
		const mockHandler = vi.fn().mockResolvedValue({
			status: 200,
			data: { userList: ['Alice', 'Bob'] },
		})

		const mockRegistry: RouteRegistry = {
			match: vi.fn().mockReturnValue({
				handler: mockHandler,
				middlewareStack: [],
				params: {},
			}),
		}

		setRouteRegistry(mockRegistry)
        
        await runWithContext(createScope(), async () => {
		    enableSSR()

		    await api('/users').get()

		    // Verify SSR data was injected
		    const collected = getCollectedSSRResponses()
		    const entries = Object.values(collected)
		    expect(entries.length).toBe(1)
		    expect(entries[0].data).toEqual({ userList: ['Alice', 'Bob'] })
        })
	})

	it('should throw error when no registry is set in SSR mode', async () => {
		enableSSR()
		// Don't set registry

		await expect(api('/test').get()).rejects.toThrow(
			'[pounce-board] SSR dispatch failed: No route registry set'
		)
	})

	it('should throw error when no handler matches in SSR mode', async () => {
		const mockRegistry: RouteRegistry = {
			match: vi.fn().mockReturnValue(null),
		}

		setRouteRegistry(mockRegistry)
		enableSSR()

		await expect(api('/nonexistent').get()).rejects.toThrow(
			'[pounce-board] SSR dispatch failed: No handler found for GET /nonexistent'
		)
	})

	it('should generate different SSR IDs for different query params', async () => {
		const mockHandler = vi.fn().mockResolvedValue({
			status: 200,
			data: { filtered: true },
		})

		const mockRegistry: RouteRegistry = {
			match: vi.fn().mockReturnValue({
				handler: mockHandler,
				middlewareStack: [],
				params: {},
			}),
		}

		setRouteRegistry(mockRegistry)
        
        await runWithContext(createScope(), async () => {
		    enableSSR()

		    // Make two requests with different query params
		    await api('/search').get({ q: 'test1' })
		    await api('/search').get({ q: 'test2' })

		    // Get the collected responses
		    const collected = getCollectedSSRResponses()
		    const entries = Object.entries(collected)
		    expect(entries.length).toBe(2)

            // Verify the SSR ID is based on URL with query params (base64 encoded)
            // The ID should differ for different query params
            const id1 = Object.keys(collected).find(k => k.includes(btoa('/search?q=test1').replace(/[=/+]/g, '')))
            const id2 = Object.keys(collected).find(k => k.includes(btoa('/search?q=test2').replace(/[=/+]/g, '')))
            expect(id1).toBeDefined()
            expect(id2).toBeDefined()
            expect(id1).not.toBe(id2)
        })
	})

	it('should extract params from registry and pass to handler context', async () => {
		const mockHandler = vi.fn().mockResolvedValue({
			status: 200,
			data: { ok: true },
		})

		const mockRegistry: RouteRegistry = {
			match: vi.fn().mockReturnValue({
				handler: mockHandler,
				middlewareStack: [],
				params: { userId: '42', postId: '7' },
			}),
		}

		setRouteRegistry(mockRegistry)
		enableSSR()

		await api('/users/42/posts/7').get()

		const callContext = mockHandler.mock.calls[0][0]
		expect(callContext.params).toEqual({ userId: '42', postId: '7' })
	})
})

describe('Timeout handling', () => {
	beforeEach(() => {
		disableSSR()
		vi.stubGlobal('document', {
			getElementById: vi.fn().mockReturnValue(null),
		})
		vi.stubGlobal('window', {
			location: {
				href: 'http://localhost/test',
				origin: 'http://localhost',
			},
		})
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.useRealTimers()
	})

	it('should timeout after DEFAULT_TIMEOUT (10s) and throw ApiError 408', async () => {
		const mockFetch = vi.fn().mockImplementation((_url, init) => {
			return new Promise((_resolve, reject) => {
				if (init.signal) {
					init.signal.addEventListener('abort', () => {
						const err = new Error('The operation was aborted')
						err.name = 'AbortError'
						reject(err)
					})
				}
			})
		})
		vi.stubGlobal('fetch', mockFetch)

		const promise = api('/slow').get()
		
		// Allow microtasks (like applyRequestInterceptors) to run
		await Promise.resolve()

		// Fast-forward 10s
		vi.advanceTimersByTime(10001)

		await expect(promise).rejects.toThrow(ApiError)
		try {
			await promise
		} catch (e: any) {
			expect(e.status).toBe(408)
			expect(e.statusText).toBe('Request Timeout')
		}
	})

	it('should allow custom timeout override', async () => {
		const mockFetch = vi.fn().mockImplementation((_url, init) => {
			return new Promise((_resolve, reject) => {
				if (init.signal) {
					init.signal.addEventListener('abort', () => {
						const err = new Error('The operation was aborted')
						err.name = 'AbortError'
						reject(err)
					})
				}
			})
		})
		vi.stubGlobal('fetch', mockFetch)

		const promise = api('/v-slow', { timeout: 1000 }).get()

		// Allow microtasks to run
		await Promise.resolve()

		// Fast-forward 1s
		vi.advanceTimersByTime(1001)

		await expect(promise).rejects.toThrow(ApiError)
		try {
			await promise
		} catch (e: any) {
			expect(e.status).toBe(408)
		}
	})

	it('should timeout during SSR dispatch', async () => {
		const mockHandler = vi.fn().mockImplementation(
			() =>
				new Promise((_resolve) => {
					// Never resolves
				})
		)

		const mockRegistry: RouteRegistry = {
			match: vi.fn().mockReturnValue({
				handler: mockHandler,
				middlewareStack: [],
				params: {},
			}),
		}

		setRouteRegistry(mockRegistry)
		enableSSR()

		const promise = api('/slow', { timeout: 100 }).get()

		// Allow microtasks to run
		await Promise.resolve()

		vi.advanceTimersByTime(101)

		await expect(promise).rejects.toThrow(ApiError)
		try {
			await promise
		} catch (e: any) {
			expect(e.status).toBe(408)
			expect(e.url).toContain('/slow')
		}
	})

	it('should respect global config.timeout changes', async () => {
		const originalTimeout = config.timeout
		config.timeout = 50 // Very short timeout
		try {
			const mockFetch = vi.fn().mockImplementation((_url, init) => {
				return new Promise((_resolve, reject) => {
					if (init.signal) {
						init.signal.addEventListener('abort', () => {
							const err = new Error('The operation was aborted')
							err.name = 'AbortError'
							reject(err)
						})
					}
				})
			})
			vi.stubGlobal('fetch', mockFetch)

			const promise = api('/global-slow').get()
			
			// Allow microtasks to run
			await Promise.resolve()

			vi.advanceTimersByTime(51)

			await expect(promise).rejects.toThrow(ApiError)
			} finally {
				config.timeout = originalTimeout
			}
		})
	})

describe('API Interceptors', () => {
	beforeEach(() => {
		disableSSR()
		clearInterceptors()
		vi.stubGlobal('document', {
			getElementById: vi.fn().mockReturnValue(null),
		})
		vi.stubGlobal('window', {
			location: {
				href: 'http://localhost/test',
				origin: 'http://localhost',
			},
		})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		clearInterceptors()
	})

	it('should match interceptors by pattern', async () => {
		const mockFetch = vi.fn().mockImplementation(async () => 
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		)
		vi.stubGlobal('fetch', mockFetch)

		// Match specific path
		intercept('/api/specific', async (req, next) => {
			req.headers.set('X-Specific', 'true')
			return next(req)
		})

		// Match wildcards
		intercept('**', async (req, next) => {
			req.headers.set('X-Global', 'true')
			return next(req)
		})

		await api('/api/specific').get()
		let headers = mockFetch.mock.calls[0][1].headers as Headers
		expect(headers.get('X-Specific')).toBe('true')
		expect(headers.get('X-Global')).toBe('true')

		mockFetch.mockClear()
		await api('/other').get()
		headers = mockFetch.mock.calls[0][1].headers as Headers
		expect(headers.get('X-Specific')).toBeNull()
		expect(headers.get('X-Global')).toBe('true')
	})

	it('should modify response body via PounceResponse', async () => {
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ data: 'original' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		)
		vi.stubGlobal('fetch', mockFetch)

		intercept('**', async (req, next) => {
			const res = await next(req)
			const json = await res.json()
			res.setData({ ...json, intercepted: true })
			return res
		})

		const result = await api('/test').get()
		expect(result).toEqual({ data: 'original', intercepted: true })
	})

	it('should allow short-circuiting the request', async () => {
		const mockFetch = vi.fn()
		vi.stubGlobal('fetch', mockFetch)

		intercept('**', async (req, next) => {
			// Don't call next(), return mock response directly
			const res = new Response(JSON.stringify({ short: 'circuit' }), { 
				status: 200, 
				headers: { 'Content-Type': 'application/json' } 
			})
			return PounceResponse.from(res)
		})

		const result = await api('/test').get()
		expect(result).toEqual({ short: 'circuit' })
		expect(mockFetch).not.toHaveBeenCalled()
	})

	it('should apply interceptors during SSR dispatch', async () => {
		const mockHandler = vi.fn().mockResolvedValue({
			status: 200,
			data: { ok: true },
		})
		const mockRegistry: RouteRegistry = {
			match: vi.fn().mockReturnValue({
				handler: mockHandler,
				middlewareStack: [],
				params: {},
			}),
		}
		setRouteRegistry(mockRegistry)
		enableSSR()

		intercept('/ssr/**', async (req, next) => {
			req.headers.set('X-SSR-Intercept', 'true')
			const res = await next(req)
			const data = await res.json()
			res.setData({ ...data, augmented: true })
			return res
		})

		const result = await api('/ssr/test').get()
		
		expect(result).toEqual({ ok: true, augmented: true })
		const callContext = mockHandler.mock.calls[0][0]
		expect(callContext.request.headers.get('X-SSR-Intercept')).toBe('true')
	})

	it('should match ~ path to current origin', async () => {
		const mockFetch = vi.fn().mockImplementation(async () => 
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		)
		vi.stubGlobal('fetch', mockFetch)

		// Register interceptor for /api/local pattern
		intercept('/api/local', async (req, next) => {
			const modified = new Request(req.url, req)
			modified.headers.set('X-Intercepted', 'true')
			return next(modified)
		})

		// Should match based on pathname
		await api('http://localhost/api/local').get()
		let headers = mockFetch.mock.calls[0][1].headers as Headers
		expect(headers.get('X-Intercepted')).toBe('true')

		mockFetch.mockClear()
		
		// Should NOT match external domain
		await api('https://external.com/api/local').get()
		headers = mockFetch.mock.calls[0][1].headers as Headers
		expect(headers.get('X-Local')).toBeNull()
	})

	it('should return unregister function that removes interceptor', async () => {
		const mockFetch = vi.fn().mockImplementation(async () => 
			new Response(JSON.stringify({ ok: true }), { status: 200 })
		)
		vi.stubGlobal('fetch', mockFetch)

		const unregister = intercept('**', async (req, next) => {
			req.headers.set('X-Active', 'true')
			return next(req)
		})

		// First call - should have header
		await api('/test').get()
		let headers = mockFetch.mock.calls[0][1].headers as Headers
		expect(headers.get('X-Active')).toBe('true')

		// Unregister
		unregister()
		mockFetch.mockClear()

		// Second call - should NOT have header
		await api('/test').get()
		headers = mockFetch.mock.calls[0][1].headers as Headers
		expect(headers.get('X-Active')).toBeNull()
	})
})

describe('Retry logic', () => {
	beforeEach(() => {
		disableSSR()
		vi.stubGlobal('document', {
			getElementById: vi.fn().mockReturnValue(null),
		})
		vi.stubGlobal('window', {
			location: {
				href: 'http://localhost/test',
				origin: 'http://localhost',
			},
		})
		config.retries = 0
		config.retryDelay = 0
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.useRealTimers()
		config.retries = 0
		config.retryDelay = 0
	})

	it('should retry on 500 error and eventually succeed', async () => {
		const mockFetch = vi.fn()
			.mockResolvedValueOnce(new Response(null, { status: 500, statusText: 'Internal Server Error' }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { 
				status: 200, 
				headers: { 'Content-Type': 'application/json' } 
			}))
		vi.stubGlobal('fetch', mockFetch)

		const result = await api('/test', { retries: 1 }).get()
		expect(result).toEqual({ ok: true })
		expect(mockFetch).toHaveBeenCalledTimes(2)
	})

	it('should retry on timeout and eventually succeed', async () => {
		const mockFetch = vi.fn()
			.mockRejectedValueOnce(new ApiError(408, 'Request Timeout', null, 'http://localhost/test'))
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { 
				status: 200, 
				headers: { 'Content-Type': 'application/json' } 
			}))
		vi.stubGlobal('fetch', mockFetch)

		const result = await api('/test', { retries: 1 }).get()
		expect(result).toEqual({ ok: true })
		expect(mockFetch).toHaveBeenCalledTimes(2)
	})

	it('should fail after maximum retries', async () => {
		const mockFetch = vi.fn().mockResolvedValue(new Response(null, { 
			status: 503, 
			statusText: 'Service Unavailable' 
		}))
		vi.stubGlobal('fetch', mockFetch)

		await expect(api('/test', { retries: 2 }).get()).rejects.toThrow(ApiError)
		expect(mockFetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
	})

	it('should respect global config.retries', async () => {
		config.retries = 2
		const mockFetch = vi.fn().mockResolvedValue(new Response(null, { 
			status: 500, 
			statusText: 'Server Error' 
		}))
		vi.stubGlobal('fetch', mockFetch)

		await expect(api('/test').get()).rejects.toThrow(ApiError)
		expect(mockFetch).toHaveBeenCalledTimes(3)
	})

	it('should support retries in SSR mode', async () => {
		const mockHandler = vi.fn()
			.mockResolvedValueOnce({ status: 500, error: 'Server Error' })
			.mockResolvedValueOnce({ status: 200, data: { ssr: 'ok' } })

		const mockRegistry: RouteRegistry = {
			match: vi.fn().mockReturnValue({
				handler: mockHandler,
				middlewareStack: [],
				params: {},
			}),
		}

		setRouteRegistry(mockRegistry)
		enableSSR()

		const result = await api('/ssr-retry', { retries: 1 }).get()
		expect(result).toEqual({ ssr: 'ok' })
		expect(mockHandler).toHaveBeenCalledTimes(2)
		
		disableSSR()
		clearRouteRegistry()
	})

	it('should delay between retries if retryDelay is set', async () => {
		const mockFetch = vi.fn()
			.mockResolvedValueOnce(new Response(null, { status: 500 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ delayed: true }), { 
				status: 200, 
				headers: { 'Content-Type': 'application/json' } 
			}))
		vi.stubGlobal('fetch', mockFetch)

		const promise = api('/test', { retries: 1, retryDelay: 1000 }).get()
		
		// Wait for microtasks
		await Promise.resolve()
		
		// Should not have finished yet
		expect(mockFetch).toHaveBeenCalledTimes(1)
		
		// Advance time
		await vi.advanceTimersByTimeAsync(1001)
		
		const result = await promise
		expect(result).toEqual({ delayed: true })
		expect(mockFetch).toHaveBeenCalledTimes(2)
	})
})

describe('Context Isolation', () => {
    beforeEach(() => {
        disableSSR()
        clearInterceptors()
        vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Response(JSON.stringify({ ok: true }), { headers: {'Content-Type': 'application/json'} })))
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('should isolate interceptors between contexts', async () => {
        const { runWithContext, createScope } = await import('../http/context.js')
        const { intercept, api } = await import('./client.js')

        const scope1 = createScope()
        const scope2 = createScope()

        let result1: any
        let result2: any

        // Run in scope 1
        await runWithContext(scope1, async () => {
            intercept('**', async (req, next) => {
                const res = await next(req)
                const data = await res.json()
                res.setData({ ...data, scope: 1 })
                return res
            })
            result1 = await api('/test').get()
        })

        // Run in scope 2
        await runWithContext(scope2, async () => {
           intercept('**', async (req, next) => {
                const res = await next(req)
                const data = await res.json()
                res.setData({ ...data, scope: 2 })
                return res
            })
            result2 = await api('/test').get()
        })

        expect(result1).toEqual({ ok: true, scope: 1 })
        expect(result2).toEqual({ ok: true, scope: 2 })
    })

    it('should isolate SSR mode between contexts', async () => {
         const { runWithContext, createScope } = await import('../http/context.js')
         const { enableSSR, api, setRouteRegistry } = await import('./client.js')

         const scope1 = createScope()
         const scope2 = createScope()
        
         const mockHandler = vi.fn().mockResolvedValue({ status: 200, data: { backend: true } })
         setRouteRegistry({
             match: () => ({ handler: mockHandler, middlewareStack: [], params: {} })
         })

         // Scope 1: SSR Enabled
         const p1 = runWithContext(scope1, async () => {
             enableSSR()
             return api('/test').get()
         })

         // Scope 2: SSR Disabled (Client mode)
         const p2 = runWithContext(scope2, async () => {
             // Default is disabled
             return api('/test').get()
         })

         const [r1, r2] = await Promise.all([p1, p2])

         expect(r1).toEqual({ backend: true }) // Dispatched to handler
         expect(r2).toEqual({ ok: true }) // Fetched from network (mockFetch)
    })
})

