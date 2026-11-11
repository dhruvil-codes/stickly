use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::{Mutex, mpsc},
    time::Duration,
};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub text: String,
    pub completed: bool,
    pub bold: bool,
    pub created_at: String,
    #[serde(default)]
    pub focus_date: Option<String>,
    #[serde(default)]
    pub reminder_at: Option<i64>,
}

pub(crate) const MAX_REMINDER_AT: i64 = 8_640_000_000_000_000;

fn valid_focus_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 10
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || !bytes
            .iter()
            .enumerate()
            .all(|(i, b)| i == 4 || i == 7 || b.is_ascii_digit())
    {
        return false;
    }
    let year: u32 = value[..4].parse().unwrap();
    let month: u32 = value[5..7].parse().unwrap();
    let day: u32 = value[8..].parse().unwrap();
    let leap = year.is_multiple_of(4) && (!year.is_multiple_of(100) || year.is_multiple_of(400));
    let days = match month {
        2 if leap => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        _ => return false,
    };
    year > 0 && day > 0 && day <= days
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Color {
    Yellow,
    Peach,
    Pink,
    Mint,
    Sky,
    Lavender,
    Charcoal,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FontSize {
    S,
    #[default]
    M,
    L,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub body: String,
    #[serde(default)]
    pub body_bold: bool,
    #[serde(default)]
    pub font_size: FontSize,
    pub color: Color,
    pub tasks: Vec<Task>,
    pub archived_at: Option<String>,
    pub created_at: String,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppData {
    pub version: u32,
    pub active_note_id: String,
    pub notes: Vec<Note>,
    pub always_on_top: bool,
    pub window_position: Option<Position>,
}

fn validate(data: &AppData) -> Result<(), String> {
    if data.version != 1 {
        return Err("Unsupported data version; the existing file was preserved.".into());
    }
    if !data
        .notes
        .iter()
        .any(|n| n.id == data.active_note_id && n.archived_at.is_none())
    {
        return Err("The active note is missing; the existing file was preserved.".into());
    }
    let mut note_ids = std::collections::HashSet::new();
    let mut task_ids = std::collections::HashSet::new();
    for note in &data.notes {
        if note.id.is_empty() || !note_ids.insert(&note.id) {
            return Err("Note IDs must be nonempty and unique.".into());
        }
        for task in &note.tasks {
            if task.id.is_empty() || !task_ids.insert(&task.id) {
                return Err("Task IDs must be nonempty and unique.".into());
            }
            if task
                .focus_date
                .as_deref()
                .is_some_and(|date| !valid_focus_date(date))
            {
                return Err("Task focus dates must be valid YYYY-MM-DD calendar dates.".into());
            }
            if task
                .reminder_at
                .is_some_and(|at| !(0..=MAX_REMINDER_AT).contains(&at))
            {
                return Err(
                    "Task reminder times must be UTC milliseconds between 0 and 8640000000000000."
                        .into(),
                );
            }
        }
    }
    Ok(())
}

pub struct Store {
    pub path: PathBuf,
    pub inner: Mutex<StoreInner>,
}

pub struct StoreInner {
    pub data: Option<AppData>,
    pub error: Option<String>,
    pub position: Option<Position>,
    pub pinned: bool,
}

enum PositionMessage {
    Moved(Position),
    Flush(mpsc::Sender<Result<(), String>>),
}

pub struct PositionWriter(mpsc::Sender<PositionMessage>);

impl PositionWriter {
    pub fn new(mut persist: impl FnMut(Position) -> Result<(), String> + Send + 'static) -> Self {
        let (sender, receiver) = mpsc::channel();
        std::thread::spawn(move || {
            let mut pending = None;
            loop {
                match receiver.recv_timeout(Duration::from_millis(150)) {
                    Ok(PositionMessage::Moved(position)) => pending = Some(position),
                    Ok(PositionMessage::Flush(reply)) => {
                        let result = pending.map_or(Ok(()), &mut persist);
                        if result.is_ok() {
                            pending = None;
                        }
                        let _ = reply.send(result);
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => {
                        if let Some(position) = pending
                            && persist(position).is_ok()
                        {
                            pending = None;
                        }
                    }
                    Err(mpsc::RecvTimeoutError::Disconnected) => break,
                }
            }
        });
        Self(sender)
    }

    pub fn moved(&self, position: Position) -> Result<(), String> {
        self.0
            .send(PositionMessage::Moved(position))
            .map_err(|e| e.to_string())
    }

    // Called from a blocking task before quitting; FIFO delivery includes every earlier move.
    pub fn flush(&self) -> Result<(), String> {
        let (sender, receiver) = mpsc::channel();
        self.0
            .send(PositionMessage::Flush(sender))
            .map_err(|e| e.to_string())?;
        receiver.recv().map_err(|e| e.to_string())?
    }
}

impl Store {
    pub fn open(path: PathBuf) -> Self {
        let result = match fs::read(&path) {
            Ok(bytes) => serde_json::from_slice::<AppData>(&bytes)
                .map_err(|e| e.to_string())
                .and_then(|d| {
                    validate(&d)?;
                    Ok(Some(d))
                }),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e.to_string()),
        };
        let (data, error) = match result {
            Ok(data) => (data, None),
            Err(e) => (
                None,
                Some(format!(
                    "Cannot load {}: {e}. No data will be overwritten. A previous version may be available as data.backup.json.",
                    path.display()
                )),
            ),
        };
        let position = data.as_ref().and_then(|d| d.window_position);
        let pinned = data.as_ref().is_some_and(|d| d.always_on_top);
        Self {
            path,
            inner: Mutex::new(StoreInner {
                data,
                error,
                position,
                pinned,
            }),
        }
    }

    // Caller holds the mutex across backup, replacement, and the in-memory commit.
    pub fn commit(&self, inner: &mut StoreInner, data: AppData) -> Result<(), String> {
        if let Some(error) = &inner.error {
            return Err(error.clone());
        }
        validate(&data)?;
        fs::create_dir_all(self.path.parent().ok_or("Missing data directory")?)
            .map_err(|e| e.to_string())?;
        if let Some(previous) = &inner.data {
            let bytes = serde_json::to_vec_pretty(previous).map_err(|e| e.to_string())?;
            atomic_write(&self.path.with_file_name("data.backup.json"), &bytes)?;
        }
        let bytes = serde_json::to_vec_pretty(&data).map_err(|e| e.to_string())?;
        atomic_write(&self.path, &bytes)?;
        inner.data = Some(data);
        Ok(())
    }

    pub fn save(&self, mut data: AppData) -> Result<(), String> {
        let mut inner = self.inner.lock().map_err(|e| e.to_string())?;
        // Native window state is authoritative; an older editor snapshot cannot rewind it.
        data.window_position = inner.position;
        data.always_on_top = inner.pinned;
        self.commit(&mut inner, data)
    }

    pub fn position(&self, position: Position) -> Result<(), String> {
        let mut inner = self.inner.lock().map_err(|e| e.to_string())?;
        if inner.position == Some(position)
            && inner
                .data
                .as_ref()
                .is_none_or(|data| data.window_position == Some(position))
        {
            return Ok(());
        }
        inner.position = Some(position);
        if let Some(mut data) = inner.data.clone() {
            data.window_position = Some(position);
            self.commit(&mut inner, data)?;
        }
        Ok(())
    }
}

pub(crate) fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let pending = path.with_extension("pending");
    let mut file = fs::File::create(&pending).map_err(|e| e.to_string())?;
    file.write_all(bytes)
        .and_then(|_| file.sync_all())
        .map_err(|e| e.to_string())?;
    drop(file);
    replace(&pending, path).map_err(|e| e.to_string())
}

#[cfg(windows)]
fn replace(source: &Path, target: &Path) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH, MoveFileExW,
    };
    let source: Vec<u16> = source.as_os_str().encode_wide().chain(Some(0)).collect();
    let target: Vec<u16> = target.as_os_str().encode_wide().chain(Some(0)).collect();
    // Both files are in the same directory, so replacement never crosses volumes.
    if unsafe {
        MoveFileExW(
            source.as_ptr(),
            target.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    } == 0
    {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(not(windows))]
fn replace(source: &Path, target: &Path) -> std::io::Result<()> {
    fs::rename(source, target)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn position_writer_coalesces_moves_and_flushes_latest() {
        let positions = std::sync::Arc::new(Mutex::new(Vec::new()));
        let recorded = positions.clone();
        let writer = PositionWriter::new(move |position| {
            recorded.lock().unwrap().push(position);
            Ok(())
        });
        for x in 0..20 {
            writer.moved(Position { x, y: -x }).unwrap();
        }
        writer.flush().unwrap();
        assert_eq!(*positions.lock().unwrap(), vec![Position { x: 19, y: -19 }]);
        writer.flush().unwrap();
        assert_eq!(positions.lock().unwrap().len(), 1);
    }

    #[test]
    fn position_writer_retries_failed_flush_without_losing_position() {
        let attempts = std::sync::Arc::new(Mutex::new(Vec::new()));
        let recorded = attempts.clone();
        let writer = PositionWriter::new(move |position| {
            let mut attempts = recorded.lock().unwrap();
            attempts.push(position);
            if attempts.len() == 1 {
                Err("Disk unavailable".into())
            } else {
                Ok(())
            }
        });
        let position = Position { x: -80, y: 100 };
        writer.moved(position).unwrap();
        assert!(writer.flush().is_err());
        writer.flush().unwrap();
        assert_eq!(*attempts.lock().unwrap(), vec![position, position]);
    }

    fn fixture() -> AppData {
        serde_json::from_str(r#"{"version":1,"activeNoteId":"n","notes":[{"id":"n","title":"Things","color":"yellow","tasks":[{"id":"t","text":"Keep me","completed":false,"bold":true,"createdAt":"2026-11-09"}],"archivedAt":null,"createdAt":"2026-11-09"}],"alwaysOnTop":false,"windowPosition":null}"#).unwrap()
    }
    fn directory() -> PathBuf {
        static NEXT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
        let p = std::env::temp_dir().join(format!(
            "stickly-test-{}-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&p).unwrap();
        p
    }
    #[test]
    fn legacy_notes_accept_and_persist_multiline_bodies() {
        let dir = directory();
        let path = dir.join("data.json");
        let mut legacy = serde_json::to_value(fixture()).unwrap();
        legacy["notes"][0].as_object_mut().unwrap().remove("body");
        legacy["notes"][0]
            .as_object_mut()
            .unwrap()
            .remove("bodyBold");
        fs::write(&path, serde_json::to_vec(&legacy).unwrap()).unwrap();

        let store = Store::open(path.clone());
        let mut data = store.inner.lock().unwrap().data.clone().unwrap();
        assert_eq!(data.version, 1);
        assert!(data.notes[0].body.is_empty());
        assert!(!data.notes[0].body_bold);
        let tasks = data.notes[0].tasks.clone();
        data.notes[0].body = "First line\n\nAnother thought — with detail.\n".into();
        data.notes[0].body_bold = true;
        store.save(data.clone()).unwrap();

        let loaded = Store::open(path.clone());
        assert_eq!(loaded.inner.lock().unwrap().data.as_ref(), Some(&data));
        assert_eq!(data.notes[0].tasks, tasks);
        let saved: serde_json::Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        assert_eq!(saved["notes"][0]["bodyBold"], true);
        let backup: AppData =
            serde_json::from_slice(&fs::read(dir.join("data.backup.json")).unwrap()).unwrap();
        assert!(backup.notes[0].body.is_empty());
        assert!(!backup.notes[0].body_bold);
        assert_eq!(backup.notes[0].tasks, tasks);
        assert!(!path.with_extension("pending").exists());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn font_size_defaults_for_version_one_and_round_trips_without_losing_content() {
        let dir = directory();
        let path = dir.join("data.json");
        let mut legacy = serde_json::to_value(fixture()).unwrap();
        legacy["notes"][0]
            .as_object_mut()
            .unwrap()
            .remove("fontSize");
        legacy["notes"][0]["body"] = "Line one\nLine two".into();
        fs::write(&path, serde_json::to_vec(&legacy).unwrap()).unwrap();
        let store = Store::open(path.clone());
        let mut data = store.inner.lock().unwrap().data.clone().unwrap();
        assert_eq!(data.notes[0].font_size, FontSize::M);
        let tasks = data.notes[0].tasks.clone();
        for font_size in [FontSize::S, FontSize::L, FontSize::M] {
            data.notes[0].font_size = font_size;
            store.save(data.clone()).unwrap();
            let loaded = Store::open(path.clone());
            let inner = loaded.inner.lock().unwrap();
            assert_eq!(inner.data.as_ref(), Some(&data));
            assert_eq!(data.version, 1);
            assert_eq!(data.notes[0].body, "Line one\nLine two");
            assert_eq!(data.notes[0].tasks, tasks);
        }
        let saved: serde_json::Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        assert_eq!(saved["notes"][0]["fontSize"], "m");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn replacement_keeps_backup_and_native_position() {
        let dir = directory();
        let path = dir.join("data.json");
        let store = Store::open(path.clone());
        let first = fixture();
        store.save(first.clone()).unwrap();
        store.position(Position { x: -100, y: 60 }).unwrap();
        let mut newer = first.clone();
        newer.notes[0].title = "Updated".into();
        store.save(newer).unwrap();
        let loaded = Store::open(path);
        let inner = loaded.inner.lock().unwrap();
        assert_eq!(
            inner.data.as_ref().unwrap().window_position,
            Some(Position { x: -100, y: 60 })
        );
        assert_eq!(inner.data.as_ref().unwrap().notes[0].title, "Updated");
        let backup: AppData =
            serde_json::from_slice(&fs::read(dir.join("data.backup.json")).unwrap()).unwrap();
        assert_eq!(backup.notes[0].title, first.notes[0].title);
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn corrupt_or_future_data_is_never_overwritten() {
        for bytes in [
            b"broken JSON".to_vec(),
            serde_json::to_vec(&AppData {
                version: 2,
                ..fixture()
            })
            .unwrap(),
        ] {
            let dir = directory();
            let path = dir.join("data.json");
            fs::write(&path, &bytes).unwrap();
            let store = Store::open(path.clone());
            assert!(store.save(fixture()).is_err());
            assert_eq!(fs::read(path).unwrap(), bytes);
            fs::remove_dir_all(dir).unwrap();
        }
    }
    #[test]
    fn parallel_mutations_produce_valid_complete_json() {
        let dir = directory();
        let path = dir.join("data.json");
        let store = std::sync::Arc::new(Store::open(path.clone()));
        store.save(fixture()).unwrap();
        let threads: Vec<_> = (0..8)
            .map(|i| {
                let store = store.clone();
                std::thread::spawn(move || {
                    let mut data = fixture();
                    data.notes[0].title = format!("Note {i}");
                    store.save(data).unwrap();
                })
            })
            .collect();
        for t in threads {
            t.join().unwrap();
        }
        let data: AppData = serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
        assert!(data.notes[0].title.starts_with("Note "));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn invalid_identity_or_archived_active_note_is_rejected() {
        let mut data = fixture();
        data.notes.push(data.notes[0].clone());
        assert!(validate(&data).is_err());
        let mut data = fixture();
        let duplicate_task = data.notes[0].tasks[0].clone();
        data.notes[0].tasks.push(duplicate_task);
        assert!(validate(&data).is_err());
        let mut data = fixture();
        data.notes[0].archived_at = Some("2026-11-09".into());
        assert!(validate(&data).is_err());
    }

    #[test]
    fn legacy_tasks_default_to_no_schedule_and_schedules_round_trip() {
        let dir = directory();
        let path = dir.join("data.json");
        let store = Store::open(path.clone());
        let mut data = fixture();
        assert_eq!(data.notes[0].tasks[0].focus_date, None);
        assert_eq!(data.notes[0].tasks[0].reminder_at, None);
        data.notes[0].tasks[0].focus_date = Some("2028-02-29".into());
        data.notes[0].tasks[0].reminder_at = Some(MAX_REMINDER_AT);
        store.save(data.clone()).unwrap();
        assert_eq!(
            Store::open(path).inner.lock().unwrap().data.as_ref(),
            Some(&data)
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn invalid_schedule_is_rejected_without_overwriting_notes() {
        let dir = directory();
        let path = dir.join("data.json");
        let store = Store::open(path.clone());
        store.save(fixture()).unwrap();
        let original = fs::read(&path).unwrap();
        for date in [
            "2026-02-29",
            "2026-04-31",
            "0000-01-01",
            "2026-00-01",
            "2026-01-00",
            "2026-1-01",
            "2026-01-01T00:00:00Z",
            "📝-01-01",
        ] {
            let mut data = fixture();
            data.notes[0].tasks[0].focus_date = Some(date.into());
            assert!(store.save(data).is_err(), "accepted {date}");
            assert_eq!(fs::read(&path).unwrap(), original);
        }
        for at in [-1, MAX_REMINDER_AT + 1] {
            let mut data = fixture();
            data.notes[0].tasks[0].reminder_at = Some(at);
            assert!(store.save(data).is_err());
            assert_eq!(fs::read(&path).unwrap(), original);
        }
        let mut invalid: serde_json::Value = serde_json::from_slice(&original).unwrap();
        invalid["notes"][0]["tasks"][0]["reminderAt"] = (-1).into();
        let bytes = serde_json::to_vec(&invalid).unwrap();
        fs::write(&path, &bytes).unwrap();
        let loaded = Store::open(path.clone());
        assert!(loaded.inner.lock().unwrap().error.is_some());
        assert!(loaded.save(fixture()).is_err());
        assert_eq!(fs::read(&path).unwrap(), bytes);
        fs::remove_dir_all(dir).unwrap();
    }
}
