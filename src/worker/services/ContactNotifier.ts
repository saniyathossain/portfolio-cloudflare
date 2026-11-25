import { EmailMessage } from "cloudflare:email";
import type { Logger } from "../logging/Logger";
import type { EmailBinding } from "../types/WorkerEnvironment";
import { composeContactMail } from "./ContactMailComposer";

export interface ContactMessage {
  readonly name: string;
  readonly email: string;
  readonly project: string;
}

/** Tells the owner about a new submission. Never throws: a failed notification must not fail the visitor's request. */
export interface ContactNotifier {
  notify(message: ContactMessage): Promise<boolean>;
}

/** Email Routing `send_email` binding. Unconfigured (no binding / addresses) → resolves false. */
export class EmailRoutingNotifier implements ContactNotifier {
  constructor(
    private readonly mailer: EmailBinding | undefined,
    private readonly from: string | undefined,
    private readonly to: string | undefined,
    private readonly logger: Logger,
  ) {}

  async notify(message: ContactMessage): Promise<boolean> {
    const { mailer, from, to } = this;
    if (!mailer || !from || !to) return false;
    try {
      await mailer.send(new EmailMessage(from, to, composeContactMail({ from, to, ...message })));
      return true;
    } catch (error) {
      this.logger.exception(
        { event: "contact_email_failed", location: "EmailRoutingNotifier.notify", reason: "email send failed; submission already stored" },
        error,
      );
      return false;
    }
  }
}
