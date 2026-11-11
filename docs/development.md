# Stickly development

[Back to the README](../README.md)

## Set up

Use Node.js 22.12 or newer, npm, Rust stable, and the [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/#windows). Commit `package-lock.json` and `src-tauri/Cargo.lock` when dependency changes are intentional.

```powershell
npm ci
npm run tauri dev
```

The frontend dev server binds to port 1420. Tauri expects this fixed port; stop an older Stickly dev server if the port is occupied. `npm run dev` runs only the renderer in a browser.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run Vite for browser UI development. |
| `npm run tauri dev` | Launch the native Windows app with the Vite renderer. |
| `npm test` | Run TypeScript model and geometry unit tests. |
| `npm run test:e2e` | Run browser interactions with Playwright. |
| `npm run build` | Type-check and build the renderer. |
| `npm run desktop:build` | Build a release executable and NSIS installer. |
| `cargo test --manifest-path src-tauri/Cargo.toml --test storage --test carry --locked` | Run Rust persistence and carry transition tests. |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings` | Lint Rust targets. |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | Check Rust formatting. |

Playwright selects installed Edge on Windows. If it is unavailable, run `npx playwright install chromium`. Native test helpers ending in `.mjs` run separately from the browser suite.

## Native test helpers

Native helpers connect to a debug WebView through Chrome DevTools Protocol. They move the actual Stickly window and exercise the current data store. Use a disposable Windows profile or back up `%APPDATA%\stickly` first. `native-smoke.mjs` also writes a recovery snapshot under the ignored `artifacts/` directory and attempts to restore the original state on exit.

Quit other Stickly instances before launching the debug instance. Tauri's single-instance plugin otherwise brings the existing process forward.

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS='--remote-debugging-port=9223'
npm run tauri dev
```

In a second terminal:

```powershell
node tests/native-smoke.mjs
```

`STICKLY_CDP_URL` overrides the default `http://127.0.0.1:9223`. Remove the WebView2 environment variable after testing. Enable remote debugging only for local development.

`node tests/native-placement.mjs` opens an owned Edge test window. Its stdin commands are `carry`, `follow`, `place`, and `quit`. Use real mouse input between commands to check cursor attachment, native click consumption, placement, and persistence. Synthetic browser events cannot validate Windows global input hooks.

## Manual Windows checklist

- Show and hide with Alt+N from a different app. Check the tray menu and Quit.
- Create, edit, complete, delete, archive, and restore notes and tasks. Relaunch and confirm data persists.
- Toggle pinning and confirm another window cannot cover the pinned note.
- Drag the header, logo, and blank paper. Edit text and use controls without starting a window gesture.
- Pull the lower-left corner slowly, pause, reverse, and release below the threshold. Pull fully, release, then click elsewhere to place. Check Escape restores the previous location.
- Confirm the placement click does not activate the application underneath.
- Resize at the lower-right grip. Test at 240 × 200 and with long wrapped text; ensure no horizontal overflow or visible scrollbars.
- Open and dismiss the palette and text-size picker by clicking blank paper and editors.
- Test Windows display scaling, monitor boundaries, a disconnected monitor, and reduced-motion settings.

Keep private notes, desktop recordings, crash dumps, and local data out of commits and issue attachments.

## Build notes

`src-tauri/tauri.conf.json` defines the borderless transparent window, content security policy, and installer assets. Capabilities are scoped in `src-tauri/capabilities/default.json`.

The development profile disables debug symbols for the Stickly package to reduce Windows linker memory use. Set `[profile.dev.package.stickly] debug = 2` in `Cargo.toml` when native debugging needs full symbols. See [Cargo profile overrides](https://doc.rust-lang.org/cargo/reference/profiles.html#overrides).

On a memory-constrained machine, run checks sequentially and set `CARGO_BUILD_JOBS=1`. Playwright supports `--workers=1`, and Vitest supports `--maxWorkers=1`.

## Before a release

Build from a clean checkout, run the automated checks and manual Windows checklist, and confirm bundled font licenses. Configure Windows code signing for signed distribution; label unsigned early previews clearly. Validate installation, upgrades, uninstall behavior, storage recovery, and the target Windows and WebView2 versions. Current development checks are not a substitute for release validation.

The public download links expect a release asset named `Stickly-Setup.exe`. Build with `npm run desktop:build`, copy the generated x64 NSIS installer to that name, and upload it with `SHA256SUMS.txt` to the matching version's GitHub Release. Keep the version in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` consistent. Publish only after testing the packaged installer. The latest release's asset name must stay the same so existing download links keep working.
