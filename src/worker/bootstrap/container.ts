import rawClientSignatures from "../../content/clientSignatures.json";
import rawSecurity from "../../content/security.json";
import type { ClientSignatures } from "../../types/ClientSignatures";
import type { SecurityConfig } from "../../types/SecurityConfig";
import { createRequestGuard, type RequestGuard } from "../security/requestGuard";
import { ClientHintsReader } from "../services/ClientHintsReader";
import { ClientProfileService } from "../services/ClientProfileService";
import { NetworkProfileReader } from "../services/NetworkProfileReader";
import { UserAgentParser } from "../services/UserAgentParser";

export interface SecurityServices {
  readonly config: SecurityConfig;
  readonly guard: RequestGuard;
  readonly clientProfiles: ClientProfileService;
}

/**
 * Composition root for the Worker's security layer (the Laravel "service provider"): the only place that
 * instantiates services and binds JSON config to them. The JSON files are validated by the Zod schemas in the test
 * suite, so the cast here is a typed contract rather than a guess.
 */
export function createSecurityServices(): SecurityServices {
  const config = rawSecurity as unknown as SecurityConfig;
  const signatures = rawClientSignatures as unknown as ClientSignatures;
  return {
    config,
    guard: createRequestGuard(config),
    clientProfiles: new ClientProfileService(new UserAgentParser(signatures), new ClientHintsReader(), new NetworkProfileReader()),
  };
}

/** One instance per isolate: tables compile once, requests reuse them. */
export const securityServices: SecurityServices = createSecurityServices();
