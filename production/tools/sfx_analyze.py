"""Analyze sound files: detect events, print them, and draw waveform+spectrogram sheets.
usage: python sfx_analyze.py out.png file1 [file2 ...]"""
import sys, subprocess, numpy as np
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt

SR = 48000
def load(fn, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', fn, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

def events(x, sr=SR, thr_db=-30):
    hop = int(sr * 0.01)
    n = len(x) // hop
    rms = np.array([np.sqrt(np.mean(x[i*hop:(i+1)*hop]**2) + 1e-12) for i in range(n)])
    db = 20 * np.log10(rms + 1e-9)
    floor = np.percentile(db, 20)
    peak = db.max()
    thr = max(floor + 12, peak + thr_db)
    ev, on = [], None
    for i, v in enumerate(db):
        if v > thr and on is None: on = i
        if v < thr - 6 and on is not None:
            if i - on > 2: ev.append((on * 0.01, i * 0.01, db[on:i].max()))
            on = None
    if on is not None: ev.append((on * 0.01, n * 0.01, db[on:].max()))
    return ev, floor, peak

if __name__ == '__main__':
    out = sys.argv[1]; files = sys.argv[2:]
    fig, axes = plt.subplots(len(files), 1, figsize=(16, 2.2 * len(files)), squeeze=False)
    for ax, fn in zip(axes[:, 0], files):
        x = load(fn)
        ev, floor, peak = events(x)
        t = np.arange(len(x)) / SR
        ax.plot(t[::20], x[::20], lw=0.4, color='k')
        for a, b, p in ev: ax.axvspan(a, b, color='orange', alpha=0.25)
        ax.set_xlim(0, max(t[-1], 0.1)); ax.set_ylim(-1, 1)
        name = fn.split('/')[-2] + '/' + fn.split('/')[-1]
        ax.set_title(f'{name}  dur={t[-1]:.2f}s peak={peak:.1f}dB floor={floor:.1f}dB  events={len(ev)}', fontsize=9, loc='left')
        ax.tick_params(labelsize=7)
        print(name, f'dur={t[-1]:.2f} peak={peak:.1f} floor={floor:.1f}')
        for a, b, p in ev[:25]: print(f'    {a:7.2f}-{b:7.2f}  {p:6.1f}dB')
    plt.tight_layout(); plt.savefig(out, dpi=80)
