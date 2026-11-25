/**
 * Real-user Web Vitals beacon (docs/aidlc/69). Loaded by boot.ts only when the page carries `<meta name="portfolio-rum">`
 * (build variable RUM_SAMPLE_RATE > 0) and this visitor was sampled. Collects LCP / CLS / INP / FCP / TTFB / TBT with their
 * sections plus device facts, and sends ONE small beacon when the page is hidden or closed. No cookies, no identifiers.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 */
import { readDevice, readHighEntropyHints, type HighEntropyValues } from "./lib/vitals/device";
import { VitalsCollector } from "./lib/vitals/collector";

interface RumConfig {
  readonly endpoint: string;
}

const CONFIG_META_NAME = "portfolio-rum";
const MAX_PAGE_CHARS = 120;

function readConfig(): RumConfig | undefined {
  const content = document.querySelector(`meta[name="${CONFIG_META_NAME}"]`)?.getAttribute("content");
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content) as Partial<RumConfig>;
    return typeof parsed.endpoint === "string" && parsed.endpoint.startsWith("/") ? { endpoint: parsed.endpoint } : undefined;
  } catch {
    return undefined;
  }
}

function navigationType(): string {
  const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return entry?.type ?? "";
}

const config = readConfig();
if (config) {
  const collector = new VitalsCollector();
  collector.start();
  let sent = false;
  // Read early: the Client Hints round-trip is async and would not finish inside `pagehide`.
  let hints: HighEntropyValues = {};
  void readHighEntropyHints().then((values) => {
    hints = values;
  });

  const send = (): void => {
    if (sent) return;
    sent = true;
    const body = JSON.stringify({
      page: location.pathname.slice(0, MAX_PAGE_CHARS),
      navigationType: navigationType(),
      ...collector.snapshot(),
      device: readDevice(hints),
    });
    // text/plain keeps the beacon a "simple" same-origin request (no preflight); the Worker parses the JSON itself.
    if (!navigator.sendBeacon(config.endpoint, new Blob([body], { type: "text/plain" }))) {
      void fetch(config.endpoint, { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => undefined);
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") send();
  });
  window.addEventListener("pagehide", () => {
    send();
  });
}

export {};
