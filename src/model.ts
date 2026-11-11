export const colors = {
  yellow: { name: 'Classic yellow', paper: '#FEF08A', ink: '#46391b', accent: '#CA8A04', back: '#fff7ba' },
  peach: { name: 'Pastel peach', paper: '#FED7AA', ink: '#543522', accent: '#ad5726', back: '#ffe7cc' },
  pink: { name: 'Blush pink', paper: '#FECDD3', ink: '#5a303d', accent: '#b04c68', back: '#ffe3e8' },
  mint: { name: 'Mint green', paper: '#A7F3D0', ink: '#234d3e', accent: '#32775d', back: '#d0f9e7' },
  sky: { name: 'Sky blue', paper: '#BAE6FD', ink: '#29475b', accent: '#32769c', back: '#def3ff' },
  lavender: { name: 'Lavender', paper: '#E9D5FF', ink: '#4b365f', accent: '#8157a3', back: '#f3e7ff' },
  charcoal: { name: 'Charcoal', paper: '#262626', ink: '#F5F5F5', accent: '#d7c38d', back: '#464646' },
} as const;
export type Color = keyof typeof colors;
export const fontSizes = { s: { name: 'Small text', body: 16, title: 20 }, m: { name: 'Medium text', body: 19, title: 23 }, l: { name: 'Large text', body: 23, title: 27 } } as const;
export type FontSize = keyof typeof fontSizes;
export interface Task { id: string; text: string; completed: boolean; bold: boolean; createdAt: string; focusDate?: string | null; reminderAt?: number | null }
export interface Note { id: string; title: string; body: string; bodyBold: boolean; fontSize: FontSize; color: Color; tasks: Task[]; archivedAt: string | null; createdAt: string }
export interface AppData { version: 1; activeNoteId: string; notes: Note[]; alwaysOnTop: boolean; windowPosition: { x: number; y: number } | null }
export const newTask = (text = ''): Task => ({ id: crypto.randomUUID(), text, completed: false, bold: false, createdAt: new Date().toISOString(), focusDate: null, reminderAt: null });
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function todayTasks(data: AppData, day = localDay()) {
  return data.notes.filter(n => !n.archivedAt).flatMap(note => note.tasks
    .filter(task => task.focusDate && (task.focusDate === day || (!task.completed && task.focusDate < day)))
    .map(task => ({ note, task })));
}
export const newNote = (color: Color = 'yellow'): Note => ({ id: crypto.randomUUID(), title: '', body: '', bodyBold: false, fontSize: 'm', color, tasks: [], archivedAt: null, createdAt: new Date().toISOString() });
export function initialData(): AppData {
  const note = newNote();
  return { version: 1, activeNoteId: note.id, notes: [note], alwaysOnTop: false, windowPosition: null };
}
export type Action =
  | { type: 'edit-note'; id: string; patch: Partial<Pick<Note, 'title' | 'color' | 'body' | 'bodyBold' | 'fontSize'>> }
  | { type: 'add-task'; noteId: string; task: Task; afterId?: string }
  | { type: 'edit-task'; noteId: string; id: string; day?: string; patch: Partial<Pick<Task, 'text' | 'completed' | 'bold' | 'reminderAt'>> }
  | { type: 'delete-task'; noteId: string; id: string }
  | { type: 'move-task'; noteId: string; id: string; toIndex: number }
  | { type: 'focus-task'; noteId: string; id: string; day: string; selected: boolean }
  | { type: 'delete-note'; id: string; replacement: Note }
  | { type: 'new-note'; note: Note }
  | { type: 'select-note'; id: string }
  | { type: 'archive-note'; id: string; replacement: Note }
  | { type: 'restore-note'; id: string }
  | { type: 'clear-history' }
  | { type: 'pin'; value: boolean };

export function reduceData(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'edit-note': return { ...state, notes: state.notes.map(n => n.id === action.id ? { ...n, ...action.patch } : n) };
    case 'add-task': return { ...state, notes: state.notes.map(n => {
      if (n.id !== action.noteId) return n;
      const tasks = [...n.tasks];
      const index = action.afterId ? tasks.findIndex(t => t.id === action.afterId) + 1 : tasks.length;
      tasks.splice(index, 0, action.task);
      return { ...n, tasks };
    }) };
    case 'edit-task': {
      const day = action.day ?? localDay();
      const focusFull = todayTasks(state, day).filter(item => !item.task.completed).length >= 3;
      return { ...state, notes: state.notes.map(n => n.id === action.noteId ? { ...n, tasks: n.tasks.map(t => {
        if (t.id !== action.id) return t;
        const next = { ...t, ...action.patch };
        if (action.patch.completed === true) {
          next.reminderAt = null;
          if (t.focusDate && t.focusDate <= day) next.focusDate = day;
        }
        if (action.patch.completed === false && t.completed && t.focusDate && t.focusDate <= day && focusFull) next.focusDate = null;
        return next;
      }) } : n) };
    }
    case 'move-task': return { ...state, notes: state.notes.map(n => {
      if (n.id !== action.noteId || !Number.isInteger(action.toIndex) || action.toIndex < 0 || action.toIndex >= n.tasks.length) return n;
      const from = n.tasks.findIndex(t => t.id === action.id);
      if (from < 0 || from === action.toIndex) return n;
      const tasks = [...n.tasks];
      tasks.splice(action.toIndex, 0, tasks.splice(from, 1)[0]);
      return { ...n, tasks };
    }) };
    case 'focus-task': {
      const active = todayTasks(state, action.day).filter(({ task }) => !task.completed);
      const alreadySelected = active.some(({ task }) => task.id === action.id);
      if (action.selected && !alreadySelected && active.length >= 3) return state;
      return { ...state, notes: state.notes.map(n => n.id === action.noteId && !n.archivedAt ? { ...n, tasks: n.tasks.map(t => t.id === action.id && (!t.completed || !action.selected) ? { ...t, focusDate: action.selected ? action.day : null } : t) } : n) };
    }
    case 'delete-task': return { ...state, notes: state.notes.map(n => n.id === action.noteId ? { ...n, tasks: n.tasks.filter(t => t.id !== action.id) } : n) };
    case 'delete-note': {
      if (!state.notes.some(n => n.id === action.id)) return state;
      const notes = state.notes.filter(n => n.id !== action.id);
      const active = notes.filter(n => !n.archivedAt);
      const previousIndex = state.notes.filter(n => !n.archivedAt).findIndex(n => n.id === action.id);
      const next = active[Math.min(Math.max(0, previousIndex), active.length - 1)];
      return { ...state, notes: next ? notes : [...notes, action.replacement], activeNoteId: action.id === state.activeNoteId ? next?.id ?? action.replacement.id : state.activeNoteId };
    }
    case 'new-note': return { ...state, activeNoteId: action.note.id, notes: [...state.notes, action.note] };
    case 'select-note': return state.notes.some(n => n.id === action.id && !n.archivedAt) ? { ...state, activeNoteId: action.id } : state;
    case 'archive-note': {
      const notes = state.notes.map(n => n.id === action.id ? { ...n, archivedAt: new Date().toISOString() } : n);
      const next = notes.find(n => !n.archivedAt);
      return { ...state, notes: next ? notes : [...notes, action.replacement], activeNoteId: next?.id ?? action.replacement.id };
    }
    case 'restore-note': return { ...state, activeNoteId: action.id, notes: state.notes.map(n => n.id === action.id ? { ...n, archivedAt: null } : n) };
    case 'clear-history': return { ...state, notes: state.notes.filter(n => !n.archivedAt).map(n => ({ ...n, tasks: n.tasks.filter(t => !t.completed) })) };
    case 'pin': return { ...state, alwaysOnTop: action.value };
  }
}

// Browser storage is untrusted too; reject incompatible data instead of replacing it.
export function validateData(value: unknown): AppData {
  if (!value || typeof value !== 'object') throw new Error('The saved notes are not a valid Stickly file.');
  const data = value as AppData;
  const ids = new Set<string>();
  const taskIds = new Set<string>();
  if (data.version !== 1 || !Array.isArray(data.notes) || !data.notes.length || typeof data.alwaysOnTop !== 'boolean') throw new Error('The saved notes have an unsupported format.');
  for (const n of data.notes) {
    if (!n || typeof n.id !== 'string' || !n.id || ids.has(n.id) || typeof n.title !== 'string' || !Object.hasOwn(colors, n.color) || typeof n.createdAt !== 'string' || (n.archivedAt !== null && typeof n.archivedAt !== 'string') || !Array.isArray(n.tasks)) throw new Error('A saved note is damaged.');
    ids.add(n.id);
    // Version 1 originally stored checklists only. Preserve those while adding a blank body.
    if (!Object.hasOwn(n, 'body')) n.body = '';
    if (!Object.hasOwn(n, 'bodyBold')) n.bodyBold = false;
    if (!Object.hasOwn(n, 'fontSize')) n.fontSize = 'm';
    if (typeof n.body !== 'string' || typeof n.bodyBold !== 'boolean') throw new Error('A saved note body is damaged.');
    if (!Object.hasOwn(fontSizes, n.fontSize)) throw new Error('The saved text size is invalid.');
    for (const t of n.tasks) {
      if (!t || typeof t.id !== 'string' || !t.id || taskIds.has(t.id) || typeof t.text !== 'string' || typeof t.bold !== 'boolean' || typeof t.completed !== 'boolean' || typeof t.createdAt !== 'string') throw new Error('A saved task is damaged.');
      taskIds.add(t.id);
      if (!Object.hasOwn(t, 'focusDate')) t.focusDate = null;
      if (!Object.hasOwn(t, 'reminderAt')) t.reminderAt = null;
      if (t.focusDate !== null && (typeof t.focusDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.focusDate) || t.focusDate.startsWith('0000') || Number.isNaN(Date.parse(t.focusDate)) || new Date(t.focusDate).toISOString().slice(0, 10) !== t.focusDate)) throw new Error('A saved focus date is invalid.');
      if (t.reminderAt !== null && (!Number.isSafeInteger(t.reminderAt) || t.reminderAt! < 0 || t.reminderAt! > 8_640_000_000_000_000)) throw new Error('A saved reminder is invalid.');
    }
  }
  if (!data.notes.some(n => n.id === data.activeNoteId && !n.archivedAt)) throw new Error('The active note is missing.');
  if (data.windowPosition !== null && (!data.windowPosition || !Number.isFinite(data.windowPosition.x) || !Number.isFinite(data.windowPosition.y))) throw new Error('The saved window position is invalid.');
  return data;
}
