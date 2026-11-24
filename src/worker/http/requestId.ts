const SHORT_ID_LENGTH = 8;

/** Reference shown to the visitor and written to every log line: the Cloudflare ray id, else a short random id. */
export function newRequestId(request: Request): string {
  const rayId = request.headers.get("CF-Ray");
  if (rayId) return rayId;
  return crypto.randomUUID().replaceAll("-", "").slice(0, SHORT_ID_LENGTH);
}
