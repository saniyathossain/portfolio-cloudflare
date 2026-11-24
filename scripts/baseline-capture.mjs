import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(`${execSync('npm root -g').toString().trim()}/lighthouse/`);
const puppeteer = require('puppeteer-core');
const BASE = process.env.BASE;
const OUT = process.env.OUT;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const widths = [360, 768, 1024, 1440];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const log = [];

async function fresh(w) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: w < 600 ? 800 : 900, deviceScaleFactor: 1 });
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForSelector('html.is-ready', { timeout: 10000 }).catch(() => {});
  await sleep(1500);
  return { page, errs };
}
const shot = (page, name, full = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
async function tryStep(name, fn) {
  try { await fn(); } catch (e) { log.push(`${name}: ${e.message}`); }
}
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

for (const w of widths) {
  const { page, errs } = await fresh(w);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await sleep(120);
  }
  await sleep(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(600);
  await shot(page, `${w}-full`, true);

  const secs = await page.evaluate(() =>
    [...document.querySelectorAll('main section, footer')].map((s, i) => ({ i, id: s.id || s.getAttribute('aria-label') || s.tagName.toLowerCase() })));
  for (const s of secs) {
    await tryStep(`${w} section ${s.id}`, async () => {
      const els = await page.$$('main section, footer');
      await els[s.i].evaluate((e) => e.scrollIntoView({ block: 'start' }));
      await sleep(900);
      await shot(page, `${w}-sec-${String(s.i).padStart(2, '0')}-${slug(s.id)}`);
    });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);

  await tryStep(`${w} menu`, async () => {
    await page.click('.menu-btn');
    await sleep(1100);
    await shot(page, `${w}-state-menu`);
    await page.click('.menu-btn');
    await sleep(900);
  });
  await tryStep(`${w} modal`, async () => {
    await page.click('.hero .pill-btn-dark');
    await sleep(1100);
    await shot(page, `${w}-state-modal`);
    await page.keyboard.press('Escape');
    await sleep(800);
  });
  await tryStep(`${w} hero card next`, async () => {
    await page.click('.hero-card__arrow');
    await sleep(700);
    await shot(page, `${w}-state-herocard-next`);
  });
  await tryStep(`${w} accordion`, async () => {
    const row = await page.$('.exp-row');
    await row.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await sleep(500);
    await row.click();
    await sleep(900);
    await shot(page, `${w}-state-accordion-open`);
  });
  await tryStep(`${w} skills toggle`, async () => {
    const t = await page.$('.skills-flat__toggle');
    if (!t) return;
    await t.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await sleep(500);
    const visible = await t.evaluate((e) => !!e.offsetParent);
    if (!visible) return;
    await t.click();
    await sleep(900);
    await shot(page, `${w}-state-skills-expanded`);
  });
  await tryStep(`${w} editorial`, async () => {
    const tabs = await page.$$('.editorial-tabs__btn');
    if (tabs.length > 1) {
      await tabs[1].evaluate((e) => e.scrollIntoView({ block: 'center' }));
      await sleep(500);
      await tabs[1].click();
      await sleep(1000);
      await shot(page, `${w}-state-editorial-tab2`);
    }
    const orb = await page.$('.editorial-search__orb--search');
    if (orb) {
      await orb.click();
      await sleep(900);
      await page.keyboard.type('laravel');
      await sleep(900);
      await shot(page, `${w}-state-editorial-search`);
    }
  });
  if (errs.length) log.push(`${w} console errors: ${JSON.stringify(errs)}`);
  await page.close();
}
await browser.close();
console.log(log.join('\n') || 'no step errors');
