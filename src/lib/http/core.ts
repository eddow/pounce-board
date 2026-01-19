/**
 * Core HTTP types and middleware runner for pounce-board
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * Structured API Error for pounce-board
 */
export class ApiError extends Error {
	constructor(
		public status: number,
		public statusText: string,
		public data: any,
		public url: string
	) {
		super(`HTTP ${status}: ${statusText}`)
		this.name = 'ApiError'
	}
}

export interface RequestContext {
	request: Request
	params: Record<string, string>
	[key: string]: unknown
}

export type Middleware = (
	context: RequestContext,
	next: () => Promise<Response>
) => Promise<Response>

export type RouteHandler = (context: RequestContext) => Promise<{
	status: number
	data?: unknown
	error?: string
	headers?: Record<string, string>
}>

export type RouteResponse = {
	status: number
	data?: unknown
	error?: string
	headers?: Record<string, string>
}

/**
 * Runs middleware stack and executes handler
 */
export async function runMiddlewares(
	middlewareStack: Middleware[],
	context: RequestContext,
	handler: RouteHandler
): Promise<Response> {
	const timings: { name: string; dur: number }[] = []

	const run = async (index: number): Promise<Response> => {
		const start = performance.now()
		let response: Response
		let name: string

		if (index >= middlewareStack.length) {
			name = 'handler'
			const result = await handler(context)
			response = new Response(result.data ? JSON.stringify(result.data) : result.error, {
				status: result.status,
				headers: {
					'Content-Type': 'application/json',
					...result.headers,
				},
			})
		} else {
			name = `mw${index}`
			const middleware = middlewareStack[index]
			response = await middleware(context, () => run(index + 1))
		}

		const dur = performance.now() - start
		timings.push({ name, dur })

		if (index === 0) {
			// Final response delivery: add Server-Timing header
			// We reverse timings because they are pushed in 'return' order (inner-most first if we didn't track names)
			// Actually with names and direct push, they are in stack-unwind order.
			// Let's sort them or just join them. Handler is usually deepest.
			const timingHeader = timings
				.reverse()
				.map((t) => `${t.name};dur=${t.dur.toFixed(3)}`)
				.join(', ')

			const newHeaders = new Headers(response.headers)
			newHeaders.append('Server-Timing', timingHeader)

			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: newHeaders,
			})
		}

		return response
	}

	return run(0)
}

/**
 * Helper to create JSON responses
 */
export function createJsonResponse(
	data: unknown,
	status = 200,
	headers: Record<string, string> = {}
): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
	})
}

/**
 * Helper to create error responses
 */
export function createErrorResponse(error: string | Error, status = 500): Response {
	const message = typeof error === 'string' ? error : error.message
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: {
			'Content-Type': 'application/json',
		},
	})
}
/**
 * Default security headers for pounce-board
 */
export const DEFAULT_SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'X-XSS-Protection': '1; mode=block',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Content-Security-Policy': "default-src 'self'",
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

/**
 * Adds security headers to a Response
 */
export function addSecurityHeaders(
	response: Response,
	options: { headers?: Record<string, string>; merge?: boolean } = {}
): Response {
	const newHeaders = new Headers(response.headers)
	const headersToAdd = options.headers || DEFAULT_SECURITY_HEADERS

	for (const [key, value] of Object.entries(headersToAdd)) {
		if (options.merge || !newHeaders.has(key)) {
			newHeaders.set(key, value)
		}
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	})
}

/**
 * Compresses a response body using CompressionStream
 */
export async function compressResponse(
	response: Response,
	encoding: 'gzip' | 'deflate'
): Promise<Response> {
	if (!response.body) return response

	const compressionStream = new CompressionStream(encoding)
	const compressedBody = response.body.pipeThrough(compressionStream)

	const newHeaders = new Headers(response.headers)
	newHeaders.set('Content-Encoding', encoding)

	return new Response(compressedBody, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	})
}
