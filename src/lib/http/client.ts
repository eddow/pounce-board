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

import { addContextInterceptor, getContext, trackSSRPromise } from '../http/context.js'

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
	const ctx = getContext()
	if (ctx) {
		// If inside a request context, register locally
		return addContextInterceptor(pattern, handler)
	}

	// Otherwise register globally
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

// Use globalThis to ensure singleton across multiple module loads in SSR
const REGISTRY_SYMBOL = Symbol.for('__POUNCE_ROUTE_REGISTRY__')

/**
 * Set the route registry for server-side dispatch
 * Called by adapters during app initialization
 */
export function setRouteRegistry(registry: RouteRegistry): void {
	const ctx = getContext()
	if (ctx) {
		ctx.routeRegistry = registry
	}
	;(globalThis as any)[REGISTRY_SYMBOL] = registry
}

export function getRouteRegistry(): RouteRegistry | null {
	return (globalThis as any)[REGISTRY_SYMBOL] || null
}

/**
 * Clear the route registry (for testing)
 */
export function clearRouteRegistry(): void {
	;(globalThis as any)[REGISTRY_SYMBOL] = null
}

/**
 * Dispatch directly to a route handler (server-side, no network)
 * @internal
 */
async function dispatchToHandler(request: Request): Promise<Response> {
	const ctx = getContext()
	const processRegistry = (globalThis as any)[REGISTRY_SYMBOL]
	const activeRegistry = ctx?.routeRegistry || processRegistry

	if (!activeRegistry) {
		throw new Error(
			'[pounce-board] SSR dispatch failed: No route registry set. ' +
				'Ensure setRouteRegistry() is called during app initialization.'
		)
	}

	const url = new URL(request.url)
	const path = url.pathname
	const method = request.method.toUpperCase() as HttpMethod
	const match = activeRegistry.match(path, method)

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

const CONFIG_SYMBOL = Symbol.for('__POUNCE_CONFIG__')

const DEFAULT_CONFIG = {
	timeout: 10000,
	ssr: false,
	retries: 0,
	retryDelay: 100,
}

function getGlobalConfig() {
	const g = globalThis as any
	if (!g[CONFIG_SYMBOL]) {
		g[CONFIG_SYMBOL] = { ...DEFAULT_CONFIG }
	}
	return g[CONFIG_SYMBOL]
}

/**
 * Global configuration for pounce-board
 */
export const config = getGlobalConfig()

/**
 * Enable SSR mode for server-side rendering
 */
export function enableSSR(): void {
	const ctx = getContext()
	if (ctx) {
		ctx.config.ssr = true
	} else {
		config.ssr = true
	}
}

/**
 * Disable SSR mode (for testing or manual control)
 */
export function disableSSR(): void {
	const ctx = getContext()
	if (ctx) {
		ctx.config.ssr = false
		// We can't clearSSRState for just this context easily as it clears everything?
		// actually utils.clearSSRData() now respects context.
		clearSSRState()
	} else {
		config.ssr = false
		clearSSRState()
	}
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
	
	const ctx = getContext()
	const contextInterceptors = ctx ? ctx.interceptors : []
	const allInterceptors = [...interceptorRegistry, ...contextInterceptors]

	const chain = allInterceptors
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
 * - api("/path", { timeout: 5000, retries: 3 }).get()
 * - api.get() // Targets current route (pendant)
 */
function apiClient(
	input: string | URL | object,
	options: { timeout?: number; retries?: number; retryDelay?: number } = {}
): ApiClientInstance {
	// If input is a proxy object (not a string/URL), return it directly
	if (typeof input === 'object' && input !== null && !(input instanceof URL)) {
		return input as ApiClientInstance
	}

	const ctx = getContext()
	const currentConfig = ctx ? { ...config, ...ctx.config } : config

	const timeout = options.timeout ?? currentConfig.timeout
	const maxRetries = options.retries ?? currentConfig.retries
	const retryDelay = options.retryDelay ?? currentConfig.retryDelay

	// Normalize input to URL
	let url: URL

	if (typeof input === 'string') {
		if (input.startsWith('http://') || input.startsWith('https://')) {
			// Absolute URL
			url = new URL(input)
		} else if (input.startsWith('/')) {
			// Site-absolute
			const ctx = getContext()
			const origin = (typeof window !== 'undefined' && window.location) 
				? window.location.origin 
				: (ctx?.origin || 'http://localhost')
			url = new URL(input, origin)
		} else if (input.startsWith('.')) {
			// Site-relative
			const ctx = getContext()
			const base = (typeof window !== 'undefined' && window.location) 
				? window.location.href 
				: (ctx?.origin || 'http://localhost')
			url = new URL(input, base)
		} else {
			// Assume site-absolute if no scheme
			const ctx = getContext()
			const origin = (typeof window !== 'undefined' && window.location) 
				? window.location.origin 
				: (ctx?.origin || 'http://localhost')
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

	/**
	 * Internal requester with retry logic
	 */
	async function requestWithRetry<T>(
		method: HttpMethod,
		currentUrl: URL,
		body?: unknown
	): Promise<T> {
		const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
		const requestHeaders: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' }
		const requestBody = isFormData ? (body as any) : body !== undefined ? JSON.stringify(body) : undefined

		const doRequest = async (): Promise<T> => {
			const activeCtx = getContext()
			const isSSR = activeCtx ? activeCtx.config.ssr ?? config.ssr : config.ssr
			
			if (isSSR && method === 'GET') {
				const currentSsrId = getSSRId(currentUrl)
				const existingData = getSSRData(currentSsrId)
				if (existingData !== undefined) {
					return existingData as T
				}
			}

			let lastError: any = null

			for (let attempt = 0; attempt <= maxRetries; attempt++) {
				try {
					const request = new Request(currentUrl.toString(), {
						method,
						headers: requestHeaders,
						body: requestBody,
					})

					const finalHandler = async (req: Request): Promise<PounceResponse> => {
						let response: Response
						
						const activeCtx = getContext()
						const isSSR = activeCtx ? activeCtx.config.ssr ?? config.ssr : config.ssr

						if (isSSR) {
							response = await dispatchWithTimeout(req)
						} else {
							response = await fetchWithTimeout(new URL(req.url), {
								method,
								headers: req.headers,
								body: requestBody,
							})
						}
						return PounceResponse.from(response)
					}

					const response = await runInterceptors(request, finalHandler)

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
					const activeCtx = getContext()
					const isSSR = activeCtx ? activeCtx.config.ssr ?? config.ssr : config.ssr

					if (isSSR) {
						const currentSsrId = getSSRId(currentUrl)
						injectSSRData(currentSsrId, data)
					}
					return data
				} catch (error: any) {
					lastError = error
					const shouldRetry =
						attempt < maxRetries &&
						(error instanceof ApiError ? error.status >= 500 || error.status === 408 : true)

					if (shouldRetry) {
						if (retryDelay > 0) {
							await new Promise((resolve) => setTimeout(resolve, retryDelay))
						}
						continue
					}
					throw error
				}
			}
			throw lastError
		}

		const promise = doRequest()
		const activeCtx = getContext()
		if (activeCtx && (activeCtx.config.ssr ?? config.ssr)) {
			trackSSRPromise(promise)
		}
		return promise
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

			const activeCtx = getContext()
			const isSSR = activeCtx ? activeCtx.config.ssr ?? config.ssr : config.ssr

			// 1. Check for hydration data first (client only)
			if (!isSSR) {
				const cachedData = getSSRData<T>(currentSsrId)
				if (cachedData !== undefined) return cachedData
			}

			return requestWithRetry<T>('GET', currentUrl)
		},

		async post<T>(body: unknown): Promise<T> {
			return requestWithRetry<T>('POST', url, body)
		},

		async put<T>(body: unknown): Promise<T> {
			return requestWithRetry<T>('PUT', url, body)
		},

		async del<T>(params?: Record<string, string>): Promise<T> {
			const currentUrl = new URL(url)
			if (params) {
				for (const [key, value] of Object.entries(params)) {
					currentUrl.searchParams.set(key, value)
				}
			}
			return requestWithRetry<T>('DELETE', currentUrl)
		},

		async patch<T>(body: unknown): Promise<T> {
			return requestWithRetry<T>('PATCH', url, body)
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
