"""Generate the requested ElevenLabs narration without storing API credentials."""
from pathlib import Path
import argparse
import base64
import json
import os
import urllib.request
import urllib.error

ROOT=Path(__file__).resolve().parents[2]
VOICE='dmWfLQZJq7wNPv9WmtiM'
TEXT=("A thousand things on your mind? Put the next one right here. "
      "Meet Stickly. Beautiful handwritten notes for your Windows desktop. "
      "Capture ideas. Check off tasks. Pick a colour. Pin what matters. "
      "Then grab a corner. Peel it away, follow your cursor, and click to stick it somewhere new. "
      "Resize it. Restore old notes. Bring it back with Alt N. "
      "No account. No cloud. Just a little more headspace. Stickly.")

def call(path,key,payload=None):
    request=urllib.request.Request('https://api.elevenlabs.io/v1/'+path,data=None if payload is None else json.dumps(payload).encode(),headers={'xi-api-key':key,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=120) as response:return json.load(response)
    except urllib.error.HTTPError as error:
        try:
            detail=json.loads(error.read()).get('detail',{})
            status=detail.get('status','request_failed') if isinstance(detail,dict) else 'request_failed'
            message=detail.get('message','') if isinstance(detail,dict) else str(detail)
        except Exception:status,message='request_failed',''
        raise SystemExit(f'ElevenLabs HTTP {error.code}: {status}. {message[:240].replace(key,"[redacted]")}')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--api-key-file',type=Path)
    args=parser.parse_args()
    key=args.api_key_file.read_text(encoding='utf-8-sig').strip() if args.api_key_file else os.environ.get('ELEVENLABS_API_KEY','').strip()
    if not key:raise SystemExit('Provide ELEVENLABS_API_KEY or a private --api-key-file.')
    result=call('text-to-speech/'+VOICE+'/with-timestamps?output_format=mp3_44100_128',key,{'text':TEXT,'model_id':'eleven_multilingual_v2','voice_settings':{'stability':.5,'similarity_boost':.8,'style':.25,'use_speaker_boost':True,'speed':1.07}})
    out=ROOT/'artifacts/media-capture'
    out.mkdir(parents=True,exist_ok=True)
    audio=base64.b64decode(result['audio_base64'])
    (out/'narration-original.mp3').write_bytes(audio)
    (out/'narration-alignment.json').write_text(json.dumps({'voiceId':VOICE,'text':TEXT,'alignment':result.get('normalized_alignment') or result['alignment']},ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'scripts/media/narration.txt').write_text(TEXT+'\n',encoding='utf-8')
    print(json.dumps({'voiceId':VOICE,'words':len(TEXT.split()),'audioBytes':len(audio),'saved':'artifacts/media-capture/narration-original.mp3'}))
