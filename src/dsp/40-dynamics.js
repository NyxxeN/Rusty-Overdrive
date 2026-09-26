/* Rusty Overdrive Corrector · dsp/40-dynamics.js
   Compresor de bus (pegamento) y limitador true-peak con normalización a LUFS. */
/* ---------- Compresor de bus (glue) ---------- */
function compressor(L, R, sr, C, prog) {
  var n = L.length, oL = new Float32Array(n), oR = new Float32Array(n);
  var thr = C.thr, ratio = C.ratio, knee = C.knee, aA = Math.exp(-1 / (sr * C.att / 1000)), aR = Math.exp(-1 / (sr * C.rel / 1000));
  var mk = Math.pow(10, C.makeup / 20), mix = C.mix / 100, cur = 0, grSum = 0, grCnt = 0, grMax = 0;
  var hp = biquadCoefs('hp', C.hpf, 0, 0.7071, sr), zL1 = 0, zL2 = 0, zR1 = 0, zR2 = 0;
  for (var i = 0; i < n; i++) {
    var xl = L[i], xr = R[i];
    var yl = hp.b0 * xl + zL1; zL1 = hp.b1 * xl - hp.a1 * yl + zL2; zL2 = hp.b2 * xl - hp.a2 * yl;
    var yr = hp.b0 * xr + zR1; zR1 = hp.b1 * xr - hp.a1 * yr + zR2; zR2 = hp.b2 * xr - hp.a2 * yr;
    var lv = Math.max(Math.abs(yl), Math.abs(yr)), ldb = 20 * Math.log10(lv + 1e-9), over = ldb - thr, gr;
    if (2 * over < -knee) gr = 0; else if (2 * Math.abs(over) <= knee) gr = (1 / ratio - 1) * Math.pow(over + knee / 2, 2) / (2 * knee); else gr = (1 / ratio - 1) * over;
    if (gr < cur) cur = aA * cur + (1 - aA) * gr; else cur = aR * cur + (1 - aR) * gr;
    if (cur < -0.3) { grSum -= cur; grCnt++; if (-cur > grMax) grMax = -cur; }
    var g = Math.pow(10, cur / 20) * mk;
    oL[i] = xl * (1 - mix) + xl * g * mix; oR[i] = xr * (1 - mix) + xr * g * mix;
    if (prog && (i & 0xFFFFF) === 0) prog(i / n);
  }
  return { L: oL, R: oR, stats: { meanDb: grCnt ? grSum / grCnt : 0, maxDb: grMax, activePct: 100 * grCnt / n } };
}


/* ---------- Limitador true-peak con lookahead ---------- */
function limiter(L, R, sr, preDb, ceilDb, lookMs, relMs) {
  var n = L.length, g0 = Math.pow(10, preDb / 20), ceil = Math.pow(10, ceilDb / 20);
  var g = tpEnv(L, R, g0, ceil * 0.5, sr);
  for (var i = 0; i < n; i++) g[i] = g[i] > ceil ? ceil / g[i] : 1;
  var Lh = Math.max(1, Math.round(lookMs / 1000 * sr)), W = 2 * Lh + 1;
  var gm = new Float32Array(n), dq = new Int32Array(n + 1), qh = 0, qt = 0; // mínimo deslizante centrado [i-Lh, i+Lh]
  for (var j = 0; j < n + Lh; j++) {
    if (j < n) { while (qt > qh && g[dq[qt - 1]] >= g[j]) qt--; dq[qt++] = j; }
    var c = j - Lh; if (c >= 0) { while (dq[qh] < c - Lh) qh++; gm[c] = g[dq[qh]]; }
  }
  // media móvil centrada sobre gm (borde: se extiende con el último valor)
  var acc = 0, gs = g; // reutilizamos g
  for (var k = -Lh; k <= Lh; k++) acc += gm[clamp(k, 0, n - 1)];
  for (var i2 = 0; i2 < n; i2++) { gs[i2] = acc / W; acc += gm[Math.min(n - 1, i2 + Lh + 1)] - gm[Math.max(0, i2 - Lh)]; }
  var kRel = 1 - Math.exp(-1 / (relMs / 1000 * sr)), prev = 1, oL = new Float32Array(n), oR = new Float32Array(n), minG = 1;
  for (var i3 = 0; i3 < n; i3++) {
    var r = prev + (1 - prev) * kRel, gr = gs[i3] < r ? gs[i3] : r; prev = gr; if (gr < minG) minG = gr;
    var gg = gr * g0; oL[i3] = L[i3] * gg; oR[i3] = R[i3] * gg;
  }
  return { L: oL, R: oR, maxRedDb: -20 * Math.log10(minG) };
}
function normalizeAndLimit(L, R, sr, O, prog) {
  if (O.mode === 'manual') { var r0 = limiter(L, R, sr, O.gain, O.ceil, O.look, O.rel); return { L: r0.L, R: r0.R, gainDb: O.gain, red: r0.maxRedDb }; }
  if (O.mode === 'limit') { var r1 = limiter(L, R, sr, 0, O.ceil, O.look, O.rel); return { L: r1.L, R: r1.R, gainDb: 0, red: r1.maxRedDb }; }
  var m0 = measureLoudness(L, R, sr), gain = O.target - m0.I, best = null, hist = [];
  for (var it = 0; it < 8; it++) {
    gain = clamp(gain, -30, 30);
    var r = limiter(L, R, sr, gain, O.ceil, O.look, O.rel), m = measureLoudness(r.L, r.R, sr), err = O.target - m.I;
    best = { L: r.L, R: r.R, gainDb: gain, red: r.maxRedDb, I: m.I, iter: it + 1, reached: Math.abs(err) < 0.1 };
    hist.push([gain, m.I]);
    if (prog) prog((it + 1) / 8);
    if (Math.abs(err) < 0.05 || gain >= 30) break;
    var slope = 1; if (hist.length >= 2) { var a = hist[hist.length - 2], b = hist[hist.length - 1]; if (Math.abs(b[0] - a[0]) > 1e-3) slope = clamp((b[1] - a[1]) / (b[0] - a[0]), 0.15, 1); }
    gain += err / slope;
  }
  return best;
}

