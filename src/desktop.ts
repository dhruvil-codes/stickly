import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { PhysicalSize } from '@tauri-apps/api/dpi';
import { type AppData, validateData } from './model';

export const native = isTauri();
const storageKey = 'stickly:data:v1';
export async function loadData(): Promise<AppData | null> {
  const data = native ? await invoke<AppData | null>('load_data') : JSON.parse(localStorage.getItem(storageKey) ?? 'null');
  return data === null ? null : validateData(data);
}
export async function saveData(data: AppData) {
  if (native) await invoke('save_data', { data });
  else localStorage.setItem(storageKey, JSON.stringify(data));
}
export async function setPinned(pinned: boolean) { if (native) await invoke('set_pinned', { pinned }); }
export async function hideWindow() { if (native) await invoke('hide_window'); }
export async function moveWindowBy(dx: number, dy: number) { if (native) await invoke('move_window_by', { dx, dy }); }
export async function resizeBy(width: number, height: number) {
  if (!native) return;
  const window = getCurrentWindow();
  const [size, scale] = await Promise.all([window.innerSize(), window.scaleFactor()]);
  const pixels = (delta: number) => Math.sign(delta) * Math.round(Math.abs(delta) * scale);
  await window.setSize(new PhysicalSize(Math.max(Math.round(240 * scale), size.width + pixels(width)), Math.max(Math.round(200 * scale), size.height + pixels(height))));
}
export async function onNewNote(callback: () => void) { return native ? listen('stickly:new-note', callback) : () => {}; }
export async function onStorageError(callback: (message: string) => void) { return native ? listen<string>('stickly:storage-error', event => callback(event.payload)) : () => {}; }
export async function onQuitRequested(callback: () => Promise<void>) { return native ? listen('stickly:quit-requested', () => { void callback(); }) : () => {}; }
export async function quitApp() { if (native) await invoke('quit_app'); }
export async function beginCarry(offsetX: number, offsetY: number) { if (native) await invoke('begin_carry', { offsetX, offsetY }); }
export async function cancelCarry() { if (native) await invoke('cancel_carry'); }
export async function onCarryFinished(callback: (cancelled: boolean) => void) { return native ? listen<{ cancelled: boolean }>('stickly:carry-finished', event => callback(event.payload.cancelled)) : () => {}; }
export async function windowSize() {
  if (!native) return { width: innerWidth, height: innerHeight };
  const window = getCurrentWindow();
  const [size, scale] = await Promise.all([window.innerSize(), window.scaleFactor()]);
  return { width: size.width / scale, height: size.height / scale };
}
export async function setWindowSize(width: number, height: number) {
  if (!native) return;
  const window = getCurrentWindow();
  const scale = await window.scaleFactor();
  await window.setSize(new PhysicalSize(Math.round(Math.max(240, width) * scale), Math.round(Math.max(200, height) * scale)));
}
