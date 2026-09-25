"""Original score for "After the Laptop Closes".
Every cue is placed in absolute seconds against the story beats (production/build/cues.json → T),
written to MIDI and rendered with FluidSynth + the FluidR3 GM soundfont."""
import json, os, subprocess, math
import mido

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, '..', 'build')
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
T = json.load(open(os.path.join(BUILD, 'cues.json')))['T']

NN = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def p(s):
    """'C#4' → MIDI note number"""
    s = s.strip()
    n = NN[s[0].upper()]
    i = 1
    while i < len(s) and s[i] in '#b':
        n += 1 if s[i] == '#' else -1; i += 1
    return n + 12 * (int(s[i:]) + 1)

# ------------------------------------------------------------------------------ score container
class Score:
    def __init__(self):
        self.ev = []  # (time, order, kind, ch, a, b)
    def prog(self, t, ch, program, bank=0):
        self.ev.append((t, 0, 'bank', ch, bank, 0)); self.ev.append((t, 1, 'prog', ch, program, 0))
    def cc(self, t, ch, num, val):
        self.ev.append((t, 2, 'cc', ch, num, int(max(0, min(127, val)))))
    def note(self, t, dur, ch, pitch, vel=80):
        if isinstance(pitch, str): pitch = p(pitch)
        vel = int(max(1, min(127, vel)))
        self.ev.append((t, 4, 'on', ch, pitch, vel)); self.ev.append((t + max(0.03, dur), 3, 'off', ch, pitch, 0))
    def chord(self, t, dur, ch, notes, vel=70, roll=0.0):
        for i, n in enumerate(notes.split()): self.note(t + i * roll, dur - i * roll, ch, n, vel)
    def mel(self, t, beat, ch, spec, vel=80, leg=0.92, stacc=None, accent=None):
        """spec: 'A4:1 C5:.5 r:1 ...' durations in beats ('|' ignored). returns end time"""
        for tok in spec.replace('|', ' ').split():
            n, d = tok.split(':')
            d = float(d) * beat
            if n != 'r':
                v = vel if accent is None else accent(t, vel)
                self.note(t, d * (stacc if stacc else leg), ch, n, v)
            t += d
        return t
    def ramp(self, t0, t1, ch, num, v0, v1, steps=16):
        for i in range(steps + 1):
            k = i / steps
            self.cc(t0 + (t1 - t0) * k, ch, num, v0 + (v1 - v0) * k)
    def gliss(self, t, dur, ch, notes, vel=60):
        ns = notes if isinstance(notes, list) else notes.split()
        step = dur / len(ns)
        for i, n in enumerate(ns): self.note(t + i * step, step * 2.2, ch, n, vel)
    def write(self, path):
        mid = mido.MidiFile(ticks_per_beat=480)
        tr = mido.MidiTrack(); mid.tracks.append(tr)
        tr.append(mido.MetaMessage('set_tempo', tempo=500000, time=0))  # 120 bpm → 960 ticks/sec
        last = 0
        for t, o, kind, ch, a, b in sorted(self.ev, key=lambda e: (e[0], e[1])):
            tick = int(round(max(0, t) * 960))
            dt = tick - last; last = tick
            if kind == 'on': m = mido.Message('note_on', channel=ch, note=a, velocity=b, time=dt)
            elif kind == 'off': m = mido.Message('note_off', channel=ch, note=a, velocity=0, time=dt)
            elif kind == 'cc': m = mido.Message('control_change', channel=ch, control=a, value=b, time=dt)
            elif kind == 'prog': m = mido.Message('program_change', channel=ch, program=a, time=dt)
            elif kind == 'bank': m = mido.Message('control_change', channel=ch, control=0, value=a, time=dt)
            tr.append(m)
        mid.save(path)

# ------------------------------------------------------------------------------ channels
MBOX, CEL, GLOCK, HARP, PAD, PIZZ, CLAR, BSN, KEYS, DR, BASS, FLUTE, XYL, STR, CHOIR, PERC = range(16)
S = Score()
def setup():
    progs = {MBOX: 10, CEL: 8, GLOCK: 9, HARP: 46, PAD: 49, PIZZ: 45, CLAR: 71, BSN: 70, KEYS: 4, BASS: 32,
             FLUTE: 73, XYL: 13, STR: 48, CHOIR: 52, PERC: 47}
    for ch, pr in progs.items():
        S.prog(0, ch, pr)
        S.cc(0, ch, 7, 100); S.cc(0, ch, 91, 50); S.cc(0, ch, 93, 0); S.cc(0, ch, 11, 127)
    S.prog(0, DR, 40)  # brush kit (channel 10 is the percussion channel)
    S.cc(0, DR, 7, 90)
    pans = {MBOX: 58, CEL: 74, GLOCK: 80, HARP: 44, PAD: 64, PIZZ: 52, CLAR: 78, BSN: 50, KEYS: 60, BASS: 64, FLUTE: 76, XYL: 84, STR: 60, CHOIR: 64, PERC: 64}
    for ch, pn in pans.items(): S.cc(0.01, ch, 10, pn)
    S.cc(0.01, MBOX, 91, 70); S.cc(0.01, CEL, 91, 75); S.cc(0.01, HARP, 91, 70); S.cc(0.01, CHOIR, 91, 80); S.cc(0.01, PAD, 91, 70)

# common harmony
THEME_A1 = 'A4:1 C5:.5 A4:.5 G4:1 F4:1 | G4:1.5 A4:.5 C5:2 | D5:1 C5:.5 A4:.5 G4:1 A4:1 | F4:3 r:1'
THEME_A2 = 'A4:1 C5:.5 D5:.5 E5:1 F5:1 | E5:1 D5:.5 C5:.5 D5:2 | C5:1 A4:.5 F4:.5 G4:1 A4:.5 G4:.5 | F4:4'
CH_A1 = ['F3 A3 C4', 'E3 G3 C4', 'D3 F3 Bb3', 'F3 A3 C4']
CH_A2 = ['F3 A3 C4', 'E3 G3 C4', 'D3 F3 Bb3', 'F3 A3 C4']
BASS_A1 = ['F2', 'C2', 'Bb1', 'F2']

def harp_bar(t, beat, chord, vel=48, octave_up=True):
    ns = chord.split()
    seq = ns + ([n[:-1] + str(int(n[-1]) + 1) for n in ns] if octave_up else [])
    step = beat * 4 / 8
    for i in range(8):
        S.note(t + i * step, step * 3, HARP, seq[i % len(seq)], vel - (i % 2) * 8)

# ============================================================================== 1. title
def title():
    beat = 60 / 72
    t0 = 2.4
    S.chord(1.0, 3.0, PAD, 'F3 C4 A4', 38)
    S.gliss(1.05, 1.2, HARP, 'F3 A3 C4 F4 A4 C5 F5', 40)
    S.ramp(1.0, 2.4, PAD, 11, 40, 110)
    end = S.mel(t0, beat, MBOX, THEME_A1, 76)
    for i, (c, b) in enumerate(zip(CH_A1, BASS_A1)):
        tb = t0 + i * 4 * beat
        S.chord(tb, 4 * beat, PAD, c, 44)
        harp_bar(tb, beat, c, 40)
    # the title settles: sparkle
    S.gliss(3.72, 0.24, GLOCK, 'C6 F6 A6', 44)
    # the cursor scampers off
    for i, n in enumerate(['F5', 'A5', 'C6', 'A5', 'C6', 'F6']):
        S.note(6.95 + i * 0.1, 0.08, PIZZ, n, 64)
    S.chord(end, 1.8, PAD, 'F3 A3 C4', 36)

# ============================================================================== 2. late-night lo-fi
def lofi(t0, t1, vel=1.0, keys_prog=4):
    beat = 0.75
    prog = [('F3 A3 C4 E4', 'F2', 'C3'), ('G3 A3 C4 E4', 'A2', 'E2'), ('F3 A3 C4 D4', 'D2', 'A2'), ('F3 G3 Bb3 D4', 'G2', 'C3')]
    t, bar = t0, 0
    while t < t1 - 0.05:
        ch, root, fifth = prog[bar % 4]
        v = vel
        # EP comping (lazy, a touch behind the beat)
        S.chord(t + 0.02, beat * 1.6, KEYS, ch, 52 * v, roll=0.012)
        if t + beat * 2.5 < t1: S.chord(t + beat * 2.5 + 0.03, beat * 1.2, KEYS, ch, 40 * v, roll=0.01)
        # bass
        S.note(t, beat * 1.7, BASS, root, 70 * v)
        if t + beat * 2 < t1: S.note(t + beat * 2, beat * 1.2, BASS, fifth, 60 * v)
        if bar % 4 == 3 and t + beat * 3.5 < t1: S.note(t + beat * 3.5, beat * 0.4, BASS, 'E2', 50 * v)
        # brushes: swish on 2 & 4, soft ride-ish taps
        for b in range(4):
            tb = t + b * beat
            if tb >= t1: break
            if b % 2 == 1: S.note(tb, 0.2, DR, 40, 38 * v)
            S.note(tb, 0.1, DR, 42, 22 * v)
            S.note(tb + beat * 0.62, 0.1, DR, 42, 16 * v)
        # a celesta figure every 4 bars
        if bar % 4 == 1 and t + beat * 4 < t1:
            S.mel(t + beat * 1, beat, CEL, 'C6:.5 A5:.5 F5:1 G5:1', 34 * v)
        t += beat * 4; bar += 1
    return t

def work():
    lofi(15.7, 49.7)
    # the little friend's celebration on screen
    S.gliss(23.78, 0.3, GLOCK, 'F6 A6 C7 F7', 56)
    # stretch: a lazy upward EP roll
    S.chord(37.4, 2.2, KEYS, 'F3 C4 E4 A4 C5', 38, roll=0.08)

# ============================================================================== 3. lullaby → lid closes
def lullaby():
    beat = 60 / 72
    t = 49.9
    notes = [(0, 'A4', 1), (1, 'C5', .5), (1.5, 'D5', .5), (2, 'E5', 1), (3, 'F5', 1), (4, 'E5', 1), (5, 'D5', .5), (5.5, 'C5', .5), (6, 'D5', 1.2), (7.2, 'C5', .5)]
    for b, n, d in notes: S.note(t + b * beat, d * beat * 0.95, MBOX, n, 64)
    S.chord(t, 4 * beat, PAD, 'F3 A3 C4', 36); S.chord(t + 4 * beat, 3.2 * beat, PAD, 'E3 G3 C4', 34)
    S.chord(t, 3.2, KEYS, 'F3 A3 C4 E4', 34); S.chord(t + 4 * beat, 2.6, KEYS, 'E3 G3 C4 D4', 30)
    # the lid shuts on the final note
    S.note(T['lidClose'], 2.6, MBOX, 'F4', 58)
    S.chord(T['lidClose'], 3.0, PAD, 'F3 A3 C4', 30)

def leaving():
    S.prog(57.5, KEYS, 0)
    for tt, n in [(59.0, 'A4'), (59.9, 'G4'), (60.8, 'F4'), (62.0, 'C4')]:
        S.note(tt, 1.2, KEYS, n, 38)
    S.note(62.0, 1.2, KEYS, 'F3', 30)

# ============================================================================== 4. the glow, the eyes, the pop
def mystery():
    S.prog(79.5, CHOIR, 92)  # bowed glass
    S.chord(T['seamOn'], 4.6, CHOIR, 'D4 F4 A4 E5', 40)
    S.ramp(T['seamOn'], T['crack'], CHOIR, 11, 30, 110)
    for i, n in enumerate(['D5', 'F5', 'A5', 'E6', 'D5', 'A5', 'F5', 'E6']):
        S.note(81.0 + i * 0.45, 0.9, CEL, n, 30 + i * 2)
    S.note(T['crack'], 1.2, PIZZ, 'D2', 70)
    S.note(T['crack'] + 0.02, 1.5, HARP, 'D5', 40)
    S.chord(T['crack'] + 0.1, 5.4, CHOIR, 'D4 A4 E5', 32)
    e = T['eyes']
    S.note(e + 0.02, 0.6, CEL, 'A6', 50)
    for dt, n in [(0.6, 'F4'), (1.2, 'A4'), (1.55, 'F4'), (1.9, 'D4')]:
        S.note(e + dt, 0.15, PIZZ, n, 70)
    # sly
    S.mel(e + 2.3, 0.3, BSN, 'D3:1 C#3:1 D3:1.5', 66, stacc=0.6)
    S.gliss(e + 3.2, 0.25, CEL, 'A5 F5 D5', 40)
    # squeeze: tremolo strings creep up, timpani roll
    S.prog(89.8, STR, 44)
    sq = T['squeeze']
    for i, n in enumerate(['D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3']):
        S.note(sq + i * 0.225, 0.26, STR, n, 50 + i * 6)
    t = sq
    while t < T['pop'] - 0.03:
        k = (t - sq) / (T['pop'] - sq)
        S.note(t, 0.07, PERC, 'D2', 30 + 70 * k); t += 0.065
    # pop!
    S.chord(T['pop'], 0.5, PIZZ, 'D4 A4 D5', 90)
    S.gliss(T['pop'] + 0.02, 0.25, GLOCK, 'D6 F6 A6 D7', 60)
    # dizzy birds
    S.prog(92.5, CEL, 123)
    for dt in (0.25, 0.7): S.note(T['land'] + dt, 0.35, CEL, 'C6', 50)
    S.prog(94.3, CEL, 8)
    # curious look around: harp
    for i, n in enumerate(['F4', 'A4', 'C5', 'D5', 'F5']): S.note(94.8 + i * 0.26, 0.8, HARP, n, 42)

def awe():
    a = T['awe']
    S.gliss(a - 0.05, 0.6, HARP, 'F3 G3 A3 C4 D4 F4 G4 A4 C5 D5 F5 G5 A5 C6 F6', 52)
    S.prog(95.5, CHOIR, 52)
    S.chord(a, 2.4, CHOIR, 'F4 A4 C5 F5', 60)
    S.ramp(a, a + 0.8, CHOIR, 11, 40, 120)
    S.chord(a, 2.4, PAD, 'F3 C4 A4', 50)
    S.note(a + 0.1, 0.6, GLOCK, 'C6', 60); S.note(a + 0.25, 0.8, GLOCK, 'F6', 60)
    S.ramp(97.6, 98.4, CHOIR, 11, 120, 20)

# ============================================================================== 5. sneaky keyboard hopscotch
SNEAK_BEAT = 0.6
def sneak_bar(t, bar, vel=1.0, melody=True):
    b = SNEAK_BEAT
    bassline = [['D3', 'A2', 'D3', 'A2'], ['Bb2', 'F2', 'A2', 'E2']][bar % 2]
    for i, n in enumerate(bassline): S.note(t + i * b, b * 0.35, PIZZ, n, 70 * vel)
    for i in range(4): S.note(t + i * b, 0.05, DR, 37, 34 * vel)  # side-stick tiptoe
    if melody:
        m = ['D4:.5 r:.5 E4:.5 r:.5 F4:.5 r:.5 G#4:.5 A4:.5', 'r:1 Bb4:.5 A4:.5 G#4:.5 A4:.5 r:1'][bar % 2]
        S.mel(t, b, CLAR, m, 62 * vel, stacc=0.55)

def sneaky():
    g0 = 104.15 - 9 * SNEAK_BEAT  # grid aligned so hop landings fall on beats
    sneak_bar(g0, 0)
    # bar 2 is cut off by the first scary key click
    b = SNEAK_BEAT; t = g0 + 4 * b
    for i, n in enumerate(['Bb2', 'F2']):
        if t + i * b < 101.5: S.note(t + i * b, b * 0.35, PIZZ, n, 66)
    S.mel(t, b, CLAR, 'r:.5 Bb4:.5', 60, stacc=0.5)
    # relief (flute sigh), then the game begins
    S.mel(102.85, 0.22, FLUTE, 'A5:1 F5:2', 46)
    S.note(103.45, 0.3, XYL, 'D5', 64)
    t = g0 + 9 * b  # = 104.15 - 0 ... resume one beat before the first hop landing
    t = 103.55
    for bar in range(2):
        sneak_bar(t + bar * 4 * b, bar, 0.85, melody=False)
    # the little friend plays the keyboard: a note on every landing
    for tt, n in zip([104.15, 104.75, 105.35, 105.95, 106.55, 107.15, 107.75], ['D5', 'F5', 'A5', 'F5', 'G5', 'Bb5', 'A5']):
        S.note(tt, 0.35, XYL, n, 84); S.note(tt, 0.4, GLOCK, n, 36)
    # star-eyed trill, wind-up, big jump
    t = 107.9
    while t < 108.35: S.note(t, 0.06, GLOCK, 'A6', 40); S.note(t + 0.04, 0.06, GLOCK, 'C7', 36); t += 0.08
    for i, n in enumerate(['D4', 'E4', 'F4', 'G4', 'A4']): S.note(108.42 + i * 0.09, 0.1, PIZZ, n, 50 + i * 8)
    S.gliss(108.92, 0.6, HARP, 'D4 F4 A4 D5 F5 A5 D6', 56)
    S.note(T['spacebar'], 1.4, PERC, 'D2', 110)
    S.note(T['spacebar'], 0.4, PIZZ, 'D2', 100)
    S.mel(T['spacebar'] + 0.16, 0.2, PIZZ, 'D4:1 A3:1', 60, stacc=0.6)

def wake():
    # silence... then a creeping cello tremolo while frozen
    S.prog(111.0, STR, 44)
    S.note(111.9, 1.85, STR, 'D2', 40); S.ramp(111.9, 113.7, STR, 11, 40, 120)
    S.cc(113.8, STR, 11, 127)
    s = T['sleep']
    S.mel(s + 0.05, 0.3, FLUTE, 'A5:1 F5:1 D5:1.6', 48)
    S.note(s + 0.1, 0.4, PIZZ, 'D3', 44)
    # the little friend hums (ocarina)
    S.prog(116.8, FLUTE, 79)
    S.mel(117.42, 0.36, FLUTE, 'A4:1 C5:.5 A4:.5 G4:1 F4:1 G4:.8', 58)
    S.prog(118.95, FLUTE, 73)

# ============================================================================== 6. the runaway pen
def chase():
    S.prog(119.0, STR, 48)
    S.prog(118.9, PERC, 55)  # orchestra hit
    S.chord(119.3, 0.4, PERC, 'D4 F4 A4', 80)
    six = 60 / 170 / 4
    t = 119.6
    pat = ['D4', 'F4', 'A4', 'F4']
    i = 0
    while t < 120.3:
        S.note(t, six * 0.9, STR, pat[i % 4], 70); S.note(t, six * 0.8, XYL, pat[i % 4].replace('4', '5'), 42)
        if i % 4 == 0: S.note(t, 0.12, PIZZ, 'D2', 80)
        t += six; i += 1
    # teetering at the edge
    t = 120.3
    while t < 121.02: S.note(t, 0.05, CLAR, 'A5', 50); S.note(t + 0.045, 0.05, CLAR, 'Bb5', 50); t += 0.09
    S.gliss(121.05, 0.4, HARP, 'D4 F4 A4 D5 F5', 50)
    S.gliss(121.5, 0.38, HARP, 'F5 D5 A4 F4 D4', 50)
    # balancing on the pen: wobbling thirds
    t, k = 121.9, 0
    while t < 123.15:
        pair = [('D3', 'F3'), ('E3', 'G3')][k % 2]
        S.note(t, 0.18, BSN, pair[0], 58); S.note(t, 0.18, CLAR, pair[1].replace('3', '4'), 44)
        t += 0.2; k += 1
    S.chord(123.25, 1.6, STR, 'D4 F#4 A4', 44)
    S.gliss(123.25, 0.3, HARP, 'D4 F#4 A4 D5', 46)
    S.note(124.0, 0.2, PIZZ, 'A3', 50)

def stroll():
    e8 = 0.29
    t = 124.95
    S.mel(t, e8, GLOCK, 'A5:1 C6:1 A5:1 G5:1 F5:2 G5:1 A5:1 | C6:2 D6:1 C6:1 A5:1 G5:1 A5:2', 54, stacc=0.7)
    S.mel(t, e8, XYL, 'A5:1 C6:1 A5:1 G5:1 F5:2 G5:1 A5:1 | C6:2 D6:1 C6:1 A5:1 G5:1 A5:2', 36, stacc=0.5)
    bass = ['F2', 'C3', 'F2', 'C3', 'C2', 'G2', 'C2', 'G2', 'Bb1', 'F2', 'C2', 'G2', 'F2', 'C3', 'F2', 'C3']
    for i, n in enumerate(bass):
        tt = t + i * e8 * 2
        if tt > 129.9: break
        S.note(tt, e8 * 0.9, BSN, n, 56)
        S.note(tt + e8, e8 * 0.5, PIZZ, ['A3', 'C4'][i % 2], 40)
    S.mel(129.85, 0.12, GLOCK, 'C6:1 E6:2', 40)  # "hm?"

# ============================================================================== 7. the note
def note_scene():
    beat = 60 / 72
    t = T['note'] + 0.2
    S.mel(t, beat, MBOX, 'A4:1 C5:.5 D5:.5 E5:1 F5:1 | E5:1 D5:.5 C5:.5 D5:2', 62)
    S.chord(t, 4 * beat, PAD, 'F3 A3 C4', 36); S.chord(t + 4 * beat, 4 * beat, PAD, 'E3 G3 C4', 34)
    harp_bar(t, beat, 'F3 A3 C4', 34); harp_bar(t + 4 * beat, beat, 'E3 G3 C4', 32)
    S.note(137.0, 0.8, GLOCK, 'F6', 54); S.note(137.5, 0.8, GLOCK, 'A6', 54)

# ============================================================================== 8. the cookie
def cookie():
    c = T['cookie']
    # sniff: a wavy flute line drifts in
    for i, n in enumerate(['F5', 'G5', 'F5', 'G5', 'A5', 'G5', 'A5', 'Bb5', 'A5', 'C6']):
        S.note(c + 0.05 + i * 0.13, 0.16, FLUTE, n, 34 + i * 2)
    S.note(140.85, 0.15, PIZZ, 'A4', 60); S.note(141.1, 0.2, PIZZ, 'D4', 60)
    # the heavenly cookie
    S.chord(141.2, 1.9, CHOIR, 'F4 A4 C5 F5', 64)
    S.ramp(141.2, 141.6, CHOIR, 11, 50, 120); S.ramp(142.5, 143.1, CHOIR, 11, 120, 30)
    S.gliss(141.2, 0.5, HARP, 'F4 A4 C5 F5 A5 C6 F6', 50)
    for tt, n in [(141.45, 'C7'), (141.95, 'A6'), (142.45, 'F6')]: S.note(tt, 0.5, GLOCK, n, 44)
    S.cc(143.2, CHOIR, 11, 127)
    # approach (sneaky, quiet)
    sneak_bar(143.3, 0, 0.7)
    # reach... tension
    S.prog(145.0, STR, 44)
    for i, n in enumerate(['A3', 'Bb3', 'B3', 'C4', 'C#4', 'D4']):
        S.note(145.2 + i * 0.23, 0.26, STR, n, 44 + i * 5)
    S.note(146.58, 0.35, STR, 'E4', 70)
    S.mel(146.95, 0.06, PIZZ, 'E5:1 C5:1 A4:1', 70)
    S.note(147.1, 0.12, PIZZ, 'D3', 60); S.note(147.45, 0.12, PIZZ, 'D3', 64)
    # (the look at us: silence)
    for i in range(6): S.note(148.92 + i * 0.11, 0.08, XYL, ['A5', 'F5'][i % 2], 60)
    S.mel(149.72, 0.25, BSN, 'D3:1 A2:2', 64, stacc=0.7)
    # tummy
    S.prog(150.3, BASS, 58)
    S.note(150.65, 0.9, BASS, 'F1', 52)
    S.prog(151.3, BASS, 32)
    for i, n in enumerate(['A3', 'Bb3', 'B3', 'C4', 'C#4', 'D4']): S.note(151.5 + i * 0.25, 0.24, CLAR, n, 44)
    for i, n in enumerate(['D4', 'E4', 'F4']): S.note(153.0 + i * 0.1, 0.08, PIZZ, n, 50)
    # the heist
    h0, h1 = T['reach2'], T['snap']
    t = h0
    while t < h1 - 0.04:
        k = (t - h0) / (h1 - h0)
        S.note(t, 0.07, PERC, 'D2', 26 + 70 * k); t += 0.07
    S.prog(154.0, PERC, 47)
    S.note(h0, h1 - h0, STR, 'D3', 40); S.note(h0, h1 - h0, STR, 'A3', 40)
    S.ramp(h0, h1, STR, 11, 50, 127)
    t, i = h0, 0
    while t < h1 - 0.05:
        S.note(t, 0.08, PIZZ, ['D4', 'A3'][i % 2], 50 + 30 * (t - h0) / (h1 - h0)); t += 0.3 - 0.18 * (t - h0) / (h1 - h0); i += 1
    # SNAP → silence → relief
    S.gliss(157.9, 0.5, HARP, 'F4 A4 C5 F5 A5 C6', 50)
    # nom nom nom
    m = T['munch']
    for i in range(8):
        tt = m + 0.3 + i * 0.57
        if tt > 161.5: break
        S.note(tt, 0.14, PIZZ, ['F3', 'C4', 'A3', 'C4'][i % 4], 60)
        S.note(tt + 0.285, 0.12, BSN, ['C3', 'F3'][i % 2], 44)
    S.note(m + 0.35, 0.3, GLOCK, 'C7', 40)
    # bliss
    S.chord(161.5, 2.9, PAD, 'F3 A3 C4 E4', 44)
    S.mel(161.6, 0.5, MBOX, 'C6:1 A5:1 F5:1 G5:1 A5:1.8', 52)
    S.note(162.25, 0.6, GLOCK, 'A6', 40); S.note(162.85, 0.6, GLOCK, 'F6', 40)

# ============================================================================== 9. PANIC
def panic():
    S.prog(165.0, STR, 48); S.prog(165.0, PERC, 61)  # strings, brass section
    beat = 60 / 168; six = beat / 4
    def frantic(t0, t1, root='D'):
        pats = [['D4', 'F4', 'A4', 'F4'], ['C#4', 'E4', 'A4', 'E4']]
        t, i = t0, 0
        while t < t1 - 0.02:
            bar = int((t - t0) / (beat * 4))
            pat = pats[bar % 2]
            S.note(t, six * 0.9, STR, pat[i % 4], 64)
            if i % 4 == 0:
                S.note(t, beat * 0.4, PIZZ, ['D2', 'A1'][bar % 2] if (i // 4) % 2 == 0 else ['A2', 'E2'][bar % 2], 80)
                S.note(t, 0.08, DR, 38 if (i // 4) % 2 else 36, 44)
            if i % 2 == 1: S.note(t, 0.05, DR, 42, 26)
            t += six; i += 1
    frantic(165.4, 169.0)
    S.chord(169.0, 0.3, PERC, 'D3 A3 D4', 90)
    frantic(169.35, 171.6)
    for tt in (171.8, 172.3, 172.8): S.chord(tt, 0.35, PERC, 'D2 A2', 70)
    S.chord(173.0, 0.35, PERC, 'D3 F3 A3', 96)
    S.prog(173.2, STR, 44)
    S.note(173.4, 0.55, STR, 'A2', 50)
    S.prog(173.85, STR, 48)
    frantic(173.9, 176.0)
    # splat: sad trombone
    S.prog(175.9, PERC, 57)
    S.mel(176.1, 0.2, PERC, 'Bb3:1 A3:1 Ab3:1 G3:2.5', 80)
    # footsteps behind the door: heartbeat
    S.prog(176.8, PERC, 47)
    for tt in (176.95, 177.15, 177.5, 177.7): S.note(tt, 0.2, PERC, 'D2', 60)
    # second try: build
    t = 177.8
    while t < 179.3:
        k = (t - 177.8) / 1.5
        S.note(t, 0.05, DR, 38, 30 + 60 * k); t += 0.07
    for i, n in enumerate(['D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C#5']): S.note(177.8 + i * 0.21, 0.2, STR, n, 50 + i * 6)
    S.gliss(179.3, 0.45, HARP, 'D4 F4 A4 D5 F5 A5', 60)
    S.prog(179.6, STR, 44)
    S.chord(179.8, 1.2, STR, 'D3 A3', 60)
    S.chord(T['lift'], 1.15, STR, 'A4 D5', 60); S.ramp(T['lift'], 182.3, STR, 11, 60, 127)
    t = T['lift']
    while t < 182.3: S.note(t, 0.06, PERC, 'D2', 40 + 50 * (t - T['lift'])); t += 0.06
    S.prog(182.32, PERC, 60)
    S.chord(182.36, 0.55, PERC, 'D2 A2 D3', 90)
    S.gliss(182.95, 0.33, XYL, 'D7 A6 F6 D6 A5 F5 D5', 70)
    S.cc(183.3, STR, 11, 127)

# ============================================================================== 10. back to normal... ?
def return_scene():
    S.prog(189.0, KEYS, 4)
    lofi(190.2, 195.9, vel=0.75)
    # "?!"
    S.note(T['insertBite'] + 0.1, 0.6, BSN, 'F2', 80)
    S.mel(T['insertBite'] + 0.55, 0.08, XYL, 'C5:1 E5:1 G5:1 C6:2', 60)
    # the stare
    S.chord(T['stare'], T['innocent'] - T['stare'], PAD, 'D2 A2', 50)
    i0 = T['innocent']
    S.note(i0 + 0.8, 0.12, PIZZ, 'A4', 60)
    S.mel(i0 + 1.3, 0.1, FLUTE, 'A5:1 G5:1 E5:2', 44)
    S.note(i0 + 2.1, 0.2, BSN, 'D3', 60)
    S.prog(i0 + 2.6, FLUTE, 78)
    S.mel(i0 + 3.0, 0.19, FLUTE, 'C5:1 A4:1 F4:1 G4:1 A4:2', 60)
    S.prog(i0 + 4.3, FLUTE, 73)
    # squint
    S.prog(T['squint'] - 0.2, STR, 44)
    S.chord(T['squint'], 2.3, STR, 'D3 A3', 36); S.ramp(T['squint'], T['sweat'], STR, 11, 50, 127)
    # sweating
    t, dt, i = T['sweat'] + 0.3, 0.32, 0
    while t < T['laugh'] - 0.1:
        S.note(t, 0.06, PIZZ, ['D4', 'A3'][i % 2], 52); t += dt; dt = max(0.1, dt * 0.9); i += 1
    t = T['sweat'] + 2.0
    while t < T['laugh'] - 0.05: S.note(t, 0.05, CLAR, 'E5', 40); S.note(t + 0.04, 0.05, CLAR, 'F5', 40); t += 0.08

def finale():
    beat = 60 / 76
    t0 = T['laugh'] + 0.8
    S.prog(t0 - 0.3, KEYS, 0)
    S.prog(t0 - 0.3, STR, 49)
    spec = 'A4:1 C5:.5 A4:.5 G4:1 F4:1 | G4:1.5 A4:.5 C5:2 | D5:1 C5:.5 A4:.5 G4:1 A4:1'
    S.mel(t0, beat, KEYS, spec, 58)
    S.mel(T['gift'], beat, GLOCK, 'r:0.3', 0)
    # glock doubles from the gift onwards
    tb = t0 + 4 * beat
    S.mel(tb, beat, GLOCK, 'G5:1.5 A5:.5 C6:2 | D6:1 C6:.5 A5:.5 G5:1 A5:1', 36)
    chords = ['F3 A3 C4', 'E3 G3 C4', 'D3 F3 Bb3']
    for i, c in enumerate(chords):
        S.chord(t0 + i * 4 * beat, 4 * beat, STR, c, 44)
        S.chord(t0 + i * 4 * beat, 3 * beat, KEYS, c, 36)
        harp_bar(t0 + i * 4 * beat, beat, c, 36)
    tend = t0 + 12 * beat
    S.note(tend, 2.5, KEYS, 'F4', 56); S.chord(tend, 2.5, STR, 'F3 A3 C4', 44); S.chord(tend, 2.5, KEYS, 'F2 C3', 40)
    # joy sparkles
    for tt in (216.9, 217.5, 218.1): S.note(tt, 0.4, CEL, 'C7', 40)

# ============================================================================== 11. credits
def credits():
    beat = 60 / 128
    t0 = T['end'] + 0.1
    S.prog(t0 - 0.2, KEYS, 0)
    spec = THEME_A1.replace('F4:3 r:1', 'F4:2 r:2') + ' | ' + THEME_A2
    # melody on glock+xylophone, bouncy bassoon/pizz, brushes
    S.mel(t0, beat, GLOCK, spec, 54, stacc=0.6)
    S.mel(t0, beat, CLAR, spec.replace('4:', '4:').replace('5:', '5:'), 40, stacc=0.5)
    chords = CH_A1 + ['F3 A3 D4', 'E3 G3 C4', 'D3 F3 Bb3', 'F3 A3 C4']
    roots = ['F2', 'C2', 'Bb1', 'F2', 'D2', 'C2', 'Bb1', 'F2']
    for i, (c, r) in enumerate(zip(chords, roots)):
        tb = t0 + i * 4 * beat
        for b in range(4):
            tt = tb + b * beat
            if b % 2 == 0: S.note(tt, beat * 0.8, BSN, r, 58)
            else: S.chord(tt, beat * 0.5, PIZZ, c, 42)
            S.note(tt, 0.1, DR, 42, 24);
            if b % 2 == 1: S.note(tt, 0.2, DR, 40, 34)
        S.chord(tb, beat * 3.5, KEYS, c, 34)
    S.chord(t0 + 31 * beat, 1.2, PIZZ, 'F3 C4 F4', 44)

# ============================================================================== 12. later that night / end card
def stinger():
    t0 = T['stinger'] + 2.0
    S.gliss(t0 + 1.25, 0.6, CEL, 'D5 F5 A5', 32)
    for i, n in enumerate(['D4', 'E4', 'F4', 'G#4', 'A4']): S.note(t0 + 2.5 + i * 0.3, 0.1, PIZZ, n, 54)
    S.gliss(t0 + 4.2, 0.18, XYL, 'D5 A5 D6 A6', 64)
    for dt, n in [(5.75, 'F6'), (6.3, 'A6'), (6.85, 'C7')]: S.note(t0 + dt, 0.6, MBOX, n, 50)
    f = T['final']
    beat = 0.5
    S.mel(f + 0.5, beat, MBOX, 'C5:1 A4:.5 F4:.5 G4:1 A4:.5 G4:.5 | F4:3', 60)
    S.chord(f + 2.5, 2.2, HARP, 'F3 A3 C4 F4', 40, roll=0.06)
    S.chord(f + 2.5, 2.4, PAD, 'F3 A3 C4', 36)

def build(out_wav):
    setup()
    for fn in (title, work, lullaby, leaving, mystery, awe, sneaky, wake, chase, stroll, note_scene, cookie, panic, return_scene, finale, credits, stinger):
        fn()
    mid = os.path.join(BUILD, 'score.mid')
    S.write(mid)
    subprocess.run(['fluidsynth', '-ni', '-g', '0.6', '-r', '48000', '-F', out_wav,
                    '-o', 'synth.reverb.room-size=0.55', '-o', 'synth.reverb.damp=0.35', '-o', 'synth.reverb.width=0.9', '-o', 'synth.reverb.level=0.55',
                    '-o', 'synth.chorus.active=0', SF2, mid], check=True, capture_output=True)
    print('music →', out_wav)

if __name__ == '__main__':
    build(os.path.join(BUILD, 'music.wav'))
