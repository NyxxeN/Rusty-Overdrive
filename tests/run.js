#!/usr/bin/env node
/* Pruebas del motor DSP con señales sintéticas (sin audio privado). Uso: node tests/run.js */
'use strict';
const { dsp } = require('./harness.js'); const ref = require('./reference.json');
const sr = 48000; let pass = 0, fail = 0;
function ok(name, cond, detail) { if (cond) { pass++; console.log('  ok   ' + name + (detail ? '  (' + detail + ')' : '')); } else { fail++; console.log('  FALLA ' + name + (detail ? '  (' + detail + ')' : '')); } }
function sine(f, a, sec, ph) { const n = Math.round(sr * sec), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = a * Math.sin(2 * Math.PI * f * i / sr + (ph || 0)); return x; }
function add(a, b) { const o = new Float32Array(a); for (let i = 0; i < b.length && i < o.length; i++) o[i] += b[i]; return o; }
function scale(a, g) { const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] * g; return o; }
function cat(a, b) { const o = new Float32Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; }
let seed = 12345; function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function noise(sec, amp) { const n = Math.round(sr * sec), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = amp * (rnd() + rnd() + rnd() + rnd() - 2) * 1.2; return x; }
function rmsDb(x, a, b) { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return 10 * Math.log10(s / (b - a) + 1e-20); }
const T0 = Date.now(); function section(t) { console.log('\n' + t); }

section('FFT');
{ const N = 4096, re = new Float64Array(N), im = new Float64Array(N), o = new Float64Array(N); for (let i = 0; i < N; i++) { re[i] = rnd() - .5; o[i] = re[i]; } dsp.fft(re, im, false); dsp.fft(re, im, true); let m = 0; for (let i = 0; i < N; i++) m = Math.max(m, Math.abs(re[i] - o[i]), Math.abs(im[i])); ok('ida y vuelta', m < 1e-9, 'error máx ' + m.toExponential(1)); }

section('Loudness BS.1770-4 (contra pyloudnorm)');
{ const s = sine(997, 0.1, 10); let m = dsp.fullMeter(s, s, sr, -1); ok('seno 997 Hz a −20 dBFS', Math.abs(m.I - ref.sine997_m20.I) < 0.05, m.I.toFixed(3) + ' vs ' + ref.sine997_m20.I);
  const loud = add(add(sine(200, 0.2, 5), sine(3000, 0.05, 5)), sine(8000, 0.02, 5)), sig = cat(loud, scale(loud, 0.01)); m = dsp.fullMeter(sig, scale(sig, 0.5), sr, -1);
  ok('compuerta relativa (dos niveles)', Math.abs(m.I - ref.gated_two_level.I) < 0.05, m.I.toFixed(3) + ' vs ' + ref.gated_two_level.I);
  m = dsp.fullMeter(sine(440, 0.3, 8), sine(1000, 0.1, 8), sr, -1); ok('canales distintos', Math.abs(m.I - ref.lr_different.I) < 0.05, m.I.toFixed(3) + ' vs ' + ref.lr_different.I); }

section('True peak');
{ const s = sine(sr / 4, 1, 2, Math.PI / 4), m = dsp.measureTP(s, s, sr, -1); ok('pico entre muestras (fs/4, fase 45°)', Math.abs(m.tp) < 0.2 && Math.abs(m.sample + 3.01) < 0.1, 'true ' + m.tp.toFixed(2) + ' dBTP, muestra ' + m.sample.toFixed(2) + ' dBFS'); }

section('Limitador y normalización');
{ const n = sr * 10, L = new Float32Array(n), R = new Float32Array(n); for (let i = 0; i < n; i++) { const env = 0.25 + 0.2 * Math.sin(2 * Math.PI * 0.5 * i / sr); L[i] = env * (rnd() * 2 - 1); R[i] = env * (rnd() * 2 - 1); if (i % 9000 === 0) { L[i] = 0.95; } }
  const r = dsp.normalizeAndLimit(L, R, sr, { mode: 'lufs', target: -8, ceil: -1, look: 1.5, rel: 80, gain: 0 }), m = dsp.fullMeter(r.L, r.R, sr, -1);
  ok('objetivo −8 LUFS alcanzado', Math.abs(m.I + 8) < 0.15, m.I.toFixed(2) + ' LUFS'); ok('true peak ≤ techo', m.tp <= -0.95, m.tp.toFixed(2) + ' dBTP'); ok('el limitador trabajó', r.red > 1, 'reducción máx ' + r.red.toFixed(1) + ' dB'); }

section('Tonos persistentes');
{ const n = sr * 20; let L = noise(20, 0.02); const freqs = []; for (let k = 0; k < 12; k++) { freqs.push(8000 + 200 * k); L = add(L, sine(8000 + 200 * k, 0.004, 20)); }
  const R = new Float32Array(L), found = dsp.detectTones(L, R, sr, 5, 3000, 20000), hit = freqs.filter(f => found.some(p => Math.abs(p.f - f) < 6)).length;
  ok('detecta los tonos', hit >= 10, hit + ' de 12');
  const o = dsp.applyTones(new Float32Array(L), new Float32Array(R), sr, found, 40, null), left = dsp.detectTones(o[0], o[1], sr, 5, 3000, 20000);
  ok('con reducción libre quedan pocos picos', left.length <= 2, left.length + ' picos restantes');
  function bandDb(x) { let re = 0, im = 0; const w = 2 * Math.PI * 9000 / sr; for (let i = sr; i < x.length - sr; i++) { re += x[i] * Math.cos(w * i); im -= x[i] * Math.sin(w * i); } return 20 * Math.log10(Math.hypot(re, im) / (x.length - 2 * sr) * 2); }   // amplitud del tono de 9 kHz (Goertzel)
  const o12 = dsp.applyTones(new Float32Array(L), new Float32Array(R), sr, found, 12, null), drop = bandDb(L) - bandDb(o12[0]);
  ok('la reducción respeta el máximo (12 dB)', drop > 9 && drop < 13.5, 'bajó ' + drop.toFixed(1) + ' dB'); }

section('Motor espectral');
{ const n = sr * 8, L = add(noise(8, 0.05), sine(1000, 0.2, 8)), R = new Float32Array(L), P = { nr: { on: true, over: 0, maxRed: 4, rel: 120, lo: 3000, hi: 9000 }, dess: { on: true, f1: 5000, f2: 14000, over: 2, ratio: 3, maxRed: 0 }, tail: { on: true, maxRed: 0, f: 6500 } };
  const o = dsp.spectral(L, R, sr, P, () => {}); let mx = 0; for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(o.L[i] - L[i])); ok('reconstrucción exacta con fuerza cero', 20 * Math.log10(mx + 1e-20) < -100, (20 * Math.log10(mx + 1e-20)).toFixed(0) + ' dBFS'); }

section('EQ dinámico (Neon Scalpel)');
{ const seg = sr, lv = [-40, -40, -10, -10, -40]; let x = new Float32Array(seg * 5); for (let s = 0; s < 5; s++) x.set(sine(3000, Math.pow(10, lv[s] / 20), 1), s * seg);
  function band(sig, f, q) { const y = new Float32Array(sig); dsp.applyBiquad(y, dsp.biquadCoefs('bandpass', f, 0, q, sr)); return y; }
  function run(over) { const L = new Float32Array(x), R = new Float32Array(x); dsp.novaProcess(L, R, sr, { on: true, bands: [Object.assign({ on: true, type: 'peak', f: 3000, q: 2, g: 0, thr: -25, ratio: 4, att: 5, rel: 100, mode: 'comp', maxDyn: 12 }, over)] }); const o = band(L, 3000, 8), i = band(x, 3000, 8), r = []; for (let s = 0; s < 5; s++) { const a = s * seg + Math.floor(seg * 0.4), b = (s + 1) * seg - 100; r.push(rmsDb(o, a, b) - rmsDb(i, a, b)); } return r; }
  let r = run({}); ok('comprimir: tramo suave intacto', Math.abs(r[0]) < 0.2, r[0].toFixed(2) + ' dB'); ok('comprimir: tramo fuerte −11,25 dB (fórmula)', Math.abs(r[2] + 11.25) < 0.6, r[2].toFixed(2) + ' dB');
  r = run({ g: 6, thr: 0 }); ok('ganancia estática +6 dB', Math.abs(r[2] - 6) < 0.3, r[2].toFixed(2) + ' dB'); r = run({ mode: 'up', maxDyn: 6 }); ok('subir al pasar (máx +6)', Math.abs(r[2] - 6) < 0.3 && Math.abs(r[0]) < 0.2, r[2].toFixed(2) + ' dB'); }

section('EQ paramétrico');
{ const n = sr * 20, x = noise(20, 0.15), bands = [{ on: true, type: 'hp', f: 40, g: 0, q: .7, slope: 24 }, { on: true, type: 'peak', f: 3000, g: -5, q: 2, slope: 12 }, { on: true, type: 'highshelf', f: 14000, g: -6, q: .7, slope: 12 }, { on: true, type: 'lowshelf', f: 120, g: 3, q: .7, slope: 12 }];
  const y = new Float32Array(x); bands.forEach(b => dsp.eqBandBiquads(b, sr).forEach(c => dsp.applyBiquad(y, c)));
  const N = 8192, re = new Float64Array(N), im = new Float64Array(N), hw = dsp.hannPeriodic(N), pa = new Float64Array(N / 2), pb = new Float64Array(N / 2);
  for (let s0 = 0; s0 + N <= n; s0 += N / 2) for (const [arr, acc] of [[x, pa], [y, pb]]) { for (let i = 0; i < N; i++) { re[i] = arr[s0 + i] * hw[i]; im[i] = 0; } dsp.fft(re, im, false); for (let k = 0; k < N / 2; k++) acc[k] += re[k] * re[k] + im[k] * im[k]; }
  let worst = 0; for (const f of [300, 1000, 2500, 3000, 3600, 6000, 10000, 14000, 18000]) { const k = Math.round(f / sr * N); let a = 0, b = 0; for (let j = -3; j <= 3; j++) { a += pa[k + j]; b += pb[k + j]; } worst = Math.max(worst, Math.abs(10 * Math.log10(b / a) - dsp.eqResponseDb(bands, f, sr))); }
  ok('respuesta medida = teórica', worst < 0.3, 'error máx ' + worst.toFixed(2) + ' dB'); }

section('Remuestreo 48 → 44,1 kHz');
{ function lvl(f) { const y = dsp.resample(sine(f, 0.5, 3), 48000, 44100); let s = 0; for (let i = 4000; i < y.length - 4000; i++) s += y[i] * y[i]; return 10 * Math.log10(2 * s / (y.length - 8000) / 0.25); }
  ok('1 kHz sin cambio', Math.abs(lvl(1000)) < 0.05, lvl(1000).toFixed(3) + ' dB'); ok('20 kHz dentro de −0,3 dB', lvl(20000) > -0.3, lvl(20000).toFixed(2) + ' dB'); ok('23,5 kHz atenuado > 60 dB', lvl(23500) < -60, lvl(23500).toFixed(1) + ' dB'); }

section('Exportación');
{ const n = sr * 4, s = sine(440, 0.3, 4), iL = dsp.makeInt(s, 16, true), iR = dsp.makeInt(s, 16, true), wav = dsp.encodeWav(iL, iR, sr, 16), dv = new DataView(wav);
  ok('WAV: cabecera y tamaño', String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) === 'RIFF' && dv.getUint32(40, true) === n * 4 && dv.getUint32(24, true) === sr);
  const mp3 = new Uint8Array(dsp.encodeMp3(iL, iR, sr, 320, null)); ok('MP3 320 kbps: tamaño esperado', Math.abs(mp3.length - 320000 / 8 * 4) / (320000 / 8 * 4) < 0.06, mp3.length + ' bytes'); ok('MP3: sincronismo de trama', mp3[0] === 0xFF && (mp3[1] & 0xE0) === 0xE0); }

section('Pipeline completo');
{ const n = sr * 12, L = add(noise(12, 0.1), sine(220, 0.3, 12)), R = add(noise(12, 0.1), sine(330, 0.3, 12)), W = dsp.W(); W.sr = sr; W.orig = { L, R };
  const eqb = (t, f, g) => ({ on: true, type: t, f, g, q: 1, slope: 12 }), P = { tones: { on: true, thr: 5, maxRed: 9, fLo: 3000, fHi: 20000 }, eq: { on: true, bands: [eqb('highshelf', 14000, -6)] }, nova: { on: true, bands: [{ on: true, type: 'peak', f: 6000, q: 1.5, g: 0, thr: -40, ratio: 3, att: 5, rel: 80, mode: 'comp', maxDyn: 8 }] },
    nr: { on: true, over: 1, maxRed: 4, rel: 120, lo: 3000, hi: 9000 }, dess: { on: true, f1: 5000, f2: 14000, over: 2, ratio: 3, maxRed: 8 }, tail: { on: true, maxRed: 8, f: 6500 }, meq: { on: true, bands: [eqb('hp', 25, 0), eqb('peak', 300, -1.5)] },
    comp: { on: true, thr: -22, ratio: 2, att: 20, rel: 120, knee: 6, makeup: 0, mix: 100, hpf: 90 }, out: { on: true, mode: 'lufs', target: -10, gain: 0, ceil: -2, look: 1.5, rel: 80 } };
  const r = dsp.runPipeline(P); let bad = 0; for (let i = 0; i < n; i++) if (!isFinite(W.final.L[i]) || !isFinite(W.final.R[i])) bad++;
  ok('sin valores inválidos', bad === 0); ok('objetivo −10 LUFS', Math.abs(r.meter.I + 10) < 0.3, r.meter.I.toFixed(2) + ' LUFS'); ok('true peak ≤ techo (−2 dBTP)', r.meter.tp <= -1.95, r.meter.tp.toFixed(2) + ' dBTP'); }

console.log('\n' + pass + ' correctas, ' + fail + ' con fallas (' + ((Date.now() - T0) / 1000).toFixed(1) + ' s)'); process.exit(fail ? 1 : 0);
