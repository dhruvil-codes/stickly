"""Mix the launch music, narration and tactile effects, ducking music under speech."""
from pathlib import Path
import subprocess,json
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'scripts/media/film/public/generated'
OUT=ROOT/'docs/media/stickly-soundtrack.mp3'
filters="[0:a]aformat=sample_fmts=fltp:channel_layouts=stereo,asplit=2[voice][key];[1:a]aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0.85[music];[music][key]sidechaincompress=threshold=0.04:ratio=4:attack=15:release=220:makeup=1[ducked];[2:a]volume=0.85[fx];[3:a]volume=0.5,adelay=13700|13700[paper];[voice][ducked][fx][paper]amix=inputs=4:duration=longest:normalize=0,atrim=duration=30,loudnorm=I=-14:TP=-1.2:LRA=5[a]"
args=['ffmpeg','-y','-hide_banner','-loglevel','error']
for name in ['voiceover.mp3','music.mp3','effects.mp3','peel-foley.mp3']:args+=['-i',str(SOURCE/name)]
subprocess.run(args+['-filter_complex',filters,'-map','[a]','-t','30','-ar','48000','-ac','2','-c:a','libmp3lame','-b:a','192k','-map_metadata','-1',str(OUT)],check=True)
(SOURCE/'soundtrack.mp3').write_bytes(OUT.read_bytes())
print(json.dumps({'mix':'docs/media/stickly-soundtrack.mp3','targetLUFS':-14,'musicDucksUnderVoice':True,'originalMusic':True,'generatedPaperFoley':True}))
