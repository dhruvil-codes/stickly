import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { Archive, ArrowLeft, ArrowUpRight, Check, CheckCircle2, ChevronLeft, ChevronRight, History, ListChecks, LoaderCircle, MoreHorizontal, Pin, Palette, Plus, RotateCcw, SquarePen, StickyNote, Trash2, Type, X } from 'lucide-react';
import { gsap } from 'gsap';
import { colors, fontSizes, initialData, newNote, newTask, reduceData, type Action, type AppData, type Color, type FontSize, type Task } from './model';
import { hideWindow, loadData, moveWindowBy, native, onNewNote, onQuitRequested, onStorageError, quitApp, resizeBy, saveData, setPinned } from './desktop';
import { PeelPaper } from './PeelPaper';
import { useWindowGestures } from './useWindowGestures';
import './App.css';

function IconButton({ label, children, onClick, pressed, expanded, className = '', disabled = false }: { label: string; children: ReactNode; onClick: () => void; pressed?: boolean; expanded?: boolean; className?: string; disabled?: boolean }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} data-tooltip={label} aria-pressed={pressed} aria-expanded={expanded} onClick={onClick} disabled={disabled}>{children}</button>;
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const stateRef = useRef<AppData | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(() => {
    try { return localStorage.getItem('stickly:toolbar-expanded') === 'true'; } catch { return false; }
  });
  const [hidden, setHidden] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [focusTask, setFocusTask] = useState<string | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingSave = useRef<AppData | null>(null);
  const writing = useRef(false);
  const lastSaveError = useRef(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const paletteButton = useRef<HTMLDivElement>(null);
  const fontButton = useRef<HTMLDivElement>(null);
  const fontRef = useRef<HTMLDivElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const gestures = useWindowGestures(setError);
  const moveGesture = gestures.bind('moving');
  function toggleToolbar() {
    const expanded = !toolbarOpen;
    setToolbarOpen(expanded);
    setPaletteOpen(false); setFontOpen(false); setDeleteConfirm(false);
    try { localStorage.setItem('stickly:toolbar-expanded', String(expanded)); } catch { /* The controls still work when preferences cannot be stored. */ }
  }
  useAutoHeight(bodyRef, data?.notes.find(n => n.id === data.activeNoteId)?.body ?? '', `${data?.activeNoteId}:${data?.notes.find(n => n.id === data.activeNoteId)?.bodyBold}:${data?.notes.find(n => n.id === data.activeNoteId)?.tasks.length}:${data?.notes.find(n => n.id === data.activeNoteId)?.fontSize}`);

  useEffect(() => {
    let cancelled = false;
    loadData().then(saved => {
      if (cancelled) return;
      const value = saved ?? initialData();
      stateRef.current = value;
      setData(value);
      if (!saved) persist(value);
    }).catch(e => { if (!cancelled) setError(`Couldn't open your notes. ${String(e)}`); });
    return () => { cancelled = true; };
  }, []);

  function persist(value: AppData) {
    pendingSave.current = value;
    setSaving(true);
    if (writing.current) return;
    writing.current = true;
    saveQueue.current = (async () => {
      try {
        while (pendingSave.current) {
          const latest = pendingSave.current;
          pendingSave.current = null;
          await saveData(latest);
        }
        lastSaveError.current = false; setSaveFailed(false);
      } catch (e) {
        lastSaveError.current = true; setSaveFailed(true); setError(`Your latest changes couldn't be saved. ${String(e)}`);
      } finally { writing.current = false; setSaving(false); }
    })();
  }

  const dispatch = useCallback((action: Action) => {
    if (!stateRef.current) return;
    const next = reduceData(stateRef.current, action);
    stateRef.current = next;
    setData(next);
    persist(next);
  }, []);

  const createNote = useCallback(() => {
    dispatch({ type: 'new-note', note: newNote(stateRef.current?.notes.find(n => n.id === stateRef.current?.activeNoteId)?.color) });
    setHistoryOpen(false); setPaletteOpen(false); setFontOpen(false); setDeleteConfirm(false);
    requestAnimationFrame(() => bodyRef.current?.focus());
  }, [dispatch]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    onNewNote(createNote).then(fn => { if (disposed) fn(); else unlisten = fn; }).catch(e => setError(String(e)));
    return () => { disposed = true; unlisten?.(); };
  }, [createNote]);

  useEffect(() => {
    let disposed = false;
    const cleanups: (() => void)[] = [];
    const attach = (fn: () => void) => { if (disposed) fn(); else cleanups.push(fn); };
    onStorageError(message => { setSaveFailed(true); setError(message); }).then(attach).catch(e => setError(String(e)));
    onQuitRequested(async () => {
      await saveQueue.current;
      // A failed write keeps the app open so edits can still be recovered.
      if (stateRef.current) {
        try { await saveData(stateRef.current); }
        catch (e) { setError(`Couldn't save before quitting. ${String(e)}`); setSaveFailed(true); return; }
      }
      try { await quitApp(); }
      catch (e) { setError(`Couldn't finish saving the window position. ${String(e)}`); }
    }).then(attach).catch(e => setError(String(e)));
    return () => { disposed = true; cleanups.forEach(fn => fn()); };
  }, []);

  useEffect(() => {
    if (!paletteOpen && !fontOpen) return;
    function close(e: Event) {
      if (!paletteButton.current?.contains(e.target as Node)) setPaletteOpen(false);
      if (!fontButton.current?.contains(e.target as Node)) setFontOpen(false);
    }
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('focusin', close, true);
    paletteRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    fontRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    return () => { document.removeEventListener('pointerdown', close, true); document.removeEventListener('focusin', close, true); };
  }, [paletteOpen, fontOpen]);

  useEffect(() => {
    if (!historyOpen || !drawer.current) return;
    const element = drawer.current;
    element.querySelector<HTMLButtonElement>('button')?.focus();
    const tween = gsap.fromTo(element, { xPercent: 105, opacity: 0.6 }, { xPercent: 0, opacity: 1, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.32, ease: 'power3.out' });
    return () => { tween.kill(); };
  }, [historyOpen]);

  useEffect(() => { setDeleteConfirm(false); }, [data?.activeNoteId]);
  useEffect(() => { if (deleteConfirm) document.querySelector<HTMLButtonElement>('.delete-popover button')?.focus(); }, [deleteConfirm]);

  const note = data?.notes.find(n => n.id === data.activeNoteId);
  const activeNotes = data?.notes.filter(n => !n.archivedAt) ?? [];
  const activeIndex = activeNotes.findIndex(n => n.id === note?.id);
  const color = colors[note?.color ?? 'yellow'];
  const completed = note?.tasks.filter(t => t.completed).length ?? 0;
  const archivedNotes = data?.notes.filter(n => n.archivedAt) ?? [];
  const completedNotes = data?.notes.filter(n => !n.archivedAt && n.tasks.some(t => t.completed)) ?? [];
  const historyCount = archivedNotes.length + completedNotes.reduce((sum, n) => sum + n.tasks.filter(t => t.completed).length, 0);

  function addTask(afterId?: string) {
    if (!note) return;
    const task = newTask();
    dispatch({ type: 'add-task', noteId: note.id, task, afterId });
    setFocusTask(task.id);
  }
  async function pin() {
    if (!data || pinBusy) return;
    setPinBusy(true);
    try { await setPinned(!data.alwaysOnTop); dispatch({ type: 'pin', value: !data.alwaysOnTop }); }
    catch (e) { setError(`Couldn't change always on top. ${String(e)}`); }
    finally { setPinBusy(false); }
  }
  async function hide() {
    await saveQueue.current;
    try { await hideWindow(); if (!native) setHidden(true); }
    catch (e) { setError(String(e)); }
  }
  async function deleteNote() {
    if (!note) return;
    const last = activeNotes.length === 1;
    dispatch({ type: 'delete-note', id: note.id, replacement: newNote(note.color) });
    setDeleteConfirm(false);
    await saveQueue.current;
    if (last && !lastSaveError.current) await hide();
    else requestAnimationFrame(() => (bodyRef.current ?? document.querySelector<HTMLTextAreaElement>('.task-list textarea'))?.focus());
  }
  function keyboard(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (deleteConfirm) setDeleteConfirm(false);
      else if (clearConfirm) setClearConfirm(false);
      else if (fontOpen) { setFontOpen(false); fontButton.current?.querySelector('button')?.focus(); }
      else if (paletteOpen) { setPaletteOpen(false); paletteButton.current?.querySelector('button')?.focus(); }
      else if (historyOpen) { setHistoryOpen(false); document.querySelector<HTMLButtonElement>('[aria-label="History and archive"]')?.focus(); }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); createNote(); }
  }

  if (!data || !note) return <main className="loading-card"><StickyNote size={28} /><h1>Stickly</h1>{error ? <><p role="alert">{error}</p><p>Your saved file has been left untouched.</p><button onClick={() => location.reload()}>Try again</button></> : <p><LoaderCircle className="spin" size={14} /> Unfolding your notes…</p>}</main>;
  if (hidden) return <main className="browser-hidden"><StickyNote /><p>Your little space is tucked away.</p><button onClick={() => setHidden(false)}>Show Stickly</button><small>In the desktop app, press Alt + N to bring it back.</small></main>;

  const style = { '--paper': color.paper, '--ink': color.ink, '--accent': color.accent, '--back': color.back, '--writing-size': `${fontSizes[note.fontSize].body}px`, '--title-size': `${fontSizes[note.fontSize].title}px` } as CSSProperties;
  return <main className={`stickly ${note.color === 'charcoal' ? 'dark-paper' : ''}`} data-window-gesture={gestures.mode} style={style} onKeyDown={keyboard} {...moveGesture} onPointerDown={event => {
    if (event.currentTarget.querySelector('.paper-shell')?.getAttribute('data-peel-state') !== 'flat') return;
    const target = event.target as Element;
    if (!target.closest('.logo-drag') && target.closest('button,input,textarea,select,a,[contenteditable="true"],[data-no-peel],[role="radiogroup"],[role="alertdialog"]')) return;
    moveGesture.onPointerDown(event);
  }}>
    <PeelPaper onError={setError} paperColor={color.paper} backColor={color.back}>
      <div className="note-layout">
        <header className="note-toolbar flex items-center justify-between" data-tools-expanded={toolbarOpen}>
          <div className="wordmark"><button className="logo-drag" aria-label="Move Stickly" title="Drag to move. Arrow keys move when focused." onKeyDown={e => {
            const step = e.shiftKey ? 1 : 10;
            const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
            if (delta[e.key]) { e.preventDefault(); void moveWindowBy(...delta[e.key]).catch(error => setError(String(error))); }
          }}><img src="/stickly.svg" width="20" height="22" alt="" draggable={false} /></button><span>stickly</span></div>
          <div className="toolbar-group">
          <div id="note-controls" className="toolbar-actions flex items-center" role="toolbar" aria-label="Note controls" hidden={!toolbarOpen}>
            <IconButton label="Add a task" onClick={() => addTask()}><ListChecks /></IconButton>
            <div ref={fontButton} className="font-anchor">
              <IconButton label="Text size" expanded={fontOpen} onClick={() => { setFontOpen(!fontOpen); setPaletteOpen(false); setHistoryOpen(false); }}><Type /></IconButton>
              {fontOpen && <div ref={fontRef} data-no-peel className="font-popover" role="radiogroup" aria-label="Text size" onKeyDown={e => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
                e.preventDefault();
                const keys: FontSize[] = ['s', 'm', 'l'];
                const index = keys.indexOf(note.fontSize);
                const next = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (index + (e.key === 'ArrowLeft' ? -1 : 1) + 3) % 3;
                dispatch({ type: 'edit-note', id: note.id, patch: { fontSize: keys[next] } });
                fontRef.current?.querySelectorAll<HTMLButtonElement>('button')[next].focus();
              }}><span className="font-caption">Text size</span><div className="font-options">{(['s', 'm', 'l'] as FontSize[]).map(size => <button key={size} role="radio" aria-checked={note.fontSize === size} aria-label={fontSizes[size].name} tabIndex={note.fontSize === size ? 0 : -1} onClick={() => dispatch({ type: 'edit-note', id: note.id, patch: { fontSize: size } })}>{size.toUpperCase()}</button>)}</div></div>}
            </div>
            <IconButton label={data.alwaysOnTop ? 'Unpin from top' : 'Pin always on top'} pressed={data.alwaysOnTop} disabled={pinBusy} onClick={() => void pin()}><Pin fill={data.alwaysOnTop ? 'currentColor' : 'none'} /></IconButton>
            <div ref={paletteButton} className="palette-anchor">
              <IconButton label="Paper color" expanded={paletteOpen} onClick={() => { setPaletteOpen(!paletteOpen); setHistoryOpen(false); setFontOpen(false); }}><Palette /></IconButton>
              {paletteOpen && <div ref={paletteRef} data-no-peel className="color-palette" role="radiogroup" aria-label="Paper color" onKeyDown={e => {
                if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
                e.preventDefault();
                const keys = Object.keys(colors) as Color[];
                const i = keys.indexOf(note.color);
                const next = e.key === 'Home' ? 0 : e.key === 'End' ? keys.length - 1 : (i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + keys.length) % keys.length;
                dispatch({ type: 'edit-note', id: note.id, patch: { color: keys[next] } });
                paletteRef.current?.querySelectorAll<HTMLButtonElement>('button')[next].focus();
              }}><div className="palette-heading"><span className="palette-caption">Paper color</span><span>{color.name}</span></div><div className="swatches">{(Object.entries(colors) as [Color, typeof color][]).map(([key, c]) => <button key={key} role="radio" aria-label={c.name} aria-checked={note.color === key} tabIndex={note.color === key ? 0 : -1} title={c.name} style={{ background: c.paper, color: c.ink }} onClick={() => dispatch({ type: 'edit-note', id: note.id, patch: { color: key } })}>{note.color === key && <Check size={17} />}</button>)}</div></div>}
            </div>
            <IconButton label="History and archive" expanded={historyOpen} onClick={() => { setHistoryOpen(!historyOpen); setPaletteOpen(false); setFontOpen(false); setClearConfirm(false); }}><History /></IconButton>
            <IconButton label="Delete note" expanded={deleteConfirm} onClick={() => {
              setFontOpen(false); setPaletteOpen(false);
              if (note.title.trim() || note.body.trim() || note.tasks.some(task => task.text.trim())) setDeleteConfirm(!deleteConfirm);
              else void deleteNote();
            }}><Trash2 /></IconButton>
            <IconButton label="Hide to tray" className="close-control" onClick={() => void hide()}><X /></IconButton>
          </div>
          <button className="icon-button toolbar-toggle" type="button" aria-label={toolbarOpen ? 'Collapse controls' : 'Expand controls'} aria-expanded={toolbarOpen} aria-controls="note-controls" data-tooltip={toolbarOpen ? 'Collapse controls' : 'Expand controls'} onClick={toggleToolbar}><MoreHorizontal /></button>
          </div>
          {deleteConfirm && <div data-no-peel className="delete-popover" role="alertdialog" aria-label="Delete this note?">
            <p>Delete this note?</p><span>This permanently removes its text and checklist.</span>
            <div><button onClick={() => setDeleteConfirm(false)}>Keep note</button><button className="danger-button" onClick={() => void deleteNote()}>Delete note</button></div>
          </div>}
        </header>

        <section className="note-content" aria-label="Current note" inert={historyOpen}>
          <div className="note-heading"><input ref={titleRef} className="note-title" aria-label="Note title" placeholder="Untitled" value={note.title} maxLength={100} onChange={e => dispatch({ type: 'edit-note', id: note.id, patch: { title: e.target.value } })} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); (bodyRef.current ?? document.querySelector<HTMLTextAreaElement>('.task-list textarea'))?.focus(); } }} /></div>
          <div className="editor-scroll">
            {(!note.tasks.length || note.body.trim().length > 0) && <textarea key={note.id} ref={bodyRef} className={`note-body ${note.bodyBold ? 'bold' : ''} ${note.tasks.length ? 'with-checklist' : ''}`} aria-label="Note text" placeholder="What’s on your mind?" value={note.body} maxLength={50000} rows={1} wrap="soft" onChange={e => dispatch({ type: 'edit-note', id: note.id, patch: { body: e.target.value } })} onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); dispatch({ type: 'edit-note', id: note.id, patch: { bodyBold: !note.bodyBold } }); }
            }} />}
            <ul className="task-list" aria-label="Checklist">{note.tasks.map((task, index) => <TaskRow key={task.id} task={task} index={index} fontSize={note.fontSize} focus={focusTask === task.id} onFocused={() => setFocusTask(null)} update={patch => dispatch({ type: 'edit-task', noteId: note.id, id: task.id, patch })} add={() => addTask(task.id)} remove={() => { dispatch({ type: 'delete-task', noteId: note.id, id: task.id }); const next = note.tasks[index + 1] ?? note.tasks[index - 1]; if (next) setFocusTask(next.id); }} />)}</ul>
            {note.tasks.length > 0 && <button className="add-task" onClick={() => addTask()}><Plus size={16} /><span>Add item</span></button>}
          </div>
        </section>

        <footer className="note-footer" inert={historyOpen}>
          <div className="note-navigation"><IconButton label="Previous note" disabled={activeIndex <= 0} onClick={() => dispatch({ type: 'select-note', id: activeNotes[activeIndex - 1].id })}><ChevronLeft /></IconButton><span>{activeIndex + 1} / {activeNotes.length}</span><IconButton label="Next note" disabled={activeIndex >= activeNotes.length - 1} onClick={() => dispatch({ type: 'select-note', id: activeNotes[activeIndex + 1].id })}><ChevronRight /></IconButton></div>
          <span className="save-status" role="status" title={saveFailed ? 'Changes not saved' : saving ? 'Saving' : 'Saved on this device'}>{saveFailed ? <span className="error-dot" /> : saving ? <LoaderCircle className="spin" size={15} /> : <CheckCircle2 size={16} />}<span className="sr-only">{saveFailed ? 'Not saved' : saving ? 'Saving…' : 'All tucked in'}</span>{note.tasks.length > 0 && <span className="completion-count" aria-label={`${completed} of ${note.tasks.length} completed`}>{completed}/{note.tasks.length}</span>}</span>
          <button className="new-note" onClick={createNote}><SquarePen size={16} /> New note</button>
        </footer>

        {historyOpen && <aside ref={drawer} data-no-peel className="history-drawer" aria-label="History drawer" onKeyDown={e => {
          if (e.key !== 'Tab') return;
          const buttons = drawer.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
          if (!buttons?.length) return;
          if (e.shiftKey && document.activeElement === buttons[0]) { e.preventDefault(); buttons[buttons.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === buttons[buttons.length - 1]) { e.preventDefault(); buttons[0].focus(); }
        }}>
          <div className="drawer-heading"><IconButton label="Back to note" onClick={() => setHistoryOpen(false)}><ArrowLeft /></IconButton><div><h2>A little look back</h2><p>{historyCount} {historyCount === 1 ? 'thing' : 'things'} tucked away</p></div><History size={22} /></div>
          <div className="history-scroll">
            {!historyCount && <div className="empty-history"><Archive size={28} strokeWidth={1} /><h3>Room for your progress.</h3><p>Past notes and completed tasks live here.</p></div>}
            {completedNotes.length > 0 && <h3 className="section-caption">THE LITTLE WINS</h3>}
            {completedNotes.map(n => <div key={n.id} className="history-group"><h4>{n.title || 'Untitled note'}</h4>{n.tasks.filter(t => t.completed).map(t => <div key={t.id} className="history-task"><Check size={15} /><span>{t.text || 'An empty little thing'}</span><IconButton label={`Restore ${t.text || 'task'}`} onClick={() => dispatch({ type: 'edit-task', noteId: n.id, id: t.id, patch: { completed: false } })}><RotateCcw /></IconButton></div>)}</div>)}
            {archivedNotes.length > 0 && <h3 className="section-caption">PAST PAGES</h3>}
            {archivedNotes.map(n => <div key={n.id} className="archived-note"><span className="archive-swatch" style={{ background: colors[n.color].paper }} /><div><h4>{n.title || 'Untitled note'}</h4><span>{n.tasks.length} little {n.tasks.length === 1 ? 'thing' : 'things'}</span></div><IconButton label={`Restore note ${n.title}`} onClick={() => { dispatch({ type: 'restore-note', id: n.id }); setHistoryOpen(false); }}><RotateCcw /></IconButton></div>)}
          </div>
          <div className="drawer-footer">{clearConfirm ? <div className="clear-confirm"><p>Permanently clear completed tasks and past pages?</p><div><button onClick={() => setClearConfirm(false)}>Keep them</button><button className="danger-button" onClick={() => { dispatch({ type: 'clear-history' }); setClearConfirm(false); }}>Clear all</button></div></div> : <><button onClick={() => { dispatch({ type: 'archive-note', id: note.id, replacement: newNote(note.color) }); setHistoryOpen(false); }}><Archive size={15} /> Archive this note <ArrowUpRight size={13} /></button><button disabled={!historyCount} onClick={() => setClearConfirm(true)}><Trash2 size={14} /> Clear all history</button></>}</div>
        </aside>}
      </div>
    </PeelPaper>
    <button className="resize-handle resize-corner" aria-label="Resize note" title="Drag this corner to resize · arrow keys when focused" {...gestures.bind('resizing')} onKeyDown={e => {
      const step = e.shiftKey ? 1 : 10;
      const changes: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const delta = changes[e.key];
      if (!delta) return;
      e.preventDefault();
      void resizeBy(...delta).catch(error => setError(String(error)));
    }}><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="m4 11 7-7m-3 7 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
    {error && <div className="error-toast" role="alert"><p>{error}</p><div>{saveFailed && <button onClick={() => { setError(''); if (stateRef.current) persist(stateRef.current); }}>Retry save</button>}<button aria-label="Dismiss message" onClick={() => setError('')}><X size={15} /></button></div></div>}
  </main>;
}

function TaskRow({ task, index, fontSize, focus, onFocused, update, add, remove }: { task: Task; index: number; fontSize: FontSize; focus: boolean; onFocused: () => void; update: (patch: Partial<Task>) => void; add: () => void; remove: () => void }) {
  const text = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (focus) { text.current?.focus(); text.current?.scrollIntoView({ block: 'nearest' }); onFocused(); } }, [focus, onFocused]);
  useAutoHeight(text, task.text, `${task.bold}:${fontSize}`);
  return <li className={`task-row ${task.completed ? 'completed' : ''} ${task.bold ? 'bold' : ''}`}>
    <button className="hand-checkbox" role="checkbox" aria-checked={task.completed} aria-label={`Complete task ${index + 1}: ${task.text || 'empty task'}`} onClick={() => update({ completed: !task.completed })}><svg viewBox="0 0 26 26" aria-hidden="true"><rect className="checkbox-outline" x="4" y="4" width="18" height="18" rx="5" /><path className="checkbox-tick" d="m7.5 13 3.7 3.8L19 9" /></svg></button>
    <div className="task-text"><textarea ref={text} aria-label={`Task ${index + 1}`} rows={1} wrap="soft" value={task.text} placeholder="To do…" spellCheck={false} maxLength={2000} onChange={e => update({ text: e.target.value })} onKeyDown={e => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); update({ bold: !task.bold }); }
      if (e.key === 'Backspace' && !task.text) { e.preventDefault(); remove(); }
    }} /></div>
    <button className="delete-task" aria-label={`Delete task ${index + 1}`} title="Delete task" onClick={remove}><X size={15} /></button>
  </li>;
}

function useAutoHeight(text: RefObject<HTMLTextAreaElement | null>, value: string, layoutKey: string) {
  useEffect(() => {
    const field = text.current;
    if (!field) return;
    const resize = () => { field.style.height = 'auto'; field.style.height = `${field.scrollHeight}px`; };
    resize();
    let disposed = false;
    void document.fonts.ready.then(() => { if (!disposed) resize(); });
    let previousWidth = field.clientWidth;
    let frame = 0;
    const observer = new ResizeObserver(() => { if (field.clientWidth !== previousWidth) { previousWidth = field.clientWidth; cancelAnimationFrame(frame); frame = requestAnimationFrame(resize); } });
    observer.observe(field);
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); };
  }, [text, value, layoutKey]);
}
