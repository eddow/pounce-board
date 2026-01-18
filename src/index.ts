/**
 * Main entry point for pounce-board
 */

// Export HTTP utilities
export { runMiddlewares, createJsonResponse, createErrorResponse } from "./lib/http/core.js";
export type {
  HttpMethod,
  RequestContext,
  Middleware,
  RouteHandler,
  RouteResponse,
} from "./lib/http/core.js";

// Export API client
export {
  api,
  enableSSR,
  disableSSR,
  getSSRId,
  getSSRData,
  injectSSRData,
  clearSSRData,
} from "./lib/http/client.js";

// Export proxy system
export { defineProxy } from "./lib/http/proxy.js";
export type { ProxyConfig, ProxyEndpointConfig } from "./lib/http/proxy.js";

// Export SSR utilities
export { injectApiResponses, escapeJson } from "./lib/ssr/utils.js";
export type { SSRDataMap } from "./lib/ssr/utils.js";

// Export router
export { parseSegment, matchRoute, buildRouteTree, collectMiddleware } from "./lib/router/index.js";
export type { RouteParams, RouteMatch, RouteTreeNode } from "./lib/router/index.js";

// Export adapters
export { createPounceMiddleware, createPounceApp } from "./adapters/hono.js";
