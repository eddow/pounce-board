import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildRouteTree, matchRoute } from '../../src/lib/router/index.js'

const MINIMAL_APP_ROUTES = path.resolve(import.meta.dirname, '../consumers/minimal-app/routes')

describe('buildRouteTree', () => {
	it('should scan minimal-app routes directory and build tree', async () => {
		const tree = await buildRouteTree(MINIMAL_APP_ROUTES)

		// Root should exist
		expect(tree).toBeDefined()
		expect(tree.segment).toBe('')

		// Should have root index handler
		expect(tree.handlers).toBeDefined()
		expect(tree.handlers!['GET']).toBeDefined()

		// Should have users child
		expect(tree.children.has('users')).toBe(true)
		const usersNode = tree.children.get('users')!
		expect(usersNode.segment).toBe('users')

		// Should have dynamic [id] child under users
		expect(usersNode.children.has('[id]')).toBe(true)
		const idNode = usersNode.children.get('[id]')!
		expect(idNode.isDynamic).toBe(true)
		expect(idNode.paramName).toBe('id')
		expect(idNode.handlers).toBeDefined()
		expect(idNode.handlers!['GET']).toBeDefined()
	})

	it('should match / route from scanned tree', async () => {
		const tree = await buildRouteTree(MINIMAL_APP_ROUTES)
		const match = matchRoute('/', tree, 'GET')

		expect(match).not.toBeNull()
		expect(match!.path).toBe('/')
		expect(match!.handler).toBeDefined()
	})

	it('should match /users/123 from scanned tree', async () => {
		const tree = await buildRouteTree(MINIMAL_APP_ROUTES)
		const match = matchRoute('/users/123', tree, 'GET')

		expect(match).not.toBeNull()
		expect(match!.params).toEqual({ id: '123' })
		expect(match!.handler).toBeDefined()
	})

	it('should call handler and get response', async () => {
		const tree = await buildRouteTree(MINIMAL_APP_ROUTES)
		const match = matchRoute('/', tree, 'GET')

		expect(match).not.toBeNull()

		// Call the handler
		const mockRequest = new Request('http://localhost/')
		const result = await match!.handler({ request: mockRequest, params: {} })

		expect(result.status).toBe(200)
		expect(result.data).toBeDefined()
		const data = result.data as { message: string }
		expect(data.message).toBe('Hello from Pounce-Board!')
	})

	it('should call dynamic handler with params', async () => {
		const tree = await buildRouteTree(MINIMAL_APP_ROUTES)
		const match = matchRoute('/users/42', tree, 'GET')

		expect(match).not.toBeNull()

		const mockRequest = new Request('http://localhost/users/42')
		const result = await match!.handler({ request: mockRequest, params: match!.params })

		expect(result.status).toBe(200)
		expect(result.data).toBeDefined()
		const data = result.data as { id: string; name: string }
		expect(data.id).toBe('42')
		expect(data.name).toBe('User 42')
	})
})
