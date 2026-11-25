import type { Logger } from "../logging/Logger";

export interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

export interface ErrorPageDependencies {
  readonly assets: AssetFetcher;
  readonly logger: Logger;
  /** Security headers every response from this Worker carries. */
  readonly baseHeaders: Readonly<Record<string, string>>;
}

export interface ErrorPageRequest {
  readonly requestUrl: string;
  /** Page under /errors/<slug>/ (see src/content/errors.json). */
  readonly slug: string;
  readonly status: number;
  /** Operator-supplied replacements (MAINTENANCE_TITLE / MAINTENANCE_MESSAGE). */
  readonly overrides?: { readonly title?: string | undefined; readonly message?: string | undefined };
  readonly extraHeaders?: Readonly<Record<string, string>>;
}

function plainTextFallback(status: number, requestId: string, headers: Record<string, string>): Response {
  return new Response(`${status} — temporarily unavailable (ref ${requestId})`, {
    status,
    headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * Serves the shell-console error page generated at build time. The visitor only ever sees the reference id —
 * the exception, stack and context go to the log under that same id. If the page itself cannot be fetched
 * a one-line plain-text body is returned: an error handler must never throw.
 */
export async function errorPageResponse(
  dependencies: ErrorPageDependencies,
  request: ErrorPageRequest,
): Promise<Response> {
  const { assets, logger, baseHeaders } = dependencies;
  const headers: Record<string, string> = {
    ...baseHeaders,
    "Cache-Control": "no-store",
    "X-Request-Id": logger.requestId,
    ...request.extraHeaders,
  };

  try {
    const pageResponse = await assets.fetch(new Request(new URL(`/errors/${request.slug}/`, request.requestUrl)));
    if (!pageResponse.ok) throw new Error(`error page "${request.slug}" answered ${pageResponse.status}`);

    const { overrides } = request;
    const rewritten = new HTMLRewriter()
      .on("[data-error-title]", {
        element(element) {
          if (overrides?.title) element.setInnerContent(overrides.title);
        },
      })
      .on("[data-error-message]", {
        element(element) {
          if (overrides?.message) element.setInnerContent(overrides.message);
        },
      })
      .on('[data-field="ref"]', {
        element(element) {
          element.setInnerContent(logger.requestId);
        },
      })
      .transform(pageResponse);

    return new Response(rewritten.body, {
      status: request.status,
      headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (thrown) {
    logger.exception(
      { event: "error_page_unavailable", location: request.slug, reason: "serving plain-text fallback" },
      thrown,
    );
    return plainTextFallback(request.status, logger.requestId, headers);
  }
}
