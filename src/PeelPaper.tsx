import { useEffect, useId, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import { gsap } from 'gsap';
import { beginCarry, cancelCarry, native, onCarryFinished } from './desktop';
import { curlGeometry, dragProgress, nearestCorner, peelDirection, peelThreshold, type Corner, type Point } from './curlGeometry';

type Status = 'flat' | 'peeling' | 'detaching' | 'carrying' | 'pasting';
interface Gesture { id: number; x: number; y: number; width: number; height: number; started: boolean; value: number }
interface Props { children: ReactNode; onError: (message: string) => void; paperColor?: string; backColor?: string }

export function PeelPaper({ children, onError, paperColor = '#b9e9f4', backColor = '#f6fdff' }: Props) {
  const paper = useRef<HTMLDivElement>(null);
  const phase = useRef<Status>('flat');
  const gesture = useRef<Gesture | null>(null);
  const motion = useRef({ value: 0 });
  const frame = useRef(0);
  const direction = useRef<Point>({ x: Math.SQRT1_2, y: Math.SQRT1_2 });
  const grip = useRef({ x: 0, y: 0 });
  const browserCarry = useRef({ x: 0, y: 0 });
  const browserOrigin = useRef({ x: 0, y: 0 });
  const browserInitial = useRef({ x: 0, y: 0 });
  const browserPosition = useRef({ x: 0, y: 0 });
  const mounted = useRef(false);
  const ready = useRef<Promise<void>>(Promise.resolve());
  const beginning = useRef<Promise<void>>(Promise.resolve());
  const listenerError = useRef<unknown>(null);
  const cancelRequested = useRef(false);
  const cycle = useRef(0);
  const swallowClick = useRef(false);
  const errorHandler = useRef(onError);
  errorHandler.current = onError;
  const [status, setStatus] = useState<Status>('flat');
  const [carryReady, setCarryReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [normal, setNormal] = useState(direction.current);
  const [size, setSize] = useState({ width: 340, height: 400 });
  const [corner, setCorner] = useState<Corner>('bottom-left');
  const [announcement, setAnnouncement] = useState('');
  const id = useId().replace(/:/g, '');
  const pose = status === 'carrying' || status === 'pasting' ? 'held' : 'removal';
  const shape = curlGeometry(size.width, size.height, progress, corner, normal, pose);
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function changeStatus(next: Status) { phase.current = next; setStatus(next); }
  function draw(value: number) { motion.current.value = value; setProgress(value); setNormal(direction.current); }
  function positionBrowser() {
    const host = paper.current?.closest<HTMLElement>('.stickly');
    if (host) host.style.translate = `${browserPosition.current.x}px ${browserPosition.current.y}px`;
  }
  function animateTo(value: number, duration: number, complete: () => void) {
    gsap.killTweensOf(motion.current);
    gsap.to(motion.current, { value, duration: reduced() ? 0 : duration, ease: value === 0 ? 'power3.out' : 'power2.inOut',
      onUpdate: () => { if (mounted.current) setProgress(motion.current.value); },
      onComplete: () => { if (mounted.current) complete(); },
    });
  }
  function restore(cancelled: boolean) {
    if (!mounted.current || phase.current !== 'carrying') return;
    cancelRequested.current = false;
    setCarryReady(true);
    if (!native && cancelled && paper.current) {
      browserPosition.current = { ...browserInitial.current };
      positionBrowser();
    }
    changeStatus('pasting');
    draw(1);
    setAnnouncement(cancelled ? 'Restoring note.' : 'Applying note here.');
    animateTo(0, .46, () => {
      changeStatus('flat');
      setAnnouncement(cancelled ? 'Note restored.' : 'Note applied.');
    });
  }
  function detach() {
    if (phase.current !== 'peeling') return;
    gesture.current = null;
    draw(1);
    changeStatus('detaching');
    setAnnouncement('Note fully peeled away.');
    // Complete the release before handing the same visible paper to native cursor tracking.
    frame.current = requestAnimationFrame(() => {
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        if (mounted.current && phase.current === 'detaching') attachToCursor();
      });
    });
  }
  function attachToCursor() {
    setCarryReady(!native);
    grip.current = curlGeometry(size.width, size.height, 1, corner, direction.current, 'held').gripPoint;
    browserInitial.current = { ...browserPosition.current };
    if (!native && paper.current) {
      const bounds = paper.current.getBoundingClientRect();
      browserPosition.current = { x: browserPosition.current.x + browserCarry.current.x - bounds.left - grip.current.x, y: browserPosition.current.y + browserCarry.current.y - bounds.top - grip.current.y };
      positionBrowser();
    }
    browserOrigin.current = { ...browserPosition.current };
    draw(1);
    changeStatus('carrying');
    setAnnouncement('Peeled note is following your cursor. Release, then click to apply. Escape cancels.');
    const token = ++cycle.current;
    beginning.current = ready.current.then(async () => {
      if (!mounted.current || cycle.current !== token || phase.current !== 'carrying') return;
      if (listenerError.current) throw listenerError.current;
      await beginCarry(grip.current.x, grip.current.y);
      if (mounted.current && cycle.current === token && phase.current === 'carrying') setCarryReady(true);
    }).catch(error => {
      if (!mounted.current || cycle.current !== token) return;
      restore(true);
      errorHandler.current(`Couldn't pick up the note. ${String(error)}`);
    });
  }
  function springBack() {
    cancelAnimationFrame(frame.current); frame.current = 0;
    const pointerId = gesture.current?.id;
    gesture.current = null;
    changeStatus('peeling');
    if (pointerId !== undefined && paper.current?.hasPointerCapture(pointerId)) paper.current.releasePointerCapture(pointerId);
    animateTo(0, .38, () => changeStatus('flat'));
  }

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    ready.current = onCarryFinished(cancelled => restore(cancelled)).then(fn => {
      if (disposed) fn(); else unlisten = fn;
    }).catch(error => { listenerError.current = error; errorHandler.current(String(error)); });
    const measure = () => {
      if (!paper.current) return;
      const bounds = paper.current.getBoundingClientRect();
      if (bounds.width && bounds.height) setSize({ width: bounds.width, height: bounds.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (paper.current) observer.observe(paper.current);
    function pointer(event: globalThis.PointerEvent) {
      if (native || phase.current !== 'carrying' || event.button !== 0) return;
      follow(event);
      event.preventDefault(); event.stopPropagation(); swallowClick.current = true;
      restore(false);
    }
    function follow(event: globalThis.PointerEvent) {
      if (phase.current !== 'carrying') { browserCarry.current = { x: event.clientX, y: event.clientY }; return; }
      if (native || phase.current !== 'carrying' || !paper.current) return;
      const dx = event.clientX - browserCarry.current.x, dy = event.clientY - browserCarry.current.y;
      browserPosition.current = { x: browserOrigin.current.x + dx, y: browserOrigin.current.y + dy };
      positionBrowser();
    }
    function click(event: globalThis.MouseEvent) {
      if (!swallowClick.current) return;
      swallowClick.current = false; event.preventDefault(); event.stopPropagation();
    }
    function key(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape' || !['peeling', 'detaching', 'carrying'].includes(phase.current)) return;
      event.preventDefault(); event.stopPropagation();
      if (phase.current === 'peeling' || phase.current === 'detaching') { springBack(); return; }
      if (!native) { restore(true); return; }
      if (cancelRequested.current) return;
      cancelRequested.current = true;
      void beginning.current.then(() => {
        if (phase.current === 'carrying' && cancelRequested.current) return cancelCarry();
      }).catch(error => { cancelRequested.current = false; errorHandler.current(String(error)); });
    }
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('pointermove', follow, true);
    document.addEventListener('click', click, true);
    window.addEventListener('keydown', key, true);
    return () => {
      disposed = true; mounted.current = false; unlisten?.(); observer.disconnect();
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('pointermove', follow, true);
      document.removeEventListener('click', click, true);
      window.removeEventListener('keydown', key, true);
      gsap.killTweensOf(motion.current);
      cancelAnimationFrame(frame.current);
      if (phase.current === 'carrying' && !cancelRequested.current) {
        cancelRequested.current = true;
        void beginning.current.then(cancelCarry).catch(() => {});
      }
    };
  }, []);

  function start(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary || phase.current !== 'flat') return;
    const target = event.target as Element;
    const windowGesture = event.currentTarget.closest('.stickly')?.getAttribute('data-window-gesture');
    if (windowGesture && windowGesture !== 'idle') return;
    if (target.closest('[data-no-peel],[role="alertdialog"],[role="radiogroup"]')) return;
    const handle = target.closest('[data-peel-handle]');
    const control = target.closest('button,input,textarea,select,a,[contenteditable="true"],[role="button"],[role="checkbox"]');
    const editorOverride = event.altKey && control?.matches('input,textarea,[contenteditable="true"]');
    if (!handle && !event.altKey) return;
    if (!handle && control && !editorOverride) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setSize({ width: bounds.width, height: bounds.height });
    setCorner(handle?.getAttribute('data-peel-handle') === 'bottom-left' ? 'bottom-left' : nearestCorner(event.clientX - bounds.left, event.clientY - bounds.top, bounds.width, bounds.height));
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, width: bounds.width, height: bounds.height, started: false, value: 0 };
    gsap.killTweensOf(motion.current);
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (!active || event.pointerId !== active.id) return;
    const dx = event.clientX - active.x, dy = event.clientY - active.y;
    direction.current = peelDirection(dx, dy);
    const value = dragProgress(dx, dy, peelThreshold(active.width, active.height, direction.current));
    if (!active.started && value === 0) return;
    if (!active.started) { active.started = true; changeStatus('peeling'); }
    event.preventDefault(); event.stopPropagation();
    active.value = value;
    browserCarry.current = { x: event.clientX, y: event.clientY };
    if (!frame.current) frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (gesture.current !== active) return;
      draw(active.value);
      if (active.value >= 1) {
        swallowClick.current = true;
        detach();
        if (paper.current?.hasPointerCapture(active.id)) paper.current.releasePointerCapture(active.id);
      }
    });
  }
  function end(event: ReactPointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    cancelAnimationFrame(frame.current); frame.current = 0;
    if (active.started) {
      swallowClick.current = true;
      if (active.value >= 1) { draw(1); detach(); }
      else springBack();
    } else gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <div ref={paper} className={`paper-shell ${status}`} data-peel-state={status} data-peel-pose={pose} data-peel-progress={progress.toFixed(4)} data-grip-x={shape.gripPoint.x} data-grip-y={shape.gripPoint.y} onPointerDownCapture={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
    <div className="paper-presentation" style={{ visibility: status === 'carrying' && !carryReady ? 'hidden' : 'visible' }}>
    <div className="paper-surface" style={{ transform: shape.surfaceTransform }}>
    <svg className="peel-layer" aria-hidden="true" viewBox={`0 0 ${size.width} ${size.height}`}>
      <defs>
        <clipPath id={`${id}-front`} clipPathUnits="userSpaceOnUse"><path d={shape.frontPath} /></clipPath>
        <linearGradient id={`${id}-back`} gradientUnits="userSpaceOnUse" x1={shape.gradientStart.x} y1={shape.gradientStart.y} x2={shape.gradientEnd.x} y2={shape.gradientEnd.y}>
          <stop offset="0" stopColor={paperColor} /><stop offset=".18" stopColor={backColor} /><stop offset="1" stopColor={backColor} />
        </linearGradient>
        <linearGradient id={`${id}-shade`} gradientUnits="userSpaceOnUse" x1={shape.gradientStart.x} y1={shape.gradientStart.y} x2={shape.gradientEnd.x} y2={shape.gradientEnd.y}>
          <stop offset="0" stopColor="#000" stopOpacity=".16" /><stop offset=".16" stopColor="#fff" stopOpacity=".12" /><stop offset=".5" stopColor="#fff" stopOpacity=".025" /><stop offset="1" stopColor="#000" stopOpacity=".025" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={shape.shadowBlur} /><feOffset dx="1" dy="2" /></filter>
      </defs>
      {progress > 0 && !(pose === 'removal' && progress >= 1) && <g>
        <path d={shape.backPath} fill="#000" opacity=".18" filter={`url(#${id}-shadow)`} />
        <path d={shape.backPath} fill={`url(#${id}-back)`} />
        <path d={shape.backPath} fill={`url(#${id}-shade)`} stroke="#ffffff30" strokeWidth=".45" />
        <path d={shape.creasePath} fill="none" stroke="#ffffff40" strokeWidth=".6" />
      </g>}
    </svg>
    <div className="paper-front" style={{ clipPath: progress > 0 ? `url(#${id}-front)` : undefined }} inert={status !== 'flat'}>{children}</div>
    </div>
    </div>
    <button className="peel-handle left" data-peel-handle="bottom-left" aria-label="Peel left corner" title="Drag to peel. Release a short pull to return; peel fully, then click to apply. Escape cancels." onKeyDown={event => {
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat && phase.current === 'flat') {
        event.preventDefault(); event.stopPropagation();
        setCorner('bottom-left'); changeStatus('peeling');
        direction.current = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
        setNormal(direction.current);
        animateTo(1, .65, detach);
      }
    }}><span /></button>
    <span className="sr-only" role="status">{announcement}</span>
  </div>;
}
