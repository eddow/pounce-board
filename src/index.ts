/**
 * Main entry point for pounce-board
 */

// Export adapters
export { createPounceApp, createPounceMiddleware } from './adapters/hono.js'
// Export API client
export {
	api,
	clearSSRData,
	config,
	disableSSR,
	enableSSR,
	getSSRData,
	getSSRId,
	injectSSRData,
	intercept,
	type InterceptorMiddleware,
} from './lib/http/client.js'
export { PounceResponse } from './lib/http/response.js'
export type {
	HttpMethod,
	Middleware,
	RequestContext,
	RouteHandler,
	RouteResponse,
} from './lib/http/core.js'
// Export HTTP utilities
export { createErrorResponse, createJsonResponse, runMiddlewares } from './lib/http/core.js'
export type { ProxyConfig, ProxyEndpointConfig } from './lib/http/proxy.js'
// Export proxy system
export { defineProxy } from './lib/http/proxy.js'
export type { RouteMatch, RouteParams, RouteTreeNode } from './lib/router/index.js'

// Export router
export { buildRouteTree, collectMiddleware, matchRoute, parseSegment } from './lib/router/index.js'
export type { SSRDataMap } from './lib/ssr/utils.js'
// Export SSR utilities
export { escapeJson, injectApiResponses } from './lib/ssr/utils.js'
