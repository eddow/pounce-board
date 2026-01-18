/**
 * Hono adapter for pounce-board
 * Automatically integrates file-based routes with Hono
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { runMiddlewares } from "../lib/http/core.js";
import { enableSSR } from "../lib/http/client.js";
import type { RouteMatch } from "../lib/router/index.js";

/**
 * Create Hono middleware that handles pounce-board routes
 */
export function createPounceMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    // Enable SSR for this request
    enableSSR();

    // TODO: Resolve route from path
    // const route: RouteMatch | null = null; // await resolveRoute(c.req.path);

    // if (!route) {
    //   return next(); // Pass to next Hono middleware or 404
    // }

    // Execute middleware stack and handler
    // const response = await runMiddlewares(
    //   route.middlewareStack,
    //   {
    //     request: c.req.raw,
    //     params: route.params,
    //   },
    //   route.handler
    // );

    // TODO: Handle SSR injection for HTML responses
    // if (response.headers.get("Content-Type")?.includes("text/html")) {
    //   const html = await response.text();
    //   const ssrData = getCollectedSSRResponses();
    //   return c.html(injectApiResponses(html, ssrData));
    // }

    // return response;
    
    // For now, just pass through
    return next();
  };
}

/**
 * Create a Hono app with pounce-board integration
 */
export function createPounceApp(): Hono {
  const app = new Hono();
  app.use("*", createPounceMiddleware());
  return app;
}
