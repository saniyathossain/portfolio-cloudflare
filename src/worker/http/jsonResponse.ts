import { API_RESPONSE_HEADERS } from "../security/headers";

/** JSON answer for the API routes: never cached, never indexed, never sniffed. */
export function jsonResponse(body: unknown, status: number, extraHeaders: Readonly<Record<string, string>> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...API_RESPONSE_HEADERS,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      ...extraHeaders,
    },
  });
}
