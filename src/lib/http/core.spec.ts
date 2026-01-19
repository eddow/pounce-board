import { describe, expect, it, vi } from 'vitest'
import {
	addSecurityHeaders,
	compressResponse,
	createErrorResponse,
	createJsonResponse,
	type Middleware,
	type RequestContext,
	type RouteHandler,
	runMiddlewares,
} from './core.js'

describe('core http utils', () => {
	describe('runMiddlewares', () => {
		it('should execute empty middleware stack and return handler response', async () => {
			const context: RequestContext = {
				request: new Request('http://localhost'),
				params: {},
			}
			const handler: RouteHandler = async () => ({
				status: 200,
				data: { success: true },
			})

			const response = await runMiddlewares([], context, handler)
			const data = await response.json()

			expect(response.status).toBe(200)
			expect(data).toEqual({ success: true })
		})

		it('should execute middleware in order', async () => {
			const order: number[] = []
			const middleware1: Middleware = async (_ctx, next) => {
				order.push(1)
				const res = await next()
				order.push(4)
				return res
			}
			const middleware2: Middleware = async (_ctx, next) => {
				order.push(2)
				const res = await next()
				order.push(3)
				return res
			}

			const context: RequestContext = {
				request: new Request('http://localhost'),
				params: {},
			}
			const handler: RouteHandler = async () => ({
				status: 200,
				data: { success: true },
			})

			await runMiddlewares([middleware1, middleware2], context, handler)
			expect(order).toEqual([1, 2, 3, 4])
		})

		it('should allow middleware to short-circuit', async () => {
			const middleware1: Middleware = async (_ctx, _next) => {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
				})
			}
			const handler = vi.fn().mockResolvedValue({ status: 200, data: {} })

			const context: RequestContext = {
				request: new Request('http://localhost'),
				params: {},
			}

			const response = await runMiddlewares([middleware1], context, handler)
			const data = await response.json()

			expect(response.status).toBe(401)
			expect(data).toEqual({ error: 'Unauthorized' })
			expect(handler).not.toHaveBeenCalled()
		})

		it('should propagate context changes through middleware', async () => {
			const middleware1: Middleware = async (ctx, next) => {
				ctx.user = 'admin'
				return next()
			}

			const context: RequestContext = {
				request: new Request('http://localhost'),
				params: {},
			}

			const handler: RouteHandler = async (ctx) => ({
				status: 200,
				data: { user: ctx.user },
			})

			const response = await runMiddlewares([middleware1], context, handler)
			const data = await response.json()

			expect(data).toEqual({ user: 'admin' })
		})

		it('should add Server-Timing header with correct format', async () => {
			const middleware1: Middleware = async (_ctx, next) => {
				return next()
			}

			const context: RequestContext = {
				request: new Request('http://localhost'),
				params: {},
			}

			const handler: RouteHandler = async () => ({
				status: 200,
				data: { success: true },
			})

			const response = await runMiddlewares([middleware1], context, handler)
			const timingHeader = response.headers.get('Server-Timing')

			expect(timingHeader).toBeDefined()
			expect(timingHeader).toMatch(/mw0;dur=\d+\.\d+, handler;dur=\d+\.\d+/)
		})
	})

	describe('createJsonResponse', () => {
		it('should create a JSON response with default status', async () => {
			const response = createJsonResponse({ foo: 'bar' })
			const data = await response.json()

			expect(response.status).toBe(200)
			expect(response.headers.get('Content-Type')).toBe('application/json')
			expect(data).toEqual({ foo: 'bar' })
		})

		it('should respect custom status and headers', async () => {
			const response = createJsonResponse({ foo: 'bar' }, 201, { 'X-Custom': 'value' })
			expect(response.status).toBe(201)
			expect(response.headers.get('X-Custom')).toBe('value')
		})
	})

	describe('createErrorResponse', () => {
		it('should create an error response from string', async () => {
			const response = createErrorResponse('Something went wrong', 400)
			const data = await response.json()

			expect(response.status).toBe(400)
			expect(data).toEqual({ error: 'Something went wrong' })
		})

		it('should create an error response from Error object', async () => {
			const response = createErrorResponse(new Error('Foo error'), 500)
			const data = await response.json()

			expect(response.status).toBe(500)
			expect(data).toEqual({ error: 'Foo error' })
		})
	})
	describe('addSecurityHeaders', () => {
		it('should add default security headers', async () => {
			const response = new Response('ok')
			const secured = addSecurityHeaders(response)

			expect(secured.headers.get('X-Content-Type-Options')).toBe('nosniff')
			expect(secured.headers.get('X-Frame-Options')).toBe('DENY')
		})

		it('should allow merging custom headers', async () => {
			const response = new Response('ok', { headers: { 'X-Frame-Options': 'SAMEORIGIN' } })
			const secured = addSecurityHeaders(response, { headers: { 'X-Custom': 'foo' }, merge: true })

			expect(secured.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
			expect(secured.headers.get('X-Custom')).toBe('foo')
		})

		it('should allow overriding default headers if merge is false (default behavior)', async () => {
			const response = new Response('ok', { headers: { 'X-Frame-Options': 'SAMEORIGIN' } })
			const secured = addSecurityHeaders(response)

			expect(secured.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
			expect(secured.headers.get('X-Content-Type-Options')).toBe('nosniff')
		})
	})

	describe('compressResponse', () => {
		it('should add content-encoding header', async () => {
			const response = new Response('some data to compress')
			const compressed = await compressResponse(response, 'gzip')

			expect(compressed.headers.get('Content-Encoding')).toBe('gzip')
		})

		it('should return same response if body is null', async () => {
			const response = new Response(null)
			const compressed = await compressResponse(response, 'gzip')
			expect(compressed.headers.has('Content-Encoding')).toBe(false)
		})
	})
})
