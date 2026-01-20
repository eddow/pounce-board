import { getContext, type RequestScope, runWithContext, createScope } from '../http/context.js'


export type SSRDataMap = Record<string, { id: string; data: unknown }>

let globalClientCounter = 0

/**
 * Run a function within an SSR context (Legacy wrapper)
 * Now delegates to runWithContext from lib/http/context
 */
export async function withSSRContext<T>(
	fn: () => Promise<T>
): Promise<{ result: T; context: RequestScope }> {
	const scope = createScope()
	// Enable SSR by default if using this legacy wrapper, as it implies SSR usage
	scope.config.ssr = true 
	
	return runWithContext(scope, async () => {
		const result = await fn()
		return { result, context: scope }
	})
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
	const ctx = getContext()
	
	// If we are in a context (Server or Client global), use counter
	// If we are on client without strict context (just global var fallback), we still use it
	// Note: Client needs to maintain order during hydration for this to work
	let counter = 0
	if (ctx) {
		counter = ctx.ssr.counter++
	} else if (typeof window !== 'undefined') {
		// If on client but no context active, we rely on a temporary global or 0
		// ideally client app should wrap main() in a context too, but api() calls might be global
		// For simplicity, without a context, we just use 0 or random?
        // Actually, if we are on client, we likely want to use a global counter if not inside a context scope
        // BUT current refactor removes globalContext var.
        // Let's rely on the fact that if getContext() returns null, we are truly outside scope.
        // Falls back to 0. Is this safe for hydration? 
        // Hydration relies on determinstic ID generation.
        // If client doesn't increment, IDs will collide (all 0).
        // WE need a true global fallback for client-side legacy behavior.
        // NOTE: Impl plan didn't specify global fallback behavior for client.
        // I will implement a module-level fallback counter for client side ONLY.
        counter = globalClientCounter++
	}

	return `pounce-data-${pathHash}-${counter}`
}

/**
 * Inject SSR data (used server-side)
 */
export function injectSSRData(id: string, data: unknown): void {
	const ctx = getContext()
	if (ctx) {
		ctx.ssr.responses.set(id, data)
	}
}

/**
 * Get all collected SSR responses as a map for injection
 */
export function getCollectedSSRResponses(): SSRDataMap {
	const ctx = getContext()
	if (!ctx) return {}

	const map: SSRDataMap = {}
	for (const [id, data] of ctx.ssr.responses.entries()) {
		map[id] = { id, data }
	}
	return map
}

/**
 * Clear all SSR data
 */
export function clearSSRData(): void {
	const ctx = getContext()
	if (ctx) {
		ctx.ssr.responses.clear()
		ctx.ssr.counter = 0
	} else if (typeof window !== 'undefined') {
        globalClientCounter = 0
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
		const ctx = getContext()
		return (ctx?.ssr.responses.get(id) as T) || null
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
