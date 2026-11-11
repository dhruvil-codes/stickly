use crate::{
    reminders_core::{Reminders, scheduled},
    storage::Store,
};
use std::{
    path::PathBuf,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

fn report(app: &tauri::AppHandle, event: &str, message: String) {
    eprintln!("{message}");
    let _ = app.emit(event, message);
}

pub fn start(app: tauri::AppHandle, path: PathBuf) {
    std::thread::spawn(move || {
        let mut reminders = None;
        let mut load_after = 0;
        let mut snapshot_error_after = 0;
        loop {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|time| time.as_millis().min(i64::MAX as u128) as i64)
                .unwrap_or(0);
            if reminders.is_none() && now >= load_after {
                match Reminders::open(path.clone()) {
                    Ok(loaded) => reminders = Some(loaded),
                    Err(error) => {
                        report(
                            &app,
                            "stickly:notification-error",
                            format!(
                                "Cannot load {}: {error}. Native reminder delivery is paused; the existing file was preserved.",
                                path.display()
                            ),
                        );
                        load_after = now.saturating_add(60_000);
                    }
                }
            }
            if let Some(reminders) = &mut reminders {
                // Clone only scheduled fields; no disk or notification calls hold the notes lock.
                let snapshot = {
                    let store = app.state::<Store>();
                    store
                        .inner
                        .lock()
                        .map(|inner| inner.data.as_ref().map(scheduled))
                        .map_err(|error| error.to_string())
                };
                match snapshot {
                    Ok(Some(snapshot)) => {
                        let result = reminders.tick(&snapshot, now, |body| {
                            // Desktop show() confirms enqueueing; OS suppression is not reported.
                            app.notification()
                                .builder()
                                .title("Stickly reminder")
                                .body(body)
                                .show()
                                .map_err(|error| error.to_string())
                        });
                        if result.due {
                            let _ = app.emit("stickly:reminder-due", ());
                        }
                        if let Some(error) = result.notification_error {
                            report(
                                &app,
                                "stickly:notification-error",
                                format!(
                                    "Could not show a reminder: {error}. Retrying in one minute; due tasks remain in Reminders."
                                ),
                            );
                        }
                        if let Some(error) = result.storage_error {
                            report(
                                &app,
                                "stickly:notification-error",
                                format!(
                                    "Could not save {}: {error}. Delivery history will be retried; notes were not changed.",
                                    path.display()
                                ),
                            );
                        }
                    }
                    Err(error) if now >= snapshot_error_after => {
                        report(
                            &app,
                            "stickly:storage-error",
                            format!("Could not read reminder schedules: {error}"),
                        );
                        snapshot_error_after = now.saturating_add(60_000);
                    }
                    _ => (),
                }
            }
            // Native process lifetime includes the tray; WebView timer throttling cannot delay this.
            std::thread::sleep(Duration::from_secs(1));
        }
    });
}
