/**
 * External API proxy system for pounce-board
 * Allows defining typed proxies for external APIs with transformation and validation
 */

import type { z } from "zod";

export type ProxyEndpointConfig = {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  transform?: (data: unknown, params?: Record<string, string>) => unknown;
  prepare?: (body: unknown) => unknown;
  params?: (input: Record<string, unknown>) => Record<string, string>;
  onError?: (error: unknown) => never;
  schema?: z.ZodSchema;
  raw?: boolean;
  mock?: (params: Record<string, string>) => unknown;
};

export type ProxyConfig = {
  baseUrl: string;
  request?: RequestInit | ((init: RequestInit) => RequestInit | Promise<RequestInit>);
  endpoints: Record<string, ProxyEndpointConfig>;
};

/**
 * Define a typed proxy for an external API
 */
export function defineProxy<T extends ProxyConfig>(
  config: T
): Record<keyof T["endpoints"], (params?: Record<string, unknown>) => Promise<unknown>> {
  return new Proxy(
    {},
    {
      get(_, endpointName: string) {
        const endpoint = config.endpoints[endpointName];
        if (!endpoint) {
          throw new Error(`Endpoint ${endpointName} not found in proxy`);
        }

        return async (params: Record<string, unknown> = {}) => {
          // Mock in development if provided
          if (process.env.NODE_ENV === "development" && endpoint.mock) {
            return endpoint.mock(params as Record<string, string>);
          }

          try {
            // Build URL with path parameter substitution
            let path = endpoint.path;
            for (const [key, value] of Object.entries(params)) {
              path = path.replace(`{${key}}`, encodeURIComponent(String(value)));
            }

            const url = new URL(path, config.baseUrl);

            // Add query parameters
            if (endpoint.params) {
              const queryParams = endpoint.params(params);
              for (const [key, value] of Object.entries(queryParams)) {
                url.searchParams.set(key, value);
              }
            }

            // Prepare request init
            let init: RequestInit = {
              method: endpoint.method,
              headers: {
                "Content-Type": "application/json",
              },
            };

            // Merge global request config
            if (config.request) {
              const globalConfig =
                typeof config.request === "function"
                  ? await config.request(init)
                  : config.request;
              init = { ...init, ...globalConfig };
            }

            // Prepare body for POST/PUT/PATCH
            if (["POST", "PUT", "PATCH"].includes(endpoint.method) && params) {
              const bodyData = endpoint.prepare ? endpoint.prepare(params) : params;
              init.body = JSON.stringify(bodyData);
            }

            // Make request
            const response = await fetch(url, init);

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Return raw response if requested
            if (endpoint.raw) {
              return response;
            }

            // Parse JSON
            const data = await response.json();

            // Validate with schema
            if (endpoint.schema) {
              endpoint.schema.parse(data);
            }

            // Transform response
            return endpoint.transform
              ? endpoint.transform(data, params as Record<string, string>)
              : data;
          } catch (error) {
            if (endpoint.onError) {
              return endpoint.onError(error);
            }
            throw error;
          }
        };
      },
    }
  ) as Record<keyof T["endpoints"], (params?: Record<string, unknown>) => Promise<unknown>>;
}
