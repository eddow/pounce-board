import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { defineRoute } from './defs'

describe('defineRoute', () => {
	it('should build a simple static URL', () => {
		const route = defineRoute('/users')
		expect(route.buildUrl({})).toBe('/users')
	})

	it('should build a URL with path params', () => {
		const route = defineRoute('/users/[id]/posts/[postId]')
		const url = route.buildUrl({ id: '123', postId: '456' })
		expect(url).toBe('/users/123/posts/456')
	})

	it('should throw if path param is missing', () => {
		const route = defineRoute('/users/[id]')
		expect(() => route.buildUrl({})).toThrow('Missing path parameter: id')
	})

	it('should append query params if schema is provided', () => {
		const route = defineRoute('/search', z.object({
			q: z.string(),
			page: z.number().optional(),
		}))

		const url = route.buildUrl({ q: 'hello', page: 1 })
		expect(url).toBe('/search?q=hello&page=1')
	})

	it('should validate query params', () => {
		const route = defineRoute('/search', z.object({
			age: z.number(),
		}))

		// @ts-expect-error - testing runtime validation
		expect(() => route.buildUrl({ age: 'not-a-number' })).toThrow()
	})

    it('should handle both path and query params', () => {
        const route = defineRoute('/users/[id]', z.object({
            details: z.boolean().optional()
        }))

        const url = route.buildUrl({ id: '123', details: true })
        expect(url).toBe('/users/123?details=true')
    })
})
