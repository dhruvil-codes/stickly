import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'vite';
import { examples } from '../scripts/media/fixtures.mjs';
import { pages, guideQuestions } from './content.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const out = resolve(here, 'dist');
export const base = '/stickly/';
export const origin = 'https://dhruvil-codes.github.io';
export const site = origin + base;
export const download = 'https://github.com/dhruvil-codes/stickly/releases/latest/download/Stickly-Setup.exe';

const faqs = [
  ['Does Stickly work offline?', 'Yes. Everyday note taking works offline, with no account or application server. Setup may need internet to install Microsoft WebView2 if your PC does not already have it.'],
  ['Is Stickly free to download?', 'Yes. The Windows preview is free to download and use. There is no subscription or sign-in.'],
  ['Which computers can run it?', 'The current download is for Windows x64. macOS and Linux versions are not distributed or verified. This is an unsigned early preview.'],
  ['Where do my notes go?', 'The desktop app saves notes, tasks and settings in %APPDATA%\\stickly\\data.json on your PC. A previous-save backup sits beside it. These JSON files are not encrypted, and there is no cloud sync.'],
  ['Can I just write, without a to-do list?', 'Absolutely. Start with a plain note, then add checklist items only when you want them. You can have both on the same page.'],
  ['Can I have more than one note?', 'Yes. Use New note and the small page arrows to switch between notes in one desktop window. Separate note windows are not available yet.'],
  ['Can I keep a sticky note always on top?', 'Yes. Expand the Stickly toolbar and select the pin to keep its window above other windows. Alt+N shows or hides the app. All your notes share that one window.'],
  ['Are reminders available?', 'Not yet. Reminders and a daily focus list are planned directions, rather than features in the current download.'],
];

const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const arrow = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>';
const diagonal = '<svg class="inline-arrow" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19 19 5M6 5h13v13"/></svg>';
const cta = `<a class="button" href="${download}">${arrow} Download for Windows</a>`;
const nav = `<a class="skip-link" href="#main">Skip to content</a><header class="site-header frame"><a class="brand" href="${base}" aria-label="Stickly home"><img src="${base}assets/stickly.svg" width="30" height="32" alt=""><span>stickly</span></a><nav aria-label="Main navigation"><a href="${base}#features">Features</a><a href="${base}#watch">Demo</a><a href="${base}guides/">Guides</a><a href="https://github.com/dhruvil-codes/stickly">GitHub</a></nav><a class="nav-download" href="${download}">Get Stickly ${arrow}</a></header>`;
const footer = `<footer class="site-footer frame"><div class="footer-top"><p>Made for the small things<br>that take up your whole brain.</p><nav aria-label="More about Stickly"><a href="${base}features/">All features</a><a href="${base}guides/">Sticky note guides</a><a href="${base}download/">Installation</a><a href="${base}privacy/">Privacy &amp; storage</a><a href="https://github.com/dhruvil-codes/stickly/issues">Feedback</a></nav><p class="footer-maker">Made by <a href="https://github.com/dhruvil-codes">Dhruvil Mistry</a>.<br>Windows preview · Free to download.</p></div><div class="footer-bottom"><a href="${base}" class="footer-wordmark" aria-label="Stickly home">stickly</a><p>Keep a little<br>headspace.</p><a class="footer-github" href="https://github.com/dhruvil-codes/stickly">Peek at the source <span aria-hidden="true">↗</span></a></div></footer>`;

function schema(page) {
  const graph = [
    { '@type': 'WebSite', '@id': site + '#website', name: 'Stickly', url: site, inLanguage: 'en' },
    { '@type': 'SoftwareApplication', '@id': site + '#app', name: 'Stickly', url: site, description: 'A Windows desktop sticky note app with handwritten plain notes, optional checklists, seven paper colors, a corner-peel interaction, and offline local storage.', operatingSystem: 'Windows x64', applicationCategory: 'ProductivityApplication', softwareVersion: '0.1.0', downloadUrl: download, screenshot: site + 'assets/plain-note.png', image: site + 'assets/social-preview.png', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, author: { '@type': 'Person', name: 'Dhruvil Mistry', url: 'https://github.com/dhruvil-codes' }, featureList: ['Handwritten plain notes and optional checklists', 'Seven paper colors and three text sizes', 'Cursor-controlled corner peel and click-to-place', 'Always-on-top pin and Alt+N shortcut', 'Archive and restore', 'Offline storage on your Windows PC'] },
    { '@type': 'WebPage', '@id': site + page.path, url: site + page.path, name: page.title, description: page.description, isPartOf: { '@id': site + '#website' }, about: { '@id': site + '#app' }, inLanguage: 'en' },
  ];
  if (!page.path || page.path === 'guides/') graph.push({ '@type': 'FAQPage', '@id': site + page.path + '#questions', mainEntity: (!page.path ? faqs : guideQuestions).map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) });
  if (page.path) {
    const crumbs = [{ name: 'Stickly', item: site }];
    if (page.article) crumbs.push({ name: 'Guides', item: site + 'guides/' });
    crumbs.push({ name: page.label, item: site + page.path });
    graph.push({ '@type': 'BreadcrumbList', itemListElement: crumbs.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, ...crumb })) });
  }
  if (page.article) graph.push({ '@type': 'Article', headline: page.title, description: page.description, mainEntityOfPage: { '@id': site + page.path }, image: site + 'assets/' + page.image, datePublished: page.updated, dateModified: page.updated, author: { '@type': 'Person', name: 'Dhruvil Mistry', url: 'https://github.com/dhruvil-codes' }, publisher: { '@type': 'Organization', name: 'Stickly', url: site }, inLanguage: 'en' });
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c');
}

await mkdir(out, { recursive: true });
// The website has its own output directory; never clear the desktop app's dist.
for (const p of pages) await mkdir(resolve(out, p.path), { recursive: true });
await mkdir(resolve(out, 'assets'), { recursive: true });
const assetSources = [
  ...['plain-note', 'checklist', 'paper-colors', 'charcoal', 'history', 'peel', 'compact', 'text-size', 'pinned'].map(n => [`docs/images/${n}.png`, `${n}.png`]),
  ...['social-preview.png', 'launch-poster.png', 'stickly-launch.mp4', 'native-desktop-demo.mp4', 'native-demo-poster.png', 'launch-captions.vtt'].map(n => [`docs/media/${n}`, n]),
  ['docs/media/source/peel-demo.mp4', 'peel-demo.mp4'],
  ['public/stickly.svg', 'stickly.svg'],
  ['src/assets/fonts/ShantellSans-Bold.ttf', 'ShantellSans-Bold.ttf'],
  ['src/assets/fonts/ShantellSans-OFL.txt', 'ShantellSans-OFL.txt'],
  ['website/assets/fonts/InterVariable.woff2', 'InterVariable.woff2'],
  ['website/assets/fonts/Inter-OFL.txt', 'Inter-OFL.txt'],
];
await Promise.all(assetSources.map(([src, dest]) => cp(resolve(root, src), resolve(out, 'assets', dest))));
await Promise.all(['site.css', 'site.js'].map(n => cp(resolve(here, n), resolve(out, 'assets', n))));
const assetVersion = createHash('sha256').update(await readFile(resolve(here, 'site.css'))).update(await readFile(resolve(here, 'site.js'))).digest('hex').slice(0, 12);

for (const p of pages) {
  const content = (await readFile(resolve(here, 'pages', p.file), 'utf8'))
    .replaceAll('{{BASE}}', base).replaceAll('{{CTA}}', cta).replaceAll('{{DOWNLOAD}}', download)
    .replaceAll('{{FAQ}}', faqs.map(([q, a], i) => `<details class="answer-card" name="questions"${i === 0 ? ' open' : ''}><summary>${esc(q)}<span aria-hidden="true">+</span></summary><p>${esc(a)}</p></details>`).join('\n'))
    .replaceAll('{{GUIDE_FAQ}}', guideQuestions.map(([q, a]) => `<div><dt>${esc(q)}</dt><dd>${esc(a)}</dd></div>`).join('\n'));
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.title)}</title><meta name="description" content="${esc(p.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#f4f3e9"><link rel="canonical" href="${site + p.path}"><link rel="icon" type="image/svg+xml" href="${base}assets/stickly.svg"><link rel="preload" href="${base}assets/ShantellSans-Bold.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="${base}assets/site.css"><meta property="og:type" content="website"><meta property="og:site_name" content="Stickly"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="${site + p.path}"><meta property="og:image" content="${site}assets/social-preview.png"><meta property="og:image:width" content="1280"><meta property="og:image:height" content="640"><meta property="og:image:alt" content="A yellow Stickly note with the words Good ideas stick."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.title)}"><meta name="twitter:description" content="${esc(p.description)}"><meta name="twitter:image" content="${site}assets/social-preview.png"><script type="application/ld+json">${schema(p)}</script><script src="${base}assets/site.js" defer></script></head><body>${nav}<main id="main">${content}</main>${footer}</body></html>`;
  const rendered = html.replace('<link rel="stylesheet"', `<link rel="preload" href="${base}assets/InterVariable.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet"`)
    .replace('<meta name="theme-color" content="#f4f3e9">', '<meta name="theme-color" content="#fafbf7">')
    .replace('<meta property="og:type" content="website">', `<meta property="og:type" content="${p.article ? 'article' : 'website'}">`)
    .replace(`href="${base}assets/site.css"`, `href="${base}assets/site.css?v=${assetVersion}"`)
    .replace(`src="${base}assets/site.js"`, `src="${base}assets/site.js?v=${assetVersion}"`);
  await writeFile(resolve(out, p.path, 'index.html'), rendered.replaceAll('&#8599;&#65038;', diagonal).replaceAll('↗', diagonal).replaceAll('↘', diagonal.replace('inline-arrow', 'inline-arrow arrow-down')));
}

await build({
  configFile: resolve(root, 'vite.config.ts'), root,
  base: base + 'play/', publicDir: false,
  plugins: [{ name: 'stickly-website-sample', enforce: 'pre',
    transform(code, id) { if (id.endsWith('/src/App.tsx')) return code.replace('src="/stickly.svg"', `src="${base}assets/stickly.svg"`); },
    transformIndexHtml: { order: 'pre', handler(html) {
      return html.replace('<head>', `<head><meta name="robots" content="noindex,nofollow"><style>html,body{background:transparent!important}html body #root{position:absolute;left:50%;top:70px;width:min(320px,calc(100vw - 48px));height:320px;transform:translateX(-50%);overflow:visible}.stickly{overflow:visible!important}.note-layout{overflow:hidden}.resize-handle{display:none!important}.paper-shell:not(.flat) .paper-front{pointer-events:none}</style><script>try{if(new URLSearchParams(location.search).has('reset')){localStorage.removeItem('stickly:data:v1')}if(!localStorage.getItem('stickly:data:v1'))localStorage.setItem('stickly:data:v1',${JSON.stringify(JSON.stringify(examples.plain))});localStorage.setItem('stickly:toolbar-expanded','false')}catch{}<\/script>`).replace('<title>Stickly | Offline sticky notes for Windows</title>', '<title>Try a sample Stickly note</title>').replace('href="/stickly.svg"', `href="${base}assets/stickly.svg"`);
    } },
  }],
  build: { outDir: resolve(out, 'play'), emptyOutDir: true },
});
await writeFile(resolve(out, '.nojekyll'), '');
await writeFile(resolve(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(p => `<url><loc>${site + p.path}</loc>${p.updated ? `<lastmod>${p.updated}</lastmod>` : ''}</url>`).join('')}</urlset>\n`);
await writeFile(resolve(out, 'robots.txt'), `# Project Pages cannot control the host-root robots.txt.\nUser-agent: *\nAllow: /stickly/\nSitemap: ${site}sitemap.xml\n`);
await writeFile(resolve(out, 'llms.txt'), `# Stickly\n\n> Stickly is a Windows desktop sticky note app for handwritten plain notes and optional checklists. It works offline and saves notes locally.\n\n- [Product and FAQ](${site}): Real demos, current features and common questions.\n- [Features](${site}features/): Corner peel, paper colors, pinning, archive, and shortcuts.\n- [Download and installation](${site}download/): Free Windows x64 setup, updates and known installation limits.\n- [Privacy and storage](${site}privacy/): Local JSON storage, backups, no cloud sync, unencrypted files.\n- [Source repository](https://github.com/dhruvil-codes/stickly): Public source; a project-wide source license has not been selected.\n\n## Guides\n\n${pages.filter(p => p.path.startsWith("guides/")).map(p => `- [${p.label}](${site + p.path}): ${p.description}`).join("\n")}\n\n## Current release\n\nVersion 0.1.0. Windows x64 only. Unsigned early preview. Free download, no account or subscription. All notes share one window with page navigation. Reminders, separate note windows, sync and automatic updates are not available. The browser sample is separate from desktop notes and does not support native window controls.\n\nThis optional index is a concise reference, not a guarantee of search indexing or AI citations.\n`);
await writeFile(resolve(out, '404.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>That note wandered off — Stickly</title><link rel="stylesheet" href="${base}assets/site.css"></head><body>${nav}<main id="main" class="article frame"><h1>That note wandered off.</h1><p>There is no page at this address.</p><a class="button" href="${base}">Back to Stickly</a></main>${footer}</body></html>`);
console.log(`Built Stickly website for ${site}`);
