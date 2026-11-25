import { DeviceType } from "../../enums/DeviceType";
import type { BotInfo, DeviceInfo, NamedVersion } from "../../types/ClientProfile";
import type { ClientSignatures, DeviceSignature, VersionedSignature } from "../../types/ClientSignatures";

export interface UserAgentFacts {
  readonly browser: NamedVersion;
  readonly engine: NamedVersion;
  readonly os: NamedVersion;
  readonly device: DeviceInfo;
  readonly botCategory: string;
}

const UNKNOWN: NamedVersion = { name: "unknown", version: "" };
const UNKNOWN_DEVICE: DeviceInfo = { type: DeviceType.Unknown, vendor: "", model: "" };

interface CompiledVersioned {
  readonly name: string;
  readonly expression: RegExp;
  readonly underscoreVersion: boolean;
}

interface CompiledDevice {
  readonly signature: DeviceSignature;
  readonly expression: RegExp;
}

function compileVersioned(signatures: readonly VersionedSignature[]): CompiledVersioned[] {
  return signatures.map(({ name, pattern, underscoreVersion }) => ({
    name,
    expression: new RegExp(pattern, "i"),
    underscoreVersion: underscoreVersion ?? false,
  }));
}

function firstMatch(userAgent: string, table: readonly CompiledVersioned[]): NamedVersion {
  for (const entry of table) {
    const match = entry.expression.exec(userAgent);
    if (!match) continue;
    const version = match[1] ?? "";
    return { name: entry.name, version: entry.underscoreVersion ? version.replaceAll("_", ".") : version };
  }
  return UNKNOWN;
}

/**
 * Turns a raw User-Agent into browser / engine / OS / device / bot facts using the data-driven tables in
 * `src/content/clientSignatures.json`. Pure and allocation-light: the tables compile once per isolate.
 * Limits worth knowing: iOS and macOS freeze their reported versions, and Android/Chrome reduce the model to "K"
 * — `ClientProfileService` fills those gaps from Client Hints when the browser sends them.
 */
export class UserAgentParser {
  private readonly browsers: CompiledVersioned[];
  private readonly engines: CompiledVersioned[];
  private readonly operatingSystems: CompiledVersioned[];
  private readonly devices: CompiledDevice[];
  private readonly bots: { readonly category: string; readonly expression: RegExp }[];

  constructor(signatures: ClientSignatures) {
    this.browsers = compileVersioned(signatures.browsers);
    this.engines = compileVersioned(signatures.engines);
    this.operatingSystems = compileVersioned(signatures.operatingSystems);
    this.devices = signatures.devices.map((signature) => ({
      signature,
      expression: new RegExp(signature.pattern, "i"),
    }));
    this.bots = signatures.bots.map(({ category, pattern }) => ({ category, expression: new RegExp(pattern, "i") }));
  }

  parse(userAgent: string): UserAgentFacts {
    return {
      browser: firstMatch(userAgent, this.browsers),
      engine: firstMatch(userAgent, this.engines),
      os: firstMatch(userAgent, this.operatingSystems),
      device: this.device(userAgent),
      botCategory: this.botCategory(userAgent),
    };
  }

  private device(userAgent: string): DeviceInfo {
    for (const { signature, expression } of this.devices) {
      const match = expression.exec(userAgent);
      if (!match) continue;
      return { type: signature.type, vendor: signature.vendor, model: (match[1] ?? "").trim() };
    }
    return UNKNOWN_DEVICE;
  }

  private botCategory(userAgent: string): string {
    if (userAgent === "") return "empty-user-agent";
    return this.bots.find(({ expression }) => expression.test(userAgent))?.category ?? "";
  }
}

export function toBotInfo(
  category: string,
  cloudflare: { readonly score: number | undefined; readonly verifiedBot: boolean | undefined },
): BotInfo {
  return {
    isBot: category !== "" || (cloudflare.score !== undefined && cloudflare.score < 30),
    category,
    cloudflareScore: cloudflare.score,
    cloudflareVerifiedBot: cloudflare.verifiedBot,
  };
}
