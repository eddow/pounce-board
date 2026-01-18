/**
 * File-based router for pounce-board
 * Scans routes/ directory and builds route tree
 */

import type { Middleware, RouteHandler } from "../http/core.js";

export type RouteParams = Record<string, string>;

export type RouteMatch = {
  handler: RouteHandler;
  middlewareStack: Middleware[];
  params: RouteParams;
  path: string;
};

export type RouteTreeNode = {
  segment: string;
  isDynamic: boolean;
  isCatchAll: boolean;
  paramName?: string;
  children: Map<string, RouteTreeNode>;
  handlers?: Record<string, RouteHandler>;
  middleware?: Middleware[];
};

/**
 * Parse dynamic segment from path segment
 * [id] -> { isDynamic: true, paramName: 'id' }
 * [...slug] -> { isCatchAll: true, paramName: 'slug' }
 */
export function parseSegment(segment: string): {
  isDynamic: boolean;
  isCatchAll: boolean;
  paramName?: string;
  normalizedSegment: string;
} {
  if (segment.startsWith("[...") && segment.endsWith("]")) {
    return {
      isDynamic: true,
      isCatchAll: true,
      paramName: segment.slice(4, -1),
      normalizedSegment: segment,
    };
  }

  if (segment.startsWith("[") && segment.endsWith("]")) {
    return {
      isDynamic: true,
      isCatchAll: false,
      paramName: segment.slice(1, -1),
      normalizedSegment: segment,
    };
  }

  return {
    isDynamic: false,
    isCatchAll: false,
    normalizedSegment: segment,
  };
}

/**
 * Match a URL path against the route tree
 */
export function matchRoute(
  path: string,
  routeTree: RouteTreeNode
): RouteMatch | null {
  // TODO: Implement route matching logic
  return null;
}

/**
 * Scan routes directory and build route tree
 * This will use import.meta.glob in Vite environment
 */
export async function buildRouteTree(routesDir: string): Promise<RouteTreeNode> {
  // TODO: Implement route scanning
  // Will use import.meta.glob for Vite or fs for Node.js
  return {
    segment: "",
    isDynamic: false,
    isCatchAll: false,
    children: new Map(),
  };
}

/**
 * Collect middleware from ancestor nodes
 */
export function collectMiddleware(path: string[]): Middleware[] {
  // TODO: Implement middleware collection from route tree
  return [];
}
