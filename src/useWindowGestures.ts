import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { moveWindowBy, setWindowSize, windowSize } from './desktop';

type Kind = 'moving' | 'resizing';
interface Gesture { kind: Kind; id: number; pressX: number; pressY: number; lastX: number; lastY: number; size?: { width: number; height: number } }
type Operation = { kind: 'moving'; dx: number; dy: number } | { kind: 'resizing'; width: number; height: number };

export function useWindowGestures(onError: (message: string) => void) {
  const active = useRef<Gesture | null>(null);
  const pending = useRef<Operation | null>(null);
  const busy = useRef(false);
  const frame = useRef(0);
  const [mode, setMode] = useState<Kind | 'idle'>('idle');
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  async function flush() {
    if (busy.current) return;
    busy.current = true;
    try {
      while (pending.current) {
        const operation = pending.current;
        pending.current = null;
        if (operation.kind === 'moving') await moveWindowBy(operation.dx, operation.dy);
        else await setWindowSize(operation.width, operation.height);
      }
    } catch (error) { pending.current = null; onError(String(error)); }
    finally { busy.current = false; }
  }

  function update(event: PointerEvent<HTMLElement>) {
    const gesture = active.current;
    if (!gesture || event.pointerId !== gesture.id) return;
    event.stopPropagation();
    if (gesture.kind === 'moving') {
      const queued = pending.current?.kind === 'moving' ? pending.current : { dx: 0, dy: 0 };
      pending.current = { kind: 'moving', dx: queued.dx + event.screenX - gesture.lastX, dy: queued.dy + event.screenY - gesture.lastY };
    } else if (gesture.size) {
      pending.current = { kind: 'resizing', width: gesture.size.width + event.screenX - gesture.pressX, height: gesture.size.height + event.screenY - gesture.pressY };
    }
    gesture.lastX = event.screenX; gesture.lastY = event.screenY;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => void flush());
  }

  function end(event: PointerEvent<HTMLElement>) {
    if (!active.current || active.current.id !== event.pointerId) return;
    if (event.type === 'pointerup') update(event);
    active.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    cancelAnimationFrame(frame.current);
    void flush();
    setMode('idle');
  }

  function bind(kind: Kind) {
    return {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0 || !event.isPrimary || active.current) return;
        event.preventDefault(); event.stopPropagation();
        const gesture: Gesture = { kind, id: event.pointerId, pressX: event.screenX, pressY: event.screenY, lastX: event.screenX, lastY: event.screenY };
        active.current = gesture; setMode(kind);
        event.currentTarget.setPointerCapture(event.pointerId);
        if (kind === 'resizing') void windowSize().then(size => {
          if (active.current !== gesture) return;
          gesture.size = size;
          pending.current = { kind: 'resizing', width: size.width + gesture.lastX - gesture.pressX, height: size.height + gesture.lastY - gesture.pressY };
          void flush();
        }).catch(error => { active.current = null; setMode('idle'); onError(String(error)); });
      },
      onPointerMove: update,
      onPointerUp: end,
      onPointerCancel: end,
      onLostPointerCapture: end,
    };
  }
  return { bind, mode };
}
