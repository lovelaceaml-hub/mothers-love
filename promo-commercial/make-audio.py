#!/usr/bin/env python3
"""Create an original, rights-safe cinematic music bed and UI sound design."""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 32000
DURATION = 60.5
OUT = Path('promo-commercial/out')
OUT.mkdir(parents=True, exist_ok=True)

# Warm D-major / B-minor-adjacent progression. Frequencies are synthesized here;
# no sampled or copyrighted music is used.
CHORDS = [
    (146.83, 185.00, 220.00),   # D
    (123.47, 146.83, 185.00),   # Bm
    (98.00, 123.47, 146.83),    # G
    (110.00, 138.59, 164.81),   # A
]
TAPS = [8.25, 15.7, 19.25, 23.3]
SHIMMERS = [4.8, 25.7, 35.7, 42.7, 51.7, 56.0]
WHOOSHES = [12.8, 35.3, 42.2, 51.1]

rng = random.Random(20260911)
phase_pad = [0.0, 1.1, 2.2]
phase_air = 0.0


def smoothstep(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3.0 - 2.0 * x)


def event_env(t, event, length, attack=0.08):
    dt = t - event
    if dt < 0 or dt > length:
        return 0.0
    if dt < attack:
        return smoothstep(dt / attack)
    return (1.0 - (dt - attack) / max(0.001, length - attack)) ** 2


def clamp(v):
    return max(-0.98, min(0.98, v))


with wave.open(str(OUT / 'mothers-love-bed.wav'), 'wb') as wav:
    wav.setnchannels(2)
    wav.setsampwidth(2)
    wav.setframerate(RATE)
    frames = bytearray()
    total = int(DURATION * RATE)

    for i in range(total):
        t = i / RATE
        chord_index = int(t // 7.5) % len(CHORDS)
        chord = CHORDS[chord_index]
        bar_pos = (t % 7.5) / 7.5

        # Gentle pad that opens as the story grows.
        intro = smoothstep(t / 3.0)
        outro = 1.0 - smoothstep((t - 57.5) / 3.0) if t > 57.5 else 1.0
        pad_amp = 0.082 * intro * outro * (0.86 + 0.14 * math.sin(2 * math.pi * bar_pos))
        pad = 0.0
        for j, f in enumerate(chord):
            pad += math.sin(2 * math.pi * f * t + phase_pad[j])
            pad += 0.22 * math.sin(2 * math.pi * (f * 2.0) * t + phase_pad[j] * 0.7)
        pad = pad / 3.66 * pad_amp

        # Soft pulse/pluck on quarter-ish beats; deliberately understated.
        beat = t % 1.875
        pluck_env = math.exp(-4.8 * beat)
        top = chord[1] * 2.0
        pluck = (math.sin(2 * math.pi * top * t) + 0.35 * math.sin(2 * math.pi * top * 2 * t)) * 0.026 * pluck_env

        # High airy layer for premium shimmer.
        air = math.sin(2 * math.pi * 659.25 * t + 0.5 * math.sin(2 * math.pi * 0.11 * t)) * 0.006

        sfx = 0.0
        # Taps: short glassy transient.
        for event in TAPS:
            env = event_env(t, event, 0.24, 0.006)
            if env:
                dt = t - event
                sfx += env * (0.085 * math.sin(2 * math.pi * (1180 - 520 * dt) * dt))

        # Shimmers: three ascending partials.
        for event in SHIMMERS:
            env = event_env(t, event, 1.35, 0.035)
            if env:
                dt = t - event
                sfx += env * 0.034 * (
                    math.sin(2 * math.pi * 880 * dt) +
                    0.62 * math.sin(2 * math.pi * 1320 * dt + 0.8) +
                    0.38 * math.sin(2 * math.pi * 1760 * dt + 1.2)
                )

        # Whooshes: filtered-ish deterministic noise with an upward tone.
        for event in WHOOSHES:
            env = event_env(t, event, 0.95, 0.28)
            if env:
                dt = t - event
                noise = rng.uniform(-1.0, 1.0)
                sfx += env * (0.038 * noise + 0.024 * math.sin(2 * math.pi * (180 + 520 * dt) * dt))

        # Finale lift after the TV reveal.
        finale = smoothstep((t - 50.0) / 4.5) if t > 50 else 0.0
        lift = finale * 0.015 * math.sin(2 * math.pi * 587.33 * t)

        mono = clamp(pad + pluck + air + sfx + lift)
        # Small stereo width without phase-risky extremes.
        pan = 0.018 * math.sin(2 * math.pi * 0.07 * t)
        left = clamp(mono * (1.0 - pan))
        right = clamp(mono * (1.0 + pan))
        frames += struct.pack('<hh', int(left * 32767), int(right * 32767))

        if len(frames) >= 32768:
            wav.writeframes(frames)
            frames.clear()

    if frames:
        wav.writeframes(frames)

print(OUT / 'mothers-love-bed.wav')
