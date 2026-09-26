#!/usr/bin/env python3
"""Genera tests/reference.json con valores de referencia de loudness (BS.1770-4) calculados con pyloudnorm.
Requiere: pip install pyloudnorm numpy.  Las señales son sumas de senos (deterministas): tests/run.js las reconstruye igual."""
import json, numpy as np, pyloudnorm as pyln
sr = 48000
def t(sec): return np.arange(int(sr * sec)) / sr
def sine(f, a, sec): return a * np.sin(2 * np.pi * f * t(sec))
signals = {}
s = sine(997, 0.1, 10); signals['sine997_m20'] = np.stack([s, s], 1)
loud = sine(200, 0.2, 5) + sine(3000, 0.05, 5) + sine(8000, 0.02, 5); sig = np.concatenate([loud, loud * 0.01])
signals['gated_two_level'] = np.stack([sig, sig * 0.5], 1)
signals['lr_different'] = np.stack([sine(440, 0.3, 8), sine(1000, 0.1, 8)], 1)
out = {}
for k, x in signals.items():
    out[k] = {'I': round(float(pyln.Meter(sr).integrated_loudness(x)), 3)}
json.dump(out, open('tests/reference.json', 'w'), indent=2); print(out)
