/* ---------- Motor espectral: ruido + de-esser dinámico + colas agudas ---------- */
function spectral(L, R, sr, P, prog) {
  var N = 2048, H = 512, K = N / 2 + 1, n = L.length, w = hannPeriodic(N), binHz = sr / N;
  var nFr = Math.ceil((n + N - H) / H), normP = 1 / Math.pow(N / 2, 2);
  var useNR = P.nr.on, useD = P.dess.on, useT = P.tail.on;
  var eD = new Float32Array(nFr), eT = new Float32Array(nFr), tot = new Float32Array(nFr);
  var HB = 100, hMin = -180, hStep = 2, hist = useNR ? new Uint32Array(K * HB) : null;
  var re = new Float64Array(N), im = new Float64Array(N), pw = new Float64Array(K), csum = new Float64Array(K + 1);
  var kD1 = Math.floor(P.dess.f1 / binHz), kD2 = Math.ceil(P.dess.f2 / binHz), kT1 = Math.floor(P.tail.f / binHz), kT2 = Math.min(K - 1, Math.floor(18000 / binHz));
  function load(j) {
    var s = -(N - H) + j * H;
    for (var i = 0; i < N; i++) { var idx = s + i; if (idx >= 0 && idx < n) { re[i] = L[idx] * w[i]; im[i] = R[idx] * w[i]; } else { re[i] = 0; im[i] = 0; } }
    fft(re, im, false);
    for (var k = 0; k < K; k++) { var kr = (N - k) & (N - 1); pw[k] = 0.25 * (re[k] * re[k] + im[k] * im[k] + re[kr] * re[kr] + im[kr] * im[kr]) * normP; }
  }
  /* pasada 1: rasgos por trama */
  var maxTot = -1e9;
  for (var j = 0; j < nFr; j++) {
    load(j);
    var t = 0, d = 0, tt = 0; for (var k = 0; k < K; k++) { t += pw[k]; }
    for (var k1 = kD1; k1 <= kD2 && k1 < K; k1++) d += pw[k1];
    for (var k2 = kT1; k2 <= kT2; k2++) tt += pw[k2];
    tot[j] = 10 * Math.log10(t + 1e-20); eD[j] = 10 * Math.log10(d + 1e-20); eT[j] = 10 * Math.log10(tt + 1e-20);
    if (tot[j] > maxTot) maxTot = tot[j];
    if (useNR && tot[j] > -90) { // (se re-filtra después con el umbral relativo)
      csum[0] = 0; for (var k3 = 0; k3 < K; k3++) csum[k3 + 1] = csum[k3] + pw[k3];
      for (var k4 = 0; k4 < K; k4++) { var a = Math.max(0, k4 - 8), b = Math.min(K, k4 + 8); var m = (csum[b] - csum[a]) / (b - a); var lv = 10 * Math.log10(m + 1e-20); var bi = Math.floor((lv - hMin) / hStep); bi = bi < 0 ? 0 : (bi >= HB ? HB - 1 : bi); hist[k4 * HB + bi]++; }
    }
    if ((j & 255) === 0) prog(0.35 * j / nFr);
  }
  var okM = new Uint8Array(nFr); for (var j2 = 0; j2 < nFr; j2++) okM[j2] = tot[j2] > maxTot - 75 ? 1 : 0;
  /* ruido estacionario por bin (percentil 10 del piso suavizado) */
  var noise = new Float64Array(K);
  if (useNR) {
    for (var kb = 0; kb < K; kb++) { var total = 0; for (var q = 0; q < HB; q++) total += hist[kb * HB + q]; var target = 0.10 * total, cum = 0, lvl = hMin; for (var q2 = 0; q2 < HB; q2++) { cum += hist[kb * HB + q2]; if (cum >= target) { lvl = hMin + hStep * (q2 + 0.5); break; } } noise[kb] = Math.pow(10, lvl / 10) * 1.6; }
    var sm = new Float64Array(K); for (var ks = 0; ks < K; ks++) { var s0 = 0, c0 = 0; for (var d2 = -4; d2 <= 4; d2++) { var kk = clamp(ks + d2, 0, K - 1); s0 += noise[kk]; c0++; } sm[ks] = s0 / c0; } noise = sm;
  }
  /* de-esser: reducción por trama (dB) */
  var redD = new Float32Array(nFr);
  if (useD) {
    var es = boxcar(eD, 3), med = rollPct(es, 140, 50);
    for (var jd = 0; jd < nFr; jd++) { var over = Math.max(es[jd] - (med[jd] + P.dess.over), 0); redD[jd] = Math.min(over * (1 - 1 / P.dess.ratio), P.dess.maxRed); }
    redD = boxcar(redD, 5);
  }
  /* colas agudas: expansor entre golpes */
  var redT = new Float32Array(nFr);
  if (useT) {
    var la = new Float32Array(nFr); for (var jt = 0; jt < nFr; jt++) la[jt] = Math.max(eT[jt], eT[Math.min(jt + 1, nFr - 1)], eT[Math.min(jt + 2, nFr - 1)]);
    var F = rollPct(la, 57, 10), Fclean = percentileOf(F, okM, 10), fall = P.tail.maxRed / 4, prev = 0;
    for (var jt2 = 0; jt2 < nFr; jt2++) {
      var excess = clamp((F[jt2] - Fclean) / 8, 0, 1), r = la[jt2] - F[jt2], s2 = clamp((r - 3) / 9, 0, 1), op = s2 * s2 * (3 - 2 * s2);
      var g = -(P.tail.maxRed * (1 - op) * excess); if (jt2 > 0) g = Math.max(g, prev - fall); prev = g; redT[jt2] = -g;
    }
  }
  /* pesos por bin */
  var wD = new Float64Array(K), wT = new Float64Array(K), wN = new Float64Array(K);
  for (var kw = 0; kw < K; kw++) {
    var f = kw * binHz; wD[kw] = (kw >= kD1 && kw <= kD2) ? 1 : 0;
    wT[kw] = interp1(f, [P.tail.f - 1000, P.tail.f + 1000], [0, 1]);
    wN[kw] = interp1(f, [P.nr.lo - 1000, P.nr.lo, P.nr.hi, P.nr.hi + 4000], [0, 1, 1, 0]);
  }
  var wD2 = new Float64Array(K), hw = [0.0245, 0.0955, 0.2061, 0.3455, 0.4, 0.3455, 0.2061, 0.0955, 0.0245], hs = 0; hw.forEach(function (v) { hs += v; });
  for (var kx = 0; kx < K; kx++) { var sx = 0; for (var q3 = 0; q3 < 9; q3++) sx += wD[clamp(kx + q3 - 4, 0, K - 1)] * hw[q3] / hs; wD2[kx] = sx; }
  /* pasada 2: aplicar */
  var oL = new Float32Array(n), oR = new Float32Array(n), Gst = new Float64Array(K).fill(1), Gnow = new Float64Array(K), Gs = new Float64Array(K), psm = new Float64Array(K);
  var gmin2 = Math.pow(10, -P.nr.maxRed / 10), aRel = Math.exp(-H / sr / (P.nr.rel / 1000)), over = P.nr.over;
  for (var jf = 0; jf < nFr; jf++) {
    load(jf);
    if (useNR) {
      csum[0] = 0; for (var kc = 0; kc < K; kc++) csum[kc + 1] = csum[kc] + pw[kc];
      for (var kn = 0; kn < K; kn++) { var a0 = Math.max(0, kn - 4), b0 = Math.min(K, kn + 5); psm[kn] = (csum[b0] - csum[a0]) / (b0 - a0); Gnow[kn] = Math.sqrt(clamp(1 - over * noise[kn] / (psm[kn] + 1e-20), gmin2, 1)); var hold = aRel * Gst[kn] + (1 - aRel) * Gnow[kn]; Gst[kn] = Math.min(1, Math.max(Gnow[kn], hold)); }
      for (var kq = 0; kq < K; kq++) { var s5 = 0, c5 = 0; for (var d5 = -2; d5 <= 2; d5++) { s5 += Gst[clamp(kq + d5, 0, K - 1)]; c5++; } Gs[kq] = 1 - wN[kq] * (1 - s5 / c5); }
    }
    var rd = redD[jf], rt = redT[jf];
    for (var kg = 0; kg < K; kg++) {
      var gl = useNR ? Gs[kg] : 1;
      var rdb = rd * wD2[kg] + rt * wT[kg]; if (rdb > 0) gl *= Math.pow(10, -rdb / 20);
      re[kg] *= gl; im[kg] *= gl;
      if (kg > 0 && kg < N / 2) { var km = N - kg; re[km] *= gl; im[km] *= gl; }
    }
    fft(re, im, true);
    var s = -(N - H) + jf * H;
    for (var i = 0; i < N; i++) { var idx = s + i; if (idx >= 0 && idx < n) { var ww = w[i] / 1.5; oL[idx] += re[i] * ww; oR[idx] += im[i] * ww; } }
    if ((jf & 255) === 0) prog(0.35 + 0.65 * jf / nFr);
  }
  return { L: oL, R: oR, stats: { noiseDbMean: dB(noise.reduce(function (a, b) { return a + b; }, 0) / K), redD: meanPos(redD), redT: meanPos(redT) } };
}
function meanPos(a) { var s = 0, c = 0; for (var i = 0; i < a.length; i++) if (a[i] > 0.5) { s += a[i]; c++; } return c ? s / c : 0; }

