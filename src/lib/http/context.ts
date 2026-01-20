/**
 * Request Context for pounce-board
 * Handles thread-local storage for SSR data, configuration, and interceptors.
 */
import type { AsyncLocalStorage } from 'node:async_hooks'

// Define the Interceptor type here to avoid circular imports if possible, 
// or import strictly as type. 
// We'll import InterceptorMiddleware from client.ts, but only as type.
import type { InterceptorMiddleware } from './client.js'

export interface InterceptorEntry {
	pattern: string | RegExp
	handler: InterceptorMiddleware
}

export interface ClientConfig {
	timeout: number
	ssr: boolean
	retries: number
	retryDelay: number
}

/**
 * Request-scoped state
 */
export interface RequestScope {
	ssr: {
		id: symbol
		responses: Map<string, unknown>
		counter: number
	}
	config: Partial<ClientConfig>
	interceptors: InterceptorEntry[]
}

// Storage for strict thread-safety in Node.js (AsyncLocalStorage)
let storage: AsyncLocalStorage<RequestScope> | null = null

// Fallback for browser/single-threaded environments
let globalCtx: RequestScope | null = null

/**
 * Get the current request scope
 */
export function getContext(): RequestScope | null {
	if (storage) {
		const store = storage.getStore()
		if (store) return store
	}
	return globalCtx
}

/**
 * Initialize a new empty scope
 */
export function createScope(config: Partial<ClientConfig> = {}): RequestScope {
	return {
		ssr: {
			id: Symbol('ssr-context'),
			responses: new Map(),
			counter: 0,
		},
		config,
		interceptors: [],
	}
}

/**
 * Run a function within a request scope
 */
export async function runWithContext<T>(
	scope: RequestScope,
	fn: () => Promise<T>
): Promise<T> {
	// Initialize storage if needed (Node.js only)
	if (!storage && typeof process !== 'undefined') {
		try {
			const { AsyncLocalStorage } = await import('node:async_hooks')
			storage = new AsyncLocalStorage<RequestScope>()
		} catch {
			// Ignore if not available (browser)
		}
	}

	if (storage) {
		return storage.run(scope, fn)
	}

	// Fallback
	const prev = globalCtx
	globalCtx = scope
	try {
		return await fn()
	} finally {
		globalCtx = prev
	}
}

/**
 * Helper to add an interceptor to the current scope
 */
export function addContextInterceptor(pattern: string | RegExp, handler: InterceptorMiddleware) {
	const ctx = getContext()
	if (ctx) {
		ctx.interceptors.push({ pattern, handler })
		return () => {
			const index = ctx.interceptors.findIndex(i => i.handler === handler)
			if (index !== -1) ctx.interceptors.splice(index, 1)
		}
	} else {
		// Warn? Or fallback to global registry?
		// For now, if no context, we can't add to context.
		// The caller should use the global 'intercept' if they want global.
		console.warn('[pounce-board] Attempted to add context interceptor outside of a context')
		return () => {}
	}
}
