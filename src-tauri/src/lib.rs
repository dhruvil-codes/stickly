mod carry;
#[cfg(windows)]
mod carry_core;
mod storage;

use carry::CarryManager;
use storage::{AppData, Position, PositionWriter, Store};
use tauri::{Emitter, Manager, PhysicalPosition, State, WebviewWindow};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

#[tauri::command]
async fn begin_carry(
    app: tauri::AppHandle,
    window: WebviewWindow,
    offset_x: f64,
    offset_y: f64,
) -> Result<(), String> {
    let (sender, receiver) = std::sync::mpsc::sync_channel(1);
    let handle = app.clone();
    app.run_on_main_thread(move || {
        let result = handle
            .state::<CarryManager>()
            .begin(&handle, &window, offset_x, offset_y);
        let _ = sender.send(result);
    })
    .map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || receiver.recv().map_err(|e| e.to_string())?)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn cancel_carry(app: tauri::AppHandle) -> Result<(), String> {
    let (sender, receiver) = std::sync::mpsc::sync_channel(1);
    let handle = app.clone();
    app.run_on_main_thread(move || {
        handle.state::<CarryManager>().cancel(&handle);
        let _ = sender.send(());
    })
    .map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || receiver.recv().map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn load_data(app: tauri::AppHandle) -> Result<Option<AppData>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let store = app.state::<Store>();
        let inner = store.inner.lock().map_err(|e| e.to_string())?;
        if let Some(error) = &inner.error {
            return Err(error.clone());
        }
        Ok(inner.data.clone())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn save_data(app: tauri::AppHandle, data: AppData) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || app.state::<Store>().save(data))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn set_pinned(window: WebviewWindow, store: State<'_, Store>, pinned: bool) -> Result<(), String> {
    let mut inner = store.inner.lock().map_err(|e| e.to_string())?;
    if let Some(error) = &inner.error {
        return Err(error.clone());
    }
    window
        .set_always_on_top(pinned)
        .map_err(|e| e.to_string())?;
    if let Some(mut data) = inner.data.clone() {
        data.always_on_top = pinned;
        if let Err(error) = store.commit(&mut inner, data) {
            let _ = window.set_always_on_top(inner.pinned);
            return Err(error);
        }
    }
    inner.pinned = pinned;
    Ok(())
}

#[tauri::command]
fn hide_window(app: tauri::AppHandle, window: WebviewWindow) -> Result<(), String> {
    app.state::<CarryManager>().cancel(&app);
    window.hide().map_err(|e| e.to_string())
}

#[tauri::command]
async fn quit_app(app: tauri::AppHandle) -> Result<(), String> {
    cancel_carry(app.clone()).await?;
    let handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || handle.state::<PositionWriter>().flush())
        .await
        .map_err(|e| e.to_string())??;
    app.exit(0);
    Ok(())
}

#[tauri::command]
fn move_window_by(window: WebviewWindow, dx: f64, dy: f64) -> Result<(), String> {
    if !dx.is_finite() || !dy.is_finite() || dx.abs() > 10000.0 || dy.abs() > 10000.0 {
        return Err("Invalid window movement".into());
    }
    let current = window.outer_position().map_err(|e| e.to_string())?;
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    window
        .set_position(PhysicalPosition::new(
            current.x.saturating_add((dx * scale).round() as i32),
            current.y.saturating_add((dy * scale).round() as i32),
        ))
        .map_err(|e| e.to_string())
}

fn show(app: &tauri::AppHandle) {
    app.state::<CarryManager>().cancel(app);
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn toggle(app: &tauri::AppHandle) {
    if app.state::<CarryManager>().cancel(app) {
        return;
    }
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) && !window.is_minimized().unwrap_or(false) {
            let _ = window.hide();
        } else {
            show(app);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CarryManager::default())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| show(app)))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Use roaming AppData/stickly, independent of the bundle identifier.
            let data_dir = app.path().data_dir()?.join("stickly");
            let store = Store::open(data_dir.join("data.json"));
            let (position, pinned) = {
                let inner = store.inner.lock().map_err(|e| e.to_string())?;
                (inner.position, inner.pinned)
            };
            app.manage(store);
            let handle = app.handle().clone();
            app.manage(PositionWriter::new(move |position| {
                let result = handle.state::<Store>().position(position);
                if let Err(error) = &result {
                    eprintln!("Could not save window position: {error}");
                    let _ = handle.emit("stickly:storage-error", error);
                }
                result
            }));
            if let Some(window) = app.get_webview_window("main") {
                window.set_always_on_top(pinned)?;
                if let Some(position) = position {
                    let window_size = window.outer_size()?;
                    let reachable = window.available_monitors()?.iter().any(|monitor| {
                        let origin = monitor.position();
                        let size = monitor.size();
                        let w = window_size.width as i64;
                        let h = window_size.height as i64;
                        let overlap_x = (position.x as i64 + w)
                            .min(origin.x as i64 + size.width as i64)
                            - (position.x as i64).max(origin.x as i64);
                        let overlap_y = (position.y as i64 + h)
                            .min(origin.y as i64 + size.height as i64)
                            - (position.y as i64).max(origin.y as i64);
                        overlap_x >= 80 && overlap_y >= 80
                    });
                    if reachable {
                        window.set_position(PhysicalPosition::new(position.x, position.y))?;
                    }
                }
            }
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
            let show_item = MenuItem::with_id(app, "show", "Show / Hide", true, None::<&str>)?;
            let new_item = MenuItem::with_id(app, "new", "New Note", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Stickly", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &new_item, &quit_item])?;
            let mut tray = TrayIconBuilder::new()
                .tooltip("Stickly - Alt+N")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => toggle(app),
                    "new" => {
                        show(app);
                        let _ = app.emit("stickly:new-note", ());
                    }
                    "quit" => {
                        app.state::<CarryManager>().cancel(app);
                        let _ = app.emit("stickly:quit-requested", ());
                    }
                    _ => (),
                })
                .on_tray_icon_event(|tray, event| {
                    if matches!(
                        event,
                        TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        }
                    ) {
                        toggle(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            // Another program may own Alt+N; leave the app usable if registration fails.
            if let Err(error) = app.global_shortcut().register("Alt+N") {
                eprintln!("Could not register Alt+N: {error}");
            }
            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                window.state::<CarryManager>().cancel(window.app_handle());
                let _ = window.hide();
            }
            tauri::WindowEvent::Moved(position) => {
                if window.state::<CarryManager>().is_active() {
                    return;
                }
                if let Some(writer) = window.try_state::<PositionWriter>()
                    && let Err(error) = writer.moved(Position {
                        x: position.x,
                        y: position.y,
                    })
                {
                    eprintln!("Could not save window position: {error}");
                    let _ = window.emit("stickly:storage-error", error);
                }
            }
            _ => (),
        })
        .invoke_handler(tauri::generate_handler![
            load_data,
            save_data,
            set_pinned,
            hide_window,
            move_window_by,
            begin_carry,
            cancel_carry,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running Stickly");
}
