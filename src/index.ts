/**
 * Main entry point for pounce-board (Universal)
 * re-exports client or server output based on environment via package.json conditions
 */

// Universal types and utilities
export {
	api,
	config,
	enableSSR,
	disableSSR,
	clearSSRData,
	getSSRData,
	getSSRId,
	intercept,
	type InterceptorMiddleware,
} from './lib/http/client.js'

export { PounceResponse } from './lib/http/response.js'
export { ApiError } from './lib/http/core.js'
export type {
	Middleware,
	RequestContext,
	RouteHandler,
	RouteResponse,
	HttpMethod,
} from './lib/http/core.js'


