"""Sound-effect library: which recording, which slice, how it's treated.
All sources are CC0 (freesound.org / kenney.nl) — see CREDITS.md."""
import os, subprocess, json
import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, '..', 'sfx_candidates')
KEN = os.path.join(HERE, '..', 'kenney')
CACHE = os.path.join(HERE, '..', 'build', 'sfx')

def kenney(pack, name):
    for root, _, files in os.walk(os.path.join(KEN, pack)):
        if name in files: return os.path.join(root, name)
    raise FileNotFoundError(name)

# id: (source, start, end, fade_in, fade_out)  — times in seconds within the source
LIB = {
    # ---- the laptop
    'lid_close':   ('lidclose3/422096.mp3', 10.12, 10.75, 0.005, 0.12),
    'lid_open':    ('lidopen/459241.mp3', 0.18, 0.86, 0.01, 0.1),
    'lid_slam':    ('lidclose3/256612.mp3', 1.24, 1.9, 0.003, 0.2),
    # ---- keys
    'key1': ('keysingle/609534.mp3', 1.03, 1.36, 0.002, 0.05),
    'key2': ('keysingle/609534.mp3', 4.09, 4.60, 0.002, 0.05),
    'key3': ('keysingle/609534.mp3', 5.00, 5.44, 0.002, 0.05),
    'key4': ('keysingle/609534.mp3', 0.19, 0.64, 0.002, 0.05),
    'key5': ('keysingle/609534.mp3', 2.03, 2.64, 0.002, 0.05),
    'key6': ('keysingle/609534.mp3', 3.03, 3.62, 0.002, 0.05),
    'key_hard': ('keymech/378085.mp3', 0.06, 0.31, 0.002, 0.05),
    'key_tac': ('keysingle/570754.mp3', 0.06, 0.34, 0.002, 0.05),
    'typing': ('typing/636044.mp3', 4.0, 16.0, 0.05, 0.3),
    # ---- the room
    'switch_off': ('lightswitch/440499.mp3', 0.10, 0.36, 0.002, 0.05),
    'switch_on':  ('lightswitch/788643.mp3', 0.07, 0.23, 0.002, 0.04),
    'door_handle': ('doorhandle/214001.mp3', 0.05, 0.92, 0.005, 0.1),
    'door_open':  ('door/627769.mp3', 4.1, 6.4, 0.01, 0.4),
    'door_close': ('door/627769.mp3', 9.55, 11.4, 0.01, 0.5),
    'chair':      ('chair/767051.mp3', 7.55, 8.2, 0.01, 0.1),
    'cloth':      ('stretch/334219.mp3', 0.0, 1.7, 0.01, 0.2),
    'yawn':       ('yawn/151239.mp3', 0.2, 2.7, 0.05, 0.3),
    'sigh':       ('sigh/449478.mp3', 0.95, 1.85, 0.03, 0.2),
    'room':       ('roomtone/466123.mp3', 5.0, 55.0, 0.5, 0.5),
    'room_lit':   ('roomtone/671455.mp3', 2.0, 42.0, 0.5, 0.5),
    'crickets':   ('crickets/361875.mp3', 10.0, 60.0, 1.0, 1.0),
    'city_night': ('crickets/442640.mp3', 2.0, 32.0, 1.0, 1.0),
    'clock':      ('clock2/464402.mp3', 0.0, 4.0, 0.0, 0.0),
    # ---- footsteps
    **{f'step{i}': ('steps5/404800.mp3', a - 0.03, a + 0.42, 0.003, 0.15) for i, a in enumerate([0.24, 0.92, 1.48, 2.12, 2.68, 3.67, 4.38, 5.07, 5.79])},
    **{f'slip{i}': ('steps3/378138.mp3', a - 0.03, a + 0.4, 0.003, 0.15) for i, a in enumerate([5.10, 6.18, 7.19, 3.62, 3.10])},
    # ---- desk things
    'pen_roll':   ('penroll2/443445.mp3', 0.8, 1.76, 0.01, 0.1),
    'pen_clack':  ('penroll2/443445.mp3', 1.86, 2.3, 0.002, 0.15),
    'paper1':     ('paper/461803.mp3', 3.84, 4.12, 0.005, 0.08),
    'paper2':     ('paper/461803.mp3', 6.35, 6.66, 0.005, 0.08),
    'mouse_click': ('mouseclick/678248.mp3', 0.44, 0.7, 0.001, 0.05),
    # ---- cookie
    'cookie_snap': ('biscuit3/443469.mp3', 0.60, 1.05, 0.001, 0.12),
    'crunch2':    ('biscuit3/443469.mp3', 2.20, 2.5, 0.001, 0.08),
    'crunch3':    ('biscuit3/443469.mp3', 2.71, 3.02, 0.001, 0.08),
    'crunch4':    ('biscuit3/443469.mp3', 3.17, 3.36, 0.001, 0.08),
    'chew1':      ('chew/707808.mp3', 0.08, 2.9, 0.01, 0.2),
    'chew2':      ('chew/707805.mp3', 0.1, 2.45, 0.01, 0.2),
    'stomach':    ('stomach/447911.mp3', 0.0, 2.04, 0.01, 0.2),
    # ---- cartoon accents
    'pop':        ('pop/676000.mp3', 0.10, 0.9, 0.001, 0.15),
    'whoosh':     ('whoosh/142348.mp3', 0.62, 0.9, 0.01, 0.08),
    'whoosh2':    ('whoosh/142348.mp3', 1.38, 1.62, 0.01, 0.08),
    'boing':      ('boing/277291.mp3', 0.0, 1.05, 0.001, 0.2),
    'slide_a':    ('slide/517633.mp3', 0.38, 2.3, 0.01, 0.15),
    'slide_b':    ('slide/517633.mp3', 3.54, 5.7, 0.01, 0.15),
    # ---- kenney
    'soft_land1': ('K:impact-sounds:impactSoft_medium_000.ogg', 0, 9, 0.001, 0.05),
    'soft_land2': ('K:impact-sounds:impactSoft_medium_002.ogg', 0, 9, 0.001, 0.05),
    'soft_heavy': ('K:impact-sounds:impactSoft_heavy_001.ogg', 0, 9, 0.001, 0.05),
    'plate_tap':  ('K:impact-sounds:impactPlate_light_001.ogg', 0, 9, 0.001, 0.05),
    'plate_tap2': ('K:impact-sounds:impactPlate_light_003.ogg', 0, 9, 0.001, 0.05),
    'wood_tap':   ('K:impact-sounds:impactWood_light_002.ogg', 0, 9, 0.001, 0.05),
    'punch':      ('K:impact-sounds:impactPunch_medium_001.ogg', 0, 9, 0.001, 0.05),
    'cloth_k':    ('K:rpg-audio:cloth2.ogg', 0, 9, 0.001, 0.05),
    'creak':      ('K:rpg-audio:creak1.ogg', 0, 9, 0.001, 0.05),
}

def _load(src, sr=SR):
    if src.startswith('K:'):
        _, pack, name = src.split(':')
        fn = kenney(pack, name)
    else:
        fn = os.path.join(CAND, src)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', fn, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

_mem = {}
def get(name):
    """Return the prepared clip (float32 mono, peak-normalised to -1 dBFS, DC removed, faded)."""
    if name in _mem: return _mem[name]
    os.makedirs(CACHE, exist_ok=True)
    cf = os.path.join(CACHE, name + '.npy')
    spec = LIB[name]
    key = json.dumps(spec)
    kf = cf + '.key'
    clip = os.path.join(HERE, 'clips', name + '.flac')
    src_missing = (not os.path.isdir(KEN)) if spec[0].startswith('K:') else not os.path.exists(os.path.join(CAND, spec[0]))
    if os.path.exists(cf) and os.path.exists(kf) and open(kf).read() == key:
        x = np.load(cf)
    elif src_missing and os.path.exists(clip):
        # sources not downloaded: use the prepared clip that ships with the project
        import soundfile as sf
        x, _ = sf.read(clip, dtype='float32')
    else:
        src, a, b, fi, fo = spec
        x = _load(src)
        x = x[int(a * SR):int(min(b, len(x) / SR) * SR)]
        x = x - np.mean(x)
        n_in, n_out = int(fi * SR), int(fo * SR)
        if n_in > 0: x[:n_in] *= np.linspace(0, 1, n_in)
        if n_out > 0: x[-n_out:] *= np.linspace(1, 0, n_out)
        pk = np.max(np.abs(x)) + 1e-9
        if name not in ('room', 'room_lit', 'crickets', 'city_night', 'typing', 'clock'):
            x = x / pk * 0.89
        else:
            rms = np.sqrt(np.mean(x ** 2)) + 1e-9
            x = x / rms * 0.1  # beds normalised by loudness (−20 dBFS RMS), gain set in the mix
        np.save(cf, x.astype(np.float32)); open(kf, 'w').write(key)
    _mem[name] = x.astype(np.float32)
    return _mem[name]

if __name__ == '__main__':
    for k in LIB:
        x = get(k)
        print(f'{k:14s} {len(x)/SR:6.2f}s  peak={20*np.log10(np.max(np.abs(x))+1e-9):6.1f}dB rms={20*np.log10(np.sqrt(np.mean(x**2))+1e-9):6.1f}dB')
