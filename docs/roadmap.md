# What would make Stickly better

[Back to the README](../README.md)

Stickly already handles the small loop of writing, checking things off, and keeping a note nearby. The next work should make that loop dependable across real Windows desktops and make saved notes easier to trust and find.

These are proposals, not release commitments.

## Available in 0.2.0: Today and reminders

Today brings up to three active priorities together across notes. Unfinished
priorities carry over, and the original notes keep every task. The footer sun
opens this optional view.

Local reminders now have date/time scheduling and an in-app Snooze 10 min.
The native scheduler runs while Stickly is open or in the tray, catches missed
reminders on reopening/resume, and batches simultaneous reminders. Windows
notification settings can suppress toasts; due tasks remain in the app.

Task grips support pointer reordering and Alt+Up/Down. Move up/down also lives
in the task menu, alongside focus, reminders, and deletion.

Daily/weekly repeating tasks, an importance star, and undo remain proposals.

## 1. Make peel placement dependable across displays

Check peel, carry, and placement on mixed-DPI monitors, monitor edges, and after a display is unplugged. The app already tracks a carried note with temporary Windows input hooks and restores its last saved position when it overlaps a connected display. More real-device coverage would catch the cases geometry tests cannot, such as a placement landing on the wrong monitor or a note returning to an awkward spot.

The distinctive peel interaction stays predictable when moving between screens or changing a desk setup.

## 2. Remember the window size

Save the window's width and height alongside its position, validate both when loading, and clamp restored bounds to a connected display. Today, position persists but size returns to the startup default of 320 × 320 logical pixels. The window can be resized down to 240 × 200, but that choice is lost after closing the app.

A wide writing note or small corner note stays the size the user chose.

## 3. Add clear recovery and undo

Provide an in-app recovery path when a save fails or a damaged file prevents loading. Add app-level undo for deleted notes, deleted tasks, and cleared history, with a clear boundary around what can be restored. Today Rust keeps one previous successful JSON snapshot, but recovery requires manual file copying; there is no app-level undo stack. Deleting or clearing history can permanently remove data.

Recovering a mistaken deletion or a damaged save does not require finding AppData and copying JSON by hand.

## 4. Find a note by its words

Add a fast local search across note titles, bodies, and task text, including archived notes. The current model keeps notes in one JSON document and the interface pages through active notes; there is no search index or search control.

Old thoughts remain useful after a collection grows beyond what page-by-page browsing can handle.

## 5. Make startup and releases deliberate

Offer opt-in launch at Windows sign-in, with an obvious setting to turn it off. Before distributing broadly, validate installation and upgrades on supported Windows configurations, sign the installer, and decide how updates will be delivered. Stickly now has a per-user Windows setup download, a tray menu, and Alt+N. Opt-in autostart, code signing, and an updater remain proposals.

People who want Stickly ready each morning can choose that behavior, and new users can install and update it with fewer Windows trust prompts.

## How to choose what comes first

With Today and reminders available, prioritize persisted window size and mixed-DPI placement checks. Add recovery and undo before search, since protecting existing notes matters more than finding them faster. Repeating tasks can build on one-time reminders. Autostart and signed distribution belong with a release plan and real installer validation.

Search, autostart, an updater, and undo are proposals only. Stickly currently has no sync, search, autostart, or general undo feature.
