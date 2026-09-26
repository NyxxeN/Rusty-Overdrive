#!/usr/bin/env node
/* Prueba de la escucha en vivo del EQ (sin procesar): equivalencia del filtro del navegador con el cálculo offline y
   los tres modos (Con EQ / Solo lo que quita / Solo la banda) medidos en el analizador con ruido blanco.
   Uso:  CHROME_PATH=/ruta/a/chrome node tests/e2e/live-eq.js */
'use strict';
const { chromium } = require('playwright-core'); const path = require('path'), fs = require('fs'), os = require('os');
const root = path.join(__dirname, '..', '..'), wav = path.join(os.tmpdir(), 'roc-noise.wav'); let fails = 0;
const ok = (n, c, d) => { console.log((c ? '  ok    ' : '  FALLA ') + n + (d ? '  (' + d + ')' : '')); if (!c) fails++; };
{ const sr = 48000, n = sr * 20, b = Buffer.alloc(44 + n * 4); let s = 1; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n * 2; i++) b.writeInt16LE(Math.round((r() + r() + r() + r() - 2) * 0.12 * 32767), 44 + i * 2); fs.writeFileSync(wav, b); }
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const p = await (await browser.newContext({ viewport: { width: 1600, height: 980 } })).newPage(), errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto('file://' + path.join(root, 'dist', 'rusty-overdrive-corrector.html'));
  const err = await p.evaluate(async () => {   // mismo mapeo que updateLiveEQ, renderizado offline
    const CM = window.__app.CM, sr = 48000, n = sr * 2, x = new Float32Array(n); let s = 5; for (let i = 0; i < n; i++) { s = (s * 1664525 + 1013904223) >>> 0; x[i] = (s / 4294967296 - .5) * .5; }
    const bands = [{ on: true, type: 'hp', f: 40, g: 0, q: .71, slope: 24 }, { on: true, type: 'peak', f: 3000, g: -5, q: 2, slope: 12 }, { on: true, type: 'highshelf', f: 14000, g: -6, q: .71, slope: 12 }, { on: true, type: 'lowshelf', f: 120, g: 3, q: .71, slope: 12 }, { on: true, type: 'notch', f: 1000, g: 0, q: 4, slope: 12 }, { on: true, type: 'lp', f: 16000, g: 0, q: .71, slope: 12 }];
    const oc = new OfflineAudioContext(1, n, sr), buf = oc.createBuffer(1, n, sr); buf.copyToChannel(x, 0); const src = oc.createBufferSource(); src.buffer = buf; let last = src, qdb = 20 * Math.log10(0.7071);
    const mk = (t, f, g, q) => { const nd = oc.createBiquadFilter(); nd.type = t; nd.frequency.value = f; nd.gain.value = g; nd.Q.value = q; last.connect(nd); last = nd; };
    bands.forEach(b => { if (b.type === 'hp' || b.type === 'lp') { const t = b.type === 'hp' ? 'highpass' : 'lowpass'; mk(t, b.f, 0, qdb); if (b.slope === 24) mk(t, b.f, 0, qdb); } else if (b.type === 'lowshelf' || b.type === 'highshelf') mk(b.type, b.f, b.g, 1); else if (b.type === 'notch') mk('notch', b.f, 0, b.q); else mk('peaking', b.f, b.g, b.q); });
    last.connect(oc.destination); src.start(); const out = (await oc.startRendering()).getChannelData(0), y = new Float32Array(x);
    bands.forEach(b => CM.eqBandBiquads(b, sr).forEach(c => { let z1 = 0, z2 = 0; for (let i = 0; i < n; i++) { const v = y[i], o = c.b0 * v + z1; z1 = c.b1 * v - c.a1 * o + z2; z2 = c.b2 * v - c.a2 * o; y[i] = o; } }));
    let e = 0, r = 0; for (let i = 0; i < n; i++) { const d = out[i] - y[i]; e += d * d; r += y[i] * y[i]; } return 10 * Math.log10(e / r); });
  ok('el filtro en vivo coincide con el procesado offline', err < -60, err.toFixed(1) + ' dB de error relativo');
  await p.setInputFiles('#file', wav); await p.waitForFunction(() => /Original: /.test(document.getElementById('status').textContent), null, { timeout: 60000 });
  await p.evaluate(() => { const S = window.__app.S; S.eq.on = true; const b = S.eq.bands[2]; b.on = true; b.type = 'peak'; b.f = 3000; b.g = -9; b.q = 4; }); await p.click('#bPlay'); await p.waitForTimeout(500);
  async function medir(m) { await p.evaluate(mm => window.__app.setLiveMode(mm, 2), m); await p.waitForTimeout(900);
    return p.evaluate(() => { const an = window.__app.getAnalyser(), d = new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(d); const hz = 48000 / an.fftSize; const avg = (f0, f1) => { let s = 0, c = 0; for (let k = Math.floor(f0 / hz); k <= Math.ceil(f1 / hz); k++) { s += Math.pow(10, d[k] / 10); c++; } return 10 * Math.log10(s / c); }; return avg(2950, 3050) - Math.max(avg(450, 550), avg(9500, 10500)); }); }
  const res = await medir('result'), del = await medir('delta'), sol = await medir('solo');
  ok('Con EQ: hueco de ≈ −9 dB a 3 kHz', res < -6 && res > -12, res.toFixed(1) + ' dB'); ok('Solo lo que quita: la energía se concentra en 3 kHz', del > 10, '+' + del.toFixed(1) + ' dB sobre el resto'); ok('Solo la banda: zona aislada', sol > 10, '+' + sol.toFixed(1) + ' dB sobre el resto');
  ok('sin errores de consola', errors.length === 0, errors.join(' | ')); await browser.close(); console.log(fails ? '\n' + fails + ' con fallas' : '\ntodo correcto'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
