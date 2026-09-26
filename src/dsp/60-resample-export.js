/* ---------- Remuestreo racional (sinc con ventana Kaiser) ---------- */
function gcd(a, b) { while (b) { var t = b; b = a % b; a = t; } return a; }
function resample(x, srIn, srOut, prog) {
  if (srIn === srOut) return x;
  var g = gcd(srIn, srOut), up = srOut / g, down = srIn / g, T = 48, beta = 9, fc = Math.min(1, srOut / srIn) * 0.955;
  function i0(v) { var s = 1, t = 1; for (var k = 1; k < 40; k++) { t *= (v / (2 * k)) * (v / (2 * k)); s += t; } return s; }
  var i0b = i0(beta), tab = new Float32Array(up * 2 * T);
  for (var ph = 0; ph < up; ph++) {
    var fr = ph / up, sum = 0;
    for (var k = -T + 1; k <= T; k++) { var t = k - fr, sc = Math.abs(t * fc) < 1e-12 ? fc : Math.sin(Math.PI * fc * t) / (Math.PI * t), r = t / T, wv = Math.abs(r) < 1 ? i0(beta * Math.sqrt(1 - r * r)) / i0b : 0, v = sc * wv; tab[ph * 2 * T + k + T - 1] = v; sum += v; }
    for (var q = 0; q < 2 * T; q++) tab[ph * 2 * T + q] /= sum;
  }
  var nIn = x.length, nOut = Math.floor(nIn * up / down), out = new Float32Array(nOut);
  for (var m = 0; m < nOut; m++) {
    var pos = m * down, n0 = Math.floor(pos / up), phs = pos - n0 * up, base = phs * 2 * T, s = 0, k0 = Math.max(-T + 1, -n0), k1 = Math.min(T, nIn - 1 - n0);
    for (var kk = k0; kk <= k1; kk++) s += x[n0 + kk] * tab[base + kk + T - 1];
    out[m] = s;
    if (prog && (m & 0x7FFFF) === 0) prog(m / nOut);
  }
  return out;
}


/* ---------- Exportación ---------- */
function makeInt(x, bits, dither) {
  var n = x.length, scale = bits === 16 ? 32767 : 8388607, lim = bits === 16 ? 32768 : 8388608, out = bits === 16 ? new Int16Array(n) : new Int32Array(n), seed = 12345;
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  for (var i = 0; i < n; i++) { var v = x[i] * scale; if (dither) v += rnd() - rnd(); v = Math.round(v); out[i] = v > scale ? scale : (v < -lim ? -lim : v); }
  return out;
}
function encodeWav(iL, iR, sr, bits) {
  var n = iL.length, bps = bits / 8, dataLen = n * 2 * bps, buf = new ArrayBuffer(44 + dataLen), dv = new DataView(buf);
  function str(o, s) { for (var i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); }
  str(0, 'RIFF'); dv.setUint32(4, 36 + dataLen, true); str(8, 'WAVE'); str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2 * bps, true); dv.setUint16(32, 2 * bps, true); dv.setUint16(34, bits, true); str(36, 'data'); dv.setUint32(40, dataLen, true);
  var o = 44;
  for (var i = 0; i < n; i++) {
    if (bits === 16) { dv.setInt16(o, iL[i], true); dv.setInt16(o + 2, iR[i], true); o += 4; }
    else { var a = iL[i], b = iR[i]; dv.setUint8(o, a & 255); dv.setUint8(o + 1, (a >> 8) & 255); dv.setUint8(o + 2, (a >> 16) & 255); dv.setUint8(o + 3, b & 255); dv.setUint8(o + 4, (b >> 8) & 255); dv.setUint8(o + 5, (b >> 16) & 255); o += 6; }
  }
  return buf;
}
function encodeMp3(iL, iR, sr, kbps, prog) {
  var enc = new lamejs.Mp3Encoder(2, sr, kbps), parts = [], total = 0, n = iL.length, blk = 1152 * 8;
  for (var i = 0; i < n; i += blk) {
    var a = enc.encodeBuffer(iL.subarray(i, i + blk), iR.subarray(i, i + blk));
    if (a.length) { parts.push(new Uint8Array(a)); total += a.length; }
    if (prog && ((i / blk) & 63) === 0) prog(i / n);
  }
  var f = enc.flush(); if (f.length) { parts.push(new Uint8Array(f)); total += f.length; }
  var out = new Uint8Array(total), o = 0; parts.forEach(function (p) { out.set(p, o); o += p.length; }); return out.buffer;
}
function doExport(opt) {
  var fin = W.final; if (!fin) throw new Error('No hay audio procesado.');
  var sr0 = W.sr, sr = opt.sr || sr0, L = fin.L, R = fin.R;
  if (sr !== sr0) { progress('Remuestreando a ' + sr + ' Hz', 0.05); L = resample(L, sr0, sr, sub(0.05, 0.2, 'Remuestreando')); R = resample(R, sr0, sr, sub(0.25, 0.2, 'Remuestreando')); }
  else { L = copyArr(L); R = copyArr(R); }
  var trim = Math.pow(10, (opt.trimDb || 0) / 20); if (trim !== 1) { for (var i = 0; i < L.length; i++) { L[i] *= trim; R[i] *= trim; } }
  var ceilDb = opt.ceil, tp0 = measureTP(L, R, sr, ceilDb).tp, extra = 0;
  if (tp0 > ceilDb + 0.005) { extra = tp0 - ceilDb; var gx = Math.pow(10, -extra / 20); for (var j = 0; j < L.length; j++) { L[j] *= gx; R[j] *= gx; } }
  var bits = opt.fmt === 'wav24' ? 24 : 16, dith = !!opt.dither && bits === 16;
  progress('Cuantizando', 0.5); var iL = makeInt(L, bits, dith), iR = makeInt(R, bits, dith), bytes, mime;
  if (opt.fmt === 'mp3') { bytes = encodeMp3(iL, iR, sr, opt.kbps || 320, sub(0.55, 0.45, 'Codificando MP3')); mime = 'audio/mpeg'; }
  else { bytes = encodeWav(iL, iR, sr, bits); mime = 'audio/wav'; }
  return { bytes: bytes, mime: mime, info: { sr: sr, tpBefore: tp0, extraTrimDb: extra, size: bytes.byteLength } };
}

