// Run against a locally launched debug app with WebView2 remote debugging enabled.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const endpoint = process.env.STICKLY_CDP_URL ?? 'http://127.0.0.1:9223';
await expect.poll(async () => {
  try { return (await fetch(`${endpoint}/json/version`)).ok; } catch { return false; }
}, { timeout: 15000 }).toBe(true);
const browser = await chromium.connectOverCDP(endpoint);
let page;
await expect.poll(() => {
  page = browser.contexts().flatMap(c => c.pages()).find(p => /localhost:1420|tauri.localhost/.test(p.url()));
  return !!page;
}, { timeout: 15000, message: 'Waiting for the Stickly WebView to finish starting' }).toBe(true);
const invoke = (command, args = {}) => page.evaluate(({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args), { command, args });
await expect(page.getByLabel('Note title')).toBeVisible();
assert.equal(await page.evaluate(() => !!window.__TAURI_INTERNALS__), true);
const original = await invoke('load_data');
const position = await invoke('plugin:window|outer_position', { label: 'main' });
const scale = await invoke('plugin:window|scale_factor', { label: 'main' });
const size = await invoke('plugin:window|inner_size', { label: 'main' });
const toolbarPreference = await page.evaluate(() => localStorage.getItem('stickly:toolbar-expanded'));
await mkdir('artifacts/native-cursor', { recursive: true });
await writeFile('artifacts/native-cursor/smoke-baseline.json', JSON.stringify({ data: original, size, position }, null, 2));
try {
  if (await page.getByRole('button', { name: 'Expand controls' }).isVisible()) await page.getByRole('button', { name: 'Expand controls' }).click();
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.getByLabel('Note title').fill('Native Windows smoke test');
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.getByLabel('Note text').fill('A plain note.\nWith room for another thought.');
  await page.getByLabel('Note text').press('Control+b');
  await page.getByRole('button', { name: 'Add a task', exact: true }).click();
  const task = page.getByRole('textbox', { name: 'Task 1', exact: true });
  await task.fill('Local file persistence works');
  await task.press('Control+b');
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Paper color', exact: true }).click();
  await page.getByRole('radio', { name: 'Mint green', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect.poll(async () => {
    const d = await invoke('load_data');
    const n = d.notes.find(n => n.id === d.activeNoteId);
    return [n.title, n.body, n.bodyBold, n.color, n.tasks[0]?.text, n.tasks[0]?.bold, n.tasks[0]?.completed];
  }).toEqual(['Native Windows smoke test', 'A plain note.\nWith room for another thought.', true, 'mint', 'Local file persistence works', true, true]);

  await page.getByRole('button', { name: original.alwaysOnTop ? 'Unpin from top' : 'Pin always on top' }).click();
  assert.equal(await invoke('plugin:window|is_always_on_top', { label: 'main' }), !original.alwaysOnTop);
  await page.getByRole('button', { name: 'History and archive' }).click();
  await page.getByRole('button', { name: 'Restore Local file persistence works', exact: true }).click();
  await page.getByRole('button', { name: 'Archive this note' }).click();
  await page.getByRole('button', { name: 'History and archive' }).click();
  await page.getByRole('button', { name: 'Restore note Native Windows smoke test', exact: true }).click();
  await expect(page.getByLabel('Note title')).toHaveValue('Native Windows smoke test');
  await expect(page.getByLabel('Note text')).toHaveValue('A plain note.\nWith room for another thought.');

  const logo = page.getByRole('button', { name: 'Move Stickly', exact: true });
  await logo.focus(); await logo.press('ArrowRight');
  await expect.poll(async () => (await invoke('plugin:window|outer_position', { label: 'main' })).x).toBe(position.x + Math.round(10 * scale));
  await logo.press('ArrowLeft');
  await expect.poll(async () => (await invoke('plugin:window|outer_position', { label: 'main' })).x).toBe(position.x);

  const editor = await page.locator('.editor-scroll').boundingBox();
  await page.mouse.move(editor.x + 8, editor.y + editor.height - 16); await page.mouse.down();
  await expect(page.locator('.stickly')).toHaveAttribute('data-window-gesture', 'moving');
  await page.mouse.move(editor.x + 32, editor.y + editor.height + 2); await page.mouse.up();
  await expect(page.locator('.stickly')).toHaveAttribute('data-window-gesture', 'idle');
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
  await expect.poll(async () => (await invoke('plugin:window|outer_position', { label: 'main' })).x).toBeGreaterThan(position.x);
  const dragged = await invoke('plugin:window|outer_position', { label: 'main' });
  await invoke('move_window_by', { dx: (position.x - dragged.x) / scale, dy: (position.y - dragged.y) / scale });
  await expect.poll(() => invoke('plugin:window|outer_position', { label: 'main' })).toEqual(position);

  await page.getByRole('button', { name: 'Text size', exact: true }).click();
  await page.getByRole('radio', { name: 'Large text', exact: true }).click();
  await page.getByLabel('Note title').click({ position: { x: 8, y: 8 } });
  await expect(page.getByRole('radiogroup', { name: 'Text size' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Note text')).toHaveCSS('font-size', '23px');
  await expect.poll(async () => {
    const data = await invoke('load_data');
    return data.notes.find(note => note.id === data.activeNoteId).fontSize;
  }).toBe('l');

  const corner = page.getByRole('button', { name: 'Peel left corner' });
  await page.evaluate(() => {
    window.peelStages = [];
    const root = document.querySelector('.paper-shell');
    new MutationObserver(() => window.peelStages.push({ state: root.dataset.peelState, front: root.querySelector('clipPath path').getAttribute('d'), extraFold: !!root.querySelector('.paper-lifted-front') })).observe(root, { attributes: true, attributeFilter: ['data-peel-state'] });
  });
  await corner.focus(); await corner.press('Space');
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'carrying');
  assert.ok(await page.evaluate(() => window.peelStages.some(stage => stage.state === 'detaching' && stage.front === '')), 'The entire source must peel clear before cursor carry begins.');
  assert.ok(await page.evaluate(() => window.peelStages.every(stage => !stage.extraFold)), 'The peel must never create a second folding surface.');
  await expect(page.locator('.paper-presentation')).toHaveCSS('visibility', 'visible');
  await expect(page.locator('.paper-presentation')).toHaveCSS('animation-name', 'none');
  await expect.poll(() => invoke('plugin:window|is_visible', { label: 'main' })).toBe(true);
  assert.equal(await invoke('plugin:window|is_always_on_top', { label: 'main' }), true);
  assert.ok((await page.locator('.peel-layer > g > path').nth(1).getAttribute('d')).includes('Q'));
  assert.ok(await page.locator('clipPath path').first().getAttribute('d'), 'Carrying must preserve the front face instead of turning the whole note over.');
  assert.ok(await page.locator('.peel-layer > g > path').nth(3).getAttribute('d'), 'The curled crease remains visible while carrying.');
  await invoke('cancel_carry');
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
  assert.deepEqual(await invoke('plugin:window|outer_position', { label: 'main' }), position);

  const grip = page.getByRole('button', { name: 'Resize note', exact: true });
  const r = await grip.boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down();
  await expect(page.locator('.stickly')).toHaveAttribute('data-window-gesture', 'resizing');
  await page.mouse.move(r.x + r.width / 2 + 32, r.y + r.height / 2 + 26, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('.stickly')).toHaveAttribute('data-window-gesture', 'idle');
  await expect.poll(async () => (await invoke('plugin:window|inner_size', { label: 'main' })).width).toBeGreaterThanOrEqual(size.width + Math.round(20 * scale));
  assert.deepEqual(await invoke('plugin:window|outer_position', { label: 'main' }), position, 'Resizing must not drag the window.');
  await invoke('plugin:window|set_size', { label: 'main', value: { Physical: size } });
  await expect.poll(() => invoke('plugin:window|inner_size', { label: 'main' })).toEqual(size);

  await grip.focus(); await grip.press('ArrowRight');
  await expect.poll(async () => (await invoke('plugin:window|inner_size', { label: 'main' })).width).toBe(size.width + Math.round(10 * scale));
  await grip.press('ArrowLeft');
  await expect.poll(async () => (await invoke('plugin:window|inner_size', { label: 'main' })).width).toBe(size.width);
  assert.equal(await invoke('plugin:window|is_resizable', { label: 'main' }), true);
  assert.equal(await page.locator('.editor-scroll').evaluate(el => getComputedStyle(el).scrollbarWidth), 'none');
  assert.equal((await page.locator('.paper-shell').boundingBox()).x, 0);
  await page.getByRole('button', { name: 'Delete note', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Delete this note?' }).getByRole('button', { name: 'Delete note', exact: true }).click();
  await expect(page.getByLabel('Note title')).toHaveValue(original.notes.find(n => n.id === original.activeNoteId).title);
  await expect.poll(async () => (await invoke('load_data')).notes.some(note => note.title === 'Native Windows smoke test')).toBe(false);
  console.log('PASS native plain notes + checklists, bold, file persistence, color, pin, archive/restore, logo movement, visible carry/cancel, S/M/L persistence, isolated pointer resizing, note deletion, compact navigation, borderless layout, invisible scrollbars');
 } finally {
  const cleanupErrors = [];
  const cleanup = async action => { try { await action(); } catch (error) { cleanupErrors.push(error); } };
  await cleanup(() => invoke('cancel_carry'));
  await cleanup(() => invoke('plugin:window|set_size', { label: 'main', value: { Physical: size } }));
  await cleanup(() => expect.poll(() => invoke('plugin:window|inner_size', { label: 'main' })).toEqual(size));
  await cleanup(async () => {
    const current = await invoke('plugin:window|outer_position', { label: 'main' });
    await invoke('move_window_by', { dx: (position.x - current.x) / scale, dy: (position.y - current.y) / scale });
  });
  await cleanup(() => invoke('set_pinned', { pinned: original.alwaysOnTop }));
  await cleanup(() => invoke('save_data', { data: original }));
  await cleanup(() => page.evaluate(value => {
    if (value === null) localStorage.removeItem('stickly:toolbar-expanded');
    else localStorage.setItem('stickly:toolbar-expanded', value);
  }, toolbarPreference));
  await cleanup(async () => {
    await page.reload();
    await expect(page.getByLabel('Note title')).toHaveValue(original.notes.find(n => n.id === original.activeNoteId).title);
  });
  await browser.close();
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'Native smoke cleanup failed; original data is in artifacts/native-cursor/smoke-baseline.json');
}
