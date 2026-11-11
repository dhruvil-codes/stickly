import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('stickly:toolbar-expanded', 'true'));
});
async function makeTasks(page: Page, text: string[]) {
  await page.getByRole('button', { name: 'Add a task', exact: true }).click();
  for (let index = 0; index < text.length; index++) {
    const field = page.getByRole('textbox', { name: `Task ${index + 1}`, exact: true });
    await field.fill(text[index]);
    if (index < text.length - 1) await field.press('Enter');
  }
}
async function taskOptions(page: Page, index: number) {
  await page.getByRole('button', { name: `Task ${index} options`, exact: true }).click();
}

test('Today collects three priorities across notes, preserves them overnight and links to source notes', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-11T10:00:00') });
  await page.goto('/');
  await page.getByLabel('Note title').fill('Work');
  await makeTasks(page, ['One', 'Two', 'Three', 'Four']);
  for (const index of [1, 2, 3]) { await taskOptions(page, index); await page.getByRole('button', { name: 'Add to Today' }).click(); }
  await taskOptions(page, 4);
  await expect(page.getByRole('button', { name: 'Add to Today' })).toBeDisabled();
  await page.getByRole('button', { name: 'Close task options' }).click();
  await page.getByRole('button', { name: "Today's focus", exact: true }).click();
  const today = page.getByRole('region', { name: 'Today focus' });
  await expect(today.getByRole('textbox')).toHaveCount(3);
  await expect(today.getByRole('textbox').first()).toHaveValue('One');
  await page.clock.fastForward(86_400_000);
  await expect(today.getByText('Work · carried over').first()).toBeVisible();
  await page.getByRole('button', { name: 'Back to note', exact: true }).click();
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.getByLabel('Note title').fill('Home');
  await makeTasks(page, ['Another task']);
  await taskOptions(page, 1);
  await expect(page.getByRole('button', { name: 'Add to Today' })).toBeDisabled();
  await page.getByRole('button', { name: 'Close task options' }).click();
  await page.getByRole('button', { name: "Today's focus", exact: true }).click();
  await today.getByRole('button', { name: 'Work · carried over' }).first().click();
  await expect(page.getByLabel('Note title')).toHaveValue('Work');
  await expect(page.getByLabel('Task 4', { exact: true })).toHaveValue('Four');
  await page.reload();
  await page.getByRole('button', { name: "Today's focus", exact: true }).click();
  await expect(today.getByRole('textbox')).toHaveCount(3);
});

test('reminders become due, snooze, persist and cancel when the task is done', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-11T10:00:00') });
  await page.goto('/');
  await makeTasks(page, ['Take a little break']);
  await taskOptions(page, 1);
  await page.getByRole('button', { name: 'Remind me', exact: true }).click();
  await page.getByLabel('Remind me', { exact: true }).fill('2026-11-11T10:01');
  await page.getByRole('button', { name: 'Set reminder', exact: true }).click();
  await page.clock.fastForward(61_000);
  await expect(page.getByRole('button', { name: 'Reminders', exact: true })).toHaveClass(/has-due-reminders/);
  await page.getByRole('button', { name: 'Reminders', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Reminders', exact: true });
  await expect(panel.getByText('Take a little break', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Snooze 10 min', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Snooze 10 min' })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Reminders', exact: true }).click();
  await expect(panel.getByText('Take a little break', { exact: true })).toBeVisible();
  await page.clock.fastForward(600_001);
  await panel.getByRole('button', { name: 'Complete Take a little break', exact: true }).click();
  await expect(panel.getByText('Take a little break', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to note', exact: true }).click();
  await expect(page.getByRole('checkbox')).toBeChecked();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('stickly:data:v1')!).notes[0].tasks[0].reminderAt)).toBeNull();
});

test('task dragging and keyboard reordering preserve content without moving or peeling the note', async ({ page }) => {
  await page.goto('/'); await makeTasks(page, ['First', 'Second', 'Third']);
  const handle = page.getByRole('button', { name: 'Reorder task 3', exact: true });
  const from = await handle.boundingBox();
  const to = await page.getByRole('button', { name: 'Reorder task 1', exact: true }).boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 12 });
  await expect(page.locator('.stickly')).toHaveAttribute('data-window-gesture', 'idle');
  await expect(page.locator('.paper-shell')).toHaveAttribute('data-peel-state', 'flat');
  await page.mouse.up();
  await expect(page.getByLabel('Task 1', { exact: true })).toHaveValue('Third');
  await page.getByRole('button', { name: 'Reorder task 1', exact: true }).focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(page.getByLabel('Task 2', { exact: true })).toHaveValue('Third');
  await expect(page.getByRole('button', { name: 'Reorder task 2', exact: true })).toBeFocused();
  await page.reload();
  await expect(page.getByLabel('Task 1', { exact: true })).toHaveValue('First');
  await expect(page.getByLabel('Task 2', { exact: true })).toHaveValue('Third');
  await expect(page.getByLabel('Task 3', { exact: true })).toHaveValue('Second');
  await page.setViewportSize({ width: 240, height: 200 });
  await expect(page.getByRole('button', { name: "Today's focus", exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Reminders', exact: true })).toBeInViewport();
  const footerFits = await page.locator('.note-footer').evaluate(footer => {
    const children = [...footer.children].map(el => el.getBoundingClientRect());
    return children[0].right <= children[1].left && children[1].right <= children[2].left;
  });
  expect(footerFits).toBe(true);
  await taskOptions(page, 1);
  await expect(page.getByRole('dialog', { name: 'Task options' })).toBeVisible();
  await page.getByLabel('Current note').click({ position: { x: 4, y: 4 }, force: true });
  await expect(page.getByRole('dialog', { name: 'Task options' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
