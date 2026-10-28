"""Mix narration, music and SFX for the 64 s Baraka Invest film. Writes stems and mix_raw.wav (float32, 48 kHz stereo)."""
import json
import subprocess
import sys
import numpy as np

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from meter import KW, momentary  # noqa: E402

ROOT = sys.argv[1]
SR, DUR = 48000, 64.0
N = int(SR * DUR)


def load(path, ch=2, af=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', path]
    if af:
        cmd += ['-af', af]
    cmd += ['-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, ch).copy()


def save(path, x):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', str(x.shape[1]), '-i', '-',
                        '-c:a', 'pcm_f32le', path], input=x.astype(np.float32).tobytes(), check=True)


def db(v):
    return 10 ** (v / 20)


def place(dst, clip, t, gain=1.0):
    i = int(round(t * SR))
    j0 = max(0, -i)
    n = min(len(clip) - j0, len(dst) - max(i, 0))
    if n > 0:
        dst[max(i, 0):max(i, 0) + n] += clip[j0:j0 + n] * gain


def fades(x, fin=0.01, fout=0.03):
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a:
        x[:a] *= np.linspace(0, 1, a)[:, None]
    if b:
        x[-b:] *= np.linspace(1, 0, b)[:, None]
    return x


# ---------------- narration ----------------
lines = {l['id']: l for l in json.load(open(f'{ROOT}/vo/lines.json'))}
VO = [('L1', 1.64), ('L2a', 6.89), ('L2b', 8.85), ('L2c', 10.30), ('L2d', 12.40), ('L3a', 14.30), ('L3b', 17.10),
      ('L4', 20.50), ('L5', 25.30), ('L6', 30.40), ('L7a', 34.30), ('L7b', 36.45), ('L7c', 38.10), ('L8', 40.10),
      ('L9', 43.85), ('L10a', 50.30), ('L10b', 52.35), ('L11a', 56.70), ('L11b', 58.55)]
vo = np.zeros((N, 1), np.float32)
speech = []
for lid, t in VO:
    c = fades(load(f'{ROOT}/vo/{lid}.wav', ch=1))
    place(vo, c, t)
    L = lines[lid]
    speech.append((t + L['speech_on'], t + L['speech_on'] + L['speech_dur']))
for a, b in zip(speech, speech[1:]):
    assert b[0] - a[1] > 0.18, (a, b)
save(f'{ROOT}/mix/vo_dry.wav', vo)
# voice chain: low cut, gentle presence, light compression
vo = load(f'{ROOT}/mix/vo_dry.wav', ch=1,
          af='highpass=f=85,equalizer=f=3200:t=q:w=1.1:g=1.8,equalizer=f=220:t=q:w=1.0:g=-1.2,'
             'acompressor=threshold=0.12:ratio=2.2:attack=8:release=120:makeup=1.3')[:N]
vo = np.pad(vo, ((0, N - len(vo)), (0, 0)))
vo2 = np.repeat(vo, 2, axis=1) * db(1.0)

# ---------------- music: 0-54.30 then the final phrase from 69.16 ----------------
m = load(f'{ROOT}/music/543.mp3', af='highpass=f=28')
XF = 0.12
cut, src_b = 54.30, 69.16
music = np.zeros((N, 2), np.float32)
na = int(cut * SR)
music[:na] = m[:na]
nx = int(XF * SR)
th = np.linspace(0, np.pi / 2, nx)[:, None]
music[na - nx:na] *= np.cos(th)
b0 = int((src_b - XF) * SR)
nb = N - (na - nx)
seg = m[b0:b0 + nb].copy()
seg[:nx] *= np.sin(th)
music[na - nx:na - nx + len(seg)] += seg

# gain automation: base level, ducking under speech, final fade with the picture
tt = np.arange(N) / SR
duck = np.zeros(N)
for s0, s1 in speech:
    a0, a1, r1 = s0 - 0.16, s0 - 0.02, s1 + 0.45
    up = np.clip((tt - a0) / (a1 - a0), 0, 1)
    down = np.clip((r1 - tt) / (r1 - s1), 0, 1)
    env = np.minimum(up, down)
    env = 0.5 - 0.5 * np.cos(np.pi * env)
    duck = np.maximum(duck, env)
# the track opens on a near-silent pad that swells into the lift at 24.58: ride it up so it reads from the start
raw_k = load(f'{ROOT}/music/543.mp3', af='highpass=f=28,' + KW)[:N].astype(np.float64)
pw = (raw_k ** 2).sum(axis=1)
k = int(2.0 * SR)
csum = np.concatenate([[0], np.cumsum(pw)])
idx = np.clip(np.arange(N), 0, N - 1)
lo, hi = np.clip(idx - k // 2, 0, N), np.clip(idx + k // 2, 0, N)
loud = -0.691 + 10 * np.log10((csum[hi] - csum[lo]) / np.maximum(hi - lo, 1) + 1e-12)
tgt = np.interp(tt, [0, 4, 8, 12, 17.2, 18.0, 23.9, 24.3, 24.5], [-30, -26, -24.5, -23.5, -22.5, -22.0, -20.0, -22.5, -22.5])
boost = np.clip(tgt - loud, 0, 26) * (tt < 24.45) + np.clip(tgt - loud, 0, 26) * ((tt >= 24.45) & (tt < 24.56)) * np.clip((24.56 - tt) / 0.11, 0, 1)
kb = int(1.0 * SR)
cb = np.concatenate([[0], np.cumsum(boost)])
lo, hi = np.clip(idx - kb // 2, 0, N), np.clip(idx + kb // 2, 0, N)
boost = (cb[hi] - cb[lo]) / np.maximum(hi - lo, 1)
depth = np.where(tt < 17.2, 3.0, np.where(tt < 24.5, 6.0, 9.0))
gdb = -3.5 + boost - depth * duck
fade = np.clip((64.0 - tt) / (64.0 - 62.4), 0, 1)
g = db(gdb) * (0.5 - 0.5 * np.cos(np.pi * fade))
music *= g[:, None].astype(np.float32)

# ---------------- sound design ----------------
SFX = [
    ('magic_sweep', 0.00, -10), ('light_sweep', 4.40, -2), ('tunnel', 5.38, -7, 2.0),
    ('whoosh_fast', 7.71, -9), ('whoosh_fast', 9.10, -9), ('whoosh_fast', 10.50, -7),
    ('ui_click', 7.40, -12), ('ui_click', 9.16, -12), ('ui_click', 10.58, -12),
    ('sweep_short', 11.61, -12), ('sweep_short', 12.195, -13), ('sweep_short', 12.65, -13),
    ('heartbeat', 16.84, -3), ('light_trans', 16.49, -7), ('sweep_short', 19.82, -9),
    ('logo_impact', 20.13, -9), ('whoosh_air', 23.69, -11), ('deep_impact', 23.95, -5),
    ('magic_sweep', 28.89, -7), ('page_chime', 31.00, -5), ('page_chime', 32.00, -9),
    ('light_sweep', 32.20, -3), ('ui_select', 34.24, -13), ('ui_select', 36.39, -13), ('ui_select', 38.04, -13),
    ('ui_click', 38.85, -13), ('whoosh_fast', 39.10, -13), ('whoosh_fast', 40.06, -13),
    ('page_chime', 41.90, -7), ('page_chime', 42.86, -9), ('ui_click', 47.90, -15), ('ui_click', 48.72, -11),
    ('whoosh_air', 48.95, -9), ('whoosh_fast', 51.40, -9),
    ('big_impact', 53.99, -5), ('energy_flow', 54.30, -9), ('page_chime', 57.60, -9),
]
sfx = np.zeros((N, 2), np.float32)
cache = {}
for name, t, gdb_, *cut in SFX:
    if name not in cache:
        cache[name] = fades(load(f'{ROOT}/sfx/{name}.mp3'), 0.003, 0.05)
    c = cache[name]
    if cut:
        c = fades(c[:int(cut[0] * SR)], 0.0, 0.6)
    place(sfx, c, t, db(gdb_))

save(f'{ROOT}/mix/stem_vo.wav', vo2)
save(f'{ROOT}/mix/stem_music.wav', music)
save(f'{ROOT}/mix/stem_sfx.wav', sfx)
mix = vo2 + music + sfx
save(f'{ROOT}/mix/mix_raw.wav', mix)
print('peak', 20 * np.log10(np.abs(mix).max() + 1e-12))
json.dump({'speech': speech}, open(f'{ROOT}/mix/speech.json', 'w'))
