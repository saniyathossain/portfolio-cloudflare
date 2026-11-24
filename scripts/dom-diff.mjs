import { writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
const [A, B, SELECTOR, OUT] = [process.env.A, process.env.B, process.env.SELECTOR, process.env.OUT];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });

async function normalized(url) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  if (!process.env.ALLOW_MOTION) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForSelector('html.is-ready', { timeout: 15000 }).catch(() => {});
  await sleep(4000);
  for (const clickSelector of (process.env.CLICK || '').split('|').filter(Boolean)) {
    const target = await page.$(clickSelector);
    if (!target) throw new Error(`CLICK target not found: ${clickSelector}`);
    await target.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await sleep(500);
    await target.click();
    await sleep(1800);
  }
  const html = await page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) return `MISSING ${selector}`;
    const clone = root.cloneNode(true);
    clone.querySelectorAll('template, script[type="text/html"]').forEach((node) => node.remove());
    // React islands are wrapped in <astro-island> (display: contents) — transparent to layout, so unwrap it.
    for (const island of [...clone.querySelectorAll('astro-island')]) island.replaceWith(...island.childNodes);
    // The first island injects Astro's hydration runtime (<style>/<script>) next to it — not page content.
    clone.querySelectorAll('script, style').forEach((node) => node.remove());
    const volatileClass = /^(is-[a-z-]+|in-view|revealed)$/;
    for (const el of [clone, ...clone.querySelectorAll('*')]) {
      for (const attr of [...el.attributes]) {
        const name = attr.name;
        if (name.startsWith('x-') || name.startsWith(':') || name.startsWith('@') || name === 'style' || name.startsWith('data-tenure') || name === 'data-copyright-template') el.removeAttribute(name);
      }
      if (el.classList.length) {
        const kept = [...el.classList].filter((c) => !volatileClass.test(c));
        if (kept.length) el.setAttribute('class', kept.join(' ')); else el.removeAttribute('class');
      }
    }
    const lines = [];
    (function walk(node, depth) {
      if (node.nodeType === 3) { const t = node.textContent.replace(/\s+/g, ' ').trim(); if (t) lines.push('  '.repeat(depth) + JSON.stringify(t)); return; }
      if (node.nodeType !== 1) return;
      const attrs = [...node.attributes].sort((p, q) => p.name.localeCompare(q.name)).map((a) => `${a.name}="${a.value.length > 90 ? a.value.slice(0, 90) + '…' : a.value}"`).join(' ');
      lines.push(`${'  '.repeat(depth)}<${node.tagName.toLowerCase()}${attrs ? ' ' + attrs : ''}>`);
      node.childNodes.forEach((child) => walk(child, depth + 1));
    })(clone, 0);
    return lines.join('\n');
  }, SELECTOR);
  await page.close();
  return html;
}
const [before, after] = [await normalized(A), await normalized(B)];
writeFileSync(`${OUT}.before.txt`, before + '\n');
writeFileSync(`${OUT}.after.txt`, after + '\n');
await browser.close();
console.log(before === after ? `IDENTICAL (${before.split('\n').length} lines)` : 'DIFFERENT');
