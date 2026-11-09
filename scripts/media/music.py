"""Generate the original instrumental launch score using ElevenLabs Music."""
from pathlib import Path
import argparse,json,urllib.request,urllib.error,subprocess
ROOT=Path(__file__).resolve().parents[2]
PROMPT="""A 30-second original instrumental for a playful Gen Z productivity app launch. Glossy indie-electronic / light UK garage groove at 112 BPM, warm round bass, crisp soft kick, syncopated claps, delicate shakers, bright plucked glass-key melody, airy jazzy seventh chords. Confident, feminine, breezy and cool, slightly cheeky, polished social launch energy. Start with a catchy pluck and percussive hit immediately, no long intro. A tiny rhythmic stop around 3 seconds, full groove at 4. From 12 to 20 seconds thin the arrangement slightly for a tactile paper peel demonstration, then bounce back. Leave space in the centre for spoken female narration. End with a clean resolved two-note sonic logo at 29 seconds and a short decay. No vocals, no spoken words, no corporate ukulele, no epic trailer drums."""
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--api-key-file',type=Path,required=True);args=p.parse_args()
 key=args.api_key_file.read_text(encoding='utf-8-sig').strip()
 request=urllib.request.Request('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192',data=json.dumps({'prompt':PROMPT,'music_length_ms':30000,'force_instrumental':True,'model_id':'music_v2_5'}).encode(),headers={'xi-api-key':key,'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(request,timeout=240) as response:audio=response.read()
 except urllib.error.HTTPError as error:
  data=json.loads(error.read());detail=data.get('detail',{});message=detail.get('message',str(detail)) if isinstance(detail,dict) else str(detail)
  raise SystemExit(f'ElevenLabs music HTTP {error.code}: '+message[:300].replace(key,'[redacted]'))
 out=ROOT/'artifacts/media-capture';out.mkdir(parents=True,exist_ok=True)
 (out/'music-original.mp3').write_bytes(audio)
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(out/'music-original.mp3'),'-af','loudnorm=I=-19:TP=-2:LRA=7,afade=t=out:st=29.2:d=0.8','-t','30','-c:a','libmp3lame','-b:a','192k',str(ROOT/'docs/media/source/music.mp3')],check=True)
 (ROOT/'docs/media/source/music-generation.json').write_text(json.dumps({'provider':'ElevenLabs','model':'music_v2_5','prompt':PROMPT,'requestedSeconds':30,'instrumental':True},indent=2),encoding='utf-8')
 print(json.dumps({'saved':'artifacts/media-capture/music-original.mp3','bytes':len(audio)}))
