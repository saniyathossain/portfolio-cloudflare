/**
 * Cloudflare Worker entry — a thin adapter: build the request logger, hand the request to the application pipeline,
 * and drain the log writes after the response is on its way.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * Pipeline and layers: src/worker/WorkerApplication.ts (docs/aidlc/57, 58). Policy values: src/content/security.json.
 */
import { loggingConfig, workerApplication } from "./worker/bootstrap/application";
import { newRequestId } from "./worker/http/requestId";
import { createLogger } from "./worker/logging/createLogger";
import type { WorkerEnvironment, WorkerExecutionContext } from "./worker/types/WorkerEnvironment";

export default {
  async fetch(request: Request, environment: WorkerEnvironment, context: WorkerExecutionContext): Promise<Response> {
    const logger = createLogger({
      config: loggingConfig,
      environment,
      actor: "edge/worker",
      requestId: newRequestId(request),
    });
    try {
      return await workerApplication.handle(request, environment, logger);
    } finally {
      // Log writes (KV / D1) finish after the response is sent and can never fail the request.
      context.waitUntil(logger.drain());
    }
  },
};
