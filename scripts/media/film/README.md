# Stickly launch film

The editable 30-second, 1920 x 1080 Remotion composition for Stickly.

See the [launch kit](../../../docs/media/README.md) for the finished MP4, narration, product captures, asset credits, and reproduction steps.

From the repository root, run `python scripts/media/prepare-film.py` first. Then, in this directory:

```powershell
npm ci --ignore-scripts
npx remotion browser ensure
npm run render
```

`npm run dev` opens the timeline. `npm run lint` checks the composition's types and lint rules. Generated inputs, build output, and dependencies stay ignored.
