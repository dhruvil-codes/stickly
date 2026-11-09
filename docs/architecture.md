# Stickly architecture

[Back to the README](../README.md)

Stickly has one Tauri desktop window. React renders the paper and editors in WebView2; Rust owns Windows integration and local file persistence. Browser development uses the same UI with a localStorage fallback.

## Source map

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | Note editor, optional checklists, toolbar, pickers, navigation, archive, and save lifecycle. |
| `src/App.css` | Paper, bundled typography, responsive spacing, scroll behavior, and motion styles. |
| `src/model.ts` | Typed note/task data, reducer operations, defaults, migrations, and validation. |
| `src/PeelPaper.tsx` | Pointer-driven peel, release, cursor carry presentation, and apply animation. |
| `src/curlGeometry.ts` | Clipping polygons, crease calculations, reflection, and curled-sheet geometry. |
| `src/useWindowGestures.ts` | Normal window movement and resize gestures, separate from editors and peeling. |
| `src/desktop.ts` | Typed Tauri commands/events and browser storage fallback. |
| `src-tauri/src/lib.rs` | App setup, commands, tray, global shortcut, pinning, and lifecycle. |
| `src-tauri/src/storage.rs` | Validated JSON storage, atomic replacement, backup, and position-write coalescing. |
| `src-tauri/src/carry.rs` | Temporary Windows input hooks and cursor-following native window movement. |
| `src-tauri/src/carry_core.rs` | Carry transitions and placement bounds, testable without WebView2. |

## Note data

The version-1 document stores `notes`, `activeNoteId`, `alwaysOnTop`, and `windowPosition`. Each note stores its title, multiline body, body bold state, S/M/L text size, color, tasks, creation time, and optional archive time. Tasks store text, bold/completed state, and creation time.

TypeScript validates loaded data and applies migrations for older note bodies and text sizes. Rust independently validates incoming storage data. Invalid or unsupported files remain untouched.

Rust serializes background writes, keeps a previous-snapshot backup, and performs atomic replacement of the main JSON file. Position changes coalesce after 150 ms idle. Tray Quit waits for pending editor and position saves. The native app restores saved positions only when they overlap a connected display.

## Peel geometry and lifecycle

The user controls the removal distance. A crease advances across the note while the front is clipped and the underside is reflected across it. Those two faces form one moving fold; the UI does not add a second central fold or clone the editor into a separate sheet.

A short pull returns to flat. After complete removal, the renderer presents the curled carry pose and Rust aligns the native window to the cursor grip. The Windows tracker updates position at a 16 ms interval without sending per-frame movement through frontend IPC or writing every position to disk.

The initial release arms placement. A later left click finishes carry, and the renderer unfolds the note at the held position. Escape cancels and restores the original position. Temporary input hooks are removed when carry finishes. Carry temporarily raises the window, then restores its prior pin state.

Normal dragging uses a separate gesture path. Text inputs, task controls, popovers, and resize handles keep their own pointer behavior.

## Desktop boundary

Tauri commands handle loading/saving, visibility, pinning, movement, and carry. Events report tray requests, storage failures, quit requests, and carry completion. Native movement validates coordinates and accounts for display scaling.

The production content security policy allows bundled scripts, styles, fonts, images, and Tauri IPC. Stickly has no application backend service or cloud sync. Fonts load from bundled assets.

## Test boundaries

Vitest checks the reducer, validation, migration, and geometry. Playwright checks the renderer in a browser. Rust integration tests include storage and carry logic without launching WebView2.

The native smoke and placement helpers exercise a running Windows debug build. Physical placement-click consumption, DPI changes, multiple monitors, and installer behavior also need real desktop checks before a production release.
