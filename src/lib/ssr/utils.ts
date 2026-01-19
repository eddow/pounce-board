import { AsyncLocalStorage } from 'node:async_hooks'

export type SSRDataMap = Record<string, { id: string; data: unknown }>

/**
 * SSR Context - request-scoped container for SSR data
 */
export interface SSRContext {
	readonly id: symbol
	responses: Map<string, unknown>
	counter: number
}

// Storage for strict thread-safety in Node.js (AsyncLocalStorage)
// In the browser (or runtimes without ALS), we fall back to a global variable since there's no concurrency
const storage = typeof AsyncLocalStorage !== 'undefined' ? new AsyncLocalStorage<SSRContext>() : null

// Fallback for browser/single-threaded environments
let globalContext: SSRContext | null = null

function getCurrentContext(): SSRContext | null {
	if (storage) {
		const store = storage.getStore()
		if (store) return store
	}
	return globalContext
}

/**
 * Create a new SSR context for a request
 */
export function createSSRContext(): SSRContext {
	return {
		id: Symbol('ssr-context'),
		responses: new Map(),
		counter: 0,
	}
}

/**
 * Run a function within an SSR context
 * Uses AsyncLocalStorage if available, otherwise global state
 */
export async function withSSRContext<T>(fn: () => Promise<T>): Promise<{ result: T; context: SSRContext }> {
	const ctx = createSSRContext()

	if (storage) {
		return storage.run(ctx, async () => {
			const result = await fn()
			return { result, context: ctx }
		})
	}

	// Fallback for browser/environments without ALS
	const prevContext = globalContext
	globalContext = ctx
	try {
		const result = await fn()
		return { result, context: ctx }
	} finally {
		globalContext = prevContext
	}
}

/**
 * Generate unique ID for SSR data
 * Combines URL path with a per-context counter for guaranteed uniqueness
 */
export function getSSRId(url: string | URL): string {
	const path = typeof url === 'string' ? url : url.pathname + url.search

	// Use base64 encoding for the path to ensure it's predictable and reversible
	// We use 'btoa' which is universal (available in Node 16+ and browsers)
	const pathHash = btoa(path).replace(/[=/+]/g, '')

	// Add counter from current context if available
	// On client (simulated hydration), we also increment to match server order
	const ctx = getCurrentContext()
	
	// If we are in a context (Server or Client global), use counter
	// If we are on client without strict context (just global var fallback), we still use it
	// Note: Client needs to maintain order during hydration for this to work
	let counter = 0
	if (ctx) {
		counter = ctx.counter++
	} else if (typeof window !== 'undefined') {
		// If we are on client but outside withSSRContext, we might be in hydration or SPA nav
		// For now, we can track a global counter if we want hydration matching?
		// Actually, we probably don't need a context object on client, just a global counter
		// But let's stick to the context pattern if possible, or fallback to random/0
		
		// If no context, we might be in a random fetch. 
		// For unique ID in SPA, random is fine.
		// Unsure if this matches hydration requirement?
		// Assuming client app initializes a context or we rely on hydration logic elsewhere?
		// Let's fallback to specific logic:
		if (!globalContext) {
			globalContext = createSSRContext()
		}
		counter = globalContext!.counter++
	}

	return `pounce-data-${pathHash}-${counter}`
}

/**
 * Inject SSR data (used server-side)
 */
export function injectSSRData(id: string, data: unknown): void {
	const ctx = getCurrentContext()
	if (ctx) {
		ctx.responses.set(id, data)
	}
}

/**
 * Get all collected SSR responses as a map for injection
 */
export function getCollectedSSRResponses(): SSRDataMap {
	const ctx = getCurrentContext()
	if (!ctx) return {}

	const map: SSRDataMap = {}
	for (const [id, data] of ctx.responses.entries()) {
		map[id] = { id, data }
	}
	return map
}

/**
 * Clear all SSR data
 */
export function clearSSRData(): void {
	const ctx = getCurrentContext()
	if (ctx) {
		ctx.responses.clear()
		ctx.counter = 0
	}
}

/**
 * Inject API responses into HTML as script tags
 */
export function injectApiResponses(html: string, responses: SSRDataMap): string {
	const scripts = Object.entries(responses)
		.map(
			([_, { id, data }]) =>
				`<script type="application/json" id="${id}">${escapeJson(JSON.stringify(data))}</script>`
		)
		.join('\n')

	// Insert before </head> if exists, otherwise before </body>
	if (html.includes('</head>')) {
		return html.replace('</head>', `${scripts}\n</head>`)
	}
	if (html.includes('</body>')) {
		return html.replace('</body>', `${scripts}\n</body>`)
	}

	// Fallback: append to end
	return html + scripts
}

/**
 * Get SSR data (universal)
 * 1. Checks server-side map if on server
 * 2. Checks script tags in DOM if on client
 */
export function getSSRData<T>(id: string): T | null {
	// 1. Server-side check
	if (typeof document === 'undefined') {
		const ctx = getCurrentContext()
		return (ctx?.responses.get(id) as T) || null
	}

	// 2. Client-side check (DOM)
	const script = document.getElementById(id)
	if (!script) {
		if (process.env.NODE_ENV === 'development') {
			console.warn(`[pounce-board] SSR hydration: Script tag with ID "${id}" not found.`)
		}
		return null
	}

	if (!script.textContent) {
		if (process.env.NODE_ENV === 'development') {
			console.warn(`[pounce-board] SSR hydration: Script tag "${id}" is empty.`)
		}
		return null
	}

	try {
		const data = JSON.parse(script.textContent) as T
		// One-time consumption
		script.remove()
		return data
	} catch (err) {
		if (process.env.NODE_ENV === 'development') {
			console.warn(`[pounce-board] SSR hydration: Failed to parse JSON for "${id}".`, err)
		}
		return null
	}
}

/**
 * Escape JSON for safe injection into HTML
 */
export function escapeJson(json: string): string {
	return json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
}
