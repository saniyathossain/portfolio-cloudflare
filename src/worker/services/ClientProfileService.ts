import { DeviceType } from "../../enums/DeviceType";
import type { ClientProfile, DeviceInfo, NamedVersion, RequestInfo } from "../../types/ClientProfile";
import type { ClientHintsReader } from "./ClientHintsReader";
import { cloudflareProperties, type NetworkProfileReader } from "./NetworkProfileReader";
import { toBotInfo, type UserAgentFacts, type UserAgentParser } from "./UserAgentParser";

const REDUCED_ANDROID_MODEL = "K";

/** Client Hints are authoritative where the User-Agent is frozen or reduced (Android model, desktop/mobile flag). */
function refineDevice(
  device: DeviceInfo,
  facts: UserAgentFacts,
  hintModel: string,
  hintMobile: boolean | null,
): DeviceInfo {
  const type = hintMobile === true && device.type === DeviceType.Desktop ? DeviceType.Mobile : device.type;
  const uaModel = device.model === REDUCED_ANDROID_MODEL ? "" : device.model;
  return {
    ...device,
    type: facts.botCategory === "" ? type : DeviceType.Bot,
    model: hintModel === "" ? uaModel : hintModel,
  };
}

function refineOs(os: NamedVersion, hintPlatform: string, hintPlatformVersion: string): NamedVersion {
  if (hintPlatformVersion === "") return os;
  return { name: hintPlatform === "" ? os.name : hintPlatform, version: hintPlatformVersion };
}

/**
 * Builds the full {@link ClientProfile} for a request by composing three single-purpose readers (User-Agent,
 * Client Hints, network/TLS). Single responsibility each, one place that knows how they combine.
 */
export class ClientProfileService {
  constructor(
    private readonly userAgentParser: UserAgentParser,
    private readonly clientHintsReader: ClientHintsReader,
    private readonly networkProfileReader: NetworkProfileReader,
  ) {}

  profile(request: Request): ClientProfile {
    const userAgent = request.headers.get("User-Agent") ?? "";
    const facts = this.userAgentParser.parse(userAgent);
    const hints = this.clientHintsReader.read(request.headers);
    const edge = cloudflareProperties(request);
    return {
      userAgent,
      browser: facts.browser,
      engine: facts.engine,
      os: refineOs(facts.os, hints.platform, hints.platformVersion),
      device: refineDevice(facts.device, facts, hints.model, hints.mobile),
      hints,
      bot: toBotInfo(facts.botCategory, {
        score: edge.botManagement?.score,
        verifiedBot: edge.botManagement?.verifiedBot,
      }),
      acceptLanguage: request.headers.get("Accept-Language") ?? "",
      network: this.networkProfileReader.read(request),
    };
  }

  describeRequest(request: Request): RequestInfo {
    const header = (name: string) => request.headers.get(name) ?? "";
    return {
      method: request.method,
      path: new URL(request.url).pathname,
      referer: header("Referer"),
      origin: header("Origin"),
      fetchSite: header("Sec-Fetch-Site"),
      fetchMode: header("Sec-Fetch-Mode"),
      fetchDestination: header("Sec-Fetch-Dest"),
      ray: header("CF-Ray"),
    };
  }

  /** One greppable line, e.g. "Chrome 131 · Android 14 · mobile Samsung SM-S918B". */
  summarize(profile: ClientProfile): string {
    const { browser, os, device } = profile;
    const hardware = [device.type, device.vendor, device.model].filter((part) => part !== "").join(" ");
    return [`${browser.name} ${browser.version}`.trim(), `${os.name} ${os.version}`.trim(), hardware].join(" · ");
  }
}
