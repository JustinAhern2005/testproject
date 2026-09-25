# Synthesizes a 30 s ambient music bed timed to the video's scene changes.
import numpy as np, wave
SR, DUR = 48000, 30.0
N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

def env(start, length, a, r):
    e = np.zeros(N); i0 = int(start * SR); i1 = min(N, int((start + length) * SR))
    x = (np.arange(i0, i1) - i0) / SR
    e[i0:i1] = np.minimum(1, x / a) * np.clip((length - x) / r, 0, 1)
    return e

# Warm pad: each chord ~7.5 s, overlapping crossfades.
chords = [[50, 57, 62, 66, 69, 76], [47, 54, 62, 64, 69, 74], [43, 50, 59, 62, 66, 71], [45, 52, 57, 61, 64, 71, 76]]
for k, ch in enumerate(chords):
    start = k * 7.5 - (0.6 if k else 0); length = 8.4 if k < 3 else DUR - start
    e = env(start, length, 2.2, 2.6 if k < 3 else 3.5)
    for j, m in enumerate(ch):
        f = hz(m); pan = 0.5 + 0.35 * np.sin(j * 1.7)
        for d in (-0.12, 0.12):
            ph = rng.uniform(0, 6.28)
            v = np.sin(2 * np.pi * f * (1 + d / 100) * t + ph) + 0.18 * np.sin(4 * np.pi * f * t + ph) + 0.06 * np.sin(6 * np.pi * f * t)
            v *= e * (0.05 if m > 60 else 0.07) * (1 + 0.15 * np.sin(2 * np.pi * 0.13 * t + j))
            L += v * (1 - pan); R += v * pan

# Glassy chimes on text reveals.
for when, notes in [(1.4, [81, 88]), (3.2, [86]), (7.1, [83, 90]), (13.0, [81, 88, 93]), (15.0, [90]), (24.0, [78, 85, 90]), (25.8, [88])]:
    for n_i, m in enumerate(notes):
        s = when + n_i * 0.09; f = hz(m); i0 = int(s * SR); x = t[i0:] - s
        v = (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x * 3)) * np.exp(-x * 1.6) * 0.06
        v *= np.minimum(1, x / 0.004)
        p = 0.3 + 0.4 * ((m * 7) % 10) / 10
        L[i0:] += v * (1 - p); R[i0:] += v * p

# Soft swooshes for the fly-throughs (band-limited noise swell).
def swoosh(start, length, peak, gain):
    i0, i1 = int(start * SR), int((start + length) * SR); n = i1 - i0
    noise = rng.standard_normal(n)
    spec = np.fft.rfft(noise); fr = np.fft.rfftfreq(n, 1 / SR)
    spec *= np.exp(-((np.log(fr + 1) - np.log(900)) ** 2) / 0.9)
    v = np.fft.irfft(spec, n); v /= np.abs(v).max()
    x = np.arange(n) / SR; e = np.where(x < peak, (x / peak) ** 2, np.exp(-(x - peak) * 3))
    pan = np.linspace(0.2, 0.8, n)
    L[i0:i1] += v * e * gain * (1 - pan); R[i0:i1] += v * e * gain * pan
swoosh(0.1, 3.0, 1.6, 0.06); swoosh(6.6, 2.8, 1.8, 0.07); swoosh(10.3, 2.6, 1.8, 0.08); swoosh(21.8, 2.8, 1.4, 0.08)

# Low sub swell under the name reveal and the end card.
for s, ln in [(12.6, 5), (23.4, 6.6)]:
    e = env(s, ln, 1.2, 3.0); L += np.sin(2 * np.pi * hz(38 if s < 20 else 33) * t) * e * 0.06; R += np.sin(2 * np.pi * hz(38 if s < 20 else 33) * t) * e * 0.06

# Reverb: convolve with decaying stereo noise.
def reverb(x, seed):
    ir_len = int(2.8 * SR); r = np.random.default_rng(seed).standard_normal(ir_len) * np.exp(-np.arange(ir_len) / SR * 2.4)
    r[:int(0.02 * SR)] = 0; n = len(x) + ir_len
    y = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(r, n), n)[:len(x)]
    return y / np.abs(y).max()
dry = 0.72
L2 = dry * L + 0.28 * reverb(L, 1) * np.abs(L).max(); R2 = dry * R + 0.28 * reverb(R, 2) * np.abs(R).max()
fade = np.minimum(1, t / 0.8) * np.clip((DUR - t) / 2.2, 0, 1)
out = np.stack([L2, R2], 1) * fade[:, None]
out *= 0.7 / np.abs(out).max()
with wave.open('out/music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
print('wrote out/music.wav')
