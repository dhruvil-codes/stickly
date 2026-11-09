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
    for at, pitch, gain in [(0.35,390,.08),(17.8,230,.14),(8.8,780,.075),(9.5,850,.075),(10.8,530,.05),(11.3,570,.05),(11.8,610,.05),(12.7,450,.05),(20.4,320,.06),(23.05,520,.045),(23.13,590,.04),(24.0,410,.065),(28.2,392,.07),(28.4,588,.055)]:
        tap(at,pitch,gain)
    rng = random.Random(21)
    low = slower = 0.0
    start = int(13.4 * RATE)
    count = int(2.5 * RATE)
    for n in range(count):
        noise = rng.uniform(-1,1)
        low = .72*low + .28*noise
        slower = .96*slower + .04*noise
        envelope = math.sin(math.pi * n/count) ** 1.5
        samples[start+n] += (low-slower) * envelope * .055
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
