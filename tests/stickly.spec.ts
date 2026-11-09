import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }, info) => {
  if (!info.title.includes('collapsed toolbar')) await page.addInitScript(() => localStorage.setItem('stickly:toolbar-expanded', 'true'));
});

test('plain notes are the default, with multiline editing, bold and persistence', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Note title')).toHaveValue('');
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  const body = page.getByLabel('Note text');
  await expect(body).toHaveCSS('font-weight', '700');
  await body.fill('An idea worth keeping.\nA second thought.');
  await body.press('Control+b');
  await expect(body).toHaveCSS('font-weight', '800');
  await expect(page.getByRole('status').filter({ hasText: 'All tucked in' })).toBeVisible();
  await page.reload();
  await expect(body).toHaveValue('An idea worth keeping.\nA second thought.');
  await expect(body).toHaveCSS('font-weight', '800');
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await expect(body).toHaveValue('');
  await expect(body).toHaveCSS('font-weight', '700');
  await expect(body).toBeFocused();
  await page.getByRole('button', { name: 'Previous note' }).click();
  await expect(body).toHaveValue('An idea worth keeping.\nA second thought.');
});

test('optional checklist CRUD, Enter, bold and seven paper colors', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Note text').fill('Keep the paragraph alongside the checklist.');
  await page.getByRole('button', { name: 'Add a task', exact: true }).click();
  const task = page.getByRole('textbox', { name: 'Task 1', exact: true });
  await expect(task).toHaveCSS('font-weight', '700');
  await expect(task).toBeFocused(); await task.fill('Build something lovely'); await task.press('Control+b');
  await expect(task).toHaveCSS('font-weight', '800');
  await task.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Task 2', exact: true })).toBeFocused();
  await page.getByRole('textbox', { name: 'Task 2', exact: true }).press('Backspace');
  await page.getByRole('checkbox').click();
  await expect(page.getByRole('checkbox')).toBeChecked();
  await expect(page.getByRole('status').filter({ hasText: 'All tucked in' })).toBeVisible();
  await page.reload();
  await expect(task).toHaveValue('Build something lovely');
  await expect(page.getByLabel('Note text')).toHaveValue('Keep the paragraph alongside the checklist.');
  await page.getByRole('button', { name: 'Paper color', exact: true }).click();
  for (const name of ['Pastel peach', 'Blush pink', 'Mint green', 'Sky blue', 'Lavender', 'Charcoal', 'Classic yellow']) {
    await page.getByRole('radio', { name, exact: true }).click();
    await expect(page.getByRole('radio', { name, exact: true })).toBeChecked();
  }
  await page.keyboard.press('Escape'); await task.hover();
  await page.getByRole('button', { name: 'Delete task 1', exact: true }).click();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByLabel('Note text')).toHaveValue('Keep the paragraph alongside the checklist.');
});

test('archive and restore preserve note text and optional tasks; clear asks first', async ({ page }) => {
  await page.goto('/'); await page.getByLabel('Note title').fill('First page');
  await page.getByLabel('Note text').fill('A paragraph to keep.');
  await page.getByRole('button', { name: 'Add a task', exact: true }).click();
  await page.getByRole('textbox', { name: 'Task 1', exact: true }).fill('A little win');
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.getByLabel('Note title').fill('Second page');
  await page.getByRole('button', { name: 'Previous note' }).click();
  await page.getByRole('button', { name: 'History and archive' }).click();
  await page.getByRole('button', { name: 'Restore A little win', exact: true }).click();
  await page.getByRole('button', { name: 'Archive this note' }).click();
  await expect(page.getByLabel('Note title')).toHaveValue('Second page');
  await page.getByRole('button', { name: 'History and archive' }).click();
  await page.getByRole('button', { name: 'Restore note First page', exact: true }).click();
  await expect(page.getByLabel('Note text')).toHaveValue('A paragraph to keep.');
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'History and archive' }).click();
  await page.getByRole('button', { name: 'Clear all history' }).click();
  await page.getByRole('button', { name: 'Keep them' }).click();
  await expect(page.getByRole('button', { name: 'Restore A little win', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear all history' }).click();
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await expect(page.getByText('Room for your progress.')).toBeVisible();
});

test('mouse drag visibly curls paper, returns on a short pull, and reverses on apply', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto('/'); await page.getByLabel('Note text').fill('A note that really peels.');
  await page.addStyleTag({ content: '#root { position: absolute; left: 180px; top: 200px; width: 320px; height: 320px; overflow: visible; }' });
  const button = page.getByRole('button', { name: 'Peel left corner' });
  const b = (await button.boundingBox())!;
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 48, y - 40, { steps: 12 });
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'peeling');
  await expect.poll(async () => Number(await page.locator('.paper-shell').getAttribute('data-peel-progress'))).toBeGreaterThan(0);
  const held = await page.locator('.paper-shell').getAttribute('data-peel-progress');
  await page.waitForTimeout(100);
  expect(await page.locator('.paper-shell').getAttribute('data-peel-progress')).toBe(held);
  await page.mouse.move(x + 20, y - 16, { steps: 5 });
  await expect.poll(async () => Number(await page.locator('.paper-shell').getAttribute('data-peel-progress'))).toBeLessThan(Number(held));
  await page.mouse.move(x + 48, y - 40, { steps: 5 });
  expect(await page.locator('.paper-front').evaluate(el => (el as HTMLElement).style.clipPath)).toContain('url');
  expect(await page.locator('.peel-layer > g > path').nth(1).getAttribute('d')).toContain('Q');
  await page.screenshot({ path: 'test-results/reference-peel-partial.png', omitBackground: true });
  await page.mouse.up();
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
  await expect(page.locator('.paper-front')).toHaveCSS('clip-path', 'none');
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 180, y - 115, { steps: 20 });
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'peeling');
  await expect.poll(async () => Number(await page.locator('.paper-shell').getAttribute('data-peel-progress'))).toBeGreaterThan(.4);
  const halfway = await page.locator('.paper-shell').getAttribute('data-peel-progress');
  await page.waitForTimeout(300);
  expect(await page.locator('.paper-shell').getAttribute('data-peel-progress')).toBe(halfway);
  await page.mouse.move(x + 250, y - 160, { steps: 20 });
  await expect(page.locator('.paper-lifted-front')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/single-peel-middle.png', omitBackground: true });
  await page.mouse.move(x + 320, y - 205, { steps: 25 });
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'peeling');
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-pose', 'removal');
  await expect.poll(() => page.locator('clipPath path').first().evaluate(el => {
    const box = (el as SVGGraphicsElement).getBBox();
    return box.width * box.height;
  })).toBeLessThan(320 * 320 * .1);
  await page.screenshot({ path: 'test-results/complete-removal-near-end.png', omitBackground: true });
  await page.evaluate(() => {
    const root = document.querySelector('.paper-shell')!;
    (window as unknown as { peelStages: unknown[] }).peelStages = [];
    new MutationObserver(() => {
      (window as unknown as { peelStages: unknown[] }).peelStages.push({ state: root.getAttribute('data-peel-state'), pose: root.getAttribute('data-peel-pose'), front: root.querySelector('clipPath path')?.getAttribute('d') });
    }).observe(root, { attributes: true, attributeFilter: ['data-peel-state'] });
  });
  await page.mouse.move(x + 360, y - 230, { steps: 35 });
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'carrying');
  expect(await page.evaluate(() => (window as unknown as { peelStages: unknown[] }).peelStages)).toEqual(expect.arrayContaining([
    expect.objectContaining({ state: 'detaching', pose: 'removal', front: '' }),
    expect.objectContaining({ state: 'carrying', pose: 'held', front: expect.stringContaining('M') }),
  ]));
  await page.mouse.up();
  await expect(page.locator('.stickly')).toHaveCSS('visibility', 'visible');
  await expect(page.locator('.paper-shell')).toBeVisible();
  expect(await page.locator('.peel-layer > g > path').nth(1).getAttribute('d')).toContain('Q');
  expect(await page.locator('clipPath path').first().getAttribute('d')).not.toBe('');
  expect(await page.locator('.peel-layer > g > path').nth(3).getAttribute('d')).not.toBe('');
  const lifted = (await page.locator('.paper-shell').boundingBox())!;
  const gripX = Number(await page.locator('.paper-shell').getAttribute('data-grip-x'));
  const gripY = Number(await page.locator('.paper-shell').getAttribute('data-grip-y'));
  expect(lifted.x + gripX).toBeCloseTo(x + 360);
  expect(lifted.y + gripY).toBeCloseTo(y - 230);
  await expect(page.locator('.paper-presentation')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.paper-presentation')).toHaveCSS('opacity', '1');
  await page.mouse.move(560, 430, { steps: 10 });
  await page.screenshot({ path: 'test-results/visible-carried-sticker.png', omitBackground: true });
  await page.mouse.click(560, 430);
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'pasting');
  await page.screenshot({ path: 'test-results/reference-peel-apply.png', omitBackground: true });
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
  const placed = (await page.locator('.paper-shell').boundingBox())!;
  expect(placed.x + gripX).toBeCloseTo(560);
  expect(placed.y + gripY).toBeCloseTo(430);
  await expect(page.locator('.paper-front-copy-content')).toHaveCount(0);
  await button.focus(); await button.press('Space');
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'carrying');
  await page.keyboard.press('Escape');
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
});

test('Escape between full removal and cursor carry returns the original note', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Note text').fill('Keep this note here.');
  await page.evaluate(() => {
    const root = document.querySelector('.paper-shell')!;
    (window as unknown as { startedCarry: boolean }).startedCarry = false;
    new MutationObserver(() => {
      const state = root.getAttribute('data-peel-state');
      if (state === 'carrying') (window as unknown as { startedCarry: boolean }).startedCarry = true;
      if (state === 'detaching') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    }).observe(root, { attributes: true, attributeFilter: ['data-peel-state'] });
  });
  await page.getByRole('button', { name: 'Peel left corner' }).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'peeling');
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
  expect(await page.evaluate(() => (window as unknown as { startedCarry: boolean }).startedCarry)).toBe(false);
  await expect(page.getByLabel('Note text')).toHaveValue('Keep this note here.');
  await expect(page.locator('.paper-front')).toHaveCSS('clip-path', 'none');
});

test('color and text-size popovers dismiss when clicking blank paper or editing the note', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Paper color', exact: true }).click();
  await expect(page.getByRole('radiogroup', { name: 'Paper color' })).toBeVisible();
  await page.getByRole('radio', { name: 'Lavender', exact: true }).click();
  await expect(page.getByRole('radiogroup', { name: 'Paper color' })).toBeVisible();
  await page.mouse.click(160, 240);
  await expect(page.getByRole('radiogroup', { name: 'Paper color' })).toHaveCount(0);
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
  await page.getByRole('button', { name: 'Text size', exact: true }).click();
  await page.mouse.click(160, 240);
  await expect(page.getByRole('radiogroup', { name: 'Text size' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Paper color', exact: true }).click();
  await page.getByLabel('Note text').fill('The picker closes so I can keep writing.');
  await expect(page.getByRole('radiogroup', { name: 'Paper color' })).toHaveCount(0);
  await expect(page.getByLabel('Note text')).toHaveValue('The picker closes so I can keep writing.');
});

test('collapsed toolbar keeps every control accessible and fits a small resized note', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Expand controls' })).toBeVisible();
  await expect(page.getByRole('toolbar', { name: 'Note controls' })).toBeHidden();
  await expect(page.getByText('stickly', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 240, height: 200 });
  await expect(page.getByRole('button', { name: 'Resize note', exact: true })).toBeInViewport();
  await page.screenshot({ path: 'test-results/collapsed-toolbar.png', omitBackground: true });
  await page.getByRole('button', { name: 'Expand controls' }).click();
  await expect(page.getByRole('toolbar', { name: 'Note controls' })).toBeVisible();
  for (const name of ['Add a task', 'Text size', 'Pin always on top', 'Paper color', 'History and archive', 'Delete note', 'Hide to tray', 'Collapse controls']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeInViewport();
  }
  await page.getByRole('button', { name: 'Text size', exact: true }).click();
  await expect(page.getByRole('radiogroup', { name: 'Text size' })).toBeVisible();
  await page.getByRole('button', { name: 'Collapse controls' }).click();
  await expect(page.getByRole('radiogroup', { name: 'Text size' })).toHaveCount(0);
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand controls' })).toBeVisible();
  await expect.poll(() => page.locator('.note-toolbar').evaluate(el => el.scrollWidth - el.clientWidth)).toBe(0);
});

test('edge-to-edge layout and long text never produce horizontal scrollbars', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Note title').fill('Ideas for a slower Sunday');
  await page.getByLabel('Note text').fill('Make time for the things that matter.\nCoffee, a long walk, a little daydreaming.');
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.screenshot({ path: 'test-results/stickly-plain.png', omitBackground: true });
  await page.getByRole('button', { name: 'Paper color', exact: true }).click();
  await page.screenshot({ path: 'test-results/stickly-palette.png', omitBackground: true });
  await page.keyboard.press('Escape');
  await page.getByLabel('Note text').fill('A'.repeat(1000));
  await page.getByRole('button', { name: 'Add a task', exact: true }).click();
  await page.getByRole('textbox', { name: 'Task 1', exact: true }).fill('B'.repeat(500));
  for (const [width, height] of [[260, 240], [320, 320], [520, 480]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.locator('.editor-scroll').evaluate(el => el.scrollWidth - el.clientWidth)).toBe(0);
    await expect(page.locator('.editor-scroll')).toHaveCSS('scrollbar-width', 'none');
    await page.locator('.editor-scroll').hover();
    await page.mouse.wheel(0, 500);
    await expect.poll(() => page.locator('.editor-scroll').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    const box = await page.locator('.paper-shell').boundingBox();
    expect(box!.x).toBe(0); expect(box!.y).toBe(0); expect(box!.width).toBe(width); expect(box!.height).toBe(height);
    await expect(page.getByRole('button', { name: 'Hide to tray' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'New note', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Resize note', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Move Stickly' })).toBeInViewport();
    await expect(page.locator('.new-note')).toHaveCSS('font-size', '14px');
  }
});

test('legacy checklist files gain plain note text without losing tasks', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('stickly:data:v1', JSON.stringify({ version: 1, activeNoteId: 'legacy', notes: [{ id: 'legacy', title: 'Old note', color: 'sky', tasks: [{ id: 't', text: 'Keep this task', bold: false, completed: true, createdAt: '2026-11-09' }], archivedAt: null, createdAt: '2026-11-09' }], alwaysOnTop: false, windowPosition: null })));
  await page.goto('/');
  await expect(page.getByRole('checkbox')).toBeChecked();
  await page.getByLabel('Note text').fill('Now with a paragraph.');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('stickly:data:v1')!).notes[0].body)).toBe('Now with a paragraph.');
  await expect(page.getByRole('textbox', { name: 'Task 1', exact: true })).toHaveValue('Keep this task');
});

test('corrupted storage is preserved and reported', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('stickly:data:v1', 'broken JSON'));
  await page.goto('/'); await expect(page.getByRole('alert')).toContainText("Couldn't open your notes");
  expect(await page.evaluate(() => localStorage.getItem('stickly:data:v1'))).toBe('broken JSON');
});

test('failed writes keep edits visible and can be retried', async ({ page }) => {
  await page.goto('/'); await expect(page.getByLabel('Note title')).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreStorage: () => void }).restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = () => { throw new Error('Disk is full'); };
  });
  await page.getByLabel('Note text').fill('Keep this idea safe');
  await expect(page.getByRole('alert')).toContainText('Disk is full');
  await page.evaluate(() => (window as unknown as { restoreStorage: () => void }).restoreStorage());
  await page.getByRole('button', { name: 'Retry save' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'All tucked in' })).toBeVisible();
  await page.reload(); await expect(page.getByLabel('Note text')).toHaveValue('Keep this idea safe');
});

test('S M L sizes persist per note and the bundled Shantell Sans font loads throughout', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(async () => (await document.fonts.load('700 19px "Shantell Sans"')).length)).toBe(1);
  expect(await page.evaluate(async () => (await document.fonts.load('800 19px "Shantell Sans"')).length)).toBe(1);
  await page.getByLabel('Note text').fill('A small thought becomes a big idea.');
  await page.getByRole('button', { name: 'Add a task', exact: true }).click();
  await page.getByRole('textbox', { name: 'Task 1', exact: true }).fill('Keep the line wrapped neatly');
  await page.getByRole('button', { name: 'Text size', exact: true }).click();
  await page.screenshot({ path: 'test-results/text-size-picker.png', omitBackground: true });
  for (const [name, size] of [['Small text', '16px'], ['Medium text', '19px'], ['Large text', '23px']]) {
    await page.getByRole('radio', { name, exact: true }).click();
    await expect(page.getByLabel('Note text')).toHaveCSS('font-size', size);
    await expect(page.getByRole('textbox', { name: 'Task 1', exact: true })).toHaveCSS('font-size', size);
    await expect(page.getByRole('radio', { name, exact: true })).toBeChecked();
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('status').filter({ hasText: 'All tucked in' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Note text')).toHaveCSS('font-size', '23px');
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await expect(page.getByLabel('Note text')).toHaveCSS('font-size', '19px');
  await page.getByRole('button', { name: 'Previous note' }).click();
  await expect(page.getByLabel('Note text')).toHaveCSS('font-size', '23px');
  await page.getByRole('button', { name: 'History and archive' }).click();
  for (const selector of ['.drawer-heading h2', '.drawer-heading p', '.drawer-footer button', '.note-navigation', '.new-note']) {
    expect(await page.locator(selector).first().evaluate(el => getComputedStyle(el).fontFamily)).toContain('Shantell Sans');
    await expect(page.locator(selector).first()).toHaveCSS('font-weight', '700');
  }
  await expect(page.locator('.empty-history p')).toBeInViewport();
  await page.screenshot({ path: 'test-results/handwritten-history.png', omitBackground: true });
});

test('header and blank paper drag normally; peeling, editing and resizing stay independent', async ({ page }) => {
  await page.goto('/');
  const logo = page.getByRole('button', { name: 'Move Stickly' });
  const resize = page.getByRole('button', { name: 'Resize note', exact: true });
  const l = (await logo.boundingBox())!, r = (await resize.boundingBox())!;
  expect(l.x + l.width < r.x || l.y + l.height < r.y).toBe(true);
  await page.mouse.move(l.x + l.width / 2, l.y + l.height / 2); await page.mouse.down();
  await page.mouse.move(l.x + 50, l.y + 40, { steps: 10 });
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
  await expect(page.locator('.stickly')).toHaveAttribute('data-window-gesture', 'moving');
  await page.mouse.up();
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
  await page.mouse.move(110, 12); await page.mouse.down();
  await page.mouse.move(145, 45, { steps: 8 });
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
  await expect(page.locator('.stickly')).toHaveAttribute('data-window-gesture', 'moving');
  await page.mouse.up(); await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
  await page.mouse.move(160, 240); await page.mouse.down();
  await page.mouse.move(190, 260, { steps: 5 });
  await expect(page.locator('.stickly')).toHaveAttribute('data-window-gesture', 'moving');
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
  await page.mouse.up();
  await expect(page.locator('.stickly')).toHaveAttribute('data-window-gesture', 'idle');
  await page.getByLabel('Note text').fill('Text can still be edited.');
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down();
  await expect(page.locator('.stickly')).toHaveAttribute('data-window-gesture', 'resizing');
  await page.mouse.move(r.x + 35, r.y + 25); await page.mouse.up();
  await expect(page.locator('.stickly')).toHaveAttribute('data-window-gesture', 'idle');
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
});

test('page navigation stays compact and notes can be deleted without deleting their neighbors', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Note title').fill('Keep me'); await page.getByLabel('Note text').fill('Original note');
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.getByLabel('Note title').fill('Remove me'); await page.getByLabel('Note text').fill('Second note');
  await page.getByRole('button', { name: 'Delete note', exact: true }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Delete this note?' });
  await dialog.getByRole('button', { name: 'Keep note', exact: true }).click();
  await expect(page.getByLabel('Note title')).toHaveValue('Remove me');
  await page.getByRole('button', { name: 'Delete note', exact: true }).click();
  await dialog.getByRole('button', { name: 'Delete note', exact: true }).click();
  await expect(page.getByLabel('Note title')).toHaveValue('Keep me');
  await expect(page.getByLabel('Note text')).toHaveValue('Original note');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('stickly:data:v1')!).notes.length)).toBe(1);
  expect((await page.locator('.note-toolbar').boundingBox())!.height).toBeLessThanOrEqual(40);
  expect((await page.locator('.note-footer').boundingBox())!.height).toBeLessThanOrEqual(30);
  await expect(page.locator('.note-navigation')).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.screenshot({ path: 'test-results/compact-navigation.png', omitBackground: true });
  await page.getByRole('button', { name: 'Delete note', exact: true }).click();
  await dialog.getByRole('button', { name: 'Delete note', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show Stickly' })).toBeVisible();
  await page.getByRole('button', { name: 'Show Stickly' }).click();
  await expect(page.getByLabel('Note text')).toHaveValue('');
  await expect(page.getByLabel('Note title')).toHaveValue('');
});
