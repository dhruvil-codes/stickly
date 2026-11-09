#[cfg(windows)]
mod windows {
    use crate::carry_core::{CarryState, Point, following};
    use crate::storage::{Position, PositionWriter};
    use std::{
        cell::RefCell,
        ptr::null_mut,
        sync::{
            Mutex,
            atomic::{AtomicBool, Ordering},
            mpsc,
        },
        thread::JoinHandle,
    };
    use tauri::{Emitter, Manager, PhysicalPosition, WebviewWindow};
    use windows_sys::Win32::{
        Foundation::{HWND, LPARAM, LRESULT, WPARAM},
        System::{LibraryLoader::GetModuleHandleW, Threading::GetCurrentThreadId},
        UI::{
            Input::KeyboardAndMouse::{GetAsyncKeyState, VK_ESCAPE, VK_LBUTTON},
            WindowsAndMessaging::*,
        },
    };

    const ACTIVATE: u32 = WM_APP + 51;
    const CANCEL: u32 = WM_APP + 52;
    const FOLLOW_INTERVAL_MS: u32 = 16;

    struct HookState {
        active: bool,
        carry: CarryState,
    }
    thread_local! {
        static HOOK_STATE: RefCell<HookState> = const { RefCell::new(HookState { active: false, carry: CarryState::Armed }) };
    }

    struct Worker {
        thread_id: u32,
        join: Option<JoinHandle<()>>,
    }

    impl Worker {
        fn post(&self, message: u32) -> Result<(), String> {
            // The worker creates its message queue before reporting readiness.
            if unsafe { PostThreadMessageW(self.thread_id, message, 0, 0) } == 0 {
                Err(std::io::Error::last_os_error().to_string())
            } else {
                Ok(())
            }
        }
    }

    impl Drop for Worker {
        fn drop(&mut self) {
            let _ = self.post(CANCEL);
            if let Some(join) = self.join.take() {
                let _ = join.join();
            }
        }
    }

    struct Session {
        id: u64,
        original: PhysicalPosition<i32>,
        pinned: bool,
        grip: Point,
        _worker: Worker,
    }

    #[derive(Default)]
    struct Inner {
        serial: u64,
        session: Option<Session>,
    }

    #[derive(Default)]
    pub struct CarryManager {
        inner: Mutex<Inner>,
        active: AtomicBool,
    }

    #[derive(Clone, serde::Serialize)]
    struct Finished {
        cancelled: bool,
    }

    fn reveal(window: &WebviewWindow, cancelled: bool) {
        let _ = window.emit("stickly:carry-finished", Finished { cancelled });
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }

    fn restore(window: &WebviewWindow, pinned: bool, cancelled: bool) {
        let _ = window.set_ignore_cursor_events(false);
        let _ = window.set_always_on_top(pinned);
        reveal(window, cancelled);
    }

    fn remember_position(window: &WebviewWindow) {
        // The final position may equal the last preview, producing no new Moved event.
        if let Ok(position) = window.outer_position()
            && let Some(writer) = window.try_state::<PositionWriter>()
            && let Err(error) = writer.moved(Position {
                x: position.x,
                y: position.y,
            })
        {
            eprintln!("Could not save window position: {error}");
            let _ = window.emit("stickly:storage-error", error);
        }
    }

    impl CarryManager {
        // All entry points run on the main thread; hooks never take this mutex.
        pub fn is_active(&self) -> bool {
            self.active.load(Ordering::Acquire)
        }

        pub fn begin(
            &self,
            app: &tauri::AppHandle,
            window: &WebviewWindow,
            offset_x: f64,
            offset_y: f64,
        ) -> Result<(), String> {
            let mut inner = self.inner.lock().unwrap_or_else(|e| e.into_inner());
            if inner.session.is_some() {
                return Err("A note is already being carried".into());
            }
            let original = window.outer_position().map_err(|e| e.to_string())?;
            let scale = window.scale_factor().map_err(|e| e.to_string())?;
            if !offset_x.is_finite()
                || !offset_y.is_finite()
                || offset_x.abs() > 10000.0
                || offset_y.abs() > 10000.0
            {
                return Err("Invalid note grip position".into());
            }
            let grip = Point {
                x: (offset_x * scale).round() as i32,
                y: (offset_y * scale).round() as i32,
            };
            let mut cursor = unsafe { std::mem::zeroed() };
            if unsafe { GetCursorPos(&mut cursor) } == 0 {
                return Err(std::io::Error::last_os_error().to_string());
            }
            let target = following(
                Point {
                    x: cursor.x,
                    y: cursor.y,
                },
                grip,
            );
            let pinned = window.is_always_on_top().map_err(|e| e.to_string())?;
            let hwnd = window.hwnd().map_err(|e| e.to_string())?.0 as usize;
            inner.serial = inner.serial.wrapping_add(1);
            let id = inner.serial;
            let worker = start_worker(app.clone(), id, hwnd, grip)?;
            self.active.store(true, Ordering::Release);
            if let Err(error) = window
                .set_always_on_top(true)
                .and_then(|_| window.set_ignore_cursor_events(true))
                .and_then(|_| window.show())
                .and_then(|_| window.set_position(PhysicalPosition::new(target.x, target.y)))
            {
                drop(worker);
                self.active.store(false, Ordering::Release);
                let _ = window.set_position(original);
                restore(window, pinned, true);
                return Err(error.to_string());
            }
            if let Err(error) = worker.post(ACTIVATE) {
                drop(worker);
                self.active.store(false, Ordering::Release);
                let _ = window.set_position(original);
                restore(window, pinned, true);
                return Err(error);
            }
            inner.session = Some(Session {
                id,
                original,
                pinned,
                grip,
                _worker: worker,
            });
            Ok(())
        }

        pub fn cancel(&self, app: &tauri::AppHandle) -> bool {
            let session = self
                .inner
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .session
                .take();
            if let Some(session) = session {
                let original = session.original;
                let pinned = session.pinned;
                drop(session); // Unhook and join before restoring the visible note.
                self.active.store(false, Ordering::Release);
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_position(original);
                    restore(&window, pinned, true);
                    remember_position(&window);
                }
                true
            } else {
                false
            }
        }

        fn finish(&self, app: &tauri::AppHandle, id: u64, point: Option<Point>) {
            let session = {
                let mut inner = self.inner.lock().unwrap_or_else(|e| e.into_inner());
                if !inner
                    .session
                    .as_ref()
                    .is_some_and(|session| session.id == id)
                {
                    return;
                }
                inner.session.take().unwrap()
            };
            let original = session.original;
            let pinned = session.pinned;
            let grip = session.grip;
            drop(session);
            self.active.store(false, Ordering::Release);
            if let Some(window) = app.get_webview_window("main") {
                let placed = point.is_some_and(|point| place(&window, point, grip).is_ok());
                if !placed {
                    let _ = window.set_position(original);
                }
                restore(&window, pinned, !placed);
                remember_position(&window);
            }
        }
    }

    fn place(window: &WebviewWindow, point: Point, grip: Point) -> Result<(), String> {
        let position = following(point, grip);
        window
            .set_position(PhysicalPosition::new(position.x, position.y))
            .map_err(|e| e.to_string())
    }

    fn start_worker(
        app: tauri::AppHandle,
        id: u64,
        hwnd: usize,
        grip: Point,
    ) -> Result<Worker, String> {
        let (ready_tx, ready_rx) = mpsc::sync_channel(1);
        let join = std::thread::Builder::new()
            .name("stickly-carry".into())
            .spawn(move || {
                let result = unsafe { hook_loop(ready_tx, hwnd as HWND, grip) };
                if let Some(point) = result {
                    let handle = app.clone();
                    // Both hooks have been removed before any UI work is dispatched.
                    let _ = app.run_on_main_thread(move || {
                        handle.state::<CarryManager>().finish(&handle, id, point)
                    });
                }
            })
            .map_err(|e| e.to_string())?;
        match ready_rx.recv() {
            Ok(Ok(thread_id)) => Ok(Worker {
                thread_id,
                join: Some(join),
            }),
            Ok(Err(error)) => {
                let _ = join.join();
                Err(error)
            }
            Err(error) => {
                let _ = join.join();
                Err(error.to_string())
            }
        }
    }

    // None means startup failure or explicit cancellation, Some(None) means global Escape/error.
    unsafe fn hook_loop(
        ready: mpsc::SyncSender<Result<u32, String>>,
        hwnd: HWND,
        grip: Point,
    ) -> Option<Option<Point>> {
        let mut message = unsafe { std::mem::zeroed::<MSG>() };
        unsafe { PeekMessageW(&mut message, null_mut(), 0, 0, PM_NOREMOVE) };
        let module = unsafe { GetModuleHandleW(std::ptr::null()) };
        let mouse = unsafe { SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_hook), module, 0) };
        if mouse.is_null() {
            let _ = ready.send(Err(std::io::Error::last_os_error().to_string()));
            return None;
        }
        let keyboard = unsafe { SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_hook), module, 0) };
        if keyboard.is_null() {
            let error = std::io::Error::last_os_error().to_string();
            unsafe { UnhookWindowsHookEx(mouse) };
            let _ = ready.send(Err(error));
            return None;
        }
        let timer = unsafe { SetTimer(null_mut(), 0, FOLLOW_INTERVAL_MS, None) };
        if timer == 0 {
            let error = std::io::Error::last_os_error().to_string();
            unsafe {
                UnhookWindowsHookEx(keyboard);
                UnhookWindowsHookEx(mouse);
            }
            let _ = ready.send(Err(error));
            return None;
        }
        HOOK_STATE.with(|state| {
            state.borrow_mut().carry =
                CarryState::new(unsafe { GetAsyncKeyState(i32::from(VK_LBUTTON)) } < 0)
        });
        let mut result = None;
        let mut last_position = None;
        if ready.send(Ok(unsafe { GetCurrentThreadId() })).is_ok() {
            loop {
                let received = unsafe { GetMessageW(&mut message, null_mut(), 0, 0) };
                if received <= 0 {
                    result = Some(HOOK_STATE.with(|state| match state.borrow().carry {
                        CarryState::Finished(point) => point,
                        _ => None,
                    }));
                    break;
                }
                if message.message == CANCEL {
                    break;
                }
                if message.message == ACTIVATE {
                    HOOK_STATE.with(|state| {
                        let mut state = state.borrow_mut();
                        state.carry =
                            CarryState::new(unsafe { GetAsyncKeyState(i32::from(VK_LBUTTON)) } < 0);
                        state.active = true;
                    });
                    if !unsafe { follow_cursor(hwnd, grip, &mut last_position) } {
                        result = Some(None);
                        break;
                    }
                } else if message.message == WM_TIMER && message.wParam == timer {
                    if !unsafe { follow_cursor(hwnd, grip, &mut last_position) } {
                        result = Some(None);
                        break;
                    }
                } else {
                    unsafe {
                        TranslateMessage(&message);
                        DispatchMessageW(&message);
                    }
                }
            }
        }
        unsafe {
            KillTimer(null_mut(), timer);
            UnhookWindowsHookEx(keyboard);
            UnhookWindowsHookEx(mouse);
        }
        result
    }

    unsafe fn follow_cursor(hwnd: HWND, grip: Point, last: &mut Option<Point>) -> bool {
        let carry = HOOK_STATE.with(|state| {
            let state = state.borrow();
            state.active.then_some(state.carry)
        });
        let point = match carry {
            None | Some(CarryState::Finished(_)) => return true,
            // The placement press freezes the preview while its release is swallowed.
            Some(CarryState::Pressed(point)) => point,
            _ => {
                let mut cursor = unsafe { std::mem::zeroed() };
                if unsafe { GetCursorPos(&mut cursor) } == 0 {
                    return false;
                }
                Point {
                    x: cursor.x,
                    y: cursor.y,
                }
            }
        };
        let position = following(point, grip);
        if *last == Some(position) {
            return true;
        }
        // Never wait on the UI thread from this worker: cancellation joins it there.
        if unsafe {
            SetWindowPos(
                hwnd,
                null_mut(),
                position.x,
                position.y,
                0,
                0,
                SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_ASYNCWINDOWPOS,
            )
        } == 0
        {
            return false;
        }
        *last = Some(position);
        true
    }

    unsafe extern "system" fn mouse_hook(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code >= 0 && matches!(wparam as u32, WM_LBUTTONDOWN | WM_LBUTTONUP) {
            // Windows owns this hook structure for the duration of the callback.
            let point = unsafe { (*(lparam as *const MSLLHOOKSTRUCT)).pt };
            let consumed = HOOK_STATE.with(|state| {
                let mut state = state.borrow_mut();
                if !state.active {
                    return false;
                }
                // Keep tray commands reachable while carrying the click-through note.
                if wparam as u32 == WM_LBUTTONDOWN && unsafe { system_menu_at(point) } {
                    state.carry.cancel();
                    unsafe { PostQuitMessage(0) };
                    return false;
                }
                let consumed = state.carry.mouse(
                    wparam as u32 == WM_LBUTTONDOWN,
                    Point {
                        x: point.x,
                        y: point.y,
                    },
                );
                if matches!(state.carry, CarryState::Finished(_)) {
                    unsafe { PostQuitMessage(0) };
                }
                consumed
            });
            if consumed {
                return 1;
            }
        }
        unsafe { CallNextHookEx(null_mut(), code, wparam, lparam) }
    }

    unsafe fn system_menu_at(point: windows_sys::Win32::Foundation::POINT) -> bool {
        let target = unsafe { WindowFromPoint(point) };
        let root = unsafe { GetAncestor(target, GA_ROOT) };
        let mut class = [0u16; 64];
        let length = unsafe { GetClassNameW(root, class.as_mut_ptr(), class.len() as i32) };
        matches!(
            String::from_utf16_lossy(&class[..length.max(0) as usize]).as_str(),
            "Shell_TrayWnd" | "Shell_SecondaryTrayWnd" | "#32768"
        )
    }

    unsafe extern "system" fn keyboard_hook(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code >= 0
            && matches!(wparam as u32, WM_KEYDOWN | WM_SYSKEYDOWN)
            && unsafe { (*(lparam as *const KBDLLHOOKSTRUCT)).vkCode } == u32::from(VK_ESCAPE)
        {
            let consumed = HOOK_STATE.with(|state| {
                let mut state = state.borrow_mut();
                if !state.active {
                    return false;
                }
                state.carry.cancel();
                unsafe { PostQuitMessage(0) };
                true
            });
            if consumed {
                return 1;
            }
        }
        unsafe { CallNextHookEx(null_mut(), code, wparam, lparam) }
    }
}

#[cfg(windows)]
pub use windows::CarryManager;

#[cfg(not(windows))]
#[derive(Default)]
pub struct CarryManager;

#[cfg(not(windows))]
impl CarryManager {
    pub fn begin(
        &self,
        _app: &tauri::AppHandle,
        _window: &tauri::WebviewWindow,
        _offset_x: f64,
        _offset_y: f64,
    ) -> Result<(), String> {
        Err("Global note carrying is supported only on Windows".into())
    }
    pub fn cancel(&self, _app: &tauri::AppHandle) -> bool {
        false
    }
    pub fn is_active(&self) -> bool {
        false
    }
}
