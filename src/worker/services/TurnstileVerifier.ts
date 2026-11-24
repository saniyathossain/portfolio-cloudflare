import type { Logger } from "../logging/Logger";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyAnswer {
  readonly success?: boolean;
}

/** Server-side Cloudflare Turnstile check. Only used when TURNSTILE_SECRET is configured; fails closed. */
export class TurnstileVerifier {
  constructor(private readonly fetchImplementation: typeof fetch = fetch) {}

  async verify(secret: string, token: string, ip: string, logger: Logger): Promise<boolean> {
    if (token === "") return false;
    const form = new FormData();
    form.append("secret", secret);
    form.append("response", token);
    if (ip !== "") form.append("remoteip", ip);
    try {
      const response = await this.fetchImplementation(SITEVERIFY_URL, { method: "POST", body: form });
      const answer = (await response.json()) as SiteverifyAnswer;
      return answer.success === true;
    } catch (error) {
      logger.exception(
        { event: "turnstile_verify_failed", location: "/api/contact", reason: "siteverify unreachable, rejecting" },
        error,
      );
      return false;
    }
  }
}
