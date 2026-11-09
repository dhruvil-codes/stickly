"""Prepare only approved product captures and generated narration for Remotion."""
from pathlib import Path
import json, re, shutil, subprocess
ROOT=Path(__file__).resolve().parents[2]
PUBLIC=ROOT/'scripts/media/film/public/generated'
RAW=ROOT/'artifacts/media-capture'
PUBLIC.mkdir(parents=True,exist_ok=True)

def ffmpeg(*args):subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error',*map(str,args)],check=True)
def duration(path):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)]))
for name in ['plain-note','checklist','paper-colors','charcoal','history','peel','compact','text-size','pinned']:
    shutil.copyfile(ROOT/f'docs/images/{name}.png',PUBLIC/f'{name}.png')
for name in ['stickly.svg','stickly-logo.svg']:
    shutil.copyfile(ROOT/'public'/name,PUBLIC/name)
shutil.copyfile(ROOT/'src/assets/fonts/ShantellSans-Bold.ttf',PUBLIC/'ShantellSans-Bold.ttf')
# Reuse the published generated voice when rebuilding without private credentials.
if (RAW/'narration-original.mp3').exists():
    ffmpeg('-i',RAW/'narration-original.mp3','-af','adelay=250|250,loudnorm=I=-16:TP=-1.5:LRA=11,apad','-t','30','-ac','2','-ar','48000','-c:a','libmp3lame','-b:a','192k','-map_metadata','-1',PUBLIC/'voiceover.mp3')
    shutil.copyfile(PUBLIC/'voiceover.mp3',ROOT/'docs/media/stickly-voiceover.mp3')
else:
    shutil.copyfile(ROOT/'docs/media/stickly-voiceover.mp3',PUBLIC/'voiceover.mp3')
if (RAW/'original-effects.wav').exists():
    ffmpeg('-i',RAW/'original-effects.wav','-af','volume=0.9','-c:a','libmp3lame','-b:a','128k','-map_metadata','-1',PUBLIC/'effects.mp3')
else:
    shutil.copyfile(ROOT/'docs/media/source/effects.mp3',PUBLIC/'effects.mp3')
# These clips contain only synthetic notes in the real Stickly renderer.
shutil.copyfile(ROOT/'docs/media/source/checklist-demo.mp4',PUBLIC/'checklist-demo.mp4')
if (RAW/'peel-demo.json').exists():
    m=json.loads((RAW/'peel-demo.json').read_text(encoding='utf-8-sig'))
    source=ROOT/m['video']; lead=max(0,duration(source)-m['tailSeconds'])
    ffmpeg('-ss',lead,'-i',source,'-t','7.2','-vf','fps=30','-an','-c:v','libx264','-preset','fast','-crf','17','-threads','2','-map_metadata','-1',PUBLIC/'peel-demo.mp4')
else:
    shutil.copyfile(ROOT/'docs/media/source/peel-demo.mp4',PUBLIC/'peel-demo.mp4')
for name in ['music.mp3','peel-foley.mp3']:
    shutil.copyfile(ROOT/'docs/media/source'/name,PUBLIC/name)
shutil.copyfile(ROOT/'docs/media/native-desktop-demo.mp4',PUBLIC/'native-desktop.mp4')
if (ROOT/'docs/media/stickly-soundtrack.mp3').exists():
    shutil.copyfile(ROOT/'docs/media/stickly-soundtrack.mp3',PUBLIC/'soundtrack.mp3')
# Keep the approved clips and synthesized effects available in a fresh clone.
for name in ['checklist-demo.mp4','peel-demo.mp4','effects.mp3']:
    shutil.copyfile(PUBLIC/name,ROOT/'docs/media/source'/name)
words=[]
if (RAW/'narration-alignment.json').exists():
    alignment=json.loads((RAW/'narration-alignment.json').read_text(encoding='utf-8'))['alignment']
    text=''.join(alignment['characters'])
    tag_spans=[match.span() for match in re.finditer(r'\[[^\]]*\]',text)]
    for match in re.finditer(r'\S+',text):
        if any(a<=match.start()<b for a,b in tag_spans):continue
        start=round((alignment['character_start_times_seconds'][match.start()]+.25)*1000)
        end=round((alignment['character_end_times_seconds'][match.end()-1]+.25)*1000)
        words.append({'text':match.group()+' ','startMs':start,'endMs':end,'timestampMs':(start+end)//2,'confidence':None})
else:
    words=json.loads((ROOT/'scripts/media/film/src/captions.json').read_text(encoding='utf-8'))
assert len(words)>60 and words[-1]['endMs']<30000
(ROOT/'scripts/media/film/src/captions.json').write_text(json.dumps(words,indent=2),encoding='utf-8')
chunks=[]; group=[]
for word in words:
    group.append(word)
    if len(group)>=6 or word['text'].rstrip().endswith(('.', '?', '!')):
        chunks.append(group);group=[]
if group:chunks.append(group)
def stamp(ms,sep=','):
    h,r=divmod(ms,3600000);m,r=divmod(r,60000);s,ms=divmod(r,1000)
    return f'{h:02}:{m:02}:{s:02}{sep}{ms:03}'
srt=[];vtt=['WEBVTT','']
for index,group in enumerate(chunks,1):
    copy=''.join(w['text'] for w in group).strip(); start=group[0]['startMs'];end=group[-1]['endMs']
    srt.extend([str(index),stamp(start)+' --> '+stamp(end),copy,''])
    vtt.extend([stamp(start,'.')+' --> '+stamp(end,'.'),copy,''])
(ROOT/'docs/media/launch-captions.srt').write_text('\n'.join(srt),encoding='utf-8')
(ROOT/'docs/media/launch-captions.vtt').write_text('\n'.join(vtt),encoding='utf-8')
print(json.dumps({'approvedImages':9,'narrationVoice':'cgSgspJ2msm6clMCkdW9','captionWords':len(words),'audioDuration':duration(PUBLIC/'voiceover.mp3'),'realPeelSeconds':duration(PUBLIC/'peel-demo.mp4')}))

(ROOT/'scripts/media/film/src/brand.ts').write_text('export const brandSvg = '+json.dumps((ROOT/'public/stickly-logo.svg').read_text(encoding='utf-8'))+';\n',encoding='utf-8')
