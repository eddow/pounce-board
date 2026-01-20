/**
 * Server-side exports for pounce-board
 * Use: import { buildRouteTree } from 'pounce-board/server'
 */

// Router
export {
	buildRouteTree,
	matchRoute,
	collectMiddleware,
	parseSegment,
	type RouteMatch,
	type RouteTreeNode,
	type RouteParams,
} from '../lib/router/index.js'

// HTTP core
export {
	runMiddlewares,
	createJsonResponse,
	createErrorResponse,
	addSecurityHeaders,
	compressResponse,
	ApiError,
	type Middleware,
	type RouteHandler,
	type RequestContext,
	type RouteResponse,
	type HttpMethod,
} from '../lib/http/core.js'

// HTTP client (works on server too for SSR dispatch)
export {
	api,
	config,
	enableSSR,
	disableSSR,
	clearSSRData,
	setRouteRegistry,
	clearRouteRegistry,
	intercept,
	clearInterceptors,
} from '../lib/http/client.js'

// SSR injection
export {
	withSSRContext,
	injectSSRData,
	getCollectedSSRResponses,
	injectApiResponses,
	escapeJson,
	getSSRId,
	type SSRDataMap,
} from '../lib/ssr/utils.js'

// Context
export {
	getContext,
	runWithContext,
	createScope,
	type RequestScope,
} from '../lib/http/context.js'

// Proxy
export { defineProxy, type ProxyConfig, type ProxyEndpointConfig } from '../lib/http/proxy.js'

// Adapters
export { createPounceApp, createPounceMiddleware, clearRouteTreeCache } from '../adapters/hono.js'
