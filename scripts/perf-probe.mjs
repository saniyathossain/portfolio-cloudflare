/**
 * Quick, repeatable load-performance probe (a fast proxy for Lighthouse): CPU 4x slowdown + slow-4G-like
 * network, N cold loads, medians of FCP/LCP/script/layout time. Use it to compare two builds served the same way.
 *   URLS="legacy=http://127.0.0.1:8801/,new=http://127.0.0.1:8803/" RUNS=5 node scripts/perf-probe.mjs
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const RUNS = Number(process.env.RUNS ?? 5);
const targets = (process.env.URLS ?? "").split(",").map((entry) => entry.split(/=(.*)/s).slice(0, 2));

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function measureOnce(browser, url) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 412, height: 823, deviceScaleFactor: 2, isMobile: true });
  const client = await page.createCDPSession();
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await client.send("Performance.enable");
  await page.evaluateOnNewDocument(() => {
    window.__vitals = { fcp: 0, lcp: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (entry.name === "first-contentful-paint") window.__vitals.fcp = entry.startTime;
    }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__vitals.lcp = entry.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto(url, { waitUntil: "load" });
  await sleep(3500);
  const metrics = Object.fromEntries((await client.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const vitals = await page.evaluate(() => window.__vitals);
  const htmlBytes = await page.evaluate(() => performance.getEntriesByType("navigation")[0].encodedBodySize);
  await context.close();
  return {
    fcp: vitals.fcp,
    lcp: vitals.lcp,
    script: metrics.ScriptDuration * 1000,
    layout: metrics.LayoutDuration * 1000,
    style: metrics.RecalcStyleDuration * 1000,
    task: metrics.TaskDuration * 1000,
    nodes: metrics.Nodes,
    htmlGz: htmlBytes,
  };
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
// Interleave the targets run by run so machine noise hits every build equally.
const samplesByName = new Map(targets.map(([name]) => [name, []]));
for (let run = 0; run < RUNS; run += 1) {
  for (const [name, url] of targets) samplesByName.get(name).push(await measureOnce(browser, url));
}
for (const [name, samples] of samplesByName) {
  const row = Object.fromEntries(Object.keys(samples[0]).map((key) => [key, Math.round(median(samples.map((s) => s[key])))]));
  console.log(name.padEnd(10), JSON.stringify(row));
}
await browser.close();
