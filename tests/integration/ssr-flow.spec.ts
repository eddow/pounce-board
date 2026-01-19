import { Hono } from 'hono'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPounceMiddleware } from '../../src/adapters/hono.js'
import { clearSSRData, injectSSRData } from '../../src/lib/ssr/utils.js'

describe('SSR Flow Integration', () => {
	beforeEach(() => {
		clearSSRData()
	})

	it('should inject collected SSR data into HTML response', async () => {
		const app = new Hono()

		// Add Pounce middleware
		app.use('*', createPounceMiddleware())

		// Simulated route handler that "fetches" data (injects into SSR state)
		app.get('/test', async (c) => {
			injectSSRData('pounce-data-test', { user: 'tester', id: 123 })
			return c.html(
				"<html><head><title>Test App</title></head><body><div id='root'></div></body></html>"
			)
		})

		const res = await app.request('/test')
		expect(res.status).toBe(200)

		const html = await res.text()

		// Verify script tag injection
		expect(html).toContain('<script type="application/json" id="pounce-data-test">')
		expect(html).toContain('{"user":"tester","id":123}')

		// Verify it's in the head (as per our current implementation in hono.ts)
		expect(html).toContain('{"user":"tester","id":123}</script>\n</head>')
	})

	it('should handle multiple SSR data points', async () => {
		const app = new Hono()
		app.use('*', createPounceMiddleware())

		app.get('/multi', async (c) => {
			injectSSRData('data-1', { val: 1 })
			injectSSRData('data-2', { val: 2 })
			return c.html('<html><body></body></html>')
		})

		const res = await app.request('/multi')
		const html = await res.text()

		expect(html).toContain('id="data-1">{"val":1}</script>')
		expect(html).toContain('id="data-2">{"val":2}</script>')
	})

	it('should NOT inject if response is not HTML', async () => {
		const app = new Hono()
		app.use('*', createPounceMiddleware())

		app.get('/json', async (c) => {
			injectSSRData('data-json', { should: 'not be here' })
			return c.json({ ok: true })
		})

		const res = await app.request('/json')
		const body = await res.text()

		expect(body).toBe('{"ok":true}')
		expect(body).not.toContain('script')
	})
})
