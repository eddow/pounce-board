import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPounceMiddleware } from 'pounce-board/server'
import { clearSSRData, injectSSRData } from 'pounce-board/server'
import { api } from 'pounce-board'

/**
 * @vocab "Test as Documentation"
 * @description Verifies the SSR injection flow from data collection to HTML output.
 * 
 * Key behaviors validated here:
 * 1. `injectSSRData()` collects data during request handling.
 * 2. Collected data is injected into HTML responses as `<script type="application/json">` tags.
 * 3. Multiple data points can be injected simultaneously.
 * 4. JSON responses are NOT modified (injection is HTML-specific).
 */
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

	it('should automatically track api() calls during SSR and inject results', async () => {
		const app = new Hono()
		app.use('*', createPounceMiddleware())

		// Mock global fetch for this test
		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ auto: 'tracked' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		)
		global.fetch = mockFetch

		app.get('/auto-api', async (c) => {
			// Call api() without awaiting it immediately to test async tracking?
			// Actually, api() returns a promise. We usually await it to get data for the component.
			// But even if we await it, the tracking happens inside api().
			// The key is that withSSRContext waits for all tracked promises to settle before finishing.
			const data = await api('https://example.com/data').get()
			return c.html(`<html><body>Data: ${JSON.stringify(data)}</body></html>`)
		})

		const res = await app.request('/auto-api')
		const html = await res.text()

		// 1. Verify fetch was called
		// client.ts calls fetch with a URL object as first arg
		expect(mockFetch).toHaveBeenCalledWith(
			expect.objectContaining({ href: 'https://example.com/data' }),
			expect.any(Object)
		)

		// 2. Verify data was rendered in HTML (standard behavior)
		expect(html).toContain('Data: {"auto":"tracked"}')

		// 3. Verify Pounce automatically injected the data script for hydration
		// The ID is deterministic based on the URL
		// We can check just for the content since ID generation is internal (though deterministic)
		expect(html).toContain('{"auto":"tracked"}')
		expect(html).toContain('<script type="application/json" id="')
	})
})
