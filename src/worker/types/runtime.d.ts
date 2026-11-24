/** The few Cloudflare Workers runtime globals the Worker modules use (no full workers-types dependency). */
interface RewriterElement {
  setInnerContent(content: string): void;
}

interface RewriterElementHandler {
  element(element: RewriterElement): void;
}

declare class HTMLRewriter {
  on(selector: string, handlers: RewriterElementHandler): HTMLRewriter;
  transform(response: Response): Response;
}
