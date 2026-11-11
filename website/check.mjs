import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = resolve(dirname(fileURLToPath(import.meta.url)), 'dist');
const base = '/stickly/';
const site = 'https://dhruvil-codes.github.io/stickly/';
const routes = ['', 'features/', 'download/', 'privacy/'];
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
  for (const [, link] of html.matchAll(/(?:href|src|poster)="([^"]+)"/g)) {
    if (/^https?:/.test(link) || !link.startsWith(base) && !link.startsWith('#')) continue;
    const [pathname, hash] = link.split('#');
    let target = pathname ? resolve(out, pathname.slice(base.length)) : resolve(out, route, 'index.html');
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
console.log(`Checked ${routes.length} static pages, ${checked} local links/assets, JSON-LD, sitemap, and isolated sample metadata.`);
