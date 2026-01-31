/**
 * @vocab "Test as Documentation"
 * @description Verifies the Client-side Hydration logic of the API client.
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, getSSRId } from '../../src/lib/http/client.js'

describe('Client Hydration Integration', () => {
	beforeEach(() => {
		// Reset document body
		document.body.innerHTML = ''
		document.head.innerHTML = ''
		
		// Reset global fetch mock
		global.fetch = vi.fn()
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('should hydrate data from script tag without network request', async () => {
		const testPath = '/api/users/123'
		const mockData = { id: '123', name: 'Hydrated User' }
		
		// 1. Calculate the ID that `api(..)` will look for
		// Note: api() creates a URL, and getSSRId(url) uses pathname+search
		// We simulate that manually here to setup the DOM
		const urlobj = new URL(testPath, 'http://localhost')
		const ssrId = getSSRId(urlobj)
		
		// 2. Inject script tag into DOM (simulating server SSR)
		const script = document.createElement('script')
		script.id = ssrId
		script.type = 'application/json'
		script.textContent = JSON.stringify(mockData)
		document.head.appendChild(script)

		// 3. Make API call
		const data = await api(testPath).get()

		// 4. Verification
		expect(data).toEqual(mockData)
		expect(global.fetch).not.toHaveBeenCalled()
		
		// 5. Verify script tag consumption (should be removed or emptied)
		expect(document.getElementById(ssrId)).toBeNull()
	})

	it('should fallback to fetch if hydration data is missing', async () => {
		const testPath = '/api/missing'
		const mockNetworkData = { from: 'network' }

		// Mock successful fetch response
		;(global.fetch as any).mockResolvedValue(
			new Response(JSON.stringify(mockNetworkData), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		)

		const data = await api(testPath).get()

		expect(data).toEqual(mockNetworkData)
		expect(global.fetch).toHaveBeenCalledTimes(1)
	})

	it('should fetch from network on second call (one-time consumption)', async () => {
		const testPath = '/api/once'
		const mockSsrData = { from: 'ssr' }
		const mockNetworkData = { from: 'network' }
		
		// Setup SSR
		const urlobj = new URL(testPath, 'http://localhost')
		const ssrId = getSSRId(urlobj)
		const script = document.createElement('script')
		script.id = ssrId
		script.type = 'application/json'
		script.textContent = JSON.stringify(mockSsrData)
		document.head.appendChild(script)

		// Setup Network Mock
		;(global.fetch as any).mockResolvedValue(
			new Response(JSON.stringify(mockNetworkData), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		)

		// First call - Hydration
		const data1 = await api(testPath).get()
		expect(data1).toEqual(mockSsrData)
		expect(global.fetch).not.toHaveBeenCalled()

		// Second call - Network (script was consumed)
		const data2 = await api(testPath).get()
		expect(data2).toEqual(mockNetworkData)
		expect(global.fetch).toHaveBeenCalledTimes(1)
	})
})
