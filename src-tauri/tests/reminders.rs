// Run scheduler and persistence tests without loading native WebView DLLs.
#[path = "../src/reminders_core.rs"]
mod reminders_core;
#[path = "../src/storage.rs"]
#[allow(dead_code)]
mod storage;
