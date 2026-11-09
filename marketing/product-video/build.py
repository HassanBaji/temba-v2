"""Builds both deliverables from scratch.

    python3 build.py            render frames, synthesize audio, mux 60 s and 15 s
    python3 build.py --mux-only reuse out/frames.mp4 and out/track.wav
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
OUT = ROOT / "out"
TL = json.loads((ROOT / "timeline.json").read_text())
FPS = TL["fps"]
BEAT = 60 / TL["bpm"]


def run(*cmd):
    print("+", " ".join(map(str, cmd)))
    subprocess.run(list(map(str, cmd)), check=True, cwd=ROOT)


if "--mux-only" not in sys.argv:
    run("node", "render.mjs")
    run(sys.executable, "audio.py", OUT / "track.wav")

AUDIO = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000"]
VIDEO = ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", FPS]

run(
    "ffmpeg", "-y", "-loglevel", "error",
    "-i", OUT / "frames.mp4", "-i", OUT / "track.wav",
    "-map", "0:v", "-map", "1:a", "-c:v", "copy", *AUDIO, "-af", "volume=-3dB",
    "-shortest", "-movflags", "+faststart", OUT / "temba-60s.mp4",
)

# The 15 s cut joins beat-aligned ranges (hook, seats filling, end card).
# Cuts are rounded to frames, and each audio piece gets a 10 ms fade at both
# ends so the joins do not click.
frames = [(round(a * BEAT * FPS), round(b * BEAT * FPS)) for a, b in TL["cut15"]]
parts = []
for i, (f0, f1) in enumerate(frames):
    t0, t1 = f0 / FPS, f1 / FPS
    d = t1 - t0
    parts.append(
        f"[0:v]trim=start_frame={f0}:end_frame={f1},setpts=PTS-STARTPTS[v{i}];"
        f"[1:a]atrim=start={t0:.5f}:end={t1:.5f},asetpts=PTS-STARTPTS,"
        f"afade=t=in:d=0.01,afade=t=out:st={d - 0.01:.5f}:d=0.01[a{i}];"
    )
joined = "".join(f"[v{i}][a{i}]" for i in range(len(frames)))
graph = "".join(parts) + f"{joined}concat=n={len(frames)}:v=1:a=1[v][a];[a]volume=-3dB[ao]"
run(
    "ffmpeg", "-y", "-loglevel", "error",
    "-i", OUT / "frames.mp4", "-i", OUT / "track.wav",
    "-filter_complex", graph, "-map", "[v]", "-map", "[ao]",
    *VIDEO, *AUDIO, "-movflags", "+faststart", OUT / "temba-15s.mp4",
)
print("frames per part:", [b - a for a, b in frames], "total", sum(b - a for a, b in frames))
