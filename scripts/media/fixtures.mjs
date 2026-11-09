export const date = '2026-01-01T10:00:00.000Z';
export function note(overrides = {}) {
 return { id: 'launch-note', title: 'A little headspace', body: 'Save the good idea.\nTake the long way home.\nMake something you love.', bodyBold: false, fontSize: 'm', color: 'yellow', tasks: [], archivedAt: null, createdAt: date, ...overrides };
}
export function task(id, text, completed = false) { return { id, text, completed, bold: false, createdAt: date }; }
export function data(active = note(), extras = []) {
 return { version: 1, activeNoteId: active.id, notes: [active, ...extras], alwaysOnTop: false, windowPosition: null };
}
export const examples = {
 plain: data(note(), [note({ id: 'next-thought', title: 'For later', color: 'mint', body: 'A little thing worth remembering.' }), note({ id: 'after-hours', title: 'After hours', color: 'lavender', body: 'Leave a little room for the unexpected.' })]),
 checklist: data(note({ title: 'Little wins', color: 'mint', body: 'One good thing at a time.', tasks: [task('win-1', 'Capture the idea', true), task('win-2', 'Ship a tiny thing', true), task('win-3', 'Call it a good day')] })),
 palette: data(note({ title: 'Your kind of day', color: 'lavender', body: 'A change of paper.\nA fresh point of view.' })),
 charcoal: data(note({ title: 'After hours', color: 'charcoal', body: 'Good ideas keep their own hours.\nSave this one for tomorrow.', tasks: [task('night-1', 'One last little thought')] })),
 history: data(note({ title: 'Little wins', color: 'peach', body: '', tasks: [task('saved-win', 'Shipped the first version', true)] }), [note({ id: 'archive-note', title: 'The first sketch', color: 'sky', body: 'The idea that started it.', archivedAt: date })]),
 peel: data(note({ title: 'Bring the idea along', color: 'sky', body: 'A corner. A cursor.\nSomewhere new.' })),
};
