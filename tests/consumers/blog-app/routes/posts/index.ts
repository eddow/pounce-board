import type { RequestContext } from 'pounce-board/http'

// Simple in-memory store
export const posts = [
	{ id: '1', title: 'First Post', content: 'Hello World' },
	{ id: '2', title: 'Pounce Board', content: 'Is awesome' },
]

export async function get(_ctx: RequestContext) {
	return {
		status: 200,
		data: posts,
	}
}

export async function post({ request }: RequestContext) {
	try {
		const body = await request.json()
		const newPost = {
			id: String(posts.length + 1),
			title: body.title,
			content: body.content,
		}
		posts.push(newPost)
		return {
			status: 201,
			data: newPost,
		}
	} catch (e) {
		return {
			status: 400,
			error: 'Invalid JSON',
		}
	}
}
