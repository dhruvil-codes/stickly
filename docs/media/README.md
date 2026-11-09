# Stickly launch kit

[Back to Stickly](../../README.md) | [Open the video index](../index.html)

Your brain is not a to-do list. Seriously.

The 30-second launch film now has a brighter female narrator, an original instrumental score, tactile paper foley, and text that moves with the delivery. It follows a problem, introduction, explanation, proof, and CTA structure for the X feed.

## Ready to share

| Asset | Format | File |
| --- | --- | --- |
| Launch film | Exactly 30 seconds, 1920 x 1080 landscape, 30 fps, H.264 and AAC | [stickly-launch.mp4](stickly-launch.mp4) |
| Real Windows demo | 27 seconds, 1920 x 1080, actual Tauri app over a work document, with music | [native-desktop-demo.mp4](native-desktop-demo.mp4) |
| Video index | Responsive static HTML with both playable videos | [index.html](../index.html) |
| X announcement | 279-character draft, ready to pair with the launch MP4 | [x-launch-post.txt](x-launch-post.txt) |
| Launch poster | 1920 x 1080 PNG | [launch-poster.png](launch-poster.png) |
| GitHub social preview | 1280 x 640 PNG | [social-preview.png](social-preview.png) |
| Square social image | 1080 x 1080 PNG | [social-square.png](social-square.png) |
| Captions | Burned into the film, plus SRT and WebVTT sidecars | [SRT](launch-captions.srt), [VTT](launch-captions.vtt) |
| Full audio mix | Female narration, music, foley, and edit accents | [stickly-soundtrack.mp3](stickly-soundtrack.mp3) |
| Isolated narration | ElevenLabs-generated speech | [stickly-voiceover.mp3](stickly-voiceover.mp3) |

The X announcement is a draft, not an automatically published post. Attach the launch MP4 to the post. The closing CTA points to the GitHub source-build instructions, matching the current early-preview release.

For the repository's social card, upload `social-preview.png` in GitHub's **Settings > General > Social preview** section. Committing it alone does not change that card. See [GitHub's instructions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview).

The video index is a static file included in the repository. Open it locally, serve the repository, or configure static hosting separately; this change does not enable a hosting service.

## The edit

| Time | Job |
| --- | --- |
| 0:00-0:04.2 | Problem: "Your brain is not a to-do list." Incoming thought cards and animated type |
| 0:04.2-0:08.2 | Introduction: meet Stickly and see the real handwritten UI |
| 0:08.2-0:13.3 | Explanation: brain dumps, optional checklists, and paper colors |
| 0:13.3-0:18.4 | Proof: the complete corner peel, cursor carry, placement, and flattening |
| 0:18.4-0:21.5 | Proof: the native app resizing on an actual Windows desktop |
| 0:21.5-0:24.6 | Benefit: no account, no cloud, less mental clutter |
| 0:24.6-0:30 | CTA: get Stickly on GitHub, with the URL held on screen |

The peel and checklist footage uses Stickly's actual React renderer with synthetic notes. The peel clip runs at 1.35x speed to fit the complete gesture into this edit. Its geometry is recorded from the app, not recreated in Remotion. The separate Windows recording shows the actual Tauri app over a synthetic Notepad document: writing, checking a task, changing color, pinning, resizing, and restoring history. Cursor highlights help show the interactions. Alt+N is illustrated with key graphics in the film; the recording does not claim to demonstrate that global key press.

All example content is synthetic. The recording session's temporary note changes were removed and the original local notes and backup restored. Private notes, raw desktop setup captures, and credentials are not part of this kit. The supplied reference informed pacing and sound direction; none of its footage, voices, music, or logos are used.

## Sound and voice

The approved brighter female voice is **`cgSgspJ2msm6clMCkdW9`**, generated with Eleven v4. The [65-word script](../../scripts/media/narration.txt) uses playful, upbeat, curious, and confident delivery tags. Word timings come from the generation response, with delivery tags excluded from captions.

The original instrumental is generated with ElevenLabs Music v2.5. Its [generation prompt](source/music-generation.json) calls for a bouncy indie-electronic groove, plucked keys, warm bass, and space for narration. Paper foley is generated separately. Synthesized UI taps and short transition accents add punctuation. Music ducks under speech; the final mix targets -14 LUFS and a true peak below -1 dB. The rendered mix measured approximately -14.4 LUFS and -1.4 dB true peak before final AAC encoding.

The stems are in `source/`. Voice and generated audio usage remain subject to your ElevenLabs account's terms; this kit does not grant rights to an underlying voice model. No music is sampled from the reference.

## Screenshots

Most screenshots show a 320 x 320 logical-pixel window at 2x resolution. Compact is 240 x 200; history is 320 x 440.

[Plain note](../images/plain-note.png) | [Checklist](../images/checklist.png) | [Colors](../images/paper-colors.png) | [Charcoal](../images/charcoal.png) | [History](../images/history.png) | [Peel](../images/peel.png) | [Compact](../images/compact.png) | [Text size](../images/text-size.png) | [Pinned](../images/pinned.png)

## Render or edit

Install Node.js 22.13 or newer, Python 3, and FFmpeg with `ffprobe` on PATH. From the repository root:

```powershell
python scripts/media/prepare-film.py
python scripts/media/mix-audio.py
cd scripts/media/film
npm ci --ignore-scripts
npx remotion browser ensure
npm run render
```

The render writes `docs/media/stickly-launch.mp4` and verifies its duration, dimensions, codecs, and frame count. It separates rendering and encoding to reduce peak memory. On a busy Windows machine, set `$env:NODE_OPTIONS='--max-old-space-size=192 --max-semi-space-size=4'` first.

A fresh clone uses the committed stems and source clips. Rendering does not require API credentials or private recordings. Generated inputs stay ignored under `scripts/media/film/public/generated/`. `npm run dev` in the film directory opens the editable Remotion timeline. `npm run lint` checks types and motion markup.

To generate a new voice take, run `python scripts/media/voiceover.py --api-key-file <private-key-file>` or provide `ELEVENLABS_API_KEY`. For new music, run `python scripts/media/music.py --api-key-file <private-key-file>`. These intentionally call the paid ElevenLabs API. Then prepare, mix, and render again. Keep credentials outside the repository.

To refresh renderer screenshots or the peel recording, build the app with `npm ci` and `npm run build`, then run `node scripts/media/capture.mjs --stills` or `node scripts/media/capture.mjs --peel-demo`. The helper uses isolated example data in Playwright and never reads the native app's notes. It uses installed Edge, or the Chromium executable in `STICKLY_BROWSER_EXECUTABLE`. `python scripts/media/sound-effects.py` regenerates the original UI accents before preparation and mixing.

The native recording is an approved capture, not an automated step in the public render command. To replace it, record the native app with synthetic content over a clean work document, review for private information, and replace `native-desktop-demo.mp4`. Keep the unmodified capture private until review.

## Credits and direction

The workflow uses [Find Skills](https://github.com/vercel-labs/skills), official [Remotion skills](https://github.com/remotion-dev/skills), and official [ElevenLabs skills](https://github.com/elevenlabs/skills) for music, speech, and sound effects. Remotion retains its own [licensing terms](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). Shantell Sans uses SIL OFL 1.1; see [third-party notices](../../THIRD_PARTY_NOTICES.md). The video index uses an identical copy of the bundled font.

The productivity angle reflects overload and interruptions discussed in [Microsoft WorkLab's infinite-workday report](https://www.microsoft.com/en-us/worklab/work-trend-index/breaking-down-infinite-workday). The film makes a specific product promise: catch a thought, keep it visible, and move it where it helps. It does not claim a measured productivity increase. The [creative brief](creative-brief.md) records the message and sound direction.
