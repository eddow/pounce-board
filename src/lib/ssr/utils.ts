/**
 * SSR utilities for injecting and hydrating data
 */

export type SSRDataMap = Record<string, { id: string; data: unknown }>;

/**
 * Inject API responses into HTML as script tags
 */
export function injectApiResponses(html: string, responses: SSRDataMap): string {
  const scripts = Object.entries(responses)
    .map(
      ([_, { id, data }]) =>
        `<script type="application/json" id="${id}">${JSON.stringify(data)}</script>`
    )
    .join("\n");

  // Insert before </head> if exists, otherwise before </body>
  if (html.includes("</head>")) {
    return html.replace("</head>", `${scripts}\n</head>`);
  }
  if (html.includes("</body>")) {
    return html.replace("</body>", `${scripts}\n</body>`);
  }

  // Fallback: append to end
  return html + scripts;
}

/**
 * Get SSR data from script tag in the DOM (client-side)
 */
export function getSSRData<T>(id: string): T | null {
  if (typeof document === "undefined") {
    return null;
  }

  const script = document.getElementById(id);
  if (!script || !script.textContent) {
    return null;
  }

  try {
    return JSON.parse(script.textContent) as T;
  } catch {
    return null;
  }
}

/**
 * Escape JSON for safe injection into HTML
 */
export function escapeJson(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
