import { describe, expect, it } from 'vitest';
import { initialData, localDay, newNote, newTask, reduceData, todayTasks, validateData } from './model';

describe('daily focus, reminders and task order', () => {
  it('limits active priorities to three across notes and frees a slot on completion', () => {
    let data = initialData();
    data.notes[0].tasks = [newTask('One'), newTask('Two')];
    const second = newNote(); second.tasks = [newTask('Three'), newTask('Four')];
    data.notes.push(second);
    for (const note of data.notes) for (const task of note.tasks) data = reduceData(data, { type: 'focus-task', noteId: note.id, id: task.id, day: '2026-11-11', selected: true });
    expect(todayTasks(data, '2026-11-11').map(({ task }) => task.text)).toEqual(['One', 'Two', 'Three']);
    data = reduceData(data, { type: 'edit-task', noteId: data.notes[0].id, id: data.notes[0].tasks[0].id, patch: { completed: true } });
    data = reduceData(data, { type: 'focus-task', noteId: second.id, id: second.tasks[1].id, day: '2026-11-11', selected: true });
    expect(todayTasks(data, '2026-11-11').filter(({ task }) => !task.completed)).toHaveLength(3);
    expect(todayTasks(data, '2026-11-11').find(({ task }) => task.text === 'Four')).toBeDefined();
  });
  it('carries unfinished priorities across midnight without duplicating or deleting tasks', () => {
    const data = initialData();
    data.notes[0].tasks = [{ ...newTask('Unfinished'), focusDate: '2026-11-10' }, { ...newTask('Finished'), focusDate: '2026-11-10', completed: true }, { ...newTask('Tomorrow'), focusDate: '2026-11-12' }];
    expect(todayTasks(data, '2026-11-11').map(({ task }) => task.text)).toEqual(['Unfinished']);
    expect(data.notes[0].tasks).toHaveLength(3);
    data.notes[0].archivedAt = new Date().toISOString();
    expect(todayTasks(data, '2026-11-11')).toEqual([]);
    expect(localDay(new Date(2026, 10, 11, 23, 59))).toBe('2026-11-11');
  });
  it('keeps a carried-over completion visible today and never reopens a fourth active priority', () => {
    let data = initialData(); const noteId = data.notes[0].id;
    data.notes[0].tasks = [newTask('Carried'), newTask('Two'), newTask('Three'), newTask('Four')].map(t => ({ ...t, focusDate: '2026-11-10' }));
    data.notes[0].tasks[3].focusDate = null;
    const id = data.notes[0].tasks[0].id;
    data = reduceData(data, { type: 'edit-task', noteId, id, day: '2026-11-11', patch: { completed: true } });
    expect(todayTasks(data, '2026-11-11').find(item => item.task.id === id)?.task.completed).toBe(true);
    data = reduceData(data, { type: 'focus-task', noteId, id: data.notes[0].tasks[3].id, day: '2026-11-11', selected: true });
    data = reduceData(data, { type: 'edit-task', noteId, id, day: '2026-11-11', patch: { completed: false } });
    expect(data.notes[0].tasks[0]).toMatchObject({ completed: false, focusDate: null });
    expect(todayTasks(data, '2026-11-11').filter(item => !item.task.completed)).toHaveLength(3);
  });
  it('persists reordering without changing task IDs, metadata or source snapshots', () => {
    const data = initialData();
    const tasks = [newTask('One'), { ...newTask('Two'), focusDate: '2026-11-11', reminderAt: 1_800_000_000_000 }, newTask('Three')];
    data.notes[0].tasks = tasks;
    const moved = reduceData(data, { type: 'move-task', noteId: data.notes[0].id, id: tasks[1].id, toIndex: 0 });
    expect(moved.notes[0].tasks).toEqual([tasks[1], tasks[0], tasks[2]]);
    expect(data.notes[0].tasks).toEqual(tasks);
    expect(validateData(JSON.parse(JSON.stringify(moved))).notes[0].tasks).toEqual(moved.notes[0].tasks);
    expect(reduceData(data, { type: 'move-task', noteId: data.notes[0].id, id: 'missing', toIndex: 0 }).notes[0]).toEqual(data.notes[0]);
    expect(reduceData(data, { type: 'move-task', noteId: data.notes[0].id, id: tasks[0].id, toIndex: 9 }).notes[0]).toEqual(data.notes[0]);
  });
  it('keeps old tasks intact, migrates missing fields and cancels a completed task reminder', () => {
    const data = initialData(); data.notes[0].tasks = [newTask('Keep me')];
    delete data.notes[0].tasks[0].focusDate; delete data.notes[0].tasks[0].reminderAt;
    const loaded = validateData(JSON.parse(JSON.stringify(data)));
    expect(loaded.notes[0].tasks[0]).toMatchObject({ text: 'Keep me', focusDate: null, reminderAt: null });
    const id = loaded.notes[0].tasks[0].id;
    let next = reduceData(loaded, { type: 'edit-task', noteId: loaded.notes[0].id, id, patch: { reminderAt: 1_800_000_000_000 } });
    next = reduceData(next, { type: 'edit-task', noteId: next.notes[0].id, id, patch: { completed: true } });
    expect(next.notes[0].tasks[0].reminderAt).toBeNull();
  });
  it('rejects malformed focus dates and reminder values before persisting them', () => {
    for (const bad of ['2026-02-30', '2026-13-01', '0000-01-01', 'yesterday']) {
      const data = initialData(); data.notes[0].tasks = [{ ...newTask(), focusDate: bad }];
      expect(() => validateData(data)).toThrow();
    }
    for (const bad of [-1, 1.5, NaN, Infinity, 8_640_000_000_000_001]) {
      const data = initialData(); data.notes[0].tasks = [{ ...newTask(), reminderAt: bad }];
      expect(() => validateData(data)).toThrow();
    }
  });
});
