/* Rusty Overdrive Corrector · dsp/00-common.js
   Utilidades compartidas (hilo principal y Worker): FFT, biquads RBJ, respuesta del ecualizador. */
'use strict';
var _fftCache = {};
function fftPlan(N) {
  if (_fftCache[N]) return _fftCache[N];
  var rev = new Uint32Array(N), bits = Math.round(Math.log2(N));
  for (var i = 0; i < N; i++) { var r = 0, x = i; for (var b = 0; b < bits; b++) { r = (r << 1) | (x & 1); x >>= 1; } rev[i] = r; }
  var cos = new Float64Array(N / 2), sin = new Float64Array(N / 2);
  for (var k = 0; k < N / 2; k++) { var a = -2 * Math.PI * k / N; cos[k] = Math.cos(a); sin[k] = Math.sin(a); }
  return (_fftCache[N] = { rev: rev, cos: cos, sin: sin });
}
/* FFT compleja in-place (radix-2). inv=true: inversa normalizada. */
function fft(re, im, inv) {
  var N = re.length, p = fftPlan(N), rev = p.rev, cs = p.cos, sn = p.sin;
  for (var i = 0; i < N; i++) { var j = rev[i]; if (j > i) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (var size = 2; size <= N; size <<= 1) {
    var half = size >> 1, step = N / size;
    for (var s = 0; s < N; s += size) {
      for (var j2 = 0, k2 = 0; j2 < half; j2++, k2 += step) {
        var wr = cs[k2], wi = inv ? -sn[k2] : sn[k2];
        var a = s + j2, b = a + half;
        var tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }
  if (inv) { var sc = 1 / N; for (var q = 0; q < N; q++) { re[q] *= sc; im[q] *= sc; } }
}
function hannPeriodic(N) { var w = new Float64Array(N); for (var i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N); return w; }
function dB(x) { return 10 * Math.log10(x + 1e-20); }
function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }

/* ---- Biquads (RBJ). tipos: peak, lowshelf, highshelf, hp, lp, notch ---- */
function biquadCoefs(type, f, gainDb, q, sr) {
  var A = Math.pow(10, gainDb / 40), w0 = 2 * Math.PI * clamp(f, 5, sr * 0.499) / sr;
  var cs = Math.cos(w0), sn = Math.sin(w0), al = sn / (2 * Math.max(q, 0.05)), sA = Math.sqrt(A);
  var b0, b1, b2, a0, a1, a2;
  switch (type) {
    case 'peak': b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; break;
    case 'lowshelf':
      b0 = A * ((A + 1) - (A - 1) * cs + 2 * sA * al); b1 = 2 * A * ((A - 1) - (A + 1) * cs); b2 = A * ((A + 1) - (A - 1) * cs - 2 * sA * al);
      a0 = (A + 1) + (A - 1) * cs + 2 * sA * al; a1 = -2 * ((A - 1) + (A + 1) * cs); a2 = (A + 1) + (A - 1) * cs - 2 * sA * al; break;
    case 'highshelf':
      b0 = A * ((A + 1) + (A - 1) * cs + 2 * sA * al); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - 2 * sA * al);
      a0 = (A + 1) - (A - 1) * cs + 2 * sA * al; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - 2 * sA * al; break;
    case 'hp': b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; break;
    case 'lp': b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; break;
    case 'bandpass': b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; break;
    case 'notch': b0 = 1; b1 = -2 * cs; b2 = 1; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; break;
    default: return { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}
function biquadMagDb(c, f, sr) {
  var w = 2 * Math.PI * f / sr, cw = Math.cos(w), sw = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
  var nr = c.b0 + c.b1 * cw + c.b2 * c2, ni = -(c.b1 * sw + c.b2 * s2);
  var dr = 1 + c.a1 * cw + c.a2 * c2, di = -(c.a1 * sw + c.a2 * s2);
  return 10 * Math.log10((nr * nr + ni * ni + 1e-30) / (dr * dr + di * di + 1e-30));
}
/* Lista de biquads para una banda del ecualizador (hp/lp con pendiente 12 o 24 dB/oct). */
function eqBandBiquads(band, sr) {
  if (!band || !band.on || band.type === 'off') return [];
  var t = band.type;
  if (t === 'hp' || t === 'lp') {
    var c = biquadCoefs(t, band.f, 0, 0.7071, sr);
    return band.slope === 24 ? [c, c] : [c];
  }
  if (Math.abs(band.g) < 0.01 && t !== 'notch') return [];
  /* los shelves usan Q fijo (Butterworth) para que coincida exactamente con el BiquadFilterNode del navegador */
  var q = (t === 'lowshelf' || t === 'highshelf') ? 0.7071 : band.q;
  return [biquadCoefs(t, band.f, band.g, q, sr)];
}
function eqResponseDb(bands, f, sr) {
  var s = 0;
  for (var i = 0; i < bands.length; i++) { var bq = eqBandBiquads(bands[i], sr); for (var j = 0; j < bq.length; j++) s += biquadMagDb(bq[j], f, sr); }
  return s;
}
