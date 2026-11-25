import type { DeviceType } from "../enums/DeviceType";

/** Everything the server can legitimately learn about the client from one request (docs/aidlc/58). */
export interface NamedVersion {
  readonly name: string;
  readonly version: string;
}

export interface DeviceInfo {
  readonly type: DeviceType;
  readonly vendor: string;
  readonly model: string;
}

/** Raw User-Agent Client Hints, quotes stripped. `mobile` is null when the browser did not send the hint. */
export interface ClientHintsInfo {
  readonly brands: string;
  readonly fullVersionList: string;
  readonly mobile: boolean | null;
  readonly platform: string;
  readonly platformVersion: string;
  readonly model: string;
  readonly architecture: string;
  readonly bitness: string;
}

export interface BotInfo {
  readonly isBot: boolean;
  /** Signature category ("scanner", "automation", "tool", "search", …) or "" for a normal browser. */
  readonly category: string;
  /** Cloudflare Bot Management score (1 = bot, 99 = human) when the plan provides it. */
  readonly cloudflareScore: number | undefined;
  readonly cloudflareVerifiedBot: boolean | undefined;
}

export interface NetworkInfo {
  readonly ip: string;
  readonly ipVersion: 4 | 6 | 0;
  readonly country: string;
  readonly region: string;
  readonly city: string;
  readonly timezone: string;
  readonly asn: number | undefined;
  readonly asOrganization: string;
  readonly datacenter: string;
  readonly httpProtocol: string;
  readonly tlsVersion: string;
  readonly tlsCipher: string;
  /** TLS client fingerprints (JA3 / JA4) — identify the client library even when the User-Agent lies. */
  readonly ja3Hash: string;
  readonly ja4: string;
  readonly clientTcpRttMilliseconds: number | undefined;
}

export interface ClientProfile {
  readonly userAgent: string;
  readonly browser: NamedVersion;
  readonly engine: NamedVersion;
  readonly os: NamedVersion;
  readonly device: DeviceInfo;
  readonly hints: ClientHintsInfo;
  readonly bot: BotInfo;
  readonly acceptLanguage: string;
  readonly network: NetworkInfo;
}

/** Request-level facts that are not about the client itself. */
export interface RequestInfo {
  readonly method: string;
  readonly path: string;
  readonly referer: string;
  readonly origin: string;
  readonly fetchSite: string;
  readonly fetchMode: string;
  readonly fetchDestination: string;
  readonly ray: string;
}
