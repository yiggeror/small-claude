"""Sound design + final mix: ambience beds, foley, cartoon accents, the little friend's voice, and the score.
Reads production/build/cues.json (story beats + events detected from the animation itself)."""
import json, os, subprocess
import numpy as np
from scipy import signal
import soundfile as sf
import sfxlib, synth

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, '..', 'build')
DATA = json.load(open(os.path.join(BUILD, 'cues.json')))
T = DATA['T']
DUR = DATA['DURATION'] + 0.5
rng = np.random.default_rng(11)

def db(x): return 10 ** (x / 20)

def resample(x, rate):
    if abs(rate - 1) < 1e-3: return x
    n = int(len(x) / rate)
    return np.interp(np.arange(n) * rate, np.arange(len(x)), x).astype(np.float32)

def lp(x, fc):
    b, a = signal.butter(2, fc / (SR / 2), 'low'); return signal.lfilter(b, a, x).astype(np.float32)
def hp(x, fc):
    b, a = signal.butter(2, fc / (SR / 2), 'high'); return signal.lfilter(b, a, x).astype(np.float32)

class Mix:
    def __init__(self, dur):
        n = int(dur * SR)
        self.L = np.zeros(n, np.float32); self.R = np.zeros(n, np.float32)
        self.rev = np.zeros(n, np.float32)      # room reverb send
        self.far = np.zeros(n, np.float32)      # "other room" send (big, dark)
        self.n = n
    def add(self, x, t, g=0.0, pan=0.0, rate=1.0, lpf=None, hpf=None, rev=0.12, far=0.0, maxlen=None, fin=0, fout=0):
        if isinstance(x, str): x = sfxlib.get(x)
        x = resample(x, rate)
        if maxlen: x = x[:int(maxlen * SR)].copy()
        if fin: m = min(len(x), int(fin * SR)); x = x.copy(); x[:m] *= np.linspace(0, 1, m)
        if fout: m = min(len(x), int(fout * SR)); x = x.copy(); x[-m:] *= np.linspace(1, 0, m)
        if lpf: x = lp(x, lpf)
        if hpf: x = hp(x, hpf)
        x = x * db(g)
        i = int(t * SR)
        if i >= self.n or i + len(x) <= 0: return
        if i < 0: x = x[-i:]; i = 0
        x = x[:self.n - i]
        a = (pan + 1) * np.pi / 4
        self.L[i:i + len(x)] += x * np.cos(a); self.R[i:i + len(x)] += x * np.sin(a)
        if rev: self.rev[i:i + len(x)] += x * rev
        if far: self.far[i:i + len(x)] += x * far
    def bed(self, name, t0, t1, g, fin=1.0, fout=1.0, lpf=None, pan=0.0, offset=0.0):
        """loop a bed with crossfades between t0 and t1"""
        x = sfxlib.get(name)
        if lpf: x = lp(x, lpf)
        n = int((t1 - t0) * SR)
        out = np.zeros(n, np.float32)
        xf = int(0.8 * SR)
        pos, src = 0, int(offset * SR) % len(x)
        while pos < n:
            seg = x[src:]
            m = min(len(seg), n - pos)
            s = seg[:m].copy()
            if pos > 0:
                k = min(xf, m); s[:k] *= np.linspace(0, 1, k)
            if pos + m < n:
                k = min(xf, m); s[-k:] *= np.linspace(1, 0, k)
            out[pos:pos + m] += s
            pos += m - (xf if pos + m < n else 0); src = 0
        e = np.ones(n, np.float32)
        a, b = int(fin * SR), int(fout * SR)
        if a: e[:a] = np.linspace(0, 1, a)
        if b: e[-b:] = np.minimum(e[-b:], np.linspace(1, 0, b))
        self.add(out * e, t0, g, pan=pan, rev=0)

def room_ir(rt=0.45, n_s=1.2, dark=4500, seed=1):
    n = int(n_s * SR)
    t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    decay = np.exp(-6.9 * t / rt)
    L = lp(r.standard_normal(n).astype(np.float32), dark) * decay
    R = lp(r.standard_normal(n).astype(np.float32), dark) * decay
    L[:int(0.004 * SR)] = 0; R[:int(0.006 * SR)] = 0
    s = np.sqrt(np.sum(L ** 2)) + 1e-9
    return L / s, R / s

M = Mix(DUR)
S = synth

# ============================================================================ ambience
def ambience():
    M.bed('city_night', 0.3, 10.8, -30, fin=2.5, fout=1.2)
    M.bed('crickets', 0.3, 10.8, -34, fin=3.0, fout=1.2, offset=3)
    # lights on (work)
    M.bed('room_lit', 9.8, T['switchOff'], -44, fin=1.0, fout=0.05)
    M.bed('crickets', 9.8, T['switchOff'], -48, fin=1.0, fout=0.3, lpf=2800, offset=20)
    # dark
    M.bed('room', T['switchOff'], T['lightsOn'], -41, fin=0.2, fout=0.3)
    M.bed('crickets', T['switchOff'], T['lightsOn'], -44, fin=2.0, fout=0.5, lpf=3200, offset=40)
    # lights on again
    M.bed('room_lit', T['lightsOn'], T['end'] + 0.5, -44, fin=0.1, fout=1.5, offset=10)
    M.bed('crickets', T['lightsOn'], T['end'] + 0.5, -48, fin=0.5, fout=1.5, lpf=2800, offset=60)
    # later that night
    M.bed('room', T['stinger'] + 1.9, T['final'], -41, fin=0.8, fout=0.7, offset=30)
    M.bed('crickets', T['stinger'] + 1.9, T['final'], -44, fin=0.8, fout=0.7, lpf=3200, offset=80)
    # the clock: soft through the film, a little louder when everything else is quiet
    clock = sfxlib.get('clock')
    def clock_span(t0, t1, g):
        t = t0
        while t < t1:
            M.add(clock, t, g, pan=0.35, rev=0.05, maxlen=min(4.0, t1 - t), fin=0.05, fout=0.05); t += 4.0
    clock_span(10.5, T['switchOff'], -46)
    clock_span(T['switchOff'], 80.2, -34)
    clock_span(80.2, 147.9, -46)
    clock_span(147.9, 148.9, -34)          # the look at us: tick... tock
    clock_span(148.9, 153.3, -46)
    clock_span(153.3, 154.2, -32)          # door check
    clock_span(154.2, 156.5, -46)
    clock_span(156.5, 158.0, -32)          # frozen after the SNAP
    clock_span(158.0, T['lightsOn'], -46)
    clock_span(T['lightsOn'], T['end'], -46)
    clock_span(T['stinger'] + 2.0, T['final'], -38)

# ============================================================================ the automatic events
def pan_x(x): return float(np.clip(x / 55.0, -0.8, 0.8))

def auto_events():
    keys = ['key1', 'key2', 'key3', 'key4', 'key5', 'key6']
    steps = [f'step{i}' for i in range(9)]
    pen_last = None
    for c in DATA['cues']:
        t, i = c['t'], c['id']
        if T['credits'] <= t < T['stinger'] + 2.0: continue
        if i in ('type_key', 'type_space', 'type_enter'):
            if i == 'type_key': M.add(keys[rng.integers(6)], t, -27 + rng.uniform(-2, 2), pan=0.1, rate=rng.uniform(0.96, 1.05), rev=0.06, maxlen=0.25)
            elif i == 'type_space': M.add('key_hard', t, -29, pan=0.1, rate=0.9, rev=0.06)
            else: M.add('key5', t, -23, pan=0.1, rate=0.9, rev=0.08)
        elif i == 'cube_step':
            mode = c.get('mode', 'walk')
            g = {'tiptoe': -40, 'run': -32, 'walk': -35}.get(mode, -36)
            M.add(S.tap(int(t * 1000), bright=rng.uniform(0.9, 1.25)), t, g + rng.uniform(-2, 1), pan=pan_x(c['x']), rev=0.08)
        elif i == 'cube_land':
            surf = c['surf']
            if t in (T['fail'], T['grab']) or abs(t - T['fail']) < 0.05 or abs(t - T['grab']) < 0.05: continue
            if abs(t - T['land']) < 0.05 or abs(t - T['spacebar']) < 0.05: continue
            pn = pan_x(c['x'])
            if surf == 'keys': M.add(S.tap(int(t * 999)), t, -34, pan=pn)
            elif surf == 'desk': M.add('soft_land1' if rng.random() < 0.5 else 'soft_land2', t, -27, pan=pn, rate=1.3)
            elif surf == 'plate': M.add('plate_tap2', t, -26, pan=pn, rate=1.2)
            elif surf == 'pad': M.add('paper1', t, -26, pan=pn)
            elif surf == 'pen': M.add('wood_tap', t, -22, pan=pn)
        elif i == 'cube_jump':
            if c.get('big'): M.add('whoosh', t, -30, pan=pan_x(c['x']), rate=1.2)
            else: M.add('whoosh2', t, -40, pan=pan_x(c['x']), rate=1.6)
        elif i == 'key_click':
            M.add(keys[rng.integers(6)], t, -22 + rng.uniform(-1.5, 1.5), pan=0.0, rate=rng.uniform(1.0, 1.1), rev=0.08, maxlen=0.3)
        elif i == 'key_space':
            M.add('key_hard', t, -12 if t < 110 else -20, pan=0.0, rate=0.85, rev=0.12)
        elif i == 'human_step':
            z = c.get('z', 0)
            g = -24 if z < 40 else -28
            M.add(steps[rng.integers(9)], t, g + rng.uniform(-2, 1), pan=pan_x(c['x'] / 3), rev=0.18)
        elif i == 'pen_roll_frame':
            if c.get('onKeys'):
                # a little tick every time the pen rolls over a row of keys (throttled)
                if pen_last is None or t - pen_last > max(0.07, 0.35 / max(c['v'], 0.5) * 2.6):
                    M.add('key_tac', t, -33, rate=1.2, pan=-0.1, maxlen=0.1); pen_last = t
        elif i == 'pen_drop':
            M.add('pen_clack', t, -22, pan=-0.1)
        elif i == 'switch_off' and t < T['stinger']:
            M.add('switch_off', t, -14, pan=-0.6, rev=0.2)
        elif i == 'switch_on':
            M.add('switch_on', t, -14, pan=-0.6, rev=0.2)
        elif i == 'door_open' and t < T['credits']:
            M.add('door_open', t - 0.05, -18, pan=-0.65, rev=0.25)
        elif i == 'door_close' and t < T['credits']:
            M.add('door_close', t - 0.2, -20, pan=-0.65, rev=0.25)
        elif i == 'lid_shut':
            if abs(t - T['lidClose']) < 0.1: M.add('lid_close', t - 0.03, -9, pan=0.05, rev=0.12)
            elif abs(t - (T['pop'] + 0.3)) < 0.2: M.add('lid_close', t - 0.02, -18, rate=1.15, rev=0.1)
            elif abs(t - T['inLaptop']) < 0.2: M.add('lid_close', t - 0.02, -14, rate=1.1, rev=0.1)
        elif i == 'led_on':
            if abs(t - T['wake']) < 0.2:
                M.add(S.chime(True), t, -24, pan=0.1, rev=0.25)
                M.add(S.fan_whirr(4.2), t - 0.1, -30, pan=0.1, rev=0.1)

    # pen rolling on the desk (continuous, following its speed)
    roll = [c for c in DATA['cues'] if c['id'] == 'pen_roll_frame' and not c.get('onKeys') and c['t'] < 170]
    if roll:
        x = sfxlib.get('pen_roll')
        t0, t1 = roll[0]['t'], roll[-1]['t']
        M.add(np.tile(x, 3)[:int((t1 - t0 + 0.2) * SR)], t0, -22, pan=-0.1, fout=0.4)

# ============================================================================ hand-placed sound design
def act1():
    # typing in the wide shot (bursty)
    typ = sfxlib.get('typing')
    n = int((16.3 - 10.0) * SR)
    tt = 10.0 + np.arange(n) / SR
    e = np.where(np.sin(tt * 1.3) > -0.6, 1.0, 0.15).astype(np.float32)
    e = signal.lfilter([0.002], [1, -0.998], e).astype(np.float32)
    M.add(typ[:n] * e[:len(typ[:n])], 10.0, -30, pan=-0.05, rev=0.06, fin=0.6, fout=0.4)
    M.add('yawn', 30.75, -15, pan=0.0, rev=0.1)
    M.add('cloth', 33.15, -30, rev=0.05)
    M.add('cloth', 37.3, -22, pan=-0.05, rev=0.1)
    M.add('chair', 37.6, -24, pan=-0.05, rev=0.15)
    M.add('sigh', 39.7, -24, rev=0.1)
    M.add('cloth_k', 41.85, -30)
    M.add('sigh', 44.85, -25, rev=0.1)
    M.add('plate_tap', 48.58, -20, pan=0.3, rate=1.1)
    M.add('cloth_k', 48.5, -32)
    # standing up, chair rolls back
    M.add('chair', T['stand'] + 0.2, -22, pan=-0.05, rate=0.9, rev=0.15)
    M.add('cloth', T['stand'], -28)
    # through the door, and away down the hall
    for k, tt in enumerate([64.45, 64.95, 65.45]): M.add(f'step{k + 2}', tt, -26 - k * 2, pan=-0.7, rev=0.25, lpf=5000)
    for k, tt in enumerate([66.7, 67.3, 67.9, 68.5, 69.1]): M.add(f'slip{k % 5}', tt, -30 - k * 2.5, pan=-0.75, lpf=1400, rev=0.0, far=0.4)
    M.add('switch_off', T['hallOff'], -38, pan=-0.8, lpf=1800, far=0.5, rev=0)

def act2():
    M.add(S.hum_glow(4.4), T['seamOn'], -30, rev=0.2)
    M.add(S.hum_glow(7.5), T['crack'] - 0.2, -34, rev=0.2)
    M.add('creak', T['crack'], -22, rate=0.8, rev=0.2)
    e = T['eyes']
    for dt in (0.6, 1.2, 1.55, 1.9, 3.2):
        M.add(S.squeak(2300, 2500, 0.03), e + dt, -38)
    M.add(S.voice('giggle', 1), e + 2.4, -30, rev=0.1)
    sq = T['squeeze']
    M.add(S.voice('effort', 2), sq + 0.2, -26, rev=0.08)
    M.add('creak', sq + 0.35, -26, rate=1.2)
    M.add(S.voice('effort', 3), sq + 1.0, -24, rev=0.08)
    M.add('creak', sq + 1.05, -24, rate=1.35)
    M.add(S.squeak(700, 500, 0.25), sq + 1.4, -30)
    M.add('pop', T['pop'] - 0.02, -7, rev=0.15)
    M.add('slide_b', T['pop'] + 0.08, -24, maxlen=0.62, fout=0.15)
    M.add('soft_heavy', T['land'] - 0.01, -11, rev=0.15)
    M.add(S.voice('uh', 4), T['land'] + 0.08, -22)
    for k, tt in enumerate([93.85, 94.0, 94.15, 94.3]): M.add('cloth_k', tt, -30, rate=1.9)
    for dt in (0.3, 0.9, 1.5): M.add(S.squeak(2300, 2500, 0.03), 94.7 + dt, -40)
    M.add(S.voice('aww', 5), T['awe'] + 0.12, -20, rev=0.15)
    M.add(S.voice('giggle', 6), 99.0, -30, rev=0.08)

def act3():
    M.add(S.voice('eep', 7), 101.62, -30)
    M.add(S.voice('phew', 8), 102.85, -28)
    M.add(S.voice('yay', 9), 104.2, -30)
    M.add('slide_a', 108.95, -22, maxlen=0.62, fout=0.12)
    M.add('soft_heavy', T['spacebar'], -18, rate=1.3)
    M.add(S.voice('eep', 10), T['spacebar'] + 0.05, -26)
    # frozen: eyes slide, a drop of sweat
    M.add(S.squeak(760, 640, 0.7), 111.95, -38)
    M.add(S.squeak(2100, 1500, 0.06), 112.55, -32)
    M.add(S.chime(False), T['sleep'] - 0.1, -28, rev=0.25)
    M.add(S.voice('phew', 11), T['sleep'] + 0.15, -18, rev=0.08)
    M.add('cloth_k', 115.0, -32, rate=1.7)
    # the pen
    M.add(S.voice('q', 12), 118.9, -28)
    M.add(S.voice('ex', 13), 119.28, -16)
    M.add(S.voice('eep', 14), 120.35, -22)
    for tt in (120.5, 120.75): M.add('whoosh2', tt, -34, rate=1.8)
    M.add(S.voice('ex', 15), 120.85, -20)
    M.add(S.voice('uh', 16), 121.95, -24)
    for tt in (122.15, 122.55, 122.95): M.add(S.squeak(900, 1050, 0.08), tt, -36)
    M.add(S.voice('phew', 17), 123.3, -22)
    M.add('cloth_k', 124.3, -32, rate=1.7)
    M.add('paper2', T['note'] + 0.1, -28)
    M.add(S.voice('q', 18), T['noteReact'] + 0.3, -28)
    M.add(S.voice('aww', 19), T['noteReact'] + 1.3, -22, rev=0.12)
    M.add(S.voice('giggle', 20), T['noteReact'] + 2.2, -26)

def sniff(t, g):
    n = int(0.09 * SR)
    x = synth.bandpass(rng.standard_normal(n), 2500, 7000) * synth.env(n, 0.02, 0.04)
    M.add(synth.norm(x, 0.6), t, g)

def act4():
    for tt in (139.1, 139.33, 139.56, 139.9): sniff(tt, -30)
    M.add(S.voice('aww', 21), 141.3, -24, rev=0.2)
    M.add(S.squeak(560, 820, 1.3), T['reach1'] + 0.05, -40)
    M.add('whoosh2', 146.95, -28, rate=1.4)
    M.add(S.voice('eep', 22), 146.98, -26)
    for dt in (0.15, 0.5, 0.75): M.add(S.squeak(2300, 2500, 0.03), 146.95 + dt, -38)
    M.add(S.voice('uh', 23), 148.95, -26); M.add(S.voice('uh', 24), 149.2, -26)
    M.add(S.voice('hmph', 25), 149.72, -21)
    M.add('stomach', T['growl'], -14, rate=1.2, rev=0.05)
    M.add(S.squeak(700, 620, 0.6), 151.5, -40)
    M.add(S.voice('effort', 26), 154.75, -24); M.add(S.voice('effort', 27), 155.6, -22)
    M.add('cookie_snap', T['snap'] - 0.01, -5, rev=0.2)
    M.add('crunch4', T['snap'] + 0.06, -22, rate=1.2)
    M.add('soft_land1', T['snap'] + 0.14, -24, rate=1.3)
    M.add(S.voice('giggle', 28), 158.0, -26)
    m = T['munch']
    M.add('crunch2', m + 0.3, -22, rate=1.25); M.add('chew1', m + 0.35, -21, rate=1.4)
    M.add('crunch3', m + 0.9, -24, rate=1.3); M.add('chew2', m + 1.6, -22, rate=1.45)
    M.add(S.voice('aww', 29), 161.7, -22, rev=0.15)
    # footsteps somewhere in the house
    M.add('creak', T['steps'], -30, lpf=1500, far=0.5, rev=0)
    M.add(S.voice('ex', 30), T['steps'] + 0.3, -14)

def act5():
    for k, tt in enumerate([165.5, 165.9, 166.3, 166.7]): M.add('whoosh2', tt, -28, rate=1.5, pan=pan_x(56))
    for tt in (165.6, 166.4): M.add('plate_tap', tt, -30, rate=1.4, pan=pan_x(56))
    n = int(1.3 * SR)
    scrape = synth.bandpass(rng.standard_normal(n), 1200, 4000) * (0.5 + 0.5 * np.sin(np.arange(n) / SR * 2 * np.pi * 6)) * np.minimum(1, np.arange(n) / 2000)
    M.add(synth.norm(scrape, 0.5), 167.3, -32, pan=pan_x(58))
    M.add(S.voice('yay', 31), 168.62, -26)
    M.add(S.voice('ex', 32), 169.02, -18)
    M.add(S.voice('effort', 33), 171.9, -24)
    M.add('pen_roll', 171.85, -24, pan=-0.1)
    M.add(S.voice('eep', 34), 173.02, -14)
    M.add('soft_heavy', T['fail'], -10, rev=0.15)
    M.add('punch', T['fail'] + 0.01, -22)
    M.add(S.voice('uh', 35), T['fail'] + 0.08, -20)
    M.add(S.squeak(1400, 700, 0.35), 176.6, -30)
    M.add('soft_land2', 176.95, -22, rate=1.2)
    M.add(S.voice('hmph', 36), 177.3, -22)
    M.add('soft_land1', T['grab'], -22, rate=1.3)
    M.add(S.voice('effort', 37), T['grab'] + 0.1, -22); M.add(S.voice('effort', 38), T['grab'] + 0.7, -22)
    M.add('creak', T['lift'] + 0.05, -22, rate=1.1)
    M.add(S.voice('effort', 39), T['lift'] + 0.2, -20)
    M.add('door_handle', 182.38, -14, pan=-0.7, rev=0.15)
    M.add(S.squeak(900, 600, 0.25), T['dive'] + 0.1, -28)
    M.add(S.squeak(800, 500, 0.3), T['dive'] + 0.6, -30)
    # the footsteps on the other side of the door: far → near → stop at the door
    t, k = T['steps'] + 0.45, 0
    while t < 176.8:
        near = np.clip((t - T['steps']) / (176.8 - T['steps']), 0, 1)
        g = -40 + 14 * near
        M.add(f'slip{k % 5}', t, g, pan=-0.75, lpf=900 + 2600 * near, rev=0, far=0.35 * (1 - near))
        t += 0.56; k += 1
    M.add('creak', 177.3, -30, lpf=2200, pan=-0.75)

def act6():
    M.add('yawn', 186.0, -24, pan=-0.3, rev=0.2, rate=1.02)
    M.add('chair', T['sit'] + 0.1, -22, pan=-0.05, rev=0.15)
    M.add('cloth', T['sit'], -28)
    M.add('lid_open', T['open'] + 0.02, -14, pan=0.05, rev=0.12)
    M.add('cloth_k', T['notice'] + 0.4, -30)
    i0 = T['innocent']
    M.add(S.squeak(2300, 2500, 0.03), i0 + 0.8, -34)
    M.add(S.squeak(2100, 1500, 0.06), i0 + 1.0, -32)
    M.add('whoosh2', i0 + 1.35, -32, rate=1.5)
    M.add('cloth_k', i0 + 2.1, -32, rate=1.8)
    s = T['sweat']
    M.add(S.squeak(760, 640, 0.3), s + 0.3, -36)
    M.add(S.squeak(2100, 1500, 0.06), s + 0.5, -32)
    M.add(S.voice('uh', 40), s + 1.0, -30)
    M.add('cookie_snap', T['laugh'] + 2.0, -16, rate=1.15, rev=0.15)
    M.add('plate_tap', T['gift'] + 1.05, -22, rate=1.3)
    M.add(S.voice('q', 41), T['gift'] + 0.9, -24)
    M.add(S.voice('yay', 42), T['gift'] + 1.85, -18, rev=0.1)
    M.add(S.voice('giggle', 43), T['gift'] + 2.8, -22)
    M.add('crunch3', 219.6, -28, rate=1.0, pan=-0.1)
    M.add('typing', 219.8, -34, maxlen=1.8, fin=0.2, fout=0.6)

def act7():
    t0 = T['stinger'] + 2.0
    M.add(S.hum_glow(5.5), t0 + 1.2, -34, rev=0.2)
    M.add('creak', t0 + 2.0, -28, rate=0.9)
    M.add(S.squeak(520, 700, 0.5), t0 + 2.5, -38)
    for dt in (3.0, 3.4, 3.7): M.add(S.tap(int(dt * 100)), t0 + dt, -40)
    M.add(S.zip_up(), t0 + 4.2, -20)
    M.add('lid_close', t0 + 4.45, -18, rate=1.2)
    for k, dt in enumerate([5.0, 5.3, 5.6]): M.add(S.voice('nom', 50 + k), t0 + dt, -30, lpf=2200)
    M.add('chew2', t0 + 5.0, -28, rate=1.5, lpf=1800, maxlen=0.8, fout=0.2)

# ============================================================================ music
def music():
    x, sr = sf.read(os.path.join(BUILD, 'music.wav'), dtype='float32')
    assert sr == SR
    n = min(len(x), M.n)
    g = np.full(n, db(8.0), np.float32)     # overall score level
    def span(t0, t1, gdb, ramp=0.3):
        a, b = int(t0 * SR), int(t1 * SR)
        r = int(ramp * SR)
        seg = np.full(b - a, db(8.0 + gdb), np.float32)
        g[a:b] = seg
        if r:
            g[max(0, a - r):a] = np.linspace(g[max(0, a - r)], db(8.0 + gdb), a - max(0, a - r))
            g[b:min(n, b + r)] = np.linspace(db(8.0 + gdb), g[min(n - 1, b + r)], min(n, b + r) - b)
    span(17.0, 27.2, -3)       # under the typing on screen
    span(49.6, 56.0, -1)
    span(T['credits'] - 0.5, T['stinger'], 1.5)
    M.L[:n] += x[:n, 0] * g; M.R[:n] += x[:n, 1] * g

def master(out):
    # room reverb + far (other room) reverb
    irL, irR = room_ir(0.45, 1.0, 4500, 1)
    fL, fR = room_ir(1.2, 2.5, 1800, 2)
    for send, (a, b), gain in ((M.rev, (irL, irR), 0.6), (M.far, (fL, fR), 0.9)):
        if np.any(send):
            M.L += signal.fftconvolve(send, a)[:M.n].astype(np.float32) * gain
            M.R += signal.fftconvolve(send, b)[:M.n].astype(np.float32) * gain
    st = np.stack([M.L, M.R], 1)
    # gentle high-pass to clean rumble
    b, a = signal.butter(2, 28 / (SR / 2), 'high'); st = signal.lfilter(b, a, st, axis=0).astype(np.float32)
    # loudness normalise (approx. integrated RMS over non-silent parts) then soft limit
    blk = int(0.4 * SR)
    rms = np.sqrt(np.array([np.mean(st[i:i + blk] ** 2) for i in range(0, len(st) - blk, blk)]) + 1e-12)
    loud = rms[rms > db(-50)]
    integ = 20 * np.log10(np.sqrt(np.mean(loud ** 2)))
    st *= db(-19.0 - integ)
    # look-ahead-free soft limiter
    thr = db(-1.5)
    st = np.where(np.abs(st) > thr * 0.7, np.sign(st) * (thr * 0.7 + (thr * 0.3) * np.tanh((np.abs(st) - thr * 0.7) / (thr * 0.3))), st)
    sf.write(out, st, SR, subtype='PCM_24')
    print('master →', out, f'integrated≈{integ:.1f} dB → -19 dB, peak {20 * np.log10(np.abs(st).max()):.1f} dBFS')

if __name__ == '__main__':
    ambience(); auto_events(); act1(); act2(); act3(); act4(); act5(); act6(); act7(); music()
    master(os.path.join(BUILD, 'soundtrack.wav'))
