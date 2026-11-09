import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const film = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(film, '../../..');
const raw = resolve(film, 'out/launch-remotion.mp4');
const output = resolve(root, 'docs/media/stickly-launch.mp4');
function run(command, args, capture = false) {
  const result = spawnSync(command, args, { cwd: film, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' });
  if (result.error || result.status !== 0) throw result.error ?? new Error(`${command} failed (${result.status})`);
  return result.stdout;
}
mkdirSync(resolve(film, 'out'), { recursive: true });
run(process.execPath, [resolve(film, 'node_modules/@remotion/cli/remotion-cli.js'), 'render', 'src/index.ts', 'SticklyLaunch', raw,
  '--concurrency=1', '--codec=h264', '--crf=18', '--pixel-format=yuv420p', '--x264-preset=fast',
  '--audio-bitrate=192k', '--disallow-parallel-encoding', '--media-cache-size-in-bytes=251658240', '--log=error']);
// Keep video frames untouched; trim AAC padding to an exact 30-second MP4.
run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', raw, '-map', '0:v:0', '-map', '0:a:0',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', '30', '-map_metadata', '-1', '-movflags', '+faststart', output]);
const info = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', output], true));
const video = info.streams.find(s => s.codec_type === 'video');
if (video?.width !== 1920 || video.height !== 1080 || video.codec_name !== 'h264' || video.nb_frames !== '900'
  || info.format.duration !== '30.000000' || !info.streams.some(s => s.codec_type === 'audio' && s.codec_name === 'aac')) {
  throw new Error('The launch film did not match its delivery specification.');
}
console.log(JSON.stringify({ file: output, duration: info.format.duration, dimensions: [1920, 1080], frames: 900, bytes: Number(info.format.size) }));
