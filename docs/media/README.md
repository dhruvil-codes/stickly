# Stickly launch kit

[Back to Stickly](../../README.md)

A thousand things on your mind? Put the next one right here.

The launch film introduces Stickly through that everyday feeling, then lets the product do the talking. The corner peel gets a continuous demonstration: pull, lift, carry, and click to place.

## Ready to share

| Asset | Format | File |
| --- | --- | --- |
| Launch film | 30 seconds, landscape 1920 x 1080, 30 fps, H.264 video with AAC audio | [stickly-launch.mp4](stickly-launch.mp4) |
| Video poster | Landscape PNG | [launch-poster.png](launch-poster.png) |
| GitHub social preview | 1280 x 640 PNG | [social-preview.png](social-preview.png) |
| Square social image | 1080 x 1080 PNG | [social-square.png](social-square.png) |
| Captions | SRT and WebVTT; also burned into the film | [SRT](launch-captions.srt), [VTT](launch-captions.vtt) |
| Narration | Generated speech, MP3 | [stickly-voiceover.mp3](stickly-voiceover.mp3) |

For GitHub's repository card, download `social-preview.png`, then upload it in the repository's **Settings > General > Social preview** section. Committing the image alone does not set that card. See [GitHub's social preview instructions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview).

## What the film shows

| Time | Moment |
| --- | --- |
| 0:00-0:03.3 | "1,000 things on your mind?" with a collage of real product screens |
| 0:03.3-0:07.6 | Meet Stickly and its handwritten notes |
| 0:07.6-0:13.3 | Plain notes, checking off tasks, paper colors, text sizes, and pinning |
| 0:13.3-0:20.1 | A continuous real peel, cursor carry, and placement demo |
| 0:20.1-0:24.7 | Compact sizing, restoring history, charcoal paper, and Alt+N |
| 0:24.7-0:30 | Local notes, no account, and the Stickly sign-off |

The screenshots and interaction clips come from Stickly's actual React renderer with synthetic example notes. The demonstration uses its browser mode for capture. Windows-level actions such as Alt+N and always-on-top are explained with captions, key graphics, and the matching UI state; this is not a recording of those operating-system actions. The peel geometry and checklist interactions are recorded from the app, not recreated as animation in the film.

The supplied reference informed the pacing, product close-ups, and warm visual direction. Its footage, soundtrack, logos, and other artwork are not included.

## Product screenshots

All PNGs use synthetic note content. Most show a 320 x 320 logical-pixel window at 2x resolution. The compact example is 240 x 200; history is 320 x 440 to show the drawer content.

- [Plain note](../images/plain-note.png)
- [Checklist](../images/checklist.png)
- [Paper colors](../images/paper-colors.png)
- [Charcoal paper](../images/charcoal.png)
- [History and archive](../images/history.png)
- [Corner peel](../images/peel.png)
- [Compact window](../images/compact.png)
- [S/M/L text size](../images/text-size.png)
- [Pinned state](../images/pinned.png)

## Edit or render the film

The editable [Remotion composition](../../scripts/media/film/src/Composition.tsx) uses frame-based motion, bundled Shantell Sans, the project's vector logo, captured product footage, and word-timed captions. The timeline is fixed at 900 frames and 30 fps.

Install Node.js 22.13 or newer, Python 3, and FFmpeg with `ffprobe` on your PATH. From the repository root:

```powershell
python scripts/media/prepare-film.py
cd scripts/media/film
npm ci --ignore-scripts
npx remotion browser ensure
npm run render
```

The output overwrites `docs/media/stickly-launch.mp4`. `prepare-film.py` copies approved assets into the ignored `film/public/generated/` folder. A fresh clone reuses the committed narration, captions, and short source clips in `docs/media/source/`; no API key is needed to render.

Use `npm run dev` inside `scripts/media/film` to open the editable timeline. The render command separates frame rendering from encoding and limits the media cache to reduce peak memory use. If Node needs a smaller heap on a busy Windows machine, set `$env:NODE_OPTIONS='--max-old-space-size=192 --max-semi-space-size=4'` before rendering.

## Refresh the product captures

From the repository root:

```powershell
npm ci
npm run build
node scripts/media/capture.mjs --stills
node scripts/media/capture.mjs --peel-demo
python scripts/media/sound-effects.py
python scripts/media/prepare-film.py
```

The capture helper opens an isolated Playwright context, seeds only its own example data, and closes its local capture server and browser when finished. It does not read or modify the native app's notes. It uses installed Microsoft Edge on Windows; set `STICKLY_BROWSER_EXECUTABLE` to use another Chromium executable, or install Playwright Chromium with `npx playwright install chromium`.

Raw recordings and generated speech alignment stay under ignored `artifacts/media-capture/`. The short approved clips and sound effects in `source/` are sufficient for future film renders. To change the checklist demonstration, replace `source/checklist-demo.mp4` with a 30 fps clip of the same framing, then prepare and render again.

## Narration and sound

The film uses the requested ElevenLabs voice **`dmWfLQZJq7wNPv9WmtiM`**, model `eleven_multilingual_v2`, at speed `1.07`. The [narration script](../../scripts/media/narration.txt) contains 70 words. Word timings come from ElevenLabs' alignment response. Quiet UI taps and paper noise are synthesized by the project's sound-effects script; no reference music is used.

To intentionally generate a new take, run `python scripts/media/voiceover.py --api-key-file <private-key-file>` or provide `ELEVENLABS_API_KEY` in your environment. This calls the paid ElevenLabs API using your account. Then run `prepare-film.py` and render again. Keep credentials outside the repository. Voice and service usage remain subject to your ElevenLabs account's terms; this kit does not grant rights to the underlying voice model.

The workflow used the requested [Find Skills](https://github.com/vercel-labs/skills) discovery tool and the official [Remotion skills](https://github.com/remotion-dev/skills). Remotion retains its own [licensing terms](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). Shantell Sans uses the bundled SIL Open Font License; see [third-party notices](../../THIRD_PARTY_NOTICES.md).

## Messaging research

The productivity angle follows the overload and interruptions described in [Microsoft WorkLab's 2025 infinite-workday report](https://www.microsoft.com/en-us/worklab/work-trend-index/breaking-down-infinite-workday). The film's "1,000 things" is a creative expression of that feeling, not a measured workload or an app capacity claim. The product promise stays specific: capture the next thought, keep it visible, and move it where it helps.
