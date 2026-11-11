// Run only against an installed Stickly started with a loopback WebView2 CDP port.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const output = process.env.STICKLY_EVIDENCE_DIR ?? 'artifacts/native-productivity';
await mkdir(output, { recursive: true });
const browser = await chromium.connectOverCDP(process.env.STICKLY_CDP_URL ?? 'http://127.0.0.1:9223');
let page;
await expect.poll(() => {
  page = browser.contexts().flatMap(context => context.pages()).find(candidate => /tauri\.localhost|^tauri:/.test(candidate.url()));
  return !!page;
}, { timeout: 15000 }).toBe(true);
const invoke = (command, args = {}) => page.evaluate(({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args), { command, args });
const original = await invoke('load_data');
assert.ok(original?.notes.length, 'Existing notes must be present before testing');
const toolbar = await page.evaluate(() => localStorage.getItem('stickly:toolbar-expanded'));
let testNoteId;
const results = [];
try {
  if (await page.getByRole('button', { name: 'Expand controls' }).isVisible()) await page.getByRole('button', { name: 'Expand controls' }).click();
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await expect.poll(async () => (await invoke('load_data')).activeNoteId).not.toBe(original.activeNoteId);
  testNoteId = (await invoke('load_data')).activeNoteId;
  assert.ok(!original.notes.some(note => note.id === testNoteId));
  await page.getByLabel('Note title').fill('Stickly feature check');
  await page.getByRole('button', { name: 'Add a task', exact: true }).click();
  await page.getByLabel('Task 1', { exact: true }).fill('Reminder smoke test');
  await page.getByRole('button', { name: 'Task 1 options', exact: true }).click();
  await page.getByRole('button', { name: 'Add to Today' }).click();
  await page.getByRole('button', { name: "Today's focus", exact: true }).click();
  await expect(page.getByRole('region', { name: 'Today focus' }).getByLabel('Task 1', { exact: true })).toHaveValue('Reminder smoke test');
  await page.getByRole('button', { name: 'Back to note', exact: true }).click();
  await expect.poll(async () => (await invoke('load_data')).notes.find(note => note.id === testNoteId)?.tasks[0]?.focusDate).toBeTruthy();
  results.push('Today selection and its native JSON save passed.');

  // Schedule a short test through the native storage boundary; the regular UI uses minute precision.
  const saved = await invoke('load_data');
  const task = saved.notes.find(note => note.id === testNoteId).tasks[0];
  task.reminderAt = Date.now() + 2500;
  await invoke('save_data', { data: saved });
  await page.reload();
  const ledgerFile = join(process.env.APPDATA, 'stickly', 'reminders.json');
  await expect.poll(async () => {
    try { return JSON.parse(await readFile(ledgerFile, 'utf8')).announced[task.id]; }
    catch { return null; }
  }, { timeout: 15000, message: 'Native scheduler must enqueue and record this reminder' }).toBe(task.reminderAt);
  await page.getByRole('button', { name: 'Reminders', exact: true }).click();
  await page.getByRole('button', { name: 'Snooze 10 min', exact: true }).click();
  await expect.poll(async () => (await invoke('load_data')).notes.find(note => note.id === testNoteId)?.tasks[0]?.reminderAt ?? 0).toBeGreaterThan(Date.now() + 590_000);
  await expect(page.getByRole('button', { name: 'Snooze 10 min', exact: true })).toHaveCount(0);
  await page.screenshot({ path: join(output, 'native-reminder-snoozed.png') });
  results.push('Native due detection, notification enqueue/ledger, and in-app snooze passed.');
} finally {
  if (testNoteId) {
    const latest = await invoke('load_data');
    latest.notes = latest.notes.filter(note => note.id !== testNoteId);
    if (latest.activeNoteId === testNoteId) latest.activeNoteId = latest.notes.some(note => note.id === original.activeNoteId && !note.archivedAt) ? original.activeNoteId : latest.notes.find(note => !note.archivedAt).id;
    await invoke('save_data', { data: latest });
    await page.evaluate(value => { if (value === null) localStorage.removeItem('stickly:toolbar-expanded'); else localStorage.setItem('stickly:toolbar-expanded', value); }, toolbar);
    await page.reload();
    const restored = await invoke('load_data');
    assert.deepEqual(restored.notes, original.notes, 'Every original note must remain unchanged');
    assert.equal(restored.activeNoteId, original.activeNoteId);
    results.push('Removed only the synthetic test note; all original notes and the active page preserved.');
  }
  await writeFile(join(output, 'results.json'), JSON.stringify({ results, limitation: 'Ledger verifies notification enqueueing, not visual OS delivery; Windows may suppress toasts.' }, null, 2));
  await browser.close();
}
console.log(results.join('\n'));
