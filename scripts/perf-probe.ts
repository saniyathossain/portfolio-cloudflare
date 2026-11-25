/**
 * Quick, repeatable load-performance probe (a fast proxy for Lighthouse): CPU 4x slowdown + slow-4G-like
 * network, N cold loads, medians of FCP/LCP/script/layout time. Use it to compare two builds served the same way.
 *   URLS="legacy=http://127.0.0.1:8801/,new=http://127.0.0.1:8803/" RUNS=5 node scripts/perf-probe.ts
 */
import type { Browser } from "puppeteer-core";
import { launchBrowser, sleep } from "./lib/browser.ts";

const RUNS = Number(process.env["RUNS"] ?? 5);
const CPU_THROTTLE_RATE = 4;
const NETWORK_LATENCY_MS = 150;
const DOWNLOAD_BYTES_PER_SECOND = (1.6 * 1024 * 1024) / 8;
const UPLOAD_BYTES_PER_SECOND = (750 * 1024) / 8;
const MOBILE_VIEWPORT = { width: 412, height: 823, deviceScaleFactor: 2, isMobile: true };
const SETTLE_AFTER_LOAD_MS = 3500;
const MILLISECONDS_PER_SECOND = 1000;
const NAME_COLUMN_WIDTH = 10;

interface Sample {
  fcp: number;
  lcp: number;
  script: number;
  layout: number;
  style: number;
  task: number;
  nodes: number;
  htmlGz: number;
}
interface Vitals {
  fcp: number;
  lcp: number;
}
type SampleKey = keyof Sample;
type Target = readonly [name: string, url: string];

const targets: Target[] = (process.env["URLS"] ?? "").split(",").map((entry) => {
  const [name = "", url = ""] = entry.split(/=(.*)/s);
  return [name, url];
});

const median = (values: number[]): number => [...values].sort((first, second) => first - second)[Math.floor(values.length / 2)] ?? Number.NaN;

async function measureOnce(browser: Browser, url: string): Promise<Sample> {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport(MOBILE_VIEWPORT);
  const client = await page.createCDPSession();
  await client.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE_RATE });
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: NETWORK_LATENCY_MS,
    downloadThroughput: DOWNLOAD_BYTES_PER_SECOND,
    uploadThroughput: UPLOAD_BYTES_PER_SECOND,
  });
  await client.send("Performance.enable");
  await page.evaluateOnNewDocument(() => {
    const vitals = { fcp: 0, lcp: 0 };
    (window as unknown as { __vitals: Vitals }).__vitals = vitals;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (entry.name === "first-contentful-paint") vitals.fcp = entry.startTime;
    }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) vitals.lcp = entry.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto(url, { waitUntil: "load" });
  await sleep(SETTLE_AFTER_LOAD_MS);
  const metrics = Object.fromEntries((await client.send("Performance.getMetrics")).metrics.map((metric) => [metric.name, metric.value]));
  const vitals = await page.evaluate(() => (window as unknown as { __vitals: Vitals }).__vitals);
  const htmlBytes = await page.evaluate(
    () => (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming).encodedBodySize,
  );
  await context.close();
  return {
    fcp: vitals.fcp,
    lcp: vitals.lcp,
    script: (metrics["ScriptDuration"] ?? Number.NaN) * MILLISECONDS_PER_SECOND,
    layout: (metrics["LayoutDuration"] ?? Number.NaN) * MILLISECONDS_PER_SECOND,
    style: (metrics["RecalcStyleDuration"] ?? Number.NaN) * MILLISECONDS_PER_SECOND,
    task: (metrics["TaskDuration"] ?? Number.NaN) * MILLISECONDS_PER_SECOND,
    nodes: metrics["Nodes"] ?? Number.NaN,
    htmlGz: htmlBytes,
  };
}

const browser = await launchBrowser();
// Interleave the targets run by run so machine noise hits every build equally.
const samplesByName = new Map<string, Sample[]>(targets.map(([name]) => [name, []]));
for (let run = 0; run < RUNS; run += 1) {
  for (const [name, url] of targets) samplesByName.get(name)?.push(await measureOnce(browser, url));
}
for (const [name, samples] of samplesByName) {
  const [firstSample] = samples;
  if (!firstSample) continue;
  const keys = Object.keys(firstSample) as SampleKey[];
  const row = Object.fromEntries(keys.map((key) => [key, Math.round(median(samples.map((sample) => sample[key])))]));
  console.log(name.padEnd(NAME_COLUMN_WIDTH), JSON.stringify(row));
}
await browser.close();
