import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineProxy } from './proxy.js'

describe('defineProxy', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	describe('basic functionality', () => {
		it('should create callable endpoints from config', () => {
			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getUser: { method: 'GET', path: '/users/[id]' },
					createUser: { method: 'POST', path: '/users' },
				},
			})

			expect(proxy.getUser).toBeTypeOf('function')
			expect(proxy.createUser).toBeTypeOf('function')
		})

		it('should throw for unknown endpoint names', () => {
			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getUser: { method: 'GET', path: '/users/[id]' },
				},
			})

			expect(() => (proxy as any).unknownEndpoint).toThrow('Endpoint unknownEndpoint not found')
		})

		it('should make GET request to correct URL', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: '123', name: 'Alice' }),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getUser: { method: 'GET', path: '/users/[id]' },
				},
			})

			await proxy.getUser({ id: '123' })

			expect(mockFetch).toHaveBeenCalledWith(
				new URL('https://api.example.com/users/123'),
				expect.objectContaining({ method: 'GET' })
			)
		})

		it('should make POST request with body', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: 'new', name: 'Bob' }),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					createUser: { method: 'POST', path: '/users' },
				},
			})

			await proxy.createUser({ name: 'Bob', email: 'bob@example.com' })

			expect(mockFetch).toHaveBeenCalledWith(
				new URL('https://api.example.com/users'),
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ name: 'Bob', email: 'bob@example.com' }),
				})
			)
		})
	})

	describe('{param} path substitution', () => {
		it('should replace single path parameter', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({}),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getUser: { method: 'GET', path: '/users/[id]' },
				},
			})

			await proxy.getUser({ id: 'user-456' })

			expect(mockFetch).toHaveBeenCalledWith(
				new URL('https://api.example.com/users/user-456'),
				expect.any(Object)
			)
		})

		it('should replace multiple path parameters', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({}),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getUserPost: { method: 'GET', path: '/users/[userId]/posts/[postId]' },
				},
			})

			await proxy.getUserPost({ userId: 'user-1', postId: 'post-99' })

			expect(mockFetch).toHaveBeenCalledWith(
				new URL('https://api.example.com/users/user-1/posts/post-99'),
				expect.any(Object)
			)
		})

		it('should URL-encode path parameters', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({}),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getUser: { method: 'GET', path: '/users/[id]' },
				},
			})

			await proxy.getUser({ id: 'user/with/slashes' })

			expect(mockFetch).toHaveBeenCalledWith(
				new URL('https://api.example.com/users/user%2Fwith%2Fslashes'),
				expect.any(Object)
			)
		})
	})

	describe('prepare() request transformation', () => {
		it('should transform request body with prepare()', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: 'new' }),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					createUser: {
						method: 'POST',
						path: '/users',
						prepare: (body: any) => ({
							userData: body,
							source: 'pounce-framework',
						}),
					},
				},
			})

			await proxy.createUser({ name: 'Alice' })

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(URL),
				expect.objectContaining({
					body: JSON.stringify({
						userData: { name: 'Alice' },
						source: 'pounce-framework',
					}),
				})
			)
		})
	})

	describe('transform() response transformation', () => {
		it('should transform response data', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						userId: '123',
						fullName: 'Alice Smith',
						emailAddress: 'alice@example.com',
					}),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getUser: {
						method: 'GET',
						path: '/users/[id]',
						transform: (data: any) => ({
							id: data.userId,
							name: data.fullName,
							email: data.emailAddress,
						}),
					},
				},
			})

			const result = await proxy.getUser({ id: '123' })

			expect(result).toEqual({
				id: '123',
				name: 'Alice Smith',
				email: 'alice@example.com',
			})
		})

		it('should pass params to transform function', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ data: 'test' }),
			})
			vi.stubGlobal('fetch', mockFetch)

			const transformFn = vi.fn((data: any, params: any) => ({
				...data,
				requestedId: params.id,
			}))

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getUser: {
						method: 'GET',
						path: '/users/[id]',
						transform: transformFn,
					},
				},
			})

			await proxy.getUser({ id: '456' })

			expect(transformFn).toHaveBeenCalledWith({ data: 'test' }, { id: '456' })
		})
	})

	describe('params() query parameter mapping', () => {
		it('should add query parameters from params function', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([]),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					searchUsers: {
						method: 'GET',
						path: '/users/search',
						params: (input: any) => ({
							q: input.query,
							page: String(input.page || 1),
							limit: String(input.limit || 10),
						}),
					},
				},
			})

			await proxy.searchUsers({ query: 'Alice', page: 2 })

			const calledUrl = mockFetch.mock.calls[0][0] as URL
			expect(calledUrl.searchParams.get('q')).toBe('Alice')
			expect(calledUrl.searchParams.get('page')).toBe('2')
			expect(calledUrl.searchParams.get('limit')).toBe('10')
		})
	})

	describe('onError() custom error handling', () => {
		it('should call onError handler on error', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				statusText: 'Not Found',
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getUser: {
						method: 'GET',
						path: '/users/[id]',
						onError: (_error: any) => {
							throw new Error(`Custom error: User not found`)
						},
					},
				},
			})

			await expect(proxy.getUser({ id: '999' })).rejects.toThrow('Custom error: User not found')
		})

		it('should propagate error if no onError handler', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getUser: { method: 'GET', path: '/users/[id]' },
				},
			})

			await expect(proxy.getUser({ id: '123' })).rejects.toThrow('HTTP 500: Internal Server Error')
		})
	})

	describe('schema validation with Zod', () => {
		it('should validate response with Zod schema', async () => {
			// Create a mock Zod schema
			const mockSchema = {
				parse: vi.fn((data) => data),
			}

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: '123', name: 'Alice' }),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getUser: {
						method: 'GET',
						path: '/users/[id]',
						schema: mockSchema as any,
					},
				},
			})

			await proxy.getUser({ id: '123' })

			expect(mockSchema.parse).toHaveBeenCalledWith({ id: '123', name: 'Alice' })
		})

		it('should throw on schema validation failure', async () => {
			const mockSchema = {
				parse: vi.fn(() => {
					throw new Error('Validation failed: invalid email')
				}),
			}

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: '123', email: 'invalid' }),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getUser: {
						method: 'GET',
						path: '/users/[id]',
						schema: mockSchema as any,
					},
				},
			})

			await expect(proxy.getUser({ id: '123' })).rejects.toThrow('Validation failed: invalid email')
		})
	})

	describe('raw flag for non-JSON responses', () => {
		it('should return raw Response object when raw=true', async () => {
			const mockResponse = {
				ok: true,
				headers: new Headers({ 'content-type': 'application/octet-stream' }),
				body: 'binary data',
			}
			const mockFetch = vi.fn().mockResolvedValue(mockResponse)
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					downloadFile: {
						method: 'GET',
						path: '/files/[id]',
						raw: true,
					},
				},
			})

			const result = await proxy.downloadFile({ id: 'file-123' })

			expect(result).toBe(mockResponse)
		})
	})

	describe('mock() for development', () => {
		it('should return mock data in development mode', async () => {
			const originalEnv = process.env.NODE_ENV
			process.env.NODE_ENV = 'development'

			try {
				const mockFetch = vi.fn()
				vi.stubGlobal('fetch', mockFetch)

				const proxy = defineProxy({
					baseUrl: 'https://api.example.com',
					endpoints: {
						getUser: {
							method: 'GET',
							path: '/users/[id]',
							mock: (params) => ({
								id: params.id,
								name: `Mock User ${params.id}`,
							}),
						},
					},
				})

				const result = await proxy.getUser({ id: '123' })

				expect(result).toEqual({ id: '123', name: 'Mock User 123' })
				expect(mockFetch).not.toHaveBeenCalled()
			} finally {
				process.env.NODE_ENV = originalEnv
			}
		})

		it('should NOT use mock in production mode', async () => {
			const originalEnv = process.env.NODE_ENV
			process.env.NODE_ENV = 'production'

			try {
				const mockFetch = vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({ id: '123', name: 'Real User' }),
				})
				vi.stubGlobal('fetch', mockFetch)

				const proxy = defineProxy({
					baseUrl: 'https://api.example.com',
					endpoints: {
						getUser: {
							method: 'GET',
							path: '/users/[id]',
							mock: (params) => ({ id: params.id, name: 'Mock User' }),
						},
					},
				})

				const result = await proxy.getUser({ id: '123' })

				expect(result).toEqual({ id: '123', name: 'Real User' })
				expect(mockFetch).toHaveBeenCalled()
			} finally {
				process.env.NODE_ENV = originalEnv
			}
		})
	})

	describe('global request configuration', () => {
		it('should merge global headers into request', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({}),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				request: {
					headers: {
						'X-API-Key': 'secret-key',
						Authorization: 'Bearer token123',
					},
				},
				endpoints: {
					getUser: { method: 'GET', path: '/users/[id]' },
				},
			})

			await proxy.getUser({ id: '123' })

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(URL),
				expect.objectContaining({
					headers: expect.objectContaining({
						'X-API-Key': 'secret-key',
						Authorization: 'Bearer token123',
					}),
				})
			)
		})

		it('should support async request function', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({}),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				request: async (init) => ({
					...init,
					headers: {
						...init.headers,
						Authorization: 'Bearer dynamic-token',
					},
				}),
				endpoints: {
					getUser: { method: 'GET', path: '/users/[id]' },
				},
			})

			await proxy.getUser({ id: '123' })

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(URL),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'Bearer dynamic-token',
					}),
				})
			)
		})
	})

	describe('HTTP methods', () => {
		it.each(['PUT', 'PATCH', 'DELETE'] as const)('should handle %s method', async (method) => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ success: true }),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					action: { method, path: '/resource/[id]' },
				},
			})

			await proxy.action({ id: '123' })

			expect(mockFetch).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ method }))
		})
	})
	
	describe('retry logic', () => {
		it('should retry on non-ok response', async () => {
			const mockFetch = vi.fn()
				.mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' })
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				retries: 1,
				retryDelay: 0,
				endpoints: {
					action: { method: 'GET', path: '/test' },
				},
			})

			const result = await proxy.action()
			expect(result).toEqual({ success: true })
			expect(mockFetch).toHaveBeenCalledTimes(2)
		})

		it('should retry on fetch error', async () => {
			const mockFetch = vi.fn()
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				retries: 2,
				retryDelay: 0,
				endpoints: {
					action: { method: 'GET', path: '/test' },
				},
			})

			const result = await proxy.action()
			expect(result).toEqual({ success: true })
			expect(mockFetch).toHaveBeenCalledTimes(2)
		})

		it('should fail after all retries exhausted', async () => {
			const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Error' })
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				retries: 2,
				retryDelay: 0,
				endpoints: {
					action: { method: 'GET', path: '/test' },
				},
			})

			await expect(proxy.action()).rejects.toThrow('HTTP 500: Internal Error')
			expect(mockFetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
		})

		it('should respect endpoint-specific retries over proxy retries', async () => {
			const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Error' })
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				retries: 5,
				retryDelay: 0,
				endpoints: {
					action: { method: 'GET', path: '/test', retries: 1 },
				},
			})

			await expect(proxy.action()).rejects.toThrow('HTTP 500: Internal Error')
			expect(mockFetch).toHaveBeenCalledTimes(2) // Initial + 1 retry
		})
	})

	describe('timeout logic', () => {
		it('should throw ApiError(408) on timeout', async () => {
			const mockFetch = vi.fn().mockImplementation(async (_url, { signal }) => {
				return new Promise((resolve, reject) => {
					// Wait longer than the timeout
					const id = setTimeout(() => {
						resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
					}, 100)
					
					signal?.addEventListener('abort', () => {
						clearTimeout(id)
						const e = new Error('The operation was aborted')
						e.name = 'AbortError'
						reject(e)
					})
				})
			})
			vi.stubGlobal('fetch', mockFetch)
			
			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				timeout: 20, // Short timeout
				endpoints: {
					slowAction: { method: 'GET', path: '/slow' },
				},
			})

			await expect(proxy.slowAction()).rejects.toThrow('HTTP 408: Request Timeout')
		})
	})
	describe('caching logic', () => {
		it('should cache successful GET requests', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ data: 'cached' }),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getData: { method: 'GET', path: '/data', cache: true },
				},
			})

			// First call
			const res1 = await proxy.getData()
			expect(res1).toEqual({ data: 'cached' })
			expect(mockFetch).toHaveBeenCalledTimes(1)

			// Second call (should be cached)
			const res2 = await proxy.getData()
			expect(res2).toEqual({ data: 'cached' })
			expect(mockFetch).toHaveBeenCalledTimes(1)
		})

		it('should respect custom TTL', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ data: 'ttl-test' }),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getData: { method: 'GET', path: '/data', cache: 50 }, // 50ms TTL
				},
			})

			await proxy.getData()
			expect(mockFetch).toHaveBeenCalledTimes(1)

			// Wait for TTL to expire
			await new Promise((resolve) => setTimeout(resolve, 60))

			await proxy.getData()
			expect(mockFetch).toHaveBeenCalledTimes(2)
		})

		it('should use custom cache key generator', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ data: 'custom-key' }),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getData: {
						method: 'GET',
						path: '/data',
						cache: {
							ttl: 1000,
							key: (params) => `custom:${params.id}`,
						},
					},
				},
			})

			await proxy.getData({ id: '1', other: 'a' })
			await proxy.getData({ id: '1', other: 'b' }) // Different params, same key

			expect(mockFetch).toHaveBeenCalledTimes(1)
		})

		it('should allow manual cache clearing', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ data: 'manual-clear' }),
			})
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getData: { method: 'GET', path: '/data', cache: true },
				},
			})

			await proxy.getData()
			expect(mockFetch).toHaveBeenCalledTimes(1)

			proxy.$cache.clear()

			await proxy.getData()
			expect(mockFetch).toHaveBeenCalledTimes(2)
		})

		it('should NOT cache error responses', async () => {
			const mockFetch = vi.fn()
				.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Error' })
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: 'success' }) })
			vi.stubGlobal('fetch', mockFetch)

			const proxy = defineProxy({
				baseUrl: 'https://api.example.com',
				endpoints: {
					getData: { method: 'GET', path: '/data', cache: true },
				},
			})

			await expect(proxy.getData()).rejects.toThrow('HTTP 500: Error')
			const res = await proxy.getData()
			expect(res).toEqual({ data: 'success' })
			expect(mockFetch).toHaveBeenCalledTimes(2)
		})
	})
})
