import { beforeEach, describe, expect, it, vi } from 'vitest'
import { escapeJson, getSSRData, injectApiResponses } from './utils.js'

describe('ssr utils', () => {
	describe('injectApiResponses', () => {
		it('should inject script tags into HTML', () => {
			const html = '<html><head></head><body></body></html>'
			const responses = {
				'user-1': { id: 'pounce-data-1', data: { name: 'John' } },
			}

			const result = injectApiResponses(html, responses)
			expect(result).toContain(
				'<script type="application/json" id="pounce-data-1">{"name":"John"}</script>'
			)
			expect(result).toContain('</head>')
		})

		it('should escape special characters for XSS safety', () => {
			const html = '<html><body></body></html>'
			const responses = {
				malicious: { id: 'pounce-xss', data: { html: '</script><script>alert(1)</script>' } },
			}

			const result = injectApiResponses(html, responses)
			expect(result).not.toContain('</script><script>')
			expect(result).toContain('\\u003c/script\\u003e')
		})
	})

	describe('getSSRData', () => {
		beforeEach(() => {
			vi.stubGlobal('document', {
				getElementById: vi.fn(),
			})
		})

		it('should read data from script tag and remove it', () => {
			const id = 'test-data'
			const data = { foo: 'bar' }
			const mockScript = {
				textContent: JSON.stringify(data),
				remove: vi.fn(),
			}

			;(document.getElementById as any).mockReturnValue(mockScript)

			const result = getSSRData<typeof data>(id)
			expect(result).toEqual(data)
			expect(mockScript.remove).toHaveBeenCalled()
		})

		describe('in development mode', () => {
			beforeEach(() => {
				vi.stubGlobal('process', { env: { NODE_ENV: 'development' } })
				vi.spyOn(console, 'warn').mockImplementation(() => {})
			})

			it('should warn if script tag is missing', () => {
				;(document.getElementById as any).mockReturnValue(null)
				getSSRData('missing')
				expect(console.warn).toHaveBeenCalledWith(
					expect.stringContaining('Script tag with ID "missing" not found')
				)
			})

			it('should warn if record is empty', () => {
				const mockScript = { textContent: '' }
				;(document.getElementById as any).mockReturnValue(mockScript)
				getSSRData('empty')
				expect(console.warn).toHaveBeenCalledWith(
					expect.stringContaining('Script tag "empty" is empty')
				)
			})

			it('should warn and not remove if JSON is invalid', () => {
				const id = 'invalid-json'
				const mockScript = {
					textContent: '{invalid}',
					remove: vi.fn(),
				}
				;(document.getElementById as any).mockReturnValue(mockScript)

				getSSRData(id)
				expect(console.warn).toHaveBeenCalledWith(
					expect.stringContaining('Failed to parse JSON for "invalid-json"'),
					expect.any(Error)
				)
				expect(mockScript.remove).not.toHaveBeenCalled()
			})
		})

		describe('in production mode', () => {
			beforeEach(() => {
				vi.stubGlobal('process', { env: { NODE_ENV: 'production' } })
				vi.spyOn(console, 'warn').mockImplementation(() => {})
			})

			it('should NOT warn if script tag is missing', () => {
				;(document.getElementById as any).mockReturnValue(null)
				getSSRData('missing')
				expect(console.warn).not.toHaveBeenCalled()
			})
		})
	})

	describe('escapeJson', () => {
		it('should escape <, >, and &', () => {
			const input = '{"tag":"</script>","amp":"&"}'
			const escaped = escapeJson(input)
			expect(escaped).toBe('{"tag":"\\u003c/script\\u003e","amp":"\\u0026"}')
		})
	})

	describe('SSRContext', () => {
		it('should generate unique IDs for the same URL within the same context', async () => {
			const { withSSRContext, getSSRId } = await import('./utils.js')
			
			await withSSRContext(async () => {
				const id1 = getSSRId('/foo')
				const id2 = getSSRId('/foo')
				expect(id1).not.toBe(id2)
				// IDs are hashed, so they won't contain the raw path 'foo'
				// expect(id1).toContain('foo') 
				// expect(id2).toContain('foo')
				expect(id1.split('-').pop()).not.toBe(id2.split('-').pop())
			})
		})

		it('should isolate data between contexts', async () => {
			const { withSSRContext, injectSSRData, getCollectedSSRResponses } = await import('./utils.js')

			const ctx1Promise = withSSRContext(async () => {
				injectSSRData('id-1', { val: 1 })
				await new Promise((r) => setTimeout(r, 10))
				return getCollectedSSRResponses()
			})

			const ctx2Promise = withSSRContext(async () => {
				injectSSRData('id-2', { val: 2 })
				await new Promise((r) => setTimeout(r, 5))
				return getCollectedSSRResponses()
			})

			const [res1, res2] = await Promise.all([ctx1Promise, ctx2Promise])

			expect(res1.result).toHaveProperty('id-1')
			expect(res1.result).not.toHaveProperty('id-2')
			
			expect(res2.result).toHaveProperty('id-2')
			expect(res2.result).not.toHaveProperty('id-1')
		})

		it('should work with nested calls', async () => {
			const { withSSRContext, injectSSRData, getCollectedSSRResponses } = await import('./utils.js')

			await withSSRContext(async () => {
				injectSSRData('outer', true)
				
				await withSSRContext(async () => {
					injectSSRData('inner', true)
					const inner = getCollectedSSRResponses()
					expect(inner).toHaveProperty('inner')
					expect(inner).not.toHaveProperty('outer')
				})
				
				const outer = getCollectedSSRResponses()
				expect(outer).toHaveProperty('outer')
				expect(outer).not.toHaveProperty('inner')
			})
		})
	})
})
