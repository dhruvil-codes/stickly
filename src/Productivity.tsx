import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Bell, Check, Clock3, Sun, Trash2, X } from 'lucide-react';
import { localDay, todayTasks, type Action, type AppData, type Note, type Task } from './model';
import './Productivity.css';
import { native } from './desktop';

export type ProductivityView = 'today' | 'reminders';
export function reminderLabel(time: number, now: number) {
  const date = new Date(time);
  const clock = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return localDay(date) === localDay(new Date(now)) ? `Today, ${clock}` : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${clock}`;
}
function dateTimeInput(time: number) {
  const date = new Date(time);
  return `${localDay(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function TaskOptions({ note, task, data, now, dispatch, close }: { note: Note; task: Task; data: AppData; now: number; dispatch: (action: Action) => void; close: () => void }) {
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState(() => dateTimeInput(task.reminderAt ?? Date.now() + 3_600_000));
  const [error, setError] = useState('');
  const day = localDay(new Date(now));
  const priorities = todayTasks(data, day).filter(item => !item.task.completed);
  const selected = todayTasks(data, day).some(item => item.task.id === task.id);
  const full = !selected && priorities.length >= 3;
  const index = note.tasks.findIndex(t => t.id === task.id);
  function saveReminder(time: number) {
    if (!task.text.trim()) { setError('Write the task before setting a reminder.'); return; }
    if (!Number.isFinite(time) || time <= Date.now() || time > 8_640_000_000_000_000) { setError('Choose a time in the future.'); return; }
    dispatch({ type: 'edit-task', noteId: note.id, id: task.id, patch: { reminderAt: time } }); close();
  }
  function move(offset: number) { dispatch({ type: 'move-task', noteId: note.id, id: task.id, toIndex: index + offset }); close(); }
  return <div className="task-options-panel" data-no-peel role="dialog" aria-label="Task options" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }}>
    <div className="productivity-heading"><h2>{schedule ? 'A little reminder' : 'This little task'}</h2><button type="button" className="icon-button" aria-label="Close task options" onClick={close}><X /></button></div>
    {schedule ? <form onSubmit={e => { e.preventDefault(); saveReminder(new Date(when).getTime()); }}>
      <label className="reminder-label" htmlFor="reminder-time">Remind me</label>
      <input id="reminder-time" className="reminder-time" type="datetime-local" required value={when} onChange={e => { setWhen(e.target.value); setError(''); }} />
      <div className="reminder-quick"><button type="button" onClick={() => saveReminder(Date.now() + 600_000)}>In 10 min</button><button type="button" onClick={() => saveReminder(Date.now() + 3_600_000)}>In an hour</button></div>
      <p className="productivity-hint">{native ? 'Keep Stickly running in the tray. Missed reminders show on reopening.' : 'This browser sample shows reminders in the app. Windows notifications need the installed app.'}</p>
      {error && <p role="alert" className="reminder-error">{error}</p>}
      <div className="reminder-form-actions"><button type="button" onClick={() => setSchedule(false)}>Back</button><button type="submit" className="filled-action">Set reminder</button></div>
    </form> : <div className="task-option-list">
      <button type="button" disabled={(task.completed && !selected) || full} aria-pressed={selected} onClick={() => { dispatch({ type: 'focus-task', noteId: note.id, id: task.id, day, selected: !selected }); close(); }}><Sun size={16} />{selected ? 'Remove from Today' : 'Add to Today'}<span>{priorities.length}/3</span></button>
      {full && <p className="productivity-hint">Three is plenty. Finish one or remove a priority first.</p>}
      <button type="button" disabled={task.completed} onClick={() => setSchedule(true)}><Bell size={16} />{task.reminderAt != null ? 'Change reminder' : 'Remind me'}</button>
      {task.reminderAt != null && <button type="button" onClick={() => { dispatch({ type: 'edit-task', noteId: note.id, id: task.id, patch: { reminderAt: null } }); close(); }}><X size={16} />Remove reminder</button>}
      <div className="task-move-options"><button type="button" disabled={index === 0} onClick={() => move(-1)}><ArrowUp size={15} />Move up</button><button type="button" disabled={index === note.tasks.length - 1} onClick={() => move(1)}><ArrowDown size={15} />Move down</button></div>
      <button type="button" className="task-delete-option" aria-label={`Delete task ${index + 1}`} onClick={() => { dispatch({ type: 'delete-task', noteId: note.id, id: task.id }); close(); }}><Trash2 size={16} />Delete task</button>
    </div>}
  </div>;
}

export function ProductivityPanel({ view, data, now, close, dispatch, jump, options, renderTask, add }: { view: ProductivityView; data: AppData; now: number; close: () => void; dispatch: (action: Action) => void; jump: (id: string) => void; options: (noteId: string, taskId: string) => void; renderTask: (note: Note, task: Task, index: number) => ReactNode; add: () => void }) {
  const day = localDay(new Date(now));
  const focused = todayTasks(data, day);
  const reminders = data.notes.filter(n => !n.archivedAt).flatMap(note => note.tasks.filter(task => !task.completed && task.reminderAt != null).map(task => ({ note, task }))).sort((a, b) => a.task.reminderAt! - b.task.reminderAt!);
  const active = focused.filter(item => !item.task.completed).length;
  return <section className="productivity-panel" data-no-peel role="region" aria-label={view === 'today' ? 'Today focus' : 'Reminders'}>
    <div className="productivity-heading"><button type="button" className="icon-button" aria-label="Back to note" onClick={close}><ArrowLeft /></button><h2>{view === 'today' ? 'Today' : 'Reminders'}</h2><span>{view === 'today' ? `${active}/3` : reminders.length}</span></div>
    <div className="productivity-scroll">
      {view === 'today' ? <>
        <p className="productivity-hint">A few things that matter. Unfinished priorities stay here.</p>
        {!focused.length && <p className="productivity-empty">Give today a little direction.<br />Choose Add to Today from a task’s menu.</p>}
        <ul className="task-list focus-list">{focused.map(({ note, task }, index) => <li className="focus-entry" key={task.id}><button type="button" className="task-origin" onClick={() => jump(note.id)}>{note.title || 'Untitled note'}{task.focusDate! < day && !task.completed ? ' · carried over' : ''}</button><ul>{renderTask(note, task, index)}</ul></li>)}</ul>
        {active < 3 && <button type="button" className="focus-add" onClick={add}>+ Add a priority</button>}
      </> : <>
        {!reminders.length && <p className="productivity-empty">A little nudge, when you need it.<br />Choose Remind me from a task’s menu.</p>}
        {reminders.map(({ note, task }) => <article key={task.id} className={`reminder-card ${task.reminderAt! <= now ? 'is-due' : ''}`}>
          <button type="button" className="task-origin" onClick={() => jump(note.id)}>{note.title || 'Untitled note'}</button>
          <p>{task.text || 'Untitled task'}</p>
          <button type="button" className="reminder-date" data-options-for={task.id} aria-label={`Change reminder for ${task.text}`} onClick={() => options(note.id, task.id)}><Clock3 size={12} />{task.reminderAt! <= now ? 'Due · ' : ''}{reminderLabel(task.reminderAt!, now)}</button>
          {task.reminderAt! <= now && <div className="reminder-card-actions"><button type="button" onClick={() => dispatch({ type: 'edit-task', noteId: note.id, id: task.id, patch: { reminderAt: Date.now() + 600_000 } })}>Snooze 10 min</button><button type="button" aria-label={`Complete ${task.text}`} onClick={() => dispatch({ type: 'edit-task', noteId: note.id, id: task.id, day, patch: { completed: true } })}><Check size={13} />Done</button><button type="button" aria-label={`Dismiss reminder for ${task.text}`} onClick={() => dispatch({ type: 'edit-task', noteId: note.id, id: task.id, patch: { reminderAt: null } })}>Dismiss</button></div>}
        </article>)}
      </>}
    </div>
  </section>;
}
