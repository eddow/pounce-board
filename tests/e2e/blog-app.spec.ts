import { test, expect } from '@playwright/test'

test.describe('Blog App Consumer', () => {
	// Root endpoint
	test('GET / should return API info', async ({ request }) => {
		const res = await request.get('http://localhost:3001/')
		expect(res.ok()).toBeTruthy()
		const data = await res.json()
		expect(data.name).toBe('Pounce Blog API')
	})

	test.describe('Posts API', () => {
		test('CRUD flow', async ({ request }) => {
			// 1. List posts (initial)
			const listRes = await request.get('http://localhost:3001/posts')
			expect(listRes.ok()).toBeTruthy()
			const initialPosts = await listRes.json()
			expect(initialPosts.length).toBeGreaterThan(0)

			// 2. Create post
			const newPost = { title: 'E2E Testing', content: 'Is fun' }
			const createRes = await request.post('http://localhost:3001/posts', { data: newPost })
			expect(createRes.status()).toBe(201)
			const createdPost = await createRes.json()
			expect(createdPost.title).toBe(newPost.title)
			const newId = createdPost.id

			// 3. Get created post
			const getRes = await request.get(`http://localhost:3001/posts/${newId}`)
			expect(getRes.ok()).toBeTruthy()
			const fetchedPost = await getRes.json()
			expect(fetchedPost.content).toBe(newPost.content)

			// 4. Update post
			const updateRes = await request.put(`http://localhost:3001/posts/${newId}`, {
				data: { title: 'E2E Testing Updated' },
			})
			expect(updateRes.ok()).toBeTruthy()
			const updatedPost = await updateRes.json()
			expect(updatedPost.title).toBe('E2E Testing Updated')

			// 5. Delete post
			const deleteRes = await request.delete(`http://localhost:3001/posts/${newId}`)
			expect(deleteRes.ok()).toBeTruthy()

			// 6. Verify deletion
			const checkRes = await request.get(`http://localhost:3001/posts/${newId}`)
			expect(checkRes.status()).toBe(404)
		})
	})

	test.describe('Middleware', () => {
		test('Global middleware adds X-Response-Time', async ({ request }) => {
			const res = await request.get('http://localhost:3001/')
			expect(res.headers()['x-response-time']).toMatch(/^\d+ms$/)
		})

		test('Posts middleware adds X-Resource header', async ({ request }) => {
			const res = await request.get('http://localhost:3001/posts')
			expect(res.headers()['x-resource']).toBe('Posts')
		})

		test('Other routes do NOT have X-Resource header', async ({ request }) => {
			const res = await request.get('http://localhost:3001/')
			expect(res.headers()['x-resource']).toBeUndefined()
		})
	})

	test.describe('Route Groups', () => {
		test('GET /login (from (auth) group)', async ({ request }) => {
			// Test invalid login
			const res = await request.post('http://localhost:3001/login', {
				data: { username: 'user', password: 'wrong' },
			})
			expect(res.status()).toBe(401)

			// Test valid login
			const res2 = await request.post('http://localhost:3001/login', {
				data: { username: 'admin', password: 'password' },
			})
			expect(res2.status()).toBe(200)
			expect((await res2.json()).token).toBe('fake-jwt-token')
		})
	})
})
