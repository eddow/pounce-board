import * as fs from 'node:fs/promises'
import * as path from 'node:path'
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
export type { Middleware, RouteHandler }

export type RouteParams = Record<string, string>

export type RouteMatch = {
	handler: RouteHandler
	middlewareStack: Middleware[]
	params: RouteParams
	path: string
}

export type RouteTreeNode = {
	segment: string
	isDynamic: boolean
	isCatchAll: boolean
	paramName?: string
	children: Map<string, RouteTreeNode>
	handlers?: Record<string, RouteHandler>
	middleware?: Middleware[]
	isRouteGroup?: boolean
}

/**
 * Parse dynamic segment from path segment
 * [id] -> { isDynamic: true, paramName: 'id' }
 * [...slug] -> { isCatchAll: true, paramName: 'slug' }
 */
export function parseSegment(segment: string): {
	isDynamic: boolean
	isCatchAll: boolean
	paramName?: string
	normalizedSegment: string
} {
	if (segment.startsWith('[...') && segment.endsWith(']')) {
		return {
			isDynamic: true,
			isCatchAll: true,
			paramName: segment.slice(4, -1),
			normalizedSegment: segment,
		}
	}

	if (segment.startsWith('[') && segment.endsWith(']')) {
		return {
			isDynamic: true,
			isCatchAll: false,
			paramName: segment.slice(1, -1),
			normalizedSegment: segment,
		}
	}

	return {
		isDynamic: false,
		isCatchAll: false,
		normalizedSegment: segment,
	}
}

/**
 * Match a URL path against the route tree
 * Returns handler, middleware stack, and extracted params
 *
 * Priority: static routes > dynamic routes > catch-all routes > route groups
 */
export function matchRoute(
	path: string,
	routeTree: RouteTreeNode,
	method = 'GET'
): RouteMatch | null {
	// Normalize path: remove trailing slash (except for root)
	const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '')
	const segments = normalizedPath.split('/').filter((s) => s !== '')

	/**
	 * Recursive tree traversal with priority handling
	 */
	function traverse(
		node: RouteTreeNode,
		segmentIndex: number
	): { node: RouteTreeNode; params: RouteParams; middlewareStack: Middleware[] } | null {
		// Base case: If we've consumed all segments, check for handler at this node
		if (segmentIndex >= segments.length) {
			// If this node is a route group, we might need to continue traversing ??
			// No, if we are at end of segments, we check if THIS node has a handler.
			// Handlers can exist on route group nodes (e.g. (auth)/index.ts -> /)
			if (node.handlers?.[method]) {
				return {
					node,
					params: {},
					middlewareStack: node.middleware ? [...node.middleware] : [],
				}
			}
			// If not found here, maybe a child catch-all matches empty? (Rare, usually catch-all needs 1 segment)
			// Or maybe we are at root / and need to check children route groups?
			// Example: / matches (auth)/index.ts
			// We effectively have 0 segments left.
		}

		const currentSegment = segments[segmentIndex]

		// Helper to prepend this node's middleware to result
		const withMiddleware = (
			result: { node: RouteTreeNode; params: RouteParams; middlewareStack: Middleware[] } | null
		) => {
			if (result && node.middleware) {
				result.middlewareStack.unshift(...node.middleware)
			}
			return result
		}

		// Priority 1: Try exact static match first
		if (segmentIndex < segments.length) {
			const staticChild = node.children.get(currentSegment)
			if (staticChild && !staticChild.isDynamic && !staticChild.isRouteGroup) {
				const result = traverse(staticChild, segmentIndex + 1)
				if (result) return withMiddleware(result)
			}
		}

		// Priority 2: Try dynamic segment match [id]
		if (segmentIndex < segments.length) {
			for (const [_, child] of node.children) {
				if (child.isDynamic && !child.isCatchAll && !child.isRouteGroup) {
					const result = traverse(child, segmentIndex + 1)
					if (result) {
						if (child.paramName) {
							result.params[child.paramName] = currentSegment
						}
						return withMiddleware(result)
					}
				}
			}
		}

		// Priority 3: Try route groups (transparent) - attempt to match REST of path inside group
		// This happens BEFORE catch-all because route group might contain specific static matches
		// Note: We do NOT advance segmentIndex
		for (const [_, child] of node.children) {
			if (child.isRouteGroup) {
				const result = traverse(child, segmentIndex)
				if (result) return withMiddleware(result)
			}
		}

		// Priority 4: Try catch-all segment [...slug]
		// Catch-all typically consumes at least one segment, unless we allow optional catch-all [[...slug]]
		// Assuming strict [...slug] for now requiring >= 1 segment
		if (segmentIndex < segments.length) {
			for (const [_, child] of node.children) {
				if (child.isCatchAll && child.paramName) {
					// Capture all remaining segments
					const remaining = segments.slice(segmentIndex).join('/')
					// Ensure we have a handler there
					if (child.handlers?.[method]) {
						return withMiddleware({
							node: child,
							params: { [child.paramName]: remaining },
							middlewareStack: child.middleware ? [...child.middleware] : [],
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
		handler: result.node.handlers![method]!,
		middlewareStack: result.middlewareStack,
		params: result.params,
		path: normalizedPath,
	}
}

/**
 * Scan routes directory and build route tree
 * This uses node:fs and is intended for server-side usage
 */
export async function buildRouteTree(routesDir: string): Promise<RouteTreeNode> {
	const root: RouteTreeNode = {
		segment: '',
		isDynamic: false,
		isCatchAll: false,
		children: new Map(),
	}

	async function scan(dir: string, node: RouteTreeNode) {
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
						const mod = await import(toFileUrl(entryPath))
						if (mod.middleware) {
							node.middleware = mod.middleware
						}
					} catch (e) {
						console.error(`Failed to load middleware from ${entryPath}`, e)
					}
				} else if (entry.name === 'index.ts') {
					try {
						const mod = await import(toFileUrl(entryPath))
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

				} else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
					// Named route file (e.g. users.ts -> /users)
					const fileName = path.parse(entry.name).name
					const segmentInfo = parseSegment(fileName)

					// Create a child node for this file
					const childNode: RouteTreeNode = {
						segment: segmentInfo.normalizedSegment,
						isDynamic: segmentInfo.isDynamic,
						isCatchAll: segmentInfo.isCatchAll,
						paramName: segmentInfo.paramName,
						children: new Map(),
					}

					try {
						const mod = await import(toFileUrl(entryPath))
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
						node.children.set(segmentInfo.normalizedSegment, childNode)
					} catch (e) {
						console.error(`Failed to load handlers from ${entryPath}`, e)
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
