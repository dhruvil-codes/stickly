import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { startServer } from './serve.mjs';
import { examples, note, data } from './fixtures.mjs';

const root = resolve(import.meta.dirname, '../..');
const shots = resolve(root, 'docs/images');
const media = resolve(root, 'docs/media');
const raw = resolve(root, 'artifacts/media-capture');
await Promise.all([shots, media, raw].map(path => mkdir(path, { recursive: true })));
const server = await startServer();
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const executablePath = process.env.STICKLY_BROWSER_EXECUTABLE ?? (existsSync(edge) ? edge : undefined);
const browser = await chromium.launch({ headless: true, executablePath, args: ['--renderer-process-limit=1', '--disable-gpu', '--js-flags=--max-old-space-size=96 --max-semi-space-size=4'] });
async function seed(context, fixture, expanded = false) {
 await context.addInitScript(({ fixture, expanded }) => {
  localStorage.setItem('stickly:data:v1', JSON.stringify(fixture));
  localStorage.setItem('stickly:toolbar-expanded', String(expanded));
 }, { fixture, expanded });
}
async function ready(page) {
 await page.goto(server.url);
 await expect(page.locator('.stickly')).toBeVisible();
 await page.evaluate(() => document.fonts.ready);
}
async function shot(name, fixture, { width = 320, height = 320, expanded = false, action } = {}) {
 const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
 try {
  await seed(context, fixture, expanded);
  const page = await context.newPage(); await ready(page);
  if (action) { await action(page); await page.waitForTimeout(600); }
  await page.evaluate(() => document.activeElement?.blur());
  await page.screenshot({ path: resolve(shots, name + '.png'), omitBackground: true, caret: 'hide' });
  if (!name.startsWith('peel')) {
   const overflow = await page.locator('.stickly').evaluate(el => el.scrollWidth > el.clientWidth);
   if (overflow) throw new Error(`Horizontal overflow in ${name}`);
  }
 } finally { await context.close(); }
}
async function captureStills() {
 await shot('plain-note', examples.plain);
 await shot('checklist', examples.checklist);
 await shot('pinned', { ...examples.plain, alwaysOnTop: true }, { expanded: true });
 await shot('paper-colors', examples.palette, { expanded: true, action: page => page.getByRole('button', { name: 'Paper color', exact: true }).click() });
 await shot('charcoal', examples.charcoal);
 await shot('history', examples.history, { height: 440, expanded: true, action: page => page.getByRole('button', { name: 'History and archive' }).click() });
 await shot('peel', examples.peel, { action: async page => {
  const b = await page.getByRole('button', { name: 'Peel left corner' }).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(80, 270, { steps: 16 });
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'peeling');
 } });
 await shot('compact', data(note({ title: 'Just enough', body: 'A small note.\nA little headspace.', fontSize: 's', color: 'mint' })), { width: 240, height: 200 });
 await shot('text-size', examples.plain, { expanded: true, action: page => page.getByRole('button', { name: 'Text size', exact: true }).click() });
 const context = await browser.newContext();
 try {
  const page = await context.newPage();
  for (const [name, width, height, format] of [['social-preview',1280,640,'social'],['social-square',1080,1080,'square'],['launch-poster',1280,720,'poster']]) {
   await page.setViewportSize({ width, height });
   await page.goto(server.url + '/launch/artwork.html?format=' + format);
   await page.evaluate(() => document.fonts.ready);
   await page.screenshot({ path: resolve(media, name + '.png') });
  }
 } finally { await context.close(); }
 console.log('Captured nine clean product screenshots and three launch artwork formats.');
}
async function recordPeelDemo() {
 const viewport={width:960,height:720};
 const context=await browser.newContext({viewport,recordVideo:{dir:raw,size:viewport}});
 try {
  await seed(context,data(note({title:'Your next good idea',body:'Keep it where you can see it.\nBring it along when you move.',fontSize:'l'})),false);
  const page=await context.newPage(); await ready(page);
  await page.addStyleTag({content:"body{background:#f2f0e6!important}#root{position:absolute;left:280px;top:165px;width:380px;height:380px;overflow:visible;filter:drop-shadow(0 20px 22px #34462b26)}input,textarea{caret-color:transparent}.demo-pointer{position:fixed;width:18px;height:26px;left:-40px;top:-40px;z-index:99999;pointer-events:none;filter:drop-shadow(0 2px 2px #0003)}"});
  await page.evaluate(()=>{document.activeElement?.blur();const p=document.createElement('div');p.className='demo-pointer';p.innerHTML='<svg viewBox="0 0 22 28"><path d="M3 2v21l6-5 5 8 4-2-5-8h8Z" fill="#354831" stroke="#fffef4" stroke-width="1.5" stroke-linejoin="round"/></svg>';document.body.append(p);document.addEventListener('pointermove',e=>{p.style.left=e.clientX+'px';p.style.top=e.clientY+'px'},true)});
  await page.evaluate(()=>document.fonts.ready);
  const started=Date.now();
  const at=async t=>{const left=t*1000-(Date.now()-started);if(left>0)await page.waitForTimeout(left)};
  const move=async(a,b,seconds)=>{for(let i=1,n=Math.round(seconds*30);i<=n;i++){await page.mouse.move(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n);await page.waitForTimeout(seconds*1000/n)}};
  const box=await page.getByRole('button',{name:'Peel left corner'}).boundingBox();
  const a={x:box.x+box.width/2,y:box.y+box.height/2},m={x:a.x+125,y:a.y-85},b={x:a.x+420,y:a.y-300};
  await at(.4);await page.mouse.move(a.x,a.y);await page.mouse.down();await move(a,m,.8);await page.waitForTimeout(220);await move(m,b,1.25);
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state','carrying');await page.waitForTimeout(200);await page.mouse.up();
  const held=await page.locator('.stickly').boundingBox();const target={x:b.x+330-held.x,y:b.y+170-held.y};
  await move(b,target,.8);await page.waitForTimeout(280);await page.mouse.click(target.x,target.y);await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state','flat');
  await at(7.2);const video=await page.video().path();await context.close();await writeFile(resolve(raw,'peel-demo.json'),JSON.stringify({video:relative(root,video),tailSeconds:7.2},null,2));console.log('Captured the clean, real Stickly peel-and-place demo.');
 }catch(e){await context.close();throw e}
}
try {
 if (process.argv.includes('--peel-demo')) await recordPeelDemo();
 else if (process.argv.includes('--stills')) await captureStills();
 else await captureStills();
} finally { await browser.close(); await server.close(); }
