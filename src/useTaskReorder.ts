import { useRef, useState, type PointerEvent, type RefObject } from 'react';

interface Drag { id: string; pointerId: number; y: number; from: number; to: number; delta: number; centers: number[] }

export function useTaskReorder(list: RefObject<HTMLUListElement | null>, move: (id: string, toIndex: number) => void) {
  const active = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  function update(e: PointerEvent<HTMLButtonElement>) {
    const current = active.current;
    if (!current || current.pointerId !== e.pointerId) return;
    e.stopPropagation();
    const center = current.centers[current.from] + e.clientY - current.y;
    const to = current.centers.reduce((best, value, index) => Math.abs(value - center) < Math.abs(current.centers[best] - center) ? index : best, 0);
    active.current = { ...current, delta: e.clientY - current.y, to };
    setDrag(active.current);
  }
  return {
    drag,
    bind(id: string, index: number) {
      return {
        onPointerDown(e: PointerEvent<HTMLButtonElement>) {
          if (e.button !== 0 || !e.isPrimary || active.current) return;
          e.preventDefault(); e.stopPropagation();
          const rows = Array.from(list.current?.querySelectorAll<HTMLElement>('.task-row') ?? []);
          if (rows.length < 2 || !rows[index]) return;
          // Snapshot centers before lifting so the translated row cannot move its own drop target.
          const centers = rows.map(row => { const r = row.getBoundingClientRect(); return r.top + r.height / 2; });
          active.current = { id, pointerId: e.pointerId, y: e.clientY, from: index, to: index, delta: 0, centers };
          setDrag(active.current);
          e.currentTarget.setPointerCapture(e.pointerId);
        },
        onPointerMove: update,
        onPointerUp(e: PointerEvent<HTMLButtonElement>) {
          update(e);
          const current = active.current;
          if (!current || current.pointerId !== e.pointerId) return;
          active.current = null; setDrag(null);
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          if (current.from !== current.to) move(current.id, current.to);
        },
        onPointerCancel() { active.current = null; setDrag(null); },
        onLostPointerCapture() { active.current = null; setDrag(null); },
        onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
          if (e.key === 'Escape') { e.stopPropagation(); active.current = null; setDrag(null); }
          if (!e.altKey || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
          e.preventDefault(); e.stopPropagation();
          move(id, index + (e.key === 'ArrowUp' ? -1 : 1));
          requestAnimationFrame(() => list.current?.querySelector<HTMLButtonElement>(`[data-reorder-id="${CSS.escape(id)}"]`)?.focus());
        },
      };
    },
  };
}
