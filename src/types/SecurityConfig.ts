import type { z } from "zod";
import type { securitySchema } from "../schemas/securitySchema";

export type SecurityConfig = z.infer<typeof securitySchema>;
export type RateRule = SecurityConfig["rateLimits"]["contact"];
