"""Synthesize the original paper noise and gentle UI taps for the launch film."""
from pathlib import Path
import array
import math
import random
import wave

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'artifacts/media-capture'
RATE = 48000
SECONDS = 30

def effects():
    samples = [0.0] * (RATE * SECONDS)
    def tap(at, pitch, gain=.1, duration=.11):
        start = int(at * RATE)
        for n in range(int(duration * RATE)):
            t = n / RATE
            envelope = math.exp(-t * 48) * min(1, t / .003)
            value = gain * envelope * (math.sin(2*math.pi*pitch*t) + .3*math.sin(2*math.pi*pitch*2.03*t))
            if start+n < len(samples): samples[start+n] += value
    for at, pitch, gain in [(0.03,390,.18),(.24,510,.11),(.5,620,.09),(3.28,180,.15),(4.18,620,.18),(9.2,780,.18),(10.82,850,.2),(11.58,530,.13),(12.08,610,.12),(16.95,230,.26),(18.38,320,.16),(19.22,720,.15),(21.52,490,.13),(22.42,570,.13),(24.62,392,.16),(25.9,588,.13),(26.07,784,.12)]:
        tap(at,pitch,gain)
    rng = random.Random(21)
    for at in [1.05,4.08,8.15,13.23,18.28,21.4,24.5]:
        low=0.0; count=int(.2*RATE); start=int(at*RATE)
        for n in range(count):
            low=.8*low+.2*rng.uniform(-1,1)
            samples[start+n]+=low*math.sin(math.pi*n/count)**2*.10

    pcm = array.array('h')
    for value in samples:
        v = max(-.7,min(.7,value))
        pcm.extend((int(v*32767*.94),int(v*32767)))
    path = RAW / 'original-effects.wav'
    with wave.open(str(path),'wb') as file:
        file.setnchannels(2); file.setsampwidth(2); file.setframerate(RATE); file.writeframes(pcm.tobytes())
    return path

if __name__ == "__main__":
    RAW.mkdir(parents=True,exist_ok=True)
    print(effects().relative_to(ROOT))
