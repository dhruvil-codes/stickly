use crate::storage::{AppData, MAX_REMINDER_AT, atomic_write};
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, fs, path::PathBuf};

const RETRY_MS: i64 = 60_000;

#[derive(Clone, Debug, PartialEq)]
pub struct ScheduledReminder {
    pub task_id: String,
    pub text: String,
    pub at: i64,
}

pub fn scheduled(data: &AppData) -> Vec<ScheduledReminder> {
    data.notes
        .iter()
        .filter(|note| note.archived_at.is_none())
        .flat_map(|note| &note.tasks)
        .filter(|task| !task.completed)
        .filter_map(|task| {
            task.reminder_at.map(|at| ScheduledReminder {
                task_id: task.id.clone(),
                text: task.text.clone(),
                at,
            })
        })
        .collect()
}

#[derive(Default, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Ledger {
    version: u32,
    announced: BTreeMap<String, i64>,
}

pub struct Reminders {
    path: PathBuf,
    ledger: Ledger,
    dirty: bool,
    notify_after: i64,
    persist_after: i64,
}

#[derive(Default, Debug)]
pub struct TickResult {
    pub due: bool,
    pub notification_error: Option<String>,
    pub storage_error: Option<String>,
}

impl Reminders {
    pub fn open(path: PathBuf) -> Result<Self, String> {
        let ledger = match fs::read(&path) {
            Ok(bytes) => {
                let ledger: Ledger = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
                if ledger.version != 1
                    || ledger
                        .announced
                        .iter()
                        .any(|(id, at)| id.is_empty() || !(0..=MAX_REMINDER_AT).contains(at))
                {
                    return Err("Invalid reminder ledger; the existing file was preserved.".into());
                }
                ledger
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ledger {
                version: 1,
                ..Ledger::default()
            },
            Err(e) => return Err(e.to_string()),
        };
        Ok(Self {
            path,
            ledger,
            dirty: false,
            notify_after: 0,
            persist_after: 0,
        })
    }

    pub fn tick(
        &mut self,
        scheduled: &[ScheduledReminder],
        now: i64,
        mut notify: impl FnMut(&str) -> Result<(), String>,
    ) -> TickResult {
        let mut result = TickResult::default();
        let current: BTreeMap<_, _> = scheduled
            .iter()
            .map(|reminder| (reminder.task_id.as_str(), reminder.at))
            .collect();
        let previous_len = self.ledger.announced.len();
        self.ledger
            .announced
            .retain(|id, at| current.get(id.as_str()) == Some(at));
        self.dirty |= previous_len != self.ledger.announced.len();

        let due: Vec<_> = scheduled
            .iter()
            .filter(|reminder| {
                reminder.at <= now
                    && self.ledger.announced.get(&reminder.task_id) != Some(&reminder.at)
            })
            .collect();
        if !due.is_empty() && now >= self.notify_after {
            result.due = true;
            match notify(&notification_body(&due)) {
                Ok(()) => {
                    for reminder in due {
                        self.ledger
                            .announced
                            .insert(reminder.task_id.clone(), reminder.at);
                    }
                    self.dirty = true;
                    self.notify_after = 0;
                }
                Err(error) => {
                    result.notification_error = Some(error);
                    self.notify_after = now.saturating_add(RETRY_MS);
                }
            }
        }
        if self.dirty && now >= self.persist_after {
            let persisted = (|| {
                fs::create_dir_all(self.path.parent().ok_or("Missing reminder directory")?)
                    .map_err(|e| e.to_string())?;
                let bytes = serde_json::to_vec_pretty(&self.ledger).map_err(|e| e.to_string())?;
                atomic_write(&self.path, &bytes)
            })();
            match persisted {
                Ok(()) => {
                    self.dirty = false;
                    self.persist_after = 0;
                }
                Err(error) => {
                    result.storage_error = Some(error);
                    self.persist_after = now.saturating_add(RETRY_MS);
                }
            }
        }
        result
    }
}

fn notification_body(due: &[&ScheduledReminder]) -> String {
    let body = if due.len() == 1 {
        let text = due[0].text.split_whitespace().collect::<Vec<_>>().join(" ");
        if text.is_empty() {
            "Task reminder".into()
        } else {
            text
        }
    } else {
        format!(
            "{} tasks are due. Open Stickly to review your reminders.",
            due.len()
        )
    };
    if body.chars().count() > 180 {
        body.chars().take(179).chain(std::iter::once('…')).collect()
    } else {
        body
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn directory() -> PathBuf {
        static NEXT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
        let path = std::env::temp_dir().join(format!(
            "stickly-reminders-{}-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&path).unwrap();
        path
    }

    fn reminder(id: &str, at: i64) -> ScheduledReminder {
        ScheduledReminder {
            task_id: id.into(),
            text: format!("Task {id}"),
            at,
        }
    }

    #[test]
    fn batches_overdue_once_and_remembers_delivery_after_restart() {
        let dir = directory();
        let path = dir.join("reminders.json");
        let schedules = [
            reminder("missed", 100),
            reminder("now", 500),
            reminder("future", 501),
        ];
        let mut engine = Reminders::open(path.clone()).unwrap();
        let mut messages = Vec::new();
        assert!(
            engine
                .tick(&schedules, 500, |body| {
                    messages.push(body.to_owned());
                    Ok(())
                })
                .due
        );
        assert_eq!(
            messages,
            ["2 tasks are due. Open Stickly to review your reminders."]
        );
        engine.tick(&schedules, 500, |_| panic!("duplicate notification"));
        let mut engine = Reminders::open(path).unwrap();
        engine.tick(&schedules, 500, |_| panic!("duplicate after restart"));
        assert!(engine.tick(&schedules, 501, |_| Ok(())).due);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn cancellation_prunes_and_snooze_or_reschedule_can_deliver_again() {
        let dir = directory();
        let mut engine = Reminders::open(dir.join("reminders.json")).unwrap();
        engine.tick(&[reminder("t", 100)], 100, |_| Ok(()));
        engine.tick(&[reminder("t", 700)], 100, |_| panic!("snoozed"));
        assert!(engine.ledger.announced.is_empty());
        assert!(engine.tick(&[reminder("t", 700)], 700, |_| Ok(())).due);
        engine.tick(&[], 700, |_| panic!("canceled"));
        assert!(engine.ledger.announced.is_empty());
        let reloaded = Reminders::open(dir.join("reminders.json")).unwrap();
        assert!(reloaded.ledger.announced.is_empty());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn notification_failure_retries_after_backoff_without_marking_delivered() {
        let dir = directory();
        let mut engine = Reminders::open(dir.join("reminders.json")).unwrap();
        let schedule = [reminder("t", 100)];
        let result = engine.tick(&schedule, 100, |_| Err("Notifications disabled".into()));
        assert!(result.due);
        assert_eq!(
            result.notification_error.as_deref(),
            Some("Notifications disabled")
        );
        assert!(engine.ledger.announced.is_empty());
        engine.tick(&schedule, 60_099, |_| panic!("retried too soon"));
        assert!(engine.tick(&schedule, 60_100, |_| Ok(())).due);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn corrupt_or_unknown_ledger_is_preserved() {
        let dir = directory();
        let path = dir.join("reminders.json");
        for bytes in [
            "broken",
            r#"{"version":2,"announced":{}}"#,
            r#"{"version":1,"announced":{"t":-1}}"#,
        ] {
            fs::write(&path, bytes).unwrap();
            assert!(Reminders::open(path.clone()).is_err());
            assert_eq!(fs::read_to_string(&path).unwrap(), bytes);
        }
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn storage_failure_dedupes_in_memory_and_retries_persistence() {
        let dir = directory();
        let blocker = dir.join("blocked");
        let path = blocker.join("reminders.json");
        let mut engine = Reminders::open(path.clone()).unwrap();
        fs::write(&blocker, "not a directory").unwrap();
        let schedule = [reminder("t", 0)];
        assert!(
            engine
                .tick(&schedule, 0, |_| Ok(()))
                .storage_error
                .is_some()
        );
        assert!(
            engine
                .tick(&schedule, 1, |_| panic!("already delivered"))
                .storage_error
                .is_none()
        );
        fs::remove_file(&blocker).unwrap();
        engine.tick(&schedule, RETRY_MS, |_| panic!("already delivered"));
        let mut reloaded = Reminders::open(path).unwrap();
        reloaded.tick(&schedule, RETRY_MS, |_| panic!("persisted retry"));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn snapshot_excludes_completed_archived_and_unscheduled_tasks() {
        let mut data: AppData = serde_json::from_str(r#"{"version":1,"activeNoteId":"n","notes":[{"id":"n","title":"N","color":"yellow","tasks":[{"id":"due","text":"Due","completed":false,"bold":false,"createdAt":"2026-11-11","reminderAt":100},{"id":"done","text":"Done","completed":true,"bold":false,"createdAt":"2026-11-11","reminderAt":100},{"id":"none","text":"None","completed":false,"bold":false,"createdAt":"2026-11-11"}],"archivedAt":null,"createdAt":"2026-11-11"}],"alwaysOnTop":false,"windowPosition":null}"#).unwrap();
        assert_eq!(
            scheduled(&data),
            [ScheduledReminder {
                task_id: "due".into(),
                text: "Due".into(),
                at: 100
            }]
        );
        data.notes[0].archived_at = Some("2026-11-11".into());
        assert!(scheduled(&data).is_empty());
        data.notes.clear();
        assert!(scheduled(&data).is_empty());
    }

    #[test]
    fn notification_preview_is_single_line_and_bounded_in_unicode_characters() {
        let mut item = reminder("t", 0);
        item.text = format!("\n\t{}\n", "📝".repeat(200));
        let body = notification_body(&[&item]);
        assert_eq!(body.chars().count(), 180);
        assert!(!body.contains('\n'));
        assert!(body.ends_with('…'));
    }
}
