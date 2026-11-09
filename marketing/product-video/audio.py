"""Synthesizes the soundtrack from timeline.json: a 124 BPM electronic track
with a Khaleeji frame-drum and hand-clap layer, UI taps, accelerating seat
ticks and a whistle hit when the stopwatch stops.

    python3 audio.py out/track.wav
"""

import json
import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import lfilter

ROOT = Path(__file__).parent
TL = json.loads((ROOT / "timeline.json").read_text())
SR = 48000
BEAT = 60 / TL["bpm"]
DUR = TL["duration"]
N = int(SR * DUR)
rng = np.random.default_rng(124)

L = np.zeros(N)
R = np.zeros(N)


def at(beat):
    return beat * BEAT


def put(sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    sig = sig[: N - i]
    L[i : i + len(sig)] += sig * gain * np.sqrt(0.5 * (1 - pan))
    R[i : i + len(sig)] += sig * gain * np.sqrt(0.5 * (1 + pan))


def env(n, attack, decay):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / decay)


def onepole_lp(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    return lfilter([1 - a], [1, -a], x)


def hp(x, cutoff):
    return x - onepole_lp(x, cutoff)


def bandnoise(n, lo, hi):
    return hp(onepole_lp(rng.standard_normal(n), hi), lo)


# ---------- Instruments ----------

def kick():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    freq = 46 + 110 * np.exp(-t / 0.045)
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t / 0.2)
    click = bandnoise(n, 1500, 6000) * np.exp(-t / 0.004) * 0.4
    return np.tanh(1.6 * (body + click))


KICK = kick()


def hat(open_=False):
    n = int((0.16 if open_ else 0.05) * SR)
    return bandnoise(n, 7000, 16000) * env(n, 0.0005, 0.05 if open_ else 0.014)


HAT_C = [hat() for _ in range(4)]
HAT_O = hat(True)


def clap(spread=0.012, voices=3):
    n = int(0.25 * SR)
    out = np.zeros(n)
    for v in range(voices):
        off = int(v * spread * SR / voices)
        m = n - off
        out[off:] += bandnoise(m, 900, 3200) * env(m, 0.0008, 0.05 if v == voices - 1 else 0.01)
    return out / voices * 1.4


CLAP = clap()
GROUP_CLAPS = [clap(spread=0.03, voices=6) for _ in range(4)]


def frame_drum(low=True):
    """Tar / daf: a tuned skin with a slap of noise."""
    n = int((0.38 if low else 0.16) * SR)
    t = np.arange(n) / SR
    if low:
        f = 82 + 55 * np.exp(-t / 0.03)
        tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
        skin = bandnoise(n, 200, 1400) * np.exp(-t / 0.02) * 0.35
    else:
        f = 360 + 80 * np.exp(-t / 0.01)
        tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.045) * 0.5
        skin = bandnoise(n, 1200, 6000) * np.exp(-t / 0.018) * 0.8
    return tone + skin


DUM = frame_drum(True)
TAK = frame_drum(False)


def saw(freq, n, voices=3, detune=0.008):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for v in range(voices):
        f = freq * (1 + detune * (v - (voices - 1) / 2))
        ph = (t * f + rng.random()) % 1.0
        out += 2 * ph - 1
    return out / voices


def bass_note(freq, length):
    n = int(length * SR)
    sig = saw(freq, n, 2, 0.004) + 0.6 * np.sin(2 * np.pi * freq / 2 * np.arange(n) / SR)
    return onepole_lp(sig, 520) * env(n, 0.003, length * 0.8) * 1.6


def stab(freqs, length, cutoff=1800):
    n = int(length * SR)
    sig = sum(saw(f, n) for f in freqs) / len(freqs)
    return onepole_lp(onepole_lp(sig, cutoff), cutoff) * env(n, 0.004, length * 0.35)


def pad(freqs, length, cutoff=900):
    n = int(length * SR)
    t = np.arange(n) / SR
    sig = sum(saw(f, n, 4, 0.01) for f in freqs) / len(freqs)
    shape = np.clip(t / 0.6, 0, 1) * np.clip((length - t) / 0.8, 0, 1)
    return onepole_lp(onepole_lp(sig, cutoff), cutoff) * shape


def tap(freq=1900, gain=1.0):
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.012)
    click = bandnoise(n, 2500, 9000) * np.exp(-t / 0.002) * 0.5
    return (body + click) * gain


def tick(k):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    f = 1500 * 2 ** (k / 8)
    body = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.02)
    wood = np.sin(2 * np.pi * f * 1.51 * t) * np.exp(-t / 0.008) * 0.5
    click = bandnoise(n, 3000, 12000) * np.exp(-t / 0.0015) * 0.7
    return body + wood + click


def whistle():
    n = int(0.62 * SR)
    t = np.arange(n) / SR
    trill = 0.55 + 0.45 * np.sign(np.sin(2 * np.pi * 28 * t))
    trill = onepole_lp(trill, 300)
    f = 2950 + 60 * np.sin(2 * np.pi * 28 * t)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.25 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR)
    breath = bandnoise(n, 2500, 5000) * 0.25
    shape = np.clip(t / 0.01, 0, 1) * np.clip((0.62 - t) / 0.12, 0, 1)
    return (tone + breath) * trill * shape


def impact(length=1.6):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = 38 + 70 * np.exp(-t / 0.08)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.5)
    air = bandnoise(n, 300, 9000) * np.exp(-t / 0.35) * 0.35
    return np.tanh(1.4 * (boom + air))


def riser(length):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    out = np.zeros(n)
    seg = SR // 20
    for s in range(0, n, seg):
        p = s / n
        cut = 400 + 9000 * p**2
        out[s : s + seg] = onepole_lp(x[s : s + seg], cut)
    return hp(out, 200) * (t / length) ** 2


def word_hit():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 60 + 40 * np.exp(-t / 0.05)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18) + bandnoise(n, 800, 4000) * np.exp(-t / 0.01) * 0.3


# ---------- Harmony: D minor, i - VI - III - VII ----------

def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


CHORDS = [[62, 65, 69], [58, 62, 65], [65, 69, 72], [60, 64, 67]]
ROOTS = [38, 34, 41, 36]


def bar_of(beat):
    return int(beat // 4)


# ---------- Arrangement ----------

S = TL["scenes"]
stop_beat = TL["stopwatch"]["stop"]

# Hook: dark pad, a thud per word, a hit on the cut, a riser into the drop.
put(pad([hz(50), hz(57), hz(62)], at(6) + 0.3, 500), 0, 0.28)
for w in TL["hook"]["words"]:
    put(word_hit(), at(w), 0.55)
put(impact(1.2), at(TL["hook"]["cut"]), 0.7)
put(riser(at(2)), at(6), 0.25)
put(tap(2400, 0.6), at(TL["hook"]["cut"]), 0.5)


def drums(b0, b1, *, kick_on=True, claps=True, khaleeji=1.0, hats=True, stabs=True, bass=True):
    for beat in np.arange(b0, b1, 0.25):
        sixteenth = int(round((beat % 4) * 4))
        swing = 0.012 if sixteenth % 2 else 0.0
        t = at(beat) + swing
        on_beat = sixteenth % 4 == 0
        if kick_on and on_beat:
            put(KICK, t, 0.9)
        if hats:
            if sixteenth % 4 == 2:
                put(HAT_O, t, 0.16, 0.2)
            else:
                put(HAT_C[sixteenth % 4], t, 0.07 if on_beat else 0.1, -0.2)
        if claps and sixteenth in (4, 12):
            put(CLAP, t, 0.42, 0.05)
        if khaleeji:
            if sixteenth in (0, 7, 8):
                put(DUM, t, 0.42 * khaleeji, -0.25)
            if sixteenth in (3, 6, 10, 13):
                put(TAK, t, 0.3 * khaleeji, 0.3)
            if sixteenth in (2, 6, 11, 14):
                put(GROUP_CLAPS[sixteenth % 4], t + 0.006, 0.22 * khaleeji, 0.35)
        bar = bar_of(beat) % 4
        if bass and sixteenth % 4 == 2:
            put(bass_note(hz(ROOTS[bar]), BEAT * 0.45), t, 0.42)
        if bass and sixteenth == 14 and bar_of(beat) % 2:
            put(bass_note(hz(ROOTS[bar] + 12), BEAT * 0.2), t, 0.3)
        if stabs and sixteenth in (3, 10):
            put(stab([hz(n) for n in CHORDS[bar]], BEAT * 0.6), t, 0.13, 0.1 if sixteenth == 3 else -0.1)


def pads(b0, b1, gain=0.12):
    b = b0
    while b < b1:
        length = min(4 - (b % 4), b1 - b)
        put(pad([hz(n - 12) for n in CHORDS[bar_of(b) % 4]], at(length) + 0.4), at(b), gain)
        b += length


drums(S["signup"][0], S["signup"][1], claps=False, stabs=False, khaleeji=0.7)
drums(S["group"][0], S["group"][1])
drums(S["game"][0], stop_beat - 4)
drums(stop_beat - 4, stop_beat, kick_on=True, hats=True, stabs=False, khaleeji=1.2)
drums(stop_beat + 1, S["game"][1], kick_on=False, claps=False, hats=False, stabs=False, bass=False, khaleeji=0.6)
drums(S["play"][0], S["play"][1])
pads(S["signup"][0], S["end"][0], 0.07)
pads(stop_beat, S["play"][0], 0.14)
put(riser(at(10)), at(stop_beat - 10), 0.22)

for cut in (S["signup"][0], S["group"][0], S["game"][0], S["play"][0]):
    put(impact(0.9), at(cut), 0.32)

# End card: one hit, a long chord, the percussion thins out.
put(impact(2.4), at(S["end"][0]), 0.75)
put(pad([hz(n) for n in (50, 57, 62, 65, 69)], DUR - at(S["end"][0]), 1200), at(S["end"][0]), 0.22)
drums(S["end"][0], S["end"][0] + 4, kick_on=False, claps=False, hats=True, stabs=False, bass=False, khaleeji=0.6)
put(tap(1200, 0.8), at(TL["end"]["logo"]), 0.45)
put(tap(1600, 0.6), at(TL["end"]["badges"]), 0.35)

# ---------- UI sound ----------

sg = TL["signup"]
for f in sg["fields"]:
    put(tap(1700, 0.8), at(f), 0.2)
    put(tap(2300), at(f + sg["doneAfter"]), 0.38)
g = TL["group"]
for b in (g["tapNew"], g["nameDone"], g["tapPhone"], g["tapShare"]):
    put(tap(2100), at(b), 0.4)
for k, j in enumerate(g["joins"]):
    put(tap(1300 * 2 ** (k / 12)), at(j), 0.3, 0.1)
gm = TL["game"]
put(tap(2100), at(gm["tapNew"]), 0.4)
for f in gm["fields"]:
    put(tap(1700, 0.8), at(f), 0.2)
    put(tap(2300), at(f + gm["doneAfter"]), 0.38)
put(tap(2100), at(gm["tapShare"]), 0.4)
for k, s in enumerate(gm["seats"]):
    put(tick(k), at(s), 0.55, 0.15 * (-1) ** k)
put(whistle(), at(stop_beat), 0.42)
put(impact(1.8), at(stop_beat), 0.7)
put(tap(900, 1.0), at(gm["flip"] + 0.5), 0.35)
p = TL["play"]
s0, s1 = at(p["score"][0]), at(p["score"][1])
for v in range(1, 8):
    frac = 1 - (1 - v / 7) ** (1 / 3)
    put(tap(1500 + 60 * v, 0.7), s0 + (s1 - s0) * frac * 0.999, 0.22)
for b, f in ((p["goalMachine"], 1320), (p["mvp"], 1760)):
    put(tap(f, 1.0), at(b), 0.4)
    put(tap(f * 1.5, 0.6), at(b) + 0.07, 0.3)
put(tap(2300), at(p["formUpdate"]), 0.4)
for b in (sg["progress"], g["progress"], gm["progress"], p["progress"]):
    put(tap(2600, 0.5), at(b), 0.2)

# ---------- Master ----------

fade = np.ones(N)
tail = int(1.2 * SR)
fade[-tail:] = np.linspace(1, 0, tail) ** 2
mix = np.stack([L, R], axis=1) * fade[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix /= np.max(np.abs(mix)) / 0.89

out = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "out/track.wav")
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"wrote {out} ({DUR}s)")
