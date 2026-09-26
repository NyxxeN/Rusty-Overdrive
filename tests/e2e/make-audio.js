/* Genera un WAV estéreo sintético (tono + ruido + golpes) para las pruebas de navegador. Uso: node make-audio.js salida.wav */
'use strict';
const fs = require('fs'); const out = process.argv[2] || 'synthetic.wav', sr = 48000, n = sr * 15; let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const buf = Buffer.alloc(44 + n * 4); buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) { const t = i / sr, hit = Math.exp(-((t * 4) % 1) * 9), tone = 0.18 * Math.sin(2 * Math.PI * 110 * t) + 0.10 * Math.sin(2 * Math.PI * 440 * t) + 0.04 * Math.sin(2 * Math.PI * 3000 * t);
  const l = tone + hit * 0.25 * (rnd() * 2 - 1) + 0.01 * (rnd() - .5), r = tone * 0.9 + hit * 0.25 * (rnd() * 2 - 1) + 0.01 * (rnd() - .5);
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(l * 32767))), 44 + i * 4); buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(r * 32767))), 46 + i * 4); }
fs.writeFileSync(out, buf); console.log('escrito', out);
