/**
 * External API proxy system for pounce-board
 * Allows defining typed proxies for external APIs with transformation and validation
 */

import { ApiError } from './core.js'
import { config as globalConfig } from './client.js'
import type { z } from 'zod'

export type ProxyEndpointConfig<
	Schema extends z.ZodSchema = z.ZodSchema,
	TransformReturn = unknown,
> = {
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
	path: string
	transform?: (data: z.infer<Schema>, params?: Record<string, string>) => TransformReturn
	prepare?: (body: unknown) => unknown
	params?: (input: Record<string, unknown>) => Record<string, string>
	onError?: (error: unknown) => never
	schema?: Schema
	raw?: boolean
	mock?: (params: Record<string, string>) => TransformReturn
	/** Caching configuration for this endpoint. 
	 * boolean: true enables default cache (1min). 
	 * number: enables cache with specified TTL in ms. 
	 * object: full control over TTL and cache key generation. */
	cache?: boolean | number | { ttl: number; key?: (params: any) => string }
	/** Number of retries for this endpoint. Overrides proxy and global config. */
	retries?: number
	/** Timeout in milliseconds for this endpoint. Overrides proxy and global config. */
	timeout?: number
}

export type ProxyConfig<Endpoints extends Record<string, ProxyEndpointConfig<any, any>>> = {
	baseUrl: string
	request?: RequestInit | ((init: RequestInit) => RequestInit | Promise<RequestInit>)
	endpoints: Endpoints
	/** Default number of retries for all endpoints in this proxy. Overrides global config. */
	retries?: number
	/** Delay between retries in milliseconds. */
	retryDelay?: number
	/** Default timeout in milliseconds for all endpoints in this proxy. Overrides global config. */
	timeout?: number
}

// Inference helper to determine the return type of an endpoint function
type EndpointReturnType<T extends ProxyEndpointConfig<any, any>> = T extends {
	transform: (...args: any) => infer R
}
	? Promise<R>
	: T extends { schema: z.ZodSchema<infer S> }
		? Promise<S>
		: T extends { raw: true }
			? Promise<Response>
			: Promise<unknown>

/**
 * Internal cache for proxy responses
 */
class ProxyCache {
	private cache = new Map<string, { data: any; expiry: number }>()

	get(key: string): any | null {
		const entry = this.cache.get(key)
		if (!entry) return null
		if (Date.now() > entry.expiry) {
			this.cache.delete(key)
			return null
		}
		return entry.data
	}

	set(key: string, data: any, ttl: number): void {
		this.cache.set(key, {
			data,
			expiry: Date.now() + ttl,
		})
	}

	clear(): void {
		this.cache.clear()
	}
}

/**
 * Define a typed proxy for an external API
 */
export function defineProxy<Endpoints extends Record<string, ProxyEndpointConfig<any, any>>>(
	config: ProxyConfig<Endpoints>
): {
	[K in keyof Endpoints]: (params?: Record<string, unknown>) => EndpointReturnType<Endpoints[K]>
} & { $cache: ProxyCache } {
	const proxyCache = new ProxyCache()

	const proxy = new Proxy(
		{},
		{
			get(_, endpointName: string) {
				if (endpointName === '$cache') return proxyCache

				const endpoint = config.endpoints[endpointName]
				if (!endpoint) {
					throw new Error(`Endpoint ${endpointName} not found in proxy`)
				}

				return async (params: Record<string, unknown> = {}) => {
					// Mock in development if provided
					if (process.env.NODE_ENV === 'development' && endpoint.mock) {
						return endpoint.mock(params as Record<string, string>)
					}

					// Cache key generation
					let cacheKey: string | null = null
					if (endpoint.cache) {
						if (typeof endpoint.cache === 'object' && endpoint.cache.key) {
							cacheKey = endpoint.cache.key(params)
						} else {
							cacheKey = `${endpoint.method}:${endpoint.path}:${JSON.stringify(params)}`
						}

						const cached = proxyCache.get(cacheKey)
						if (cached !== null) return cached
					}

					try {
						// Build URL with path parameter substitution
						let path = endpoint.path
						for (const [key, value] of Object.entries(params)) {
							path = path.replace(`[${key}]`, encodeURIComponent(String(value)))
						}

						const url = new URL(path, config.baseUrl)

						// Add query parameters
						if (endpoint.params) {
							const queryParams = endpoint.params(params)
							for (const [key, value] of Object.entries(queryParams)) {
								url.searchParams.set(key, value)
							}
						}

						// Prepare request init
						let init: RequestInit = {
							method: endpoint.method,
							headers: {
								'Content-Type': 'application/json',
							},
						}

						// Merge global request config
						if (config.request) {
							const globalConfigResult =
								typeof config.request === 'function' ? await config.request(init) : config.request
							init = { ...init, ...globalConfigResult }
						}

						// Prepare body for POST/PUT/PATCH
						if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && params) {
							const bodyData = endpoint.prepare ? endpoint.prepare(params) : params
							init.body = JSON.stringify(bodyData)
						}

						// Determine timeout
						const timeout = endpoint.timeout ?? config.timeout ?? globalConfig.timeout ?? 10000

						// Make request with retries
						const maxRetries = endpoint.retries ?? config.retries ?? globalConfig.retries ?? 0
						const retryDelay = config.retryDelay ?? globalConfig.retryDelay ?? 100
						let lastError: unknown

						for (let attempt = 0; attempt <= maxRetries; attempt++) {
							const controller = new AbortController()
							const timeoutId = setTimeout(() => controller.abort(), timeout)
							const requestInit = { ...init, signal: controller.signal }

							try {
								const response = await fetch(url, requestInit)

								if (!response.ok) {
									// Only retry on certain status codes (e.g., 5xx, or network errors)
									// For now, retry on any non-ok response as per common proxy patterns
									if (attempt < maxRetries) {
										if (retryDelay > 0) {
											await new Promise((resolve) => setTimeout(resolve, retryDelay))
										}
										continue
									}
									throw new Error(`HTTP ${response.status}: ${response.statusText}`)
								}

								// Return raw response if requested
								if (endpoint.raw) {
									return response
								}

								// Parse JSON
								const data = await response.json()

								// Validate with schema
								if (endpoint.schema) {
									endpoint.schema.parse(data)
								}

								// Transform response
								const result = endpoint.transform
									? endpoint.transform(data, params as Record<string, string>)
									: data

								// Store in cache if enabled
								if (endpoint.cache && cacheKey) {
									let ttl = 60 * 1000 // Default 1 minute
									if (typeof endpoint.cache === 'number') ttl = endpoint.cache
									else if (typeof endpoint.cache === 'object') ttl = endpoint.cache.ttl
									proxyCache.set(cacheKey, result, ttl)
								}

								return result
							} catch (error: any) {
								if (error.name === 'AbortError') {
									lastError = new ApiError(408, 'Request Timeout', null, url.toString())
								} else {
									lastError = error
								}

								if (attempt < maxRetries) {
									if (retryDelay > 0) {
										await new Promise((resolve) => setTimeout(resolve, retryDelay))
									}
									continue
								}
								throw lastError
							} finally {
								clearTimeout(timeoutId)
							}
						}
						throw lastError
					} catch (error) {
						if (endpoint.onError) {
							return endpoint.onError(error)
						}
						throw error
					}
				}
			},
		}
	) as any

	return proxy
}
