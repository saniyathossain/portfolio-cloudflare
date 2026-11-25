import type { z } from "zod";
import type { loggingSchema } from "../schemas/loggingSchema";

export type LoggingConfig = z.infer<typeof loggingSchema>;
export type ChannelConfig = LoggingConfig["channels"][string];
