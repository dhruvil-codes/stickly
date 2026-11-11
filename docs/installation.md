# Install Stickly on Windows

[Download Stickly-Setup.exe](https://github.com/dhruvil-codes/stickly/releases/latest/download/Stickly-Setup.exe) | [Release notes](https://github.com/dhruvil-codes/stickly/releases/latest)

## Three steps

1. Download the setup file for Windows x64.
2. Open it and follow the installer. It installs for your current account.
3. Launch **Stickly** from Start or its desktop shortcut. **Alt+N** shows and hides the note.

You do not need Node.js, Rust, Git, or a terminal. Setup checks for Microsoft WebView2 and downloads it if needed; internet is required for that initial runtime download. Your notes work offline after setup.

This first release is unsigned. Windows may show an unrecognized-publisher warning. Code signing is not configured yet.

## Update

Download the latest setup file and run it again. Quit Stickly from its tray menu first if it is running. Setup replaces the application, while your notes stay in `%APPDATA%\stickly`.

There is no automatic updater yet.

## Uninstall

Use **Windows Settings > Apps > Stickly > Uninstall**. Your notes are stored separately from the application folder. Keep a copy of `%APPDATA%\stickly` before uninstalling if you want an additional backup.

## Verify the download

Each release includes `SHA256SUMS.txt`. To check that the download matches the published file, use PowerShell in the download folder:

```powershell
Get-FileHash .\Stickly-Setup.exe -Algorithm SHA256
```

Compare the result with the value next to `Stickly-Setup.exe` in the release's checksum file. A checksum verifies file integrity; it is not a code-signing certificate.

## Notes and recovery

The app saves notes in `%APPDATA%\stickly\data.json` and keeps the previous successful save in `data.backup.json`. These are plain local JSON files. Installing does not migrate them to a server or another account.

If something seems missing, quit Stickly before changing saved files. Keep copies of both files first, then follow [the recovery instructions](../README.md#your-notes-and-your-files). Browser preview notes use separate localStorage and are not imported by the installer.

## If the window disappears

Closing the note hides it to the tray. Press **Alt+N**, or use the Stickly tray menu. Choose **Quit** in that menu to exit completely.

For reproducible problems, [open an issue](https://github.com/dhruvil-codes/stickly/issues) with your Windows version and display scaling. Use example text in screenshots instead of private notes.
