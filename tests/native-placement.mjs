// Interactive native hook check: issue carry, follow, place, quit on stdin.
// Middle-click then left-click the owned test button with an OS input driver.
import { chromium, expect } from '@playwright/test';
import { createInterface } from 'node:readline';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('artifacts/native-visible-carry', { recursive: true });
const appBrowser = await chromium.connectOverCDP(process.env.STICKLY_CDP_URL ?? 'http://127.0.0.1:9223');
const app = appBrowser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('tauri.localhost'));
const invoke = (command, args = {}) => app.evaluate(({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args), { command, args });
const original = await invoke('plugin:window|outer_position', { label: 'main' });
const scale = await invoke('plugin:window|scale_factor', { label: 'main' });
const targetBrowser = await chromium.launch({ headless: false, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args: ['--window-position=800,200', '--window-size=600,500'] });
const target = await targetBrowser.newPage({ viewport: { width: 600, height: 420 } });
await target.setContent('<title>Stickly placement target</title><style>body{margin:0;display:grid;place-content:center;height:100vh;background:#ecf0ea;font:18px system-ui;text-align:center}button{padding:28px 40px;border:1px solid #9ba69b;border-radius:12px;background:white;font:inherit}p{font-size:14px;color:#526052}</style><button>Place sticker here</button><p>Temporary local test surface</p><script>window.leftClicks=0;document.querySelector("button").onclick=()=>window.leftClicks++;</script>');
let started;
const evidence = {};
const input = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
console.log('READY: owned placement target is open. Commands: carry, follow, place, quit.');
try {
  for await (const command of input) {
    if (command.trim() === 'quit') break;
    if (command.trim() === 'carry') {
      const handle = app.getByRole('button', { name: 'Peel left corner' });
      await handle.focus(); await handle.press('Space');
      await expect(app.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'carrying');
      await expect.poll(() => invoke('plugin:window|is_visible', { label: 'main' })).toBe(true);
      await app.waitForTimeout(80);
      started = await invoke('plugin:window|outer_position', { label: 'main' });
      console.log('CARRYING', started);
    }
    if (command.trim() === 'follow') {
      await expect.poll(async () => {
        const p = await invoke('plugin:window|outer_position', { label: 'main' });
        return Math.hypot(p.x - started.x, p.y - started.y);
      }).toBeGreaterThan(50);
      evidence.follow = await invoke('plugin:window|outer_position', { label: 'main' });
      assert.equal(await invoke('plugin:window|is_visible', { label: 'main' }), true);
      await app.screenshot({ path: 'artifacts/native-visible-carry/following.png' });
      console.log('PASS visible native cursor tracking', evidence.follow);
    }
    if (command.trim() === 'place') {
      await expect(app.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
      assert.equal(await target.evaluate(() => window.leftClicks), 0, 'Placement click must not activate the underlying button.');
      evidence.placed = await invoke('plugin:window|outer_position', { label: 'main' });
      assert.deepEqual(evidence.placed, evidence.follow, 'Placement must keep the visible grip position.');
      await expect.poll(async () => (await invoke('load_data')).windowPosition).toEqual(evidence.placed);
      await app.screenshot({ path: 'artifacts/native-visible-carry/placed.png' });
      await writeFile('artifacts/native-visible-carry/placement-check.json', JSON.stringify(evidence, null, 2));
      console.log('PASS native click-to-place, consumed underlying click, stable grip, and position persistence');
    }
  }
} finally {
  input.close();
  try {
    await invoke('cancel_carry');
    const current = await invoke('plugin:window|outer_position', { label: 'main' });
    await invoke('move_window_by', { dx: (original.x - current.x) / scale, dy: (original.y - current.y) / scale });
    await expect.poll(() => invoke('plugin:window|outer_position', { label: 'main' })).toEqual(original);
  } finally { await targetBrowser.close(); await appBrowser.close(); }
}
