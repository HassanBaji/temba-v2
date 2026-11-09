"""The music bed: 20 seconds at 120 BPM in A minor, synthesised from scratch.

    python3 music/score.py          → music/music.wav (44.1 kHz, 16-bit stereo)

Needs only numpy. Every cue is read from ../timing.js, the same block the
picture uses, so the hits land on the cuts. Edit the arrangement in `score()`.
"""

import json
import pathlib
import wave

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
SR = 44100
RNG = np.random.default_rng(7)


def load_timing():
    text = (HERE.parent / "timing.js").read_text()
    return json.loads(text[text.index("{") : text.rindex("}") + 1])


# ---- Building blocks -------------------------------------------------------


def secs(n):
    return np.arange(int(n * SR)) / SR


def noise(dur):
    return RNG.uniform(-1, 1, int(dur * SR))


def lowpass_shape(freqs, cutoff, order=2):
    return 1 / np.sqrt(1 + (freqs / cutoff) ** (2 * order))


def fft_filter(x, lo=None, hi=None, order=2):
    """Zero-phase band filter with Butterworth-shaped magnitude."""
    n = len(x)
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    gain = np.ones_like(f)
    if hi:
        gain *= lowpass_shape(f, hi, order)
    if lo:
        with np.errstate(divide="ignore"):
            gain *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-6)) ** (2 * order))
    return np.fft.irfft(spec * gain, n)


def sweep_filter(x, cutoffs_hz, block=2048, hop=512):
    """Lowpass whose cutoff follows `cutoffs_hz` (one value per sample)."""
    out = np.zeros(len(x) + block)
    norm = np.zeros(len(x) + block)
    win = np.hanning(block)
    f = np.fft.rfftfreq(block, 1 / SR)
    padded = np.concatenate([x, np.zeros(block)])
    for start in range(0, len(x), hop):
        seg = padded[start : start + block] * win
        c = cutoffs_hz[min(start + block // 2, len(x) - 1)]
        seg = np.fft.irfft(np.fft.rfft(seg) * lowpass_shape(f, c, 3), block)
        out[start : start + block] += seg * win
        norm[start : start + block] += win**2
    return (out / np.maximum(norm, 1e-6))[: len(x)]


def saw(freq, t, bright=1.0):
    """Band-limited sawtooth by additive synthesis. `freq` may be an array."""
    freq = np.broadcast_to(np.asarray(freq, dtype=float), t.shape)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    top = int(min(40, (SR / 2) / np.max(freq)))
    out = np.zeros_like(t)
    for k in range(1, top + 1):
        out += np.sin(k * phase) / k * (bright ** (k - 1))
    return out * 0.6


def env(t, attack=0.004, decay=6.0):
    a = np.clip(t / attack, 0, 1)
    return a * np.exp(-t * decay)


# ---- Instruments ------------------------------------------------------------


def kick(gain=1.0, length=0.5, punch=1.0):
    t = secs(length)
    f = 44 + 130 * punch * np.exp(-t * 30)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    click = fft_filter(noise(length), lo=1500) * np.exp(-t * 400) * 0.25
    return (body + click) * gain * 0.85


def sub_boom(gain=1.0, length=1.6):
    t = secs(length)
    f = 38 + 40 * np.exp(-t * 6)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.003, 2.2) * gain


def clap(gain=1.0):
    t = secs(0.45)
    n = fft_filter(noise(0.45), lo=900, hi=6000)
    e = np.zeros_like(t)
    for off in (0.0, 0.011, 0.022):
        e += np.where(t >= off, np.exp(-(t - off) * 140), 0)
    e += np.where(t >= 0.03, np.exp(-(t - 0.03) * 14) * 0.5, 0)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 30) * 0.3
    return (n * e + tone) * gain


def hat(gain=1.0, open_=False):
    length = 0.25 if open_ else 0.08
    t = secs(length)
    n = fft_filter(noise(length), lo=7000)
    return n * np.exp(-t * (16 if open_ else 70)) * gain


def tick(gain=1.0, freq=2400):
    t = secs(0.05)
    return (np.sin(2 * np.pi * freq * t) * np.exp(-t * 160) + fft_filter(noise(0.05), lo=3000) * np.exp(-t * 500) * 0.4) * gain


def clink(freq, gain=1.0, length=1.2):
    """A coin: inharmonic partials with fast-decaying highs."""
    t = secs(length)
    out = np.zeros_like(t)
    for ratio, amp, decay in ((1.0, 1.0, 5.0), (2.76, 0.55, 8.0), (5.40, 0.3, 13.0), (8.93, 0.16, 20.0)):
        out += amp * np.sin(2 * np.pi * freq * ratio * t + RNG.uniform(0, 6.28)) * np.exp(-t * decay)
    out += fft_filter(noise(length), lo=4000) * np.exp(-t * 300) * 0.3
    return out * np.clip(t / 0.001, 0, 1) * gain * 0.45


def stab(freqs, gain=1.0, length=0.7, decay=5.0, cutoff=2600, bend=None):
    t = secs(length)
    bend_curve = np.ones_like(t) if bend is None else bend(t)
    out = np.zeros_like(t)
    for f in freqs:
        for cents in (-8, 0, 8):
            out += saw(f * 2 ** (cents / 1200) * bend_curve, t, bright=0.93)
    out = fft_filter(out, hi=cutoff)
    return out / (len(freqs) * 3) * env(t, 0.003, decay) * gain * 2.9


def bass(freq, gain=1.0, length=0.22):
    t = secs(length)
    tone = saw(freq, t, bright=0.8) * 0.5 + np.sin(2 * np.pi * freq * t)
    tone = fft_filter(tone, hi=700)
    return tone * env(t, 0.004, 9) * gain


def pad(freqs, length, gain=1.0, cutoff=900):
    t = secs(length)
    out = np.zeros_like(t)
    for f in freqs:
        for cents in (-6, 6):
            out += saw(f * 2 ** (cents / 1200), t, bright=0.75)
    out = fft_filter(out, hi=cutoff)
    fade = np.minimum(np.clip(t / 0.6, 0, 1), np.clip((length - t) / 0.3, 0, 1))
    return out / (len(freqs) * 2) * fade * gain


def riser(length, gain=1.0, start_hz=300, end_hz=9000):
    t = secs(length)
    p = t / length
    cut = start_hz * (end_hz / start_hz) ** p
    return sweep_filter(noise(length), cut) * p**2 * gain


def whirr(length, gain=1.0):
    """A spinning coin: noise pulsing at a slowing rate, rising in pitch."""
    t = secs(length)
    p = t / length
    rate = 22 - 14 * p
    pulse = 0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(rate) / SR)
    cut = 900 * (6 ** p)
    return sweep_filter(noise(length), cut) * pulse * (0.3 + 0.7 * p) ** 2 * gain


def whoosh(length, gain=1.0):
    t = secs(length)
    p = t / length
    cut = 400 * (20**p)
    return sweep_filter(noise(length), cut) * np.sin(np.pi * p) ** 2 * gain


def reverb(x, wet=0.25, length=1.6):
    t = secs(length)
    ir = fft_filter(noise(length), hi=5000) * np.exp(-t * 3.2)
    ir /= np.sqrt(np.sum(ir**2))
    n = len(x) + len(ir)
    y = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]
    return x + wet * y


# ---- Arrangement --------------------------------------------------------------

NOTE = {
    "E1": 41.20, "F1": 43.65, "G1": 49.00, "A1": 55.00, "C2": 65.41,
    "A2": 110.0, "E3": 164.81, "F3": 174.61, "G3": 196.0, "G#3": 207.65,
    "A3": 220.0, "B3": 246.94, "C4": 261.63, "D4": 293.66, "E4": 329.63, "G4": 392.0,
}
CHORD = {
    "Am": ["A3", "C4", "E4"],
    "C": ["C4", "E4", "G4"],
    "F": ["F3", "A3", "C4"],
    "G": ["G3", "B3", "D4"],
    "E": ["E3", "G#3", "B3"],
    "Am9": ["A2", "E3", "A3", "B3", "C4", "E4"],
}


def chord(name):
    return [NOTE[n] for n in CHORD[name]]


class Mix:
    def __init__(self, duration):
        self.n = int(duration * SR)
        self.dry = np.zeros((2, self.n))
        self.send = np.zeros((2, self.n))

    def add(self, at, sig, gain=1.0, pan=0.0, rev=0.0):
        i = int(round(at * SR))
        if i >= self.n:
            return
        sig = sig[: self.n - i] * gain
        left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        for ch, g in ((0, left), (1, right)):
            self.dry[ch, i : i + len(sig)] += sig * g * 1.414
            if rev:
                self.send[ch, i : i + len(sig)] += sig * g * 1.414 * rev

    def render(self, fade_from, duration):
        wet = np.stack([reverb(self.send[0], 1.0) - self.send[0], reverb(self.send[1], 1.0) - self.send[1]])
        out = self.dry + wet * 0.9
        t = np.arange(self.n) / SR
        out *= np.clip((duration - t) / (duration - fade_from), 0, 1)
        drive = 1.6
        out = np.tanh(out * drive) / np.tanh(drive)
        return out / np.max(np.abs(out)) * 0.89


def score(T):
    beat = 60 / T["bpm"]
    m = Mix(T["duration"])

    # 0–3 s: the line arrives. A low pad, one tick per word, a riser into the card.
    m.add(0.0, pad([NOTE["A2"], NOTE["E3"]], T["irisEnd"], cutoff=500), 0.22)
    words = 7
    for i in range(words):
        m.add(T["introFirstWord"] + i * T["introWordStep"], tick(freq=2200), 0.22, pan=-0.2 + 0.07 * i)
    m.add(T["irisStart"] - 0.5, riser(T["irisEnd"] - T["irisStart"] + 0.5, end_hz=7000), 0.35)

    # 3–7 s: the card builds, the MVP coin spins down and stamps.
    b = T["cardBuild"]
    m.add(b, kick(punch=1.2), 0.9)
    m.add(b, sub_boom(length=1.0), 0.45)
    m.add(b, hat(open_=True), 0.25, pan=0.3)
    for i, at in enumerate((b, b + 0.25, b + 0.5)):
        m.add(at, tick(freq=1800 + 300 * i), 0.18)
    t = b + beat
    while t < T["coinEnter"] - 1e-6:
        m.add(t, kick(punch=0.8), 0.45)
        t += beat
    t = b + beat / 2
    while t < T["coinLand"] - 1e-6:
        m.add(t, hat(), 0.22, pan=0.25)
        t += beat
    m.add(T["coinEnter"], whirr(T["coinLand"] - T["coinEnter"]), 0.4)

    land = T["coinLand"]
    m.add(land, kick(punch=1.4, length=0.6), 1.1)
    m.add(land, sub_boom(), 0.7)
    m.add(land, clink(1760), 0.75, rev=0.35)
    m.add(land, stab(chord("Am"), length=1.2, decay=3.0), 0.55, rev=0.3)
    m.add(land, fft_filter(noise(0.3), hi=900) * np.exp(-secs(0.3) * 18), 0.5)
    t = land
    while t < T["pushOut"] - 1e-6:
        if t > land:
            m.add(t, kick(), 0.8)
        m.add(t + beat / 2, hat(), 0.25, pan=0.25)
        m.add(t + beat / 2, bass(NOTE["A1"]), 0.5)
        t += beat
    for at in (land + beat, land + 3 * beat):
        if at < T["pushOut"]:
            m.add(at, clap(), 0.5, rev=0.15)
    m.add(T["pushOut"], whoosh(T["montageStart"] - T["pushOut"] + 0.05), 0.45)

    # 7–13 s: one mark per beat pair. A stab on the cut, a clink on the landing.
    marks = [("Am", "A1", 2093.0), ("C", "C2", 2349.3), ("F", "F1", 2637.0), ("G", "G1", 1975.5), ("Am", "A1", 2093.0), ("E", "E1", 1318.5)]
    for i, (name, root, ping) in enumerate(marks):
        start = T["montageStart"] + i * T["montageStep"]
        sleepy = i == len(marks) - 1
        bend = (lambda tt: 1 - 0.28 * np.clip(tt / 0.7, 0, 1) ** 1.5) if sleepy else None
        m.add(start, stab(chord(name), length=0.9 if sleepy else 0.6, decay=3.0 if sleepy else 5.5, bend=bend), 0.5, rev=0.2)
        m.add(start, kick(), 0.95)
        m.add(start + T["montageLand"][i], clink(ping), 0.5, pan=0.15 * (-1) ** i, rev=0.25)
        if i == 3:
            m.add(start + T["montageLand"][i], kick(punch=1.3), 0.7)
        for k in range(int(T["montageStep"] / beat)):
            bt = start + k * beat
            if k > 0:
                m.add(bt, kick(), 0.8)
            m.add(bt + beat / 2, clap(), 0.45, rev=0.12)
            for s16 in range(4):
                m.add(bt + s16 * beat / 4, hat(), 0.14 if s16 % 2 else 0.08, pan=-0.3)
            for e8 in range(2):
                m.add(bt + e8 * beat / 2 + beat / 4, bass(NOTE[root]), 0.42)

    # 13–16 s: coins drop into the cabinet, each clink a step up the scale.
    c = T["cabinetStart"]
    m.add(c, kick(punch=1.2), 0.9)
    m.add(c, pad(chord("Am"), T["cabinetSilence"] - c, cutoff=1400), 0.2)
    for at in (c + 1.0, c + 2.0):
        m.add(at, kick(), 0.7)
    t = c
    while t < T["cabinetSilence"] - 1e-6:
        m.add(t + beat / 2, hat(), 0.18, pan=0.2)
        t += beat
    scale = [880.0, 1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0, 2349.3]
    for k, f in enumerate(scale):
        m.add(T["dropFirst"] + k * T["dropStep"], clink(f, length=0.9), 0.55, pan=-0.35 + 0.1 * k, rev=0.2)
    m.add(T["cabinetSilence"] - 0.75, riser(0.75, start_hz=600, end_hz=10000), 0.3)

    # 16–18 s: three lines, three hits.
    o = T["outroStart"]
    for i, name in enumerate(("F", "G", "Am")):
        at = o + i * T["outroStep"]
        m.add(at, kick(punch=1.2), 1.0)
        m.add(at, clap(), 0.55, rev=0.2)
        m.add(at, stab(chord(name), length=0.5, decay=6), 0.6, rev=0.25)
        m.add(at, bass(NOTE[{"F": "F1", "G": "G1", "Am": "A1"}[name]] * 2, length=0.4), 0.6)
    t = o + 2 * T["outroStep"]
    while t < T["endStart"] - 1e-6:
        m.add(t + beat / 2, hat(), 0.2)
        t += beat
    for k in range(4):
        m.add(T["endStart"] - beat / 2 + k * beat / 8, clap(), 0.18 + 0.08 * k)

    # 18–20 s: the end card. One last chord and a coin, ringing out.
    e = T["endStart"]
    m.add(e, kick(punch=1.4, length=0.6), 1.0)
    m.add(e, sub_boom(length=2.0), 0.65)
    m.add(e, stab(chord("Am9"), length=2.0, decay=1.6, cutoff=3200), 0.6, rev=0.45)
    m.add(e, clink(2637.0, length=1.8), 0.5, rev=0.5)
    m.add(e, pad(chord("Am"), T["duration"] - e, cutoff=1100), 0.16)

    return m.render(T["duration"] - 0.9, T["duration"])


def write_wav(path, stereo):
    data = (np.clip(stereo.T, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


if __name__ == "__main__":
    out = HERE / "music.wav"
    write_wav(out, score(load_timing()))
    print(out)
