import type { RequestContext } from 'pounce-board/http/core.js'
import { posts } from '../index.js'

export async function get({ params }: RequestContext) {
	const post = posts.find((p) => p.id === params.id)
	if (!post) {
		return { status: 404, error: 'Post not found' }
	}
	return { status: 200, data: post }
}

export async function put({ request, params }: RequestContext) {
	const postIndex = posts.findIndex((p) => p.id === params.id)
	if (postIndex === -1) {
		return { status: 404, error: 'Post not found' }
	}

	try {
		const body = await request.json()
		posts[postIndex] = { ...posts[postIndex], ...body }
		return { status: 200, data: posts[postIndex] }
	} catch {
		return { status: 400, error: 'Invalid JSON' }
	}
}

export async function del({ params }: RequestContext) {
	const postIndex = posts.findIndex((p) => p.id === params.id)
	if (postIndex === -1) {
		return { status: 404, error: 'Post not found' }
	}

	posts.splice(postIndex, 1)
	return { status: 200, data: { success: true } }
}
