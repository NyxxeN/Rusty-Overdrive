/* Rusty Overdrive Corrector · dsp/10-util.js
   Estado del Worker, mensajes de progreso y utilidades numéricas. */
'use strict';
var W = { sr: 48000, orig: null, outA: null, outB: null, keyA: '', keyB: '', tonesKey: '', tones: [], final: null, meterOrig: null };
function post(msg, tr) { self.postMessage(msg, tr || []); }
function progress(label, frac) { post({ type: 'progress', label: label, frac: clamp(frac, 0, 1) }); }
function sub(base, span, label) { return function (f) { progress(label, base + span * f); }; }
function copyArr(a) { return new Float32Array(a); }

/* ---------- utilidades numéricas ---------- */
function rollPct(a, size, pct) {
  var n = a.length, h = size >> 1, out = new Float32Array(n), w = new Float64Array(size), idx = Math.floor(pct / 100 * (size - 1));
  for (var i = 0; i < n; i++) {
    for (var k = 0; k < size; k++) { var j = i - h + k; j = j < 0 ? 0 : (j >= n ? n - 1 : j); w[k] = a[j]; }
    w.sort(); out[i] = w[idx];
  }
  return out;
}
function boxcar(a, size) {
  var n = a.length, out = new Float32Array(n), h = size >> 1;
  for (var i = 0; i < n; i++) { var s = 0, c = 0; for (var k = -h; k <= h; k++) { var j = i + k; if (j < 0) j = 0; else if (j >= n) j = n - 1; s += a[j]; c++; } out[i] = s / c; }
  return out;
}
function percentileOf(arr, mask, pct) {
  var v = []; for (var i = 0; i < arr.length; i++) if (!mask || mask[i]) v.push(arr[i]);
  if (!v.length) return 0; v.sort(function (a, b) { return a - b; }); return v[Math.floor(pct / 100 * (v.length - 1))];
}
function interp1(x, xs, ys) { if (x <= xs[0]) return ys[0]; for (var i = 1; i < xs.length; i++) if (x <= xs[i]) { var t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]); return ys[i - 1] + t * (ys[i] - ys[i - 1]); } return ys[ys.length - 1]; }
function applyBiquad(x, c) {
  var b0 = c.b0, b1 = c.b1, b2 = c.b2, a1 = c.a1, a2 = c.a2, z1 = 0, z2 = 0;
  for (var i = 0, n = x.length; i < n; i++) { var v = x[i], y = b0 * v + z1; z1 = b1 * v - a1 * y + z2; z2 = b2 * v - a2 * y; x[i] = y; }
}

