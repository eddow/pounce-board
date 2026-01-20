import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildRouteTree, matchRoute } from 'pounce-board/server'

const MINIMAL_APP_ROUTES = path.resolve(import.meta.dirname, '../consumers/minimal-app/routes')

/**
 * @vocab "Test as Documentation"
 * @description Verifies how the router discovers and assigns components to the route tree.
 * 
 * Key behaviors validated here:
 * 1. `index.tsx` is attached as the main `component` for a route node.
 * 2. `common.tsx` is attached as the `layout` for a route node.
 * 3. Layouts are collected from parent directories (inheritance).
 * 4. Named files (e.g. `list.tsx`) are treated as valid routes (e.g. `/list`) with `component` attached.
 */
describe('Component Discovery', () => {
	it('should attach index.tsx component to route node', async () => {
		const tree = await buildRouteTree(MINIMAL_APP_ROUTES)
		
		// Check root node
		expect(tree.component).toBeDefined()
		expect(tree.component.name).toBe('IndexPage')
	})

	it('should match route and return component', async () => {
		const tree = await buildRouteTree(MINIMAL_APP_ROUTES)
		const match = matchRoute('/', tree, 'GET')

		expect(match).not.toBeNull()
		expect(match!.component).toBeDefined()
		expect(match!.component.name).toBe('IndexPage')
	})

	it('should attach common.tsx layout to route node', async () => {
		const tree = await buildRouteTree(MINIMAL_APP_ROUTES)
		
		// Root should have its own layout
		expect(tree.layout).toBeDefined()
		expect(tree.layout.name).toBe('RootLayout')
	})

	it('should collect layouts from parent directories', async () => {
		const tree = await buildRouteTree(MINIMAL_APP_ROUTES)
		
		// Get users node (nested)
		const usersNode = tree.children.get('users')!
		expect(usersNode).toBeDefined()
        
        // Match a route inside users
        const match = matchRoute('/users/42', tree, 'GET')
        expect(match).not.toBeNull()
        
        // Should have layouts from:
        // 1. Root common.tsx
        // 2. Users common.tsx
        expect(match!.layouts).toBeDefined()
        expect(match!.layouts!.length).toBeGreaterThanOrEqual(2)
        expect(match!.layouts![0].name).toBe('RootLayout')
        expect(match!.layouts![1].name).toBe('UsersLayout')
	})

	it('should match named route file list.tsx', async () => {
		const tree = await buildRouteTree(MINIMAL_APP_ROUTES)
		const match = matchRoute('/users/list', tree, 'GET')

		expect(match).not.toBeNull()
		expect(match!.component).toBeDefined()
		expect(match!.component.name).toBe('UserListPage')
	})
})
