/**
 * Real-time frames of the pill hover reveal, via a Chrome screencast (frames carry their own timestamps).
 * Hover a pill from well outside the row, record ~900 ms, then write the frame closest to each target time,
 * cropped around the pill: <OUT>_<ms>.png
 *   BASE=http://127.0.0.1:8803/ OUT=/tmp/pill node scripts/pill-frames.mjs
 */
import { writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE;
const OUT = process.env.OUT ?? "/tmp/pill";
const TARGET_TIMES_MS = [0, 60, 120, 200, 320, 520];
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 700, deviceScaleFactor: 2 });
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(3000);

const target = (await page.$$(".skills-flat__pill"))[6];
await target.evaluate((element) => element.scrollIntoView({ block: "center" }));
await sleep(1800);
const box = await target.boundingBox();
const centerX = box.x + box.width / 2;
const centerY = box.y + box.height / 2;
await page.mouse.move(centerX, centerY - 220);
await sleep(400);

const client = await page.createCDPSession();
const frames = [];
client.on("Page.screencastFrame", (frame) => {
  frames.push({ time: frame.metadata.timestamp * 1000, data: frame.data });
  void client.send("Page.screencastFrameAck", { sessionId: frame.sessionId });
});
await client.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
await sleep(150);
const hoverStartedAt = Date.now();
await page.mouse.move(centerX, centerY, { steps: 3 });
await sleep(1000);
await client.send("Page.stopScreencast");

if (frames.length < 3) throw new Error(`only ${frames.length} screencast frames captured`);
const firstChangeIndex = Math.max(0, frames.findIndex((frame) => frame.time >= frames[0].time + 150) - 1);
const origin = frames[firstChangeIndex].time;
for (const targetTime of TARGET_TIMES_MS) {
  const closest = frames.reduce((best, frame) => (Math.abs(frame.time - origin - targetTime) < Math.abs(best.time - origin - targetTime) ? frame : best));
  writeFileSync(`${OUT}_${String(targetTime).padStart(3, "0")}.png`, Buffer.from(closest.data, "base64"));
}
console.log(`frames=${frames.length} hoverAt=${Date.now() - hoverStartedAt}ms crop=${Math.round(box.x - 130)},${Math.round(box.y - 30)} ${Math.round(420)}x${Math.round(box.height + 60)}`);
await browser.close();
