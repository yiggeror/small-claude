"""Spectrogram + loudness strip of the soundtrack with story beats marked. usage: specview.py out.png t0 t1"""
import sys, json, numpy as np, soundfile as sf
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
out, t0, t1 = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
x, sr = sf.read('/home/user/small-claude/production/build/soundtrack.wav', dtype='float32')
m = x[int(t0*sr):int(t1*sr)].mean(1)
T = json.load(open('/home/user/small-claude/production/build/cues.json'))['T']
fig, (a, b) = plt.subplots(2, 1, figsize=(18, 6), gridspec_kw={'height_ratios': [3, 1]}, sharex=True)
a.specgram(m, NFFT=2048, Fs=sr, noverlap=1536, cmap='magma', vmin=-130, vmax=-30, xextent=(t0, t1))
a.set_ylim(0, 9000)
hop = int(0.05*sr)
r = [20*np.log10(np.sqrt(np.mean(m[i:i+hop]**2))+1e-9) for i in range(0, len(m)-hop, hop)]
b.plot(t0 + np.arange(len(r))*0.05, r, lw=0.8); b.set_ylim(-70, 0); b.grid(alpha=0.3)
for k, v in T.items():
    if t0 <= v <= t1:
        for ax in (a, b): ax.axvline(v, color='cyan', lw=0.6, alpha=0.7)
        a.text(v, 8600, k, color='cyan', fontsize=7, rotation=90, va='top')
plt.tight_layout(); plt.savefig(out, dpi=70)
