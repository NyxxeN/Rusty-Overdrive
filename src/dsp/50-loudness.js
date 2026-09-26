/* ---------- Medición: LUFS (BS.1770-4) y true peak ---------- */
function kFilterCoefs(sr) {
  var f0 = 1681.974450955533, G = 3.999843853973347, Q1 = 0.7071752369554196, K1 = Math.tan(Math.PI * f0 / sr), Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416), A0 = 1 + K1 / Q1 + K1 * K1;
  var s1 = { b0: (Vh + Vb * K1 / Q1 + K1 * K1) / A0, b1: 2 * (K1 * K1 - Vh) / A0, b2: (Vh - Vb * K1 / Q1 + K1 * K1) / A0, a1: 2 * (K1 * K1 - 1) / A0, a2: (1 - K1 / Q1 + K1 * K1) / A0 };
  var fc = 38.13547087602444, Q = 0.5003270373238773, K = Math.tan(Math.PI * fc / sr), a0 = 1 + K / Q + K * K;
  var s2 = { b0: 1 / a0, b1: -2 / a0, b2: 1 / a0, a1: 2 * (K * K - 1) / a0, a2: (1 - K / Q + K * K) / a0 };
  return [s1, s2];
}
function subEnergies(L, R, sr) {
  var sub = Math.round(sr * 0.1), nsb = Math.floor(L.length / sub), out = new Float64Array(nsb), f = kFilterCoefs(sr);
  var st = [[0, 0, 0, 0], [0, 0, 0, 0]], chs = [L, R];
  for (var c = 0; c < 2; c++) {
    var x = chs[c], s1 = f[0], s2 = f[1], z11 = 0, z12 = 0, z21 = 0, z22 = 0;
    for (var b = 0; b < nsb; b++) {
      var acc = 0, e = (b + 1) * sub;
      for (var i = b * sub; i < e; i++) {
        var v = x[i], y1 = s1.b0 * v + z11; z11 = s1.b1 * v - s1.a1 * y1 + z12; z12 = s1.b2 * v - s1.a2 * y1;
        var y2 = s2.b0 * y1 + z21; z21 = s2.b1 * y1 - s2.a1 * y2 + z22; z22 = s2.b2 * y1 - s2.a2 * y2; acc += y2 * y2;
      }
      out[b] += acc;
    }
  }
  return { e: out, sub: sub };
}
function lufsFromZ(z) { return -0.691 + 10 * Math.log10(z + 1e-20); }
function measureLoudness(L, R, sr) {
  var se = subEnergies(L, R, sr), e = se.e, sub = se.sub, nsb = e.length, nb = nsb - 3;
  if (nb < 1) return { I: -70, LRA: 0, M: -70, S: -70, st: [], shortMax: -70 };
  var z = new Float64Array(nb), M = -1e9; for (var j = 0; j < nb; j++) { z[j] = (e[j] + e[j + 1] + e[j + 2] + e[j + 3]) / (4 * sub); var l = lufsFromZ(z[j]); if (l > M) M = l; }
  var sA = 0, cA = 0; for (var j2 = 0; j2 < nb; j2++) if (lufsFromZ(z[j2]) > -70) { sA += z[j2]; cA++; }
  var I = -70; if (cA) { var rel = lufsFromZ(sA / cA) - 10, sG = 0, cG = 0; for (var j3 = 0; j3 < nb; j3++) if (lufsFromZ(z[j3]) > Math.max(-70, rel)) { sG += z[j3]; cG++; } if (cG) I = lufsFromZ(sG / cG); }
  var ns = nsb - 29, st = [], sMax = -1e9; for (var j4 = 0; j4 < ns; j4++) { var ss = 0; for (var q = 0; q < 30; q++) ss += e[j4 + q]; var v = lufsFromZ(ss / (30 * sub)); st.push(v); if (v > sMax) sMax = v; }
  var LRA = 0, stG = [], sum = 0, cnt = 0; st.forEach(function (v) { if (v > -70) { sum += Math.pow(10, v / 10); cnt++; } });
  if (cnt) { var relS = 10 * Math.log10(sum / cnt) - 20; st.forEach(function (v) { if (v > -70 && v > relS) stG.push(v); }); stG.sort(function (a, b) { return a - b; }); if (stG.length > 1) LRA = stG[Math.floor(0.95 * (stG.length - 1))] - stG[Math.floor(0.10 * (stG.length - 1))]; }
  var series = []; for (var j5 = 0; j5 < st.length; j5 += 10) series.push(st[j5]);
  return { I: I, LRA: LRA, M: M, S: sMax === -1e9 ? -70 : sMax, series: series };
}
var _tpK = {};
function tpKernel(sr) {
  var F = sr >= 96000 ? 2 : 4; if (_tpK[F]) return _tpK[F];
  var T = 12, beta = 8, h = [];
  function i0(x) { var s = 1, t = 1; for (var k = 1; k < 30; k++) { t *= (x / (2 * k)) * (x / (2 * k)); s += t; } return s; }
  for (var p = 1; p < F; p++) {
    var ker = new Float64Array(2 * T), sum = 0;
    for (var k = -T + 1; k <= T; k++) { var t = k - p / F, sc = Math.abs(t) < 1e-12 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t), r = t / T, win = Math.abs(r) < 1 ? i0(beta * Math.sqrt(1 - r * r)) / i0(beta) : 0; ker[k + T - 1] = sc * win; sum += ker[k + T - 1]; }
    for (var q = 0; q < 2 * T; q++) ker[q] /= sum; h.push(ker);
  }
  return (_tpK[F] = { F: F, T: T, h: h });
}
/* envolvente de true peak por muestra (máximo entre la muestra n y las interpoladas hasta n+1), escalada por 'scale' */
function tpEnv(L, R, scale, thrLin, sr) {
  var n = L.length, out = new Float32Array(n), ker = tpKernel(sr), F = ker.F, T = ker.T, H = ker.h, chs = [L, R];
  for (var i = 0; i < n; i++) {
    var a = Math.max(Math.abs(L[i]), Math.abs(R[i])) * scale, b = i + 1 < n ? Math.max(Math.abs(L[i + 1]), Math.abs(R[i + 1])) * scale : 0, m = a;
    if (Math.max(a, b) > thrLin) {
      for (var p = 0; p < F - 1; p++) {
        var h = H[p];
        for (var c = 0; c < 2; c++) {
          var x = chs[c], s = 0, k0 = Math.max(-T + 1, -i), k1 = Math.min(T, n - 1 - i);
          for (var k = k0; k <= k1; k++) s += x[i + k] * h[k + T - 1];
          s = Math.abs(s) * scale; if (s > m) m = s;
        }
      }
    }
    out[i] = m;
  }
  return out;
}
function measureTP(L, R, sr, ceilDb) {
  var n = L.length, sp = 0; for (var i = 0; i < n; i++) { var v = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (v > sp) sp = v; }
  if (sp === 0) return { tp: -120, sample: -120, overs: [] };
  var env = tpEnv(L, R, 1, sp * 0.5, sr), mx = 0; for (var j = 0; j < n; j++) if (env[j] > mx) mx = env[j];
  var overs = [], ceil = Math.pow(10, (ceilDb + 0.05) / 20), last = -1e9;   // tolerancia de 0,05 dB: el limitador deja los picos justo en el techo
  for (var k = 0; k < n; k++) if (env[k] > ceil) { if (k - last > sr * 0.05) overs.push(k / sr); last = k; if (overs.length > 400) break; }
  return { tp: 20 * Math.log10(mx), sample: 20 * Math.log10(sp), overs: overs };
}
function fullMeter(L, R, sr, ceilDb) {
  var m = measureLoudness(L, R, sr), t = measureTP(L, R, sr, ceilDb);
  m.tp = t.tp; m.samplePeak = t.sample; m.overs = t.overs; m.PLR = t.tp - m.I; return m;
}


/* ---------- Espectro promedio (LTAS) en bandas de 1/3 de octava ---------- */
/* Devuelve la ENERGÍA por banda (no densidad) en dB relativos; sirve para comparar contra una curva de referencia. */
var LTAS_FC = [25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000];
function ltas(L, R, sr) {
  var N = 8192, H = 4096, K = N / 2 + 1, w = hannPeriodic(N), n = L.length, acc = new Float64Array(K), starts = [], re = new Float64Array(N), im = new Float64Array(N);
  for (var s = 0; s + N <= n; s += H) {
    var e = 0; for (var i = 0; i < N; i += 16) { var v = L[s + i] + R[s + i]; e += v * v; }
    if (e / (N / 16) > 1e-9) starts.push(s);            // descarta silencio digital
  }
  if (!starts.length) return { fc: LTAS_FC, db: LTAS_FC.map(function () { return -120; }) };
  for (var q = 0; q < starts.length; q += 2) {
    var s1 = starts[q], s2 = q + 1 < starts.length ? starts[q + 1] : -1;
    for (var j = 0; j < N; j++) { re[j] = 0.5 * (L[s1 + j] + R[s1 + j]) * w[j]; im[j] = s2 >= 0 ? 0.5 * (L[s2 + j] + R[s2 + j]) * w[j] : 0; }
    fft(re, im, false);
    for (var k = 0; k < K; k++) {
      var kr = (N - k) & (N - 1), ar = re[k], ai = im[k], br = re[kr], bi = im[kr];
      acc[k] += ((ar + br) * (ar + br) + (ai - bi) * (ai - bi)) * 0.25; if (s2 >= 0) acc[k] += ((ar - br) * (ar - br) + (ai + bi) * (ai + bi)) * 0.25;
    }
  }
  var binHz = sr / N, fcs = [], db = [], norm = starts.length * (N / 2) * (N / 2);
  for (var b = 0; b < LTAS_FC.length; b++) {
    var fc = LTAS_FC[b]; if (fc > sr / 2 * 0.98) break;
    var lo = fc / Math.pow(2, 1 / 6), hi = fc * Math.pow(2, 1 / 6), sum = 0, cnt = 0;
    for (var kk = Math.max(1, Math.ceil(lo / binHz)); kk * binHz < hi && kk < K; kk++) { sum += acc[kk]; cnt++; }
    if (!cnt) { var kn = Math.max(1, Math.round(fc / binHz)); sum = acc[kn] * (hi - lo) / binHz; }
    fcs.push(fc); db.push(10 * Math.log10(sum / norm + 1e-20));
  }
  return { fc: fcs, db: db };
}
