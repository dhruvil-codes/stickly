// Keep persistence tests independent of native WebView/common-controls DLL loading.
#[path = "../src/storage.rs"]
#[allow(dead_code)]
mod storage;
