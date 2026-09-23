"""Small synthesized sounds: the little friend's voice, tiny footsteps, the laptop waking up."""
import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(7)

def env(n, a=0.005, d=0.1, sustain=0.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4))
    return e * (1 - sustain) + sustain

def bandpass(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)

def lowpass(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'low')
    return signal.lfilter(b, a, x)

def norm(x, peak=0.89):
    return (x / (np.max(np.abs(x)) + 1e-9) * peak).astype(np.float32)

def tap(seed=0, bright=1.0):
    """tiny footstep of a 5 cm creature: a soft click with a woody body"""
    r = np.random.default_rng(seed)
    n = int(0.06 * SR)
    noise = r.standard_normal(n)
    x = bandpass(noise, 1800 * bright, 6500 * bright) * env(n, 0.001, 0.008)
    f = 900 * bright * (1 + 0.15 * r.random())
    t = np.arange(n) / SR
    x += 0.6 * np.sin(2 * np.pi * f * t) * env(n, 0.001, 0.012)
    return norm(x)

def voice(kind, seed=0):
    """cute chirps: 'q' (hm?), 'ex' (!), 'yay', 'uh', 'effort', 'nom', 'phew', 'hmph', 'giggle'"""
    r = np.random.default_rng(seed)
    specs = {
        'q':      [(0.16, 560, 820)],
        'ex':     [(0.07, 900, 1500)],
        'yay':    [(0.09, 700, 950), (0.14, 950, 1250)],
        'uh':     [(0.12, 700, 480)],
        'effort': [(0.35, 420, 520)],
        'nom':    [(0.06, 620, 560)],
        'phew':   [(0.3, 800, 420)],
        'hmph':   [(0.08, 520, 420), (0.12, 480, 330)],
        'giggle': [(0.05, 900, 1100), (0.05, 850, 1050), (0.05, 800, 1000)],
        'aww':    [(0.35, 600, 760)],
        'eep':    [(0.1, 1200, 1800)],
    }
    parts = []
    for dur, f0, f1 in specs[kind]:
        n = int(dur * SR)
        t = np.arange(n) / SR
        k = t / dur
        f = f0 + (f1 - f0) * (k if kind != 'q' else k ** 2)
        vib = 1 + 0.03 * np.sin(2 * np.pi * 11 * t)
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        # a soft "vowel": fundamental + 2nd/3rd harmonic, then formant-ish band emphasis
        x = np.sin(ph) + 0.45 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)
        if kind == 'effort': x = np.tanh(3 * x) + 0.2 * r.standard_normal(n) * 0.2
        a = min(0.012, dur * 0.2)
        e = np.minimum(1, t / a) * np.minimum(1, (dur - t) / (dur * 0.35))
        x = x * e
        x = bandpass(x, 350, 5000)
        parts.append(x); parts.append(np.zeros(int(0.025 * SR)))
    return norm(np.concatenate(parts), 0.8)

def fan_whirr(dur=4.2):
    """laptop fan spinning up then settling"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    amp = np.clip(t / 0.6, 0, 1) * np.clip((dur - t) / 1.2, 0, 1)
    x = bandpass(noise, 250, 2400) * amp
    hum_f = 180 + 120 * np.clip(t / 0.8, 0, 1)
    x += 0.15 * np.sin(2 * np.pi * np.cumsum(hum_f) / SR) * amp
    return norm(x, 0.7)

def chime(up=True):
    """soft two-tone boot/sleep chime"""
    tones = [(0.0, 660), (0.12, 990)] if up else [(0.0, 880), (0.14, 587)]
    n = int(1.4 * SR)
    x = np.zeros(n)
    t = np.arange(n) / SR
    for t0, f in tones:
        m = t >= t0
        tt = t[m] - t0
        x[m] += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * np.exp(-tt / 0.35) * np.minimum(1, tt / 0.01)
    return norm(x, 0.6)

def hum_glow(dur=4.0):
    """a faint magical hum for the orange glow at the seam"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    trem = 0.75 + 0.25 * np.sin(2 * np.pi * 0.7 * t)
    x = (np.sin(2 * np.pi * 146.8 * t) + 0.5 * np.sin(2 * np.pi * 220 * t) + 0.25 * np.sin(2 * np.pi * 293.7 * t + 0.4)) * trem
    x *= np.clip(t / 1.2, 0, 1) * np.clip((dur - t) / 0.8, 0, 1)
    return norm(lowpass(x, 1200), 0.5)

def squeak(f0=1400, f1=2200, dur=0.12):
    n = int(dur * SR); t = np.arange(n) / SR
    f = np.linspace(f0, f1, n)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur)
    return norm(x, 0.5)

def zip_up(dur=0.18):
    n = int(dur * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    x = np.zeros(n)
    # sweep a band upward
    for i in range(0, n, 256):
        k = i / n
        lo = 800 + 5000 * k
        seg = noise[i:i + 256]
        x[i:i + 256] = seg
    x = bandpass(x, 1500, 7000) * np.sin(np.pi * t / dur) ** 0.7
    return norm(x, 0.6)
