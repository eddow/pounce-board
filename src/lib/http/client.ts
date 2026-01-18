/**
 * Universal API client for pounce-board
 * Supports absolute, site-absolute, and site-relative URLs
 * Handles SSR data injection and hydration
 */

const ssrMode = { enabled: false };
const ssrResponses = new Map<string, unknown>();

/**
 * Enable SSR mode for server-side rendering
 */
export function enableSSR(): void {
  ssrMode.enabled = true;
}

/**
 * Disable SSR mode (for testing or manual control)
 */
export function disableSSR(): void {
  ssrMode.enabled = false;
  ssrResponses.clear();
}

/**
 * Generate deterministic ID for SSR data based on URL
 */
export function getSSRId(url: string | URL): string {
  const path = typeof url === "string" ? url : url.pathname + url.search;
  // Use base64 encoding for safe ID generation
  if (typeof btoa !== "undefined") {
    return `pounce-data-${btoa(path)}`;
  }
  // Node.js fallback
  return `pounce-data-${Buffer.from(path).toString("base64")}`;
}

/**
 * Get SSR data by ID
 */
export function getSSRData<T>(id: string): T | null {
  return (ssrResponses.get(id) as T) || null;
}

/**
 * Inject SSR data (used server-side)
 */
export function injectSSRData(id: string, data: unknown): void {
  ssrResponses.set(id, data);
}

/**
 * Clear all SSR data
 */
export function clearSSRData(): void {
  ssrResponses.clear();
}

/**
 * Universal API client
 * Handles absolute URLs (https://...), site-absolute (/...), and site-relative (./...)
 */
export function api(input: string | URL) {
  // Normalize input to URL
  let url: URL;

  if (typeof input === "string") {
    if (input.startsWith("http://") || input.startsWith("https://")) {
      // Absolute URL
      url = new URL(input);
    } else if (input.startsWith("/")) {
      // Site-absolute
      const origin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost";
      url = new URL(input, origin);
    } else if (input.startsWith(".")) {
      // Site-relative
      const base = typeof window !== "undefined" ? window.location.href : "http://localhost";
      url = new URL(input, base);
    } else {
      // Assume site-absolute if no scheme
      const origin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost";
      url = new URL(`/${input}`, origin);
    }
  } else {
    url = input;
  }

  const ssrId = getSSRId(url);

  return {
    async get<T>(params?: Record<string, string>): Promise<T> {
      // Add query parameters
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, value);
        }
      }

      // Server-side: Direct dispatch (to be implemented with router integration)
      if (ssrMode.enabled) {
        // TODO: Implement direct handler dispatch
        const mockData = { _mock: true } as T;
        injectSSRData(ssrId, mockData);
        return mockData;
      }

      // Client-side: Check for hydration data first
      const cachedData = getSSRData<T>(ssrId);
      if (cachedData) {
        return cachedData;
      }

      // Client-side: Fetch from network
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json() as Promise<T>;
    },

    async post<T>(body: unknown): Promise<T> {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json() as Promise<T>;
    },

    async put<T>(body: unknown): Promise<T> {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json() as Promise<T>;
    },

    async del<T>(params?: Record<string, string>): Promise<T> {
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, value);
        }
      }

      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json() as Promise<T>;
    },

    async patch<T>(body: unknown): Promise<T> {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json() as Promise<T>;
    },
  };
}
