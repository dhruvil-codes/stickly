import { describe, expect, it } from 'vitest';
import { initialData, newNote, newTask, reduceData, validateData } from './model';
function seeded() {
  const data = initialData();
  data.notes[0].tasks = [newTask('First'), newTask('Second'), { ...newTask('Done'), completed: true }];
  return data;
}

describe('note and checklist lifecycle', () => {
  it('deletes only the selected note and creates a valid blank when the last note is deleted', () => {
    const data = seeded(); const original = data.notes[0]; const second = newNote('sky');
    const withSecond = reduceData(data, { type: 'new-note', note: second });
    const deleted = reduceData(withSecond, { type: 'delete-note', id: second.id, replacement: newNote() });
    expect(deleted.notes).toEqual([original]); expect(deleted.activeNoteId).toBe(original.id);
    const replacement = newNote('mint');
    const lastDeleted = reduceData(deleted, { type: 'delete-note', id: original.id, replacement });
    expect(lastDeleted.notes).toEqual([replacement]); expect(lastDeleted.activeNoteId).toBe(replacement.id);
    expect(validateData(JSON.parse(JSON.stringify(lastDeleted)))).toEqual(lastDeleted);
  });
  it('starts with a blank plain note and migrates legacy checklists without data loss', () => {
    const fresh = initialData();
    expect(fresh.notes[0]).toMatchObject({ body: '', bodyBold: false, tasks: [] });
    const legacy = seeded();
    delete (legacy.notes[0] as Partial<typeof legacy.notes[0]>).body;
    delete (legacy.notes[0] as Partial<typeof legacy.notes[0]>).bodyBold;
    delete (legacy.notes[0] as Partial<typeof legacy.notes[0]>).fontSize;
    const migrated = validateData(legacy);
    expect(migrated.notes[0]).toMatchObject({ body: '', bodyBold: false, fontSize: 'm' });
    expect(migrated.notes[0].tasks).toHaveLength(3);
    const edited = reduceData(migrated, { type: 'edit-note', id: migrated.activeNoteId, patch: { body: 'A thought\nAnother thought', bodyBold: true, fontSize: 'l' } });
    expect(validateData(JSON.parse(JSON.stringify(edited))).notes[0].body).toBe('A thought\nAnother thought');
    expect(validateData(JSON.parse(JSON.stringify(edited))).notes[0].fontSize).toBe('l');
  });
  it('inserts after the active line, edits, completes, restores, and deletes', () => {
    let d = seeded(); const noteId = d.activeNoteId; const task = newTask('Ship Stickly');
    d = reduceData(d, { type: 'add-task', noteId, task, afterId: d.notes[0].tasks[0].id });
    expect(d.notes[0].tasks[1].id).toBe(task.id);
    d = reduceData(d, { type: 'edit-task', noteId, id: task.id, patch: { text: 'Ship it', bold: true, completed: true } });
    expect(d.notes[0].tasks[1]).toMatchObject({ text: 'Ship it', bold: true, completed: true });
    d = reduceData(d, { type: 'edit-task', noteId, id: task.id, patch: { completed: false } });
    expect(d.notes[0].tasks[1].completed).toBe(false);
    d = reduceData(d, { type: 'delete-task', noteId, id: task.id });
    expect(d.notes[0].tasks.some(t => t.id === task.id)).toBe(false);
  });
  it('archives the last note without losing its data, restores it, and clears only history', () => {
    let d = seeded(); const original = d.notes[0]; const replacement = newNote('mint');
    d = reduceData(d, { type: 'archive-note', id: original.id, replacement });
    expect(d.activeNoteId).toBe(replacement.id); expect(d.notes[0].tasks).toEqual(original.tasks);
    expect(d.notes[0].archivedAt).toBeTruthy();
    d = reduceData(d, { type: 'restore-note', id: original.id });
    expect(d.activeNoteId).toBe(original.id);
    d = reduceData(d, { type: 'archive-note', id: replacement.id, replacement: newNote() });
    d = reduceData(d, { type: 'clear-history' });
    expect(d.notes).toHaveLength(1); expect(d.notes[0].id).toBe(original.id);
    expect(d.notes[0].tasks).toHaveLength(2); expect(d.notes[0].tasks.every(t => !t.completed)).toBe(true);
    expect(validateData(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });
  it('rejects corrupted, future, duplicate-id and missing-active-note saves', () => {
    expect(() => validateData({ ...initialData(), version: 2 })).toThrow();
    expect(() => validateData({ ...initialData(), activeNoteId: 'missing' })).toThrow();
    const d = initialData(); d.notes.push(d.notes[0]); expect(() => validateData(d)).toThrow();
    const bad = seeded(); bad.notes[0].tasks[0].bold = 'yes' as never; expect(() => validateData(bad)).toThrow();
    const invalidBody = initialData(); invalidBody.notes[0].body = null as never; expect(() => validateData(invalidBody)).toThrow();
    const invalidSize = initialData(); invalidSize.notes[0].fontSize = 'huge' as never; expect(() => validateData(invalidSize)).toThrow();
  });
});
