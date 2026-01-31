import { describe, expect, it } from 'vitest'
import type { RequestContext } from '../http/core.js'
import {
	type Middleware,
	matchRoute,
	buildRouteTree,
	parseSegment,
	type RouteHandler,
	type RouteTreeNode,
} from './index.js'

describe('router', () => {
	describe('parseSegment', () => {
		it('should parse static segments', () => {
			const result = parseSegment('users')
			expect(result).toEqual({
				isDynamic: false,
				isCatchAll: false,
				normalizedSegment: 'users',
			})
		})

		it('should parse dynamic segments [id]', () => {
			const result = parseSegment('[id]')
			expect(result).toEqual({
				isDynamic: true,
				isCatchAll: false,
				paramName: 'id',
				normalizedSegment: '[id]',
			})
		})

		it('should parse catch-all segments [...slug]', () => {
			const result = parseSegment('[...slug]')
			expect(result).toEqual({
				isDynamic: true,
				isCatchAll: true,
				paramName: 'slug',
				normalizedSegment: '[...slug]',
			})
		})
	})

	describe('matchRoute', () => {
		// Helper to create mock handler
		const createHandler = (name: string): RouteHandler => {
			return async () => ({ status: 200, data: { handler: name } })
		}

		// Helper to create mock middleware
		const createMiddleware = (name: string): Middleware => {
			return async (ctx: RequestContext, next: () => Promise<Response>) => {
				ctx[name] = true
				return next()
			}
		}

		it('should match static root route', () => {
			const tree: RouteTreeNode = {
				segment: '',
				isDynamic: false,
				isCatchAll: false,
				children: new Map(),
				handlers: { GET: createHandler('root') },
			}

			const match = matchRoute('/', tree)
			expect(match).not.toBeNull()
			expect(match?.path).toBe('/')
			expect(match?.params).toEqual({})
		})

		it('should match static nested route', () => {
			const usersNode: RouteTreeNode = {
				segment: 'users',
				isDynamic: false,
				isCatchAll: false,
				children: new Map(),
				handlers: { GET: createHandler('users') },
			}

			const tree: RouteTreeNode = {
				segment: '',
				isDynamic: false,
				isCatchAll: false,
				children: new Map([['users', usersNode]]),
			}

			const match = matchRoute('/users', tree)
			expect(match).not.toBeNull()
			expect(match?.path).toBe('/users')
			expect(match?.params).toEqual({})
		})

		it('should match dynamic route and extract param', () => {
			const idNode: RouteTreeNode = {
				segment: '[id]',
				isDynamic: true,
				isCatchAll: false,
				paramName: 'id',
				children: new Map(),
				handlers: { GET: createHandler('user-detail') },
			}

			const usersNode: RouteTreeNode = {
				segment: 'users',
				isDynamic: false,
				isCatchAll: false,
				children: new Map([['[id]', idNode]]),
			}

			const tree: RouteTreeNode = {
				segment: '',
				isDynamic: false,
				isCatchAll: false,
				children: new Map([['users', usersNode]]),
			}

			const match = matchRoute('/users/123', tree)
			expect(match).not.toBeNull()
			expect(match?.params).toEqual({ id: '123' })
		})

		it('should prioritize static routes over dynamic routes', () => {
			const newNode: RouteTreeNode = {
				segment: 'new',
				isDynamic: false,
				isCatchAll: false,
				children: new Map(),
				handlers: { GET: createHandler('new-user') },
			}

			const idNode: RouteTreeNode = {
				segment: '[id]',
				isDynamic: true,
				isCatchAll: false,
				paramName: 'id',
				children: new Map(),
				handlers: { GET: createHandler('user-detail') },
			}

			const usersNode: RouteTreeNode = {
				segment: 'users',
				isDynamic: false,
				isCatchAll: false,
				children: new Map([
					['[id]', idNode],
					['new', newNode],
				]),
			}

			const tree: RouteTreeNode = {
				segment: '',
				isDynamic: false,
				isCatchAll: false,
				children: new Map([['users', usersNode]]),
			}

			// Should match static "new" route, not dynamic [id]
			const match = matchRoute('/users/new', tree)
			expect(match).not.toBeNull()
			expect(match?.params).toEqual({})
		})

		it('should match catch-all route and capture remaining segments', () => {
			const slugNode: RouteTreeNode = {
				segment: '[...slug]',
				isDynamic: true,
				isCatchAll: true,
				paramName: 'slug',
				children: new Map(),
				handlers: { GET: createHandler('docs') },
			}

			const docsNode: RouteTreeNode = {
				segment: 'docs',
				isDynamic: false,
				isCatchAll: false,
				children: new Map([['[...slug]', slugNode]]),
			}

			const tree: RouteTreeNode = {
				segment: '',
				isDynamic: false,
				isCatchAll: false,
				children: new Map([['docs', docsNode]]),
			}

			const match = matchRoute('/docs/api/users/create', tree)
			expect(match).not.toBeNull()
			expect(match?.params).toEqual({ slug: 'api/users/create' })
		})

		it('should collect middleware from parent nodes', () => {
			const mw1 = createMiddleware('mw1')
			const mw2 = createMiddleware('mw2')

			const idNode: RouteTreeNode = {
				segment: '[id]',
				isDynamic: true,
				isCatchAll: false,
				paramName: 'id',
				children: new Map(),
				handlers: { GET: createHandler('user-detail') },
				middleware: [mw2],
			}

			const usersNode: RouteTreeNode = {
				segment: 'users',
				isDynamic: false,
				isCatchAll: false,
				children: new Map([['[id]', idNode]]),
				middleware: [mw1],
			}

			const tree: RouteTreeNode = {
				segment: '',
				isDynamic: false,
				isCatchAll: false,
				children: new Map([['users', usersNode]]),
			}

			const match = matchRoute('/users/123', tree)
			expect(match).not.toBeNull()
			expect(match?.middlewareStack.length).toBe(2)
			expect(match?.middlewareStack[0]).toBe(mw1)
			expect(match?.middlewareStack[1]).toBe(mw2)
		})

		it('should match through route groups (transparent segments)', () => {
			const loginNode: RouteTreeNode = {
				segment: 'login',
				isDynamic: false,
				isCatchAll: false,
				children: new Map(),
				handlers: { GET: createHandler('login') },
			}

			const authGroupNode: RouteTreeNode = {
				segment: '',
				isDynamic: false,
				isCatchAll: false,
				children: new Map([['login', loginNode]]),
				isRouteGroup: true,
			}

			const tree: RouteTreeNode = {
				segment: '',
				isDynamic: false,
				isCatchAll: false,
				children: new Map([['(auth)', authGroupNode]]),
			}

			// (auth) is transparent, so /login should match
			const match = matchRoute('/login', tree)
			expect(match).not.toBeNull()
			expect(match?.path).toBe('/login')
			expect(match?.handler).toBeDefined()
		})

		it('should collect middleware from route groups', () => {
			const mwAuth = createMiddleware('auth')
			const mwLogin = createMiddleware('login')

			const loginNode: RouteTreeNode = {
				segment: 'login',
				isDynamic: false,
				isCatchAll: false,
				children: new Map(),
				handlers: { GET: createHandler('login') },
				middleware: [mwLogin],
			}

			const authGroupNode: RouteTreeNode = {
				segment: '',
				isDynamic: false,
				isCatchAll: false,
				children: new Map([['login', loginNode]]),
				isRouteGroup: true,
				middleware: [mwAuth],
			}

			const tree: RouteTreeNode = {
				segment: '',
				isDynamic: false,
				isCatchAll: false,
				children: new Map([['(auth)', authGroupNode]]),
			}

			const match = matchRoute('/login', tree)
			expect(match).not.toBeNull()
			expect(match?.middlewareStack.length).toBe(2)
			expect(match?.middlewareStack[0]).toBe(mwAuth)
			expect(match?.middlewareStack[1]).toBe(mwLogin)
		})

		it('should return null for non-existent routes', () => {
			const tree: RouteTreeNode = {
				segment: '',
				isDynamic: false,
				isCatchAll: false,
				children: new Map(),
			}

			const match = matchRoute('/nonexistent', tree)
			expect(match).toBeNull()
		})
	})

	describe('buildRouteTree', () => {
		it('should build tree from globRoutes', async () => {
			const globRoutes = {
				'/routes/index.ts': async () => ({ get: () => {} }),
				'/routes/users/[id]/index.ts': async () => ({ get: () => {} }),
				'/routes/users/[id]/types.d.ts': async () => ({}), // Types file
			}

			const tree = await buildRouteTree('/routes', undefined, globRoutes)

			expect(tree.handlers?.GET).toBeDefined()
			
			const usersNode = tree.children.get('users')
			const idNode = usersNode?.children.get('[id]')
			
			expect(idNode).toBeDefined()
			expect(idNode?.handlers?.GET).toBeDefined()
			expect(idNode?.types).toBe('/routes/users/[id]/types.d.ts')
		})

		it('should handle named type files', async () => {
			const globRoutes = {
				'/routes/users.ts': async () => ({ get: () => {} }),
				'/routes/users.d.ts': async () => ({}),
			}

			const tree = await buildRouteTree('/routes', undefined, globRoutes)

			const usersNode = tree.children.get('users')
			expect(usersNode).toBeDefined()
			expect(usersNode?.handlers?.GET).toBeDefined()
			expect(usersNode?.types).toBe('/routes/users.d.ts')
		})
	})
})
