import type { BrowserDevice } from "../../../types/WebVitals";

interface NetworkInformation {
  readonly effectiveType?: string;
  readonly downlink?: number;
  readonly rtt?: number;
  readonly saveData?: boolean;
}

export interface HighEntropyValues {
  readonly model?: string;
  readonly platform?: string;
  readonly platformVersion?: string;
  readonly architecture?: string;
}

interface UserAgentData {
  getHighEntropyValues(hints: readonly string[]): Promise<HighEntropyValues>;
}

interface NavigatorExtras {
  readonly connection?: NetworkInformation;
  readonly deviceMemory?: number;
  readonly userAgentData?: UserAgentData;
}

const HIGH_ENTROPY_HINTS = ["model", "platform", "platformVersion", "architecture"] as const;

/** The Client Hints that need an async permission round-trip (device model, OS version, architecture). */
export async function readHighEntropyHints(): Promise<HighEntropyValues> {
  try {
    return (
      (await (navigator as Navigator & NavigatorExtras).userAgentData?.getHighEntropyValues(HIGH_ENTROPY_HINTS)) ?? {}
    );
  } catch {
    // Client Hints can be blocked by policy; the edge still sees the low-entropy ones.
    return {};
  }
}

/**
 * Device facts only the browser knows. Synchronous so it can run inside `pagehide`, where an await would lose the beacon;
 * pass the hints read earlier. Every field degrades to "" / 0 when the browser does not expose it.
 */
export function readDevice(hints: HighEntropyValues = {}): BrowserDevice {
  return {
    model: hints.model ?? "",
    platform: hints.platform ?? "",
    platformVersion: hints.platformVersion ?? "",
    architecture: hints.architecture ?? "",
    ...readHardware(),
    ...readConnection(),
    ...readViewport(),
  };
}

function readConnection(): Pick<BrowserDevice, "effectiveConnection" | "downlinkMbps" | "rttMs" | "saveData"> {
  const connection = (navigator as Navigator & NavigatorExtras).connection;
  return {
    effectiveConnection: connection?.effectiveType ?? "",
    downlinkMbps: connection?.downlink ?? 0,
    rttMs: connection?.rtt ?? 0,
    saveData: connection?.saveData === true,
  };
}

function readHardware(): Pick<BrowserDevice, "memoryGb" | "cores"> {
  return {
    memoryGb: (navigator as Navigator & NavigatorExtras).deviceMemory ?? 0,
    cores: navigator.hardwareConcurrency,
  };
}

function readViewport(): Pick<
  BrowserDevice,
  "viewportWidth" | "viewportHeight" | "devicePixelRatio" | "reducedMotion" | "colorScheme"
> {
  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    colorScheme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  };
}
