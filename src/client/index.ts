/**
 * Client-side exports for pounce-board
 * Use: import { api } from 'pounce-board/client'
 */

// API client
export {
	api,
	type ApiClientInstance,
	get,
	post,
	put,
	del,
	patch,
	intercept,
	type InterceptorMiddleware,
} from '../lib/http/client.js'

// Types
export { ApiError } from '../lib/http/core.js'
export { PounceResponse } from '../lib/http/response.js'

// SSR hydration (client-side consumption)
export { getSSRData, getSSRId } from '../lib/ssr/utils.js'

export { defineRoute, type RouteDefinition } from '../lib/router/defs.js'
