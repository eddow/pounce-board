/**
 * Core HTTP types and middleware runner for pounce-board
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface RequestContext {
  request: Request;
  params: Record<string, string>;
  [key: string]: unknown;
}

export type Middleware = (
  context: RequestContext,
  next: () => Promise<Response>
) => Promise<Response>;

export interface RouteHandler {
  (context: RequestContext): Promise<{
    status: number;
    data?: unknown;
    error?: string;
    headers?: Record<string, string>;
  }>;
}

export type RouteResponse = {
  status: number;
  data?: unknown;
  error?: string;
  headers?: Record<string, string>;
};

/**
 * Runs middleware stack and executes handler
 */
export async function runMiddlewares(
  middlewareStack: Middleware[],
  context: RequestContext,
  handler: RouteHandler
): Promise<Response> {
  const run = async (index: number): Promise<Response> => {
    if (index >= middlewareStack.length) {
      const result = await handler(context);
      return new Response(result.data ? JSON.stringify(result.data) : result.error, {
        status: result.status,
        headers: {
          "Content-Type": "application/json",
          ...result.headers,
        },
      });
    }

    const middleware = middlewareStack[index];
    return middleware(context, () => run(index + 1));
  };

  return run(0);
}

/**
 * Helper to create JSON responses
 */
export function createJsonResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

/**
 * Helper to create error responses
 */
export function createErrorResponse(error: string | Error, status = 500): Response {
  const message = typeof error === "string" ? error : error.message;
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
