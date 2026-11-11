# What would make Stickly better

[Back to the README](../README.md)

Stickly already handles the small loop of writing, checking things off, and keeping a note nearby. The next work should make that loop dependable across real Windows desktops and make saved notes easier to trust and find.

These are proposals, not release commitments.

## Next productivity release: Today and reminders

Give each day a small focus list with three important tasks, selected from the
existing notes. An unfinished task stays saved when the day changes. Keep the
Today view optional so the desktop note remains compact.

Add local reminders with a date, time, Windows notification, and Snooze. Decide
and document what happens when Stickly is quit or the PC sleeps. Missed reminders
should still be visible when the app next opens. Daily and weekly repeating
tasks can follow once one-time reminders behave reliably.

The next checklist improvements should be drag-to-reorder, an important-task
star, and undo for accidental deletion. Put extra controls in the existing
collapsed toolbar or on the active row so every task does not gain a row of icons.

Daily focus, reminders, repeating tasks, reordering, and task importance are
not implemented in the current preview. The daily-list and reminder patterns
are also documented in [Microsoft To Do's My Day guide](https://support.microsoft.com/en-gb/todo/my-day-and-suggestions)
and [reminder guide](https://support.microsoft.com/en-us/todo/add-due-dates-and-reminders-in-microsoft-to-do).

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

Today and reminders are the next user-facing productivity direction. Pair that work with persisted window size and mixed-DPI placement checks, which fix behavior people notice every day. Add recovery and undo before search, since protecting existing notes matters more than finding them faster. Autostart and signed distribution belong with a release plan and real installer validation.

Search, autostart, an updater, and undo are proposals only. Stickly currently has no sync, search, autostart, or general undo feature.
