/**
 * Universal API client for pounce-board
 * Supports absolute, site-absolute, and site-relative URLs
 * Handles SSR data injection and hydration
 */

import { clearSSRData as clearSSRState, getSSRData, getSSRId, injectSSRData } from '../ssr/utils.js'
import {
	ApiError,
	type HttpMethod,
	type Middleware,
	type RequestContext,
	type RouteHandler,
	runMiddlewares,
} from './core.js'

import { PounceResponse } from './response.js'

export type InterceptorMiddleware = (
	request: Request,
	next: (req: Request) => Promise<PounceResponse>
) => Promise<PounceResponse>

interface InterceptorEntry {
	pattern: string | RegExp
	handler: InterceptorMiddleware
}

const interceptorRegistry: InterceptorEntry[] = []

/**
 * Register a global interceptor
 * @param pattern URL pattern to match (glob string or RegExp)
 * @param handler Middleware function
 * @returns Unregister function
 */
export function intercept(pattern: string | RegExp, handler: InterceptorMiddleware): () => void {
	const entry = { pattern, handler }
	interceptorRegistry.push(entry)
	return () => {
		const index = interceptorRegistry.indexOf(entry)
		if (index !== -1) {
			interceptorRegistry.splice(index, 1)
		}
	}
}

/**
 * Clear all interceptors (for testing)
 */
export function clearInterceptors(): void {
	interceptorRegistry.length = 0
}

/**
 * Match a URL against a pattern
 */
function matchPattern(urlString: string, pattern: string | RegExp): boolean {
	if (pattern instanceof RegExp) return pattern.test(urlString)
	if (pattern === '**') return true
	
	// Extract pathname for matching
	let pathname = urlString
	try {
		if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
			const u = new URL(urlString)
			pathname = u.pathname
		}
	} catch {
		// keep original string if parsing fails
	}
	
	if (pattern === '*') return !pathname.slice(1).includes('/')

	// Simple glob: ends with /**
	if (typeof pattern === 'string' && pattern.endsWith('/**')) {
		const base = pattern.slice(0, -3)
		if (base.startsWith('http')) {
			return urlString.startsWith(base)
		}
		return pathname.startsWith(base)
	}
	
	// Exact match
	if (typeof pattern === 'string' && pattern.startsWith('http')) {
		return urlString === pattern
	}
	return pathname === pattern
}

export interface ApiClientInstance {
	get: <T>(params?: Record<string, string>) => Promise<T>
	post: <T>(body: unknown) => Promise<T>
	put: <T>(body: unknown) => Promise<T>
	del: <T>(params?: Record<string, string>) => Promise<T>
	patch: <T>(body: unknown) => Promise<T>
}

/**
 * Route registry for server-side dispatch
 * Populated by adapters (Hono, Vercel, etc.) during initialization
 */
export interface RouteRegistry {
	/**
	 * Match a path and method to a handler
	 * Returns null if no match found
	 */
	match(
		path: string,
		method: HttpMethod
	): {
		handler: RouteHandler
		middlewareStack: Middleware[]
		params: Record<string, string>
	} | null
}

let routeRegistry: RouteRegistry | null = null

/**
 * Set the route registry for server-side dispatch
 * Called by adapters during app initialization
 */
export function setRouteRegistry(registry: RouteRegistry): void {
	routeRegistry = registry
}

/**
 * Clear the route registry (for testing)
 */
export function clearRouteRegistry(): void {
	routeRegistry = null
}

/**
 * Dispatch directly to a route handler (server-side, no network)
 * @internal
 */
async function dispatchToHandler(request: Request): Promise<Response> {
	if (!routeRegistry) {
		throw new Error(
			'[pounce-board] SSR dispatch failed: No route registry set. ' +
				'Ensure setRouteRegistry() is called during app initialization.'
		)
	}

	const url = new URL(request.url)
	const path = url.pathname
	const method = request.method.toUpperCase() as HttpMethod
	const match = routeRegistry.match(path, method)

	if (!match) {
		throw new Error(`[pounce-board] SSR dispatch failed: No handler found for ${method} ${path}`)
	}

	const context: RequestContext = {
		request,
		params: match.params,
	}

	// Run through middleware stack and handler
	const response = await runMiddlewares(match.middlewareStack, context, match.handler)

	return response
}

/**
 * Global configuration for pounce-board
 */
export const config = {
	/** Default timeout for API requests in milliseconds */
	timeout: 10000,
	/** Whether SSR mode is enabled (server-side dispatch, hydration tracking) */
	ssr: false,
}

/**
 * Enable SSR mode for server-side rendering
 */
export function enableSSR(): void {
	config.ssr = true
}

/**
 * Disable SSR mode (for testing or manual control)
 */
export function disableSSR(): void {
	config.ssr = false
	clearSSRState()
}

export { getSSRId, getSSRData, injectSSRData }

/**
 * Clear all SSR data
 */
export function clearSSRData(): void {
	clearSSRState()
}



/**
 * Run interceptors for a request
 */
async function runInterceptors(
	initialRequest: Request,
	finalHandler: (req: Request) => Promise<PounceResponse>
): Promise<PounceResponse> {
	const url = initialRequest.url
	
	// Filter matching interceptors
	const chain = interceptorRegistry
		.filter((entry) => matchPattern(url, entry.pattern))
		.map((entry) => entry.handler)

	// Compose middleware chain
	let index = 0
	const dispatch = async (req: Request): Promise<PounceResponse> => {
		if (index < chain.length) {
			const handler = chain[index++]
			return handler(req, dispatch)
		}
		return finalHandler(req)
	}

	return dispatch(initialRequest)
}

/**
 * Universal API client
 * Handles absolute URLs (https://...), site-absolute (/...), and site-relative (./...)
 * Also supports passing a proxy object directly
 *
 * Support syntaxes:
 * - api("/path", { timeout: 5000 }).get()
 * - api.get() // Targets current route (pendant)
 */
function apiClient(input: string | URL | object, options: { timeout?: number } = {}): ApiClientInstance {
	// If input is a proxy object (not a string/URL), return it directly
	if (typeof input === 'object' && input !== null && !(input instanceof URL)) {
		return input as ApiClientInstance
	}

	const timeout = options.timeout ?? config.timeout

	// Normalize input to URL
	let url: URL

	if (typeof input === 'string') {
		if (input.startsWith('http://') || input.startsWith('https://')) {
			// Absolute URL
			url = new URL(input)
		} else if (input.startsWith('/')) {
			// Site-absolute
			const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
			url = new URL(input, origin)
		} else if (input.startsWith('.')) {
			// Site-relative
			const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost'
			url = new URL(input, base)
		} else {
			// Assume site-absolute if no scheme
			const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
			url = new URL(`/${input}`, origin)
		}
	} else {
		url = input
	}

	const ssrId = getSSRId(url)

	/**
	 * Helper for fetch with timeout
	 */
	async function fetchWithTimeout(fetchUrl: URL, init: RequestInit): Promise<Response> {
		const controller = new AbortController()
		const id = setTimeout(() => controller.abort(), timeout)
		try {
			const response = await fetch(fetchUrl, {
				...init,
				signal: controller.signal,
			})
			return response
		} catch (error: any) {
			if (error.name === 'AbortError') {
				throw new ApiError(408, 'Request Timeout', null, fetchUrl.toString())
			}
			throw error
		} finally {
			clearTimeout(id)
		}
	}

	/**
	 * Helper for local dispatch with timeout (parity with fetch)
	 * Returns Response instead of data to allow interceptors
	 */
	async function dispatchWithTimeout(request: Request): Promise<Response> {
		const controller = new AbortController()
		const id = setTimeout(() => controller.abort(), timeout)

		try {
			return await Promise.race([
				dispatchToHandler(request),
				new Promise<Response>((_, reject) => {
					controller.signal.addEventListener('abort', () => {
						reject(new ApiError(408, 'Request Timeout', null, request.url))
					})
				}),
			])
		} finally {
			clearTimeout(id)
		}
	}

	return {
		async get<T>(params?: Record<string, string>): Promise<T> {
			const currentUrl = new URL(url)
			if (params) {
				for (const [key, value] of Object.entries(params)) {
					currentUrl.searchParams.set(key, value)
				}
			}

			const currentSsrId = getSSRId(currentUrl)

			// 1. Check for hydration data first (client only)
			if (!config.ssr) {
				const cachedData = getSSRData<T>(currentSsrId)
				if (cachedData) return cachedData
			}

			// 2. Prepare request
			const request = new Request(currentUrl.toString(), { method: 'GET' })

			const finalHandler = async (req: Request): Promise<PounceResponse> => {
				let response: Response
				if (config.ssr) {
					response = await dispatchWithTimeout(req)
				} else {
					response = await fetchWithTimeout(new URL(req.url), {
						method: 'GET',
						headers: req.headers,
					})
				}
				return PounceResponse.from(response)
			}

			let response = await runInterceptors(request, finalHandler)

			if (!response.ok) {
				let errorData = null
				try {
					if (response.headers.get('Content-Type')?.includes('application/json')) {
						errorData = await response.json()
					}
				} catch {
					/* ignore */
				}
				throw new ApiError(response.status, response.statusText, errorData, request.url)
			}

			const data = (await response.json()) as T
			if (config.ssr) {
				injectSSRData(currentSsrId, data)
			}
			return data
		},

		async post<T>(body: unknown): Promise<T> {
			const request = new Request(url.toString(), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})

			const finalHandler = async (req: Request): Promise<PounceResponse> => {
				let response: Response
				if (config.ssr) {
					response = await dispatchWithTimeout(req)
				} else {
					response = await fetchWithTimeout(new URL(req.url), {
						method: 'POST',
						headers: req.headers,
						body: JSON.stringify(body),
					})
				}
				return PounceResponse.from(response)
			}

			let response = await runInterceptors(request, finalHandler)

			if (!response.ok) {
				let errorData = null
				try {
					if (response.headers.get('Content-Type')?.includes('application/json')) {
						errorData = await response.json()
					}
				} catch {
					/* ignore */
				}
				throw new ApiError(response.status, response.statusText, errorData, request.url)
			}

			const data = (await response.json()) as T
			if (config.ssr) {
				injectSSRData(ssrId, data)
			}
			return data
		},

		async put<T>(body: unknown): Promise<T> {
			const request = new Request(url.toString(), {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})

			const finalHandler = async (req: Request): Promise<PounceResponse> => {
				let response: Response
				if (config.ssr) {
					response = await dispatchWithTimeout(req)
				} else {
					response = await fetchWithTimeout(new URL(req.url), {
						method: 'PUT',
						headers: req.headers,
						body: JSON.stringify(body),
					})
				}
				return PounceResponse.from(response)
			}

			let response = await runInterceptors(request, finalHandler)

			if (!response.ok) {
				let errorData = null
				try {
					if (response.headers.get('Content-Type')?.includes('application/json')) {
						errorData = await response.json()
					}
				} catch {
					/* ignore */
				}
				throw new ApiError(response.status, response.statusText, errorData, request.url)
			}

			const data = (await response.json()) as T
			if (config.ssr) {
				injectSSRData(ssrId, data)
			}
			return data
		},

		async del<T>(params?: Record<string, string>): Promise<T> {
			const currentUrl = new URL(url)
			if (params) {
				for (const [key, value] of Object.entries(params)) {
					currentUrl.searchParams.set(key, value)
				}
			}

			const currentSsrId = getSSRId(currentUrl)

			const request = new Request(currentUrl.toString(), { method: 'DELETE' })

			const finalHandler = async (req: Request): Promise<PounceResponse> => {
				let response: Response
				if (config.ssr) {
					response = await dispatchWithTimeout(req)
				} else {
					response = await fetchWithTimeout(new URL(req.url), {
						method: 'DELETE',
						headers: req.headers,
					})
				}
				return PounceResponse.from(response)
			}

			let response = await runInterceptors(request, finalHandler)

			if (!response.ok) {
				let errorData = null
				try {
					if (response.headers.get('Content-Type')?.includes('application/json')) {
						errorData = await response.json()
					}
				} catch {
					/* ignore */
				}
				throw new ApiError(response.status, response.statusText, errorData, request.url)
			}

			const data = (await response.json()) as T
			if (config.ssr) {
				injectSSRData(currentSsrId, data)
			}
			return data
		},

		async patch<T>(body: unknown): Promise<T> {
			const request = new Request(url.toString(), {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})
			
			const finalHandler = async (req: Request): Promise<PounceResponse> => {
				let response: Response
				if (config.ssr) {
					response = await dispatchWithTimeout(req)
				} else {
					response = await fetchWithTimeout(new URL(req.url), {
						method: 'PATCH',
						headers: req.headers,
						body: JSON.stringify(body),
					})
				}
				return PounceResponse.from(response)
			}

			let response = await runInterceptors(request, finalHandler)

			if (!response.ok) {
				let errorData = null
				try {
					if (response.headers.get('Content-Type')?.includes('application/json')) {
						errorData = await response.json()
					}
				} catch {
					/* ignore */
				}
				throw new ApiError(response.status, response.statusText, errorData, request.url)
			}

			const data = (await response.json()) as T
			if (config.ssr) {
				injectSSRData(ssrId, data)
			}
			return data
		},
	}
}

/**
 * Universal API client as a functional proxy
 *
 * api.get() -> api(window.location.href).get() [Client] targeting current resource ("pendant")
 * api.post(body) -> api(window.location.href).post(body)
 */
export const api = new Proxy(apiClient, {
	get(target, prop: string) {
		if (prop in target) {
			return (target as any)[prop]
		}

		// Support api.get(params), api.post(body), etc. targeting current route
		const methods = ['get', 'post', 'put', 'del', 'patch']
		if (methods.includes(prop)) {
			const currentPath = typeof window !== 'undefined' ? window.location.href : '.'
			return (target(currentPath) as any)[prop]
		}

		return (target as any)[prop]
	},
}) as typeof apiClient & ApiClientInstance

/**
 * Direct method exports for current route ("server pendant")
 * We use wrappers to ensure 'api.get' is accessed at call time,
 * capturing the current window.location.
 */
export function get<T>(params?: Record<string, string>): Promise<T> {
	return api.get<T>(params)
}

export function post<T>(body: unknown): Promise<T> {
	return api.post<T>(body)
}

export function put<T>(body: unknown): Promise<T> {
	return api.put<T>(body)
}

export function del<T>(params?: Record<string, string>): Promise<T> {
	return api.del<T>(params)
}

export function patch<T>(body: unknown): Promise<T> {
	return api.patch<T>(body)
}
