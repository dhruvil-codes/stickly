import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages, guideQuestions } from './content.mjs';

const out = resolve(dirname(fileURLToPath(import.meta.url)), 'dist');
const base = '/stickly/';
const site = 'https://dhruvil-codes.github.io/stickly/';
const routes = pages.map(p => p.path);
let checked = 0;
for (const route of routes) {
  const html = await readFile(resolve(out, route, 'index.html'), 'utf8');
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${route}: one h1`);
  assert.ok(html.includes(`<link rel="canonical" href="${site + route}">`), `${route}: canonical`);
  assert.ok(!html.includes('{{'), `${route}: no template placeholders`);
  assert.ok(html.includes('name="description"'), `${route}: description`);
  assert.ok(html.includes('property="og:image"'), `${route}: social image`);
  const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  assert.ok(JSON.parse(json[1])['@graph'].some(n => n['@type'] === 'SoftwareApplication'), `${route}: app schema`);
  if (pages.find(p => p.path === route).article) assert.ok(JSON.parse(json[1])['@graph'].some(n => n['@type'] === 'Article'), `${route}: article schema`);
  for (const [, link] of html.matchAll(/(?:href|src|poster)="([^"]+)"/g)) {
    if (/^https?:/.test(link) || !link.startsWith(base) && !link.startsWith('#')) continue;
    const parsed = new URL(link, site + route);
    const pathname = parsed.pathname, hash = parsed.hash.slice(1);
    let target = resolve(out, pathname.slice(base.length));
    const info = await stat(target).catch(() => null);
    assert.ok(info, `${route}: missing target ${link}`);
    if (info.isDirectory()) target = resolve(target, 'index.html');
    if (hash) {
      const text = await readFile(target, 'utf8');
      assert.ok(text.includes(`id="${hash}"`), `${route}: missing anchor ${link}`);
    }
    checked++;
  }
}
const demo = await readFile(resolve(out, 'play/index.html'), 'utf8');
assert.ok(demo.includes('noindex,nofollow'), 'Sample must stay out of search');
assert.ok(demo.includes('A little headspace'), 'Sample has real seeded example content');
const sitemap = await readFile(resolve(out, 'sitemap.xml'), 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, routes.length);
for (const route of routes) assert.ok(sitemap.includes(`<loc>${site + route}</loc>`));
const guides = await readFile(resolve(out, 'guides/index.html'), 'utf8');
const guideSchema = JSON.parse(guides.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'].find(n => n['@type'] === 'FAQPage');
assert.equal(guideSchema.mainEntity.length, guideQuestions.length);
for (const [question] of guideQuestions) assert.ok(guides.includes(`<dt>${question}</dt>`), 'Guide answers must be visible HTML');
assert.equal((await readFile(resolve(out, 'assets/InterVariable.woff2'))).subarray(0, 4).toString(), 'wOF2', 'Inter is a real WOFF2 font');
assert.ok((await readFile(resolve(out, 'assets/Inter-OFL.txt'), 'utf8')).includes('SIL OPEN FONT LICENSE'), 'Bundled font license');
console.log(`Checked ${routes.length} static pages, ${checked} local links/assets, JSON-LD, sitemap, and isolated sample metadata.`);
