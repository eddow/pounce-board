import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { parsePathSegment, type ParsedPathSegment, type RouteParams } from 'pounce-ts'
import type { Middleware, RouteHandler } from '../http/core.js'

/**
 * Convert a file path to a file:// URL without encoding special characters like brackets.
 * This is needed because dynamic routes like [id] would otherwise get encoded as %5Bid%5D.
 */
function toFileUrl(filePath: string): string {
	// Ensure absolute path and forward slashes
	const absolutePath = path.resolve(filePath).replace(/\\/g, '/')
	return `file://${absolutePath}`
}

// Re-export for convenience
export type { Middleware, RouteHandler, RouteParams, ParsedPathSegment }

/**
 * Result of a successful route match.
 */
export type RouteMatch = {
	/** Backend route handler functions (GET, POST, etc.) */
	handler?: RouteHandler
	/** Frontend page component (from index.tsx or named.tsx) */
	component?: any
	/** Collected middleware stack from root to leaf */
	middlewareStack: Middleware[]
	/** Collected layout components from root to leaf (common.tsx) */
	layouts?: any[]
	/** Extracted path parameters (e.g., { id: "123" }) */
	params: RouteParams
	/** The normalized matched path */
	path: string
}

/**
 * Node in the route tree structure representing a path segment.
 */
export type RouteTreeNode = {
	/** The URL segment this node matches (e.g., "users" or "") */
	segment: string
	/** True if this is a dynamic segment (e.g., [id]) */
	isDynamic: boolean
	/** True if this is a catch-all segment (e.g., [...slug]) */
	isCatchAll: boolean
	/** The name of the parameter for dynamic/catch-all segments */
	paramName?: string
	/** Child nodes mapped by their segment name */
	children: Map<string, RouteTreeNode>
	/** Route handlers loaded from index.ts or named.ts */
	handlers?: Record<string, RouteHandler>
	/** Page component loaded from index.tsx or named.tsx */
	component?: any
	/** Middleware loaded from common.ts */
	middleware?: Middleware[]
	/** Layout component loaded from common.tsx */
	layout?: any
	/** True if this is a route group (folder in parentheses) */
	isRouteGroup?: boolean
}

/**
 * Segment info derived from pounce-ts parsePathSegment.
 * Adapts ParsedPathSegment to the format used by buildRouteTree.
 */
export interface SegmentInfo {
	isDynamic: boolean
	isCatchAll: boolean
	paramName?: string
	normalizedSegment: string
}

/**
 * Parse dynamic segment from path segment using pounce-ts core.
 * Adapts the ParsedPathSegment to SegmentInfo format for tree building.
 *
 * [id] -> { isDynamic: true, paramName: 'id' }
 * [...slug] -> { isCatchAll: true, paramName: 'slug' }
 */
export function parseSegment(segment: string): SegmentInfo {
	const parsed = parsePathSegment(segment)

	switch (parsed.kind) {
		case 'catchAll':
			return {
				isDynamic: true,
				isCatchAll: true,
				paramName: parsed.name,
				normalizedSegment: segment,
			}
		case 'param':
			return {
				isDynamic: true,
				isCatchAll: false,
				paramName: parsed.name,
				normalizedSegment: segment,
			}
		case 'literal':
		default:
			return {
				isDynamic: false,
				isCatchAll: false,
				normalizedSegment: segment,
			}
	}
}

/**
 * Match a URL path against the route tree
 * Returns handler, middleware stack, and extracted params
 *
 * Priority: static routes > dynamic routes > catch-all routes > route groups
 */
export function matchRoute(
	urlPath: string,
	routeTree: RouteTreeNode,
	method = 'GET'
): RouteMatch | null {
	// Normalize path: remove trailing slash (except for root)
	const normalizedPath = urlPath === '/' ? '/' : urlPath.replace(/\/$/, '')
	const segments = normalizedPath.split('/').filter((s) => s !== '')

	/**
	 * Recursive tree traversal with priority handling
	 */
	/**
	 * Recursive tree traversal with priority handling
	 */
	function traverse(
		node: RouteTreeNode,
		segmentIndex: number,
		depth = 0
	): { node: RouteTreeNode; params: RouteParams; middlewareStack: Middleware[]; layouts: any[] } | null {
		if (depth > 50) {
			console.warn('[pounce-board] Route matching depth exceeded')
			return null
		}
		// Base case: If we've consumed all segments, check for handler OR component at this node
		if (segmentIndex >= segments.length) {
			if (node.handlers?.[method] || node.component) {
				return {
					node,
					params: {},
					middlewareStack: node.middleware ? [...node.middleware] : [],
					layouts: node.layout ? [node.layout] : [],
				}
			}
		}

		const currentSegment = segments[segmentIndex]

		// Helper to prepend this node's middleware and layout to result
		const withStack = (
			result: { node: RouteTreeNode; params: RouteParams; middlewareStack: Middleware[]; layouts: any[] } | null
		) => {
			if (!result) return null
			
			if (node.middleware) {
				result.middlewareStack.unshift(...node.middleware)
			}
			if (node.layout) {
				result.layouts.unshift(node.layout)
			}
			return result
		}

		// Priority 1: Try exact static match first
		if (segmentIndex < segments.length) {
			const staticChild = node.children.get(currentSegment)
			if (staticChild && !staticChild.isDynamic && !staticChild.isRouteGroup) {
				const result = traverse(staticChild, segmentIndex + 1, depth + 1)
				if (result) return withStack(result)
			}
		}

		// Priority 2: Try dynamic segment match [id]
		if (segmentIndex < segments.length) {
			for (const [_, child] of node.children) {
				if (child.isDynamic && !child.isCatchAll && !child.isRouteGroup) {
					const result = traverse(child, segmentIndex + 1, depth + 1)
					if (result) {
						if (child.paramName) {
							result.params[child.paramName] = currentSegment
						}
						return withStack(result)
					}
				}
			}
		}

		// Priority 3: Try route groups (transparent)
		for (const [_, child] of node.children) {
			if (child.isRouteGroup) {
				const result = traverse(child, segmentIndex, depth + 1)
				if (result) return withStack(result)
			}
		}

		// Priority 4: Try catch-all segment [...slug]
		if (segmentIndex < segments.length) {
			for (const [_, child] of node.children) {
				if (child.isCatchAll && child.paramName) {
					const remaining = segments.slice(segmentIndex).join('/')
					if (child.handlers?.[method] || child.component) {
						return withStack({
							node: child,
							params: { [child.paramName]: remaining },
							middlewareStack: child.middleware ? [...child.middleware] : [],
							layouts: child.layout ? [child.layout] : [],
						})
					}
				}
			}
		}

		return null
	}


	const result = traverse(routeTree, 0)
	if (!result) return null

	return {
		handler: result.node.handlers?.[method],
		component: result.node.component,
		middlewareStack: result.middlewareStack,
		layouts: result.layouts,
		params: result.params,
		path: normalizedPath,
	}
}

/**
 * Scan routes directory and build route tree.
 * 
 * Discovers:
 * - `index.ts` -> Backend handlers
 * - `index.tsx` -> Frontend page components
 * - `common.ts` -> Middleware (inherited by children)
 * - `common.tsx` -> Layouts (inherited, wraps children)
 * - `named.ts` -> Route handlers (e.g. `users.ts` -> `/users`)
 * - `named.tsx` -> Page components (e.g. `list.tsx` -> `/list`)
 * 
 * This uses node:fs and is intended for server-side usage.
 */
export async function buildRouteTree(
	routesDir: string,
	importFn: (path: string) => Promise<any> = (p) => import(/* @vite-ignore */ toFileUrl(p))
): Promise<RouteTreeNode> {
	const root: RouteTreeNode = {
		segment: '',
		isDynamic: false,
		isCatchAll: false,
		children: new Map(),
	}

	async function scan(dir: string, node: RouteTreeNode) {
		if (path.relative(routesDir, dir).split(path.sep).length > 20) {
			console.warn(`[pounce-board] Route recursion depth exceeded at ${dir}`)
			return
		}

		let entries
		try {
			entries = await fs.readdir(dir, { withFileTypes: true })
		} catch {
			return // Directory likely doesn't exist
		}

		for (const entry of entries) {
			const entryPath = path.join(dir, entry.name)

			if (entry.isFile()) {
				if (entry.name === 'common.ts') {
					try {
						const mod = await importFn(entryPath)
						if (mod.middleware) {
							node.middleware = mod.middleware
						}
					} catch (e) {
						console.error(`Failed to load middleware from ${entryPath}`, e)
					}
				} else if (entry.name === 'common.tsx') {
					try {
						const mod = await importFn(entryPath)
						if (mod.default) {
							node.layout = mod.default
						}
					} catch (e) {
						console.error(`Failed to load layout from ${entryPath}`, e)
					}
				} else if (entry.name === 'index.ts') {
					try {
						const mod = await importFn(entryPath)
						const handlers: Record<string, RouteHandler> = {}
						const methods = ['get', 'post', 'put', 'del', 'patch', 'delete'] // include delete alias
						for (const method of methods) {
							// exports can be 'get', 'GET', etc.
							const exportName = method
							if (typeof mod[exportName] === 'function') {
								const upperMethod = method === 'del' || method === 'delete' ? 'DELETE' : method.toUpperCase()
								handlers[upperMethod] = mod[exportName]
							}
						}
						// Don't overwrite if empty, checks are done lazily
						node.handlers = handlers
					} catch (e) {
						console.error(`Failed to load handlers from ${entryPath}`, e)
					}
				} else if (entry.name === 'index.tsx') {
					try {
						const mod = await importFn(entryPath)
						if (mod.default) {
							node.component = mod.default
						}
					} catch (e) {
						console.error(`Failed to load component from ${entryPath}`, e)
					}
				} else if ((entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) || entry.name.endsWith('.tsx')) {
					// Named route file (e.g. users.ts -> /users or users.tsx)
					const fileName = path.parse(entry.name).name
					const segmentInfo = parseSegment(fileName)
					const segment = segmentInfo.normalizedSegment

					// Check if child node already exists (e.g. created by matching .ts file)
					let childNode = node.children.get(segment)
					if (!childNode) {
						childNode = {
							segment: segment,
							isDynamic: segmentInfo.isDynamic,
							isCatchAll: segmentInfo.isCatchAll,
							paramName: segmentInfo.paramName,
							children: new Map(),
						}
						node.children.set(segment, childNode)
					}

					try {
						const mod = await importFn(entryPath)
						
						if (entry.name.endsWith('.ts')) {
							const handlers: Record<string, RouteHandler> = {}
							const methods = ['get', 'post', 'put', 'del', 'patch', 'delete']
							for (const method of methods) {
								const exportName = method
								if (typeof mod[exportName] === 'function') {
									const upperMethod =
										method === 'del' || method === 'delete' ? 'DELETE' : method.toUpperCase()
									handlers[upperMethod] = mod[exportName]
								}
							}
							childNode.handlers = handlers
						} else if (entry.name.endsWith('.tsx')) {
							if (mod.default) {
								childNode.component = mod.default
							}
						}
					} catch (e) {
						console.error(`Failed to load handlers/component from ${entryPath}`, e)
					}
				}
			} else if (entry.isDirectory()) {
				const segmentInfo = parseSegment(entry.name)
				const isGroup = entry.name.startsWith('(') && entry.name.endsWith(')')

				const childNode: RouteTreeNode = {
					segment: isGroup ? '' : segmentInfo.normalizedSegment,
					isDynamic: segmentInfo.isDynamic,
					isCatchAll: segmentInfo.isCatchAll,
					paramName: segmentInfo.paramName,
					children: new Map(),
					isRouteGroup: isGroup,
				}

				node.children.set(entry.name, childNode)
				await scan(entryPath, childNode)
			}
		}
	}

	await scan(routesDir, root)
	return root
}

/**
 * Collect middleware from ancestor nodes
 * Deprecated: matchRoute now handles this
 */
export function collectMiddleware(_path: string[]): Middleware[] {
	return []
}
