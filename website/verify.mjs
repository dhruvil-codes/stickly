import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pages } from './content.mjs';

const url = process.argv[2] || 'http://127.0.0.1:4317/stickly/';
const output = resolve('artifacts/website-qa');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const errors = [], failed = [], result = [];
try {
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(String(error)));
    page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(url)) failed.push(`${r.status()} ${r.url()}`); });
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.evaluate(() => document.fonts.check('400 17px Inter')), `${width}: Inter loaded`);
    assert.ok((await page.locator('.hero-copy>p').first().evaluate(p => getComputedStyle(p).fontFamily)).startsWith('Inter'), `${width}: supporting copy uses Inter`);
    assert.equal(await page.title(), 'Stickly — Handwritten sticky notes for Windows');
    assert.ok(await page.locator('.hero .button').isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: horizontal overflow`);
    await page.screenshot({ path: resolve(output, `home-${width}.png`) });
    for (const section of await page.locator('main>section').all()) {
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(950);
    }
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: resolve(output, `home-full-${width}.png`), fullPage: true });
    result.push(`${width}px: no horizontal overflow, font loaded, download visible`);
    if (width === 1440) {
      await page.getByRole('button', { name: 'The real Windows app' }).click();
      await page.waitForFunction(() => document.querySelector('#product-video source').src.endsWith('native-desktop-demo.mp4'));
      assert.equal(await page.locator('#product-video track').count(), 0);
      await page.getByRole('button', { name: 'The 30-second hello' }).click();
      assert.equal(await page.locator('#product-video track').count(), 1);
      await page.locator('#questions summary').nth(3).click();
      assert.equal(await page.locator('#questions details[open]').count(), 1);
      await page.locator('#try-note').click();
      const frame = page.frameLocator('#sample-desk iframe');
      await frame.locator('.note-title').waitFor();
      assert.ok((await frame.locator('.note-body').evaluate(p => getComputedStyle(p).fontFamily)).includes('Shantell'), 'The actual note keeps its handwriting');
      await frame.locator('.note-body').fill('A good idea from the website.');
      await frame.getByRole('button', { name: 'Expand controls' }).click();
      await frame.getByRole('button', { name: 'Paper color', exact: true }).click();
      await frame.getByRole('radio', { name: 'Mint green' }).click();
      await frame.locator('.note-content').click({ position: { x: 20, y: 200 } });
      assert.equal(await frame.getByRole('radiogroup', { name: 'Paper color' }).count(), 0);
      const handle = frame.getByRole('button', { name: 'Peel left corner' });
      const bounds = await handle.boundingBox();
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.mouse.down();
      await page.mouse.move(bounds.x + 110, bounds.y - 110, { steps: 30 });
      await page.screenshot({ path: resolve(output, 'sample-half-peel.png') });
      const progress = Number(await frame.locator('.paper-shell').getAttribute('data-peel-progress'));
      console.log('Partial peel progress:', progress);
      assert.ok(progress > .1 && progress < 1, 'Peel responds to partial drag');
      await page.mouse.up();
      await frame.locator('[data-peel-state="flat"]').waitFor();
      const b = await handle.boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + 330, b.y - 330, { steps: 65 });
      await page.mouse.up();
      await frame.locator('[data-peel-state="carrying"]').waitFor();
      const desk = await page.locator('#sample-desk iframe').boundingBox();
      await page.mouse.click(desk.x + desk.width / 2, desk.y + 270);
      await frame.locator('[data-peel-state="flat"]').waitFor();
      await page.locator('#reset-note').click();
      await page.frameLocator('#sample-desk iframe').locator('.note-body').waitFor();
      await page.waitForTimeout(150);
      assert.ok((await page.frameLocator('#sample-desk iframe').locator('.note-body').inputValue()).includes('Save the good idea'));
      result.push('Interactive sample: edit, palette, click-away dismissal, partial peel, full carry, click-to-place, reset passed');
      result.push('Video switching and native FAQ accordion passed');
    }
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(url);
  await page.locator('#peel').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#peel-video').evaluate(v => v.paused), true, 'Reduced motion disables automatic loop');
  for (const route of pages.map(p => p.path).filter(Boolean)) {
    await page.goto(url + route);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: mobile overflow`);
    assert.equal(await page.locator('h1').count(), 1);
    const longHeadings = await page.locator('h1,h2,h3').evaluateAll(headings => headings.filter(h => h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight) > 2.1).map(h => h.textContent));
    assert.deepEqual(longHeadings, [], `${route}: headings fit two lines`);
    await page.screenshot({ path: resolve(output, `${route.replaceAll('/', '-')}mobile.png`), fullPage: true });
  }
  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of pages.map(p => p.path).filter(Boolean)) {
      await page.goto(url + route);
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} at ${width}px: overflow`);
      const long = await page.locator('h1,h2,h3').evaluateAll(headings => headings.filter(h => h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight) > 2.1).map(h => h.textContent));
      assert.deepEqual(long, [], `${route} at ${width}px: headings fit two lines`);
      if (width === 1440 && route === 'guides/') await page.screenshot({ path: resolve(output, 'guides-desktop.png'), fullPage: true });
    }
  }
  await context.close();
  assert.deepEqual(errors, [], 'No browser JS errors');
  assert.deepEqual(failed, [], 'No local HTTP errors');
  result.push('Reduced motion and all seven support/guide pages on mobile passed. No JS or HTTP errors.');
  await writeFile(resolve(output, 'results.json'), JSON.stringify(result, null, 2));
  console.log(result.join('\n'));
} finally { await browser.close(); }
