/* ---------- Tonos persistentes (peine) ---------- */
function detectTones(L, R, sr, thr, fLo, fHi) {
  var N = 65536, H = 32768, w = hannPeriodic(N), n = L.length, M = N / 2 + 1, acc = new Float64Array(M);
  var re = new Float64Array(N), im = new Float64Array(N), starts = [];
  for (var s = 0; s + N <= n; s += H) starts.push(s);
  for (var q = 0; q < starts.length; q += 2) {
    var s1 = starts[q], s2 = q + 1 < starts.length ? starts[q + 1] : -1;
    for (var i = 0; i < N; i++) { re[i] = 0.5 * (L[s1 + i] + R[s1 + i]) * w[i]; im[i] = s2 >= 0 ? 0.5 * (L[s2 + i] + R[s2 + i]) * w[i] : 0; }
    fft(re, im, false);
    for (var k = 0; k < M; k++) {
      var kr = (N - k) & (N - 1), ar = re[k], ai = im[k], br = re[kr], bi = im[kr];
      var p1 = ((ar + br) * (ar + br) + (ai - bi) * (ai - bi)) * 0.25, p2 = ((ar - br) * (ar - br) + (ai + bi) * (ai + bi)) * 0.25;
      acc[k] += p1; if (s2 >= 0) acc[k] += p2;
    }
  }
  var frames = starts.length; if (!frames) return [];
  var d = new Float32Array(M); for (var k2 = 0; k2 < M; k2++) d[k2] = 10 * Math.log10(acc[k2] / frames + 1e-20);
  var base = new Float32Array(M), stride = 8, half = 200, tmp = new Float64Array(401), xs = [], ys = [];
  for (var kk = 0; kk < M + stride; kk += stride) { var kc = Math.min(kk, M - 1); for (var j = 0; j < 401; j++) tmp[j] = d[clamp(kc - half + j, 0, M - 1)]; tmp.sort(); xs.push(kc); ys.push(tmp[200]); }
  for (var k3 = 0, si = 0; k3 < M; k3++) { while (si < xs.length - 2 && xs[si + 1] < k3) si++; var x0 = xs[si], x1 = xs[si + 1]; var t = x1 > x0 ? (k3 - x0) / (x1 - x0) : 0; base[k3] = ys[si] + t * (ys[si + 1] - ys[si]); }
  var binHz = sr / N, kLo = Math.max(2, Math.floor(fLo / binHz)), kHi = Math.min(M - 3, Math.ceil(fHi / binHz)), cand = [];
  for (var k4 = kLo; k4 <= kHi; k4++) { var pr = d[k4] - base[k4]; if (pr >= thr && d[k4] >= d[k4 - 1] && d[k4] > d[k4 + 1]) cand.push({ k: k4, prom: pr }); }
  cand.sort(function (a, b) { return b.prom - a.prom; });
  var acc2 = [];
  for (var c = 0; c < cand.length; c++) { var ok = true; for (var a = 0; a < acc2.length; a++) if (Math.abs(acc2[a].k - cand[c].k) < 8) { ok = false; break; } if (ok) acc2.push(cand[c]); }
  acc2.sort(function (a, b) { return a.k - b.k; });
  return acc2.map(function (p) { return { f: p.k * binHz, prom: p.prom }; });
}
function applyTones(L, R, sr, peaks, maxRed, prog) {
  var n = L.length, N = 32768, H = 16384, w = hannPeriodic(N), gdb = new Float64Array(N);
  peaks.forEach(function (p) {
    var b = Math.round(p.f * N / sr), red = Math.min(p.prom - 1.5, maxRed); if (red <= 0) return;
    for (var kk = -3; kk <= 3; kk++) { var g = red * (0.5 + 0.5 * Math.cos(Math.PI * kk / 4)), i1 = b + kk, i2 = (N - i1) & (N - 1); if (i1 > 0 && i1 < N / 2) { if (g > gdb[i1]) gdb[i1] = g; if (g > gdb[i2]) gdb[i2] = g; } }
  });
  var gl = new Float64Array(N); for (var i = 0; i < N; i++) gl[i] = Math.pow(10, -gdb[i] / 20);
  var oL = new Float32Array(n), oR = new Float32Array(n), re = new Float64Array(N), im = new Float64Array(N), tot = Math.ceil((n + H) / H), j = 0;
  for (var s = -H; s < n; s += H, j++) {
    for (var q = 0; q < N; q++) { var idx = s + q; if (idx >= 0 && idx < n) { re[q] = L[idx] * w[q]; im[q] = R[idx] * w[q]; } else { re[q] = 0; im[q] = 0; } }
    fft(re, im, false);
    for (var k = 0; k < N; k++) { re[k] *= gl[k]; im[k] *= gl[k]; }
    fft(re, im, true);
    for (var q2 = 0; q2 < N; q2++) { var id2 = s + q2; if (id2 >= 0 && id2 < n) { oL[id2] += re[q2]; oR[id2] += im[q2]; } }
    if (prog && (j & 31) === 0) prog(j / tot);
  }
  return [oL, oR];
}

