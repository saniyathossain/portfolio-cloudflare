import rawClientSignatures from "../../content/clientSignatures.json";
import rawSecurity from "../../content/security.json";
import type { ClientSignatures } from "../../types/ClientSignatures";
import type { SecurityConfig } from "../../types/SecurityConfig";
import { EnvironmentConfigResolver } from "../config/EnvironmentConfigResolver";
import { createRequestGuard, type RequestGuard } from "../security/requestGuard";
import { ClientHintsReader } from "../services/ClientHintsReader";
import { ClientProfileService } from "../services/ClientProfileService";
import { NetworkProfileReader } from "../services/NetworkProfileReader";
import { UserAgentParser } from "../services/UserAgentParser";

export interface SecurityServices {
  /** The policy in src/content/security.json, before any Worker variable overrides. */
  readonly baseConfig: SecurityConfig;
  /** Layers the Worker variables (MAX_*, RATE_LIMIT_*, …) over the JSON policy, once per environment. */
  readonly configResolver: EnvironmentConfigResolver;
  readonly clientProfiles: ClientProfileService;
  /** The request guard for a resolved config (compiled once per config object). */
  guardFor(config: SecurityConfig): RequestGuard;
}

/**
 * Composition root for the Worker's security layer (the Laravel "service provider"): the only place that
 * instantiates services and binds JSON config to them. The JSON files are validated by the Zod schemas in the test
 * suite, so the cast here is a typed contract rather than a guess.
 */
export function createSecurityServices(): SecurityServices {
  const baseConfig = rawSecurity as unknown as SecurityConfig;
  const signatures = rawClientSignatures as unknown as ClientSignatures;
  const guards = new WeakMap<SecurityConfig, RequestGuard>();
  return {
    baseConfig,
    configResolver: new EnvironmentConfigResolver(baseConfig),
    clientProfiles: new ClientProfileService(new UserAgentParser(signatures), new ClientHintsReader(), new NetworkProfileReader()),
    guardFor(config) {
      let guard = guards.get(config);
      if (!guard) {
        guard = createRequestGuard(config);
        guards.set(config, guard);
      }
      return guard;
    },
  };
}

/** One instance per isolate: tables compile once, requests reuse them. */
export const securityServices: SecurityServices = createSecurityServices();
