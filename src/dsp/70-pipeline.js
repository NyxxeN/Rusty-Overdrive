/* Rusty Overdrive Corrector · dsp/70-pipeline.js
   Orquestación por etapas con caché:
     A) tonos → EQ de corrección → Neon Scalpel     (clave keyA)
     B) ruido + de-esser dinámico + colas agudas      (clave keyB)
     C) EQ de master → compresor → nivel y limitador  (se recalcula siempre; es rápido) */
/* ---------- Envolvente aguda (para el gráfico "piso agudo") ---------- */
function hfEnvelope(L, R, sr, fLow) {
  var n = L.length, m = new Float32Array(n); for (var i = 0; i < n; i++) m[i] = 0.5 * (L[i] + R[i]);
  var c = biquadCoefs('hp', fLow, 0, 0.7071, sr); applyBiquad(m, c); applyBiquad(m, c);
  var blk = Math.round(sr * 0.01), nb = Math.floor(n / blk), e = new Float32Array(nb);
  for (var b = 0; b < nb; b++) { var s = 0; for (var j = b * blk; j < (b + 1) * blk; j++) s += m[j] * m[j]; e[b] = 10 * Math.log10(s / blk + 1e-14); }
  var fl = rollPct(e, 57, 10), pts = 2400, step = Math.max(1, Math.floor(nb / pts)), env = [], flr = [];
  for (var k = 0; k < nb; k += step) { var mx = -200, md = 0; for (var q = k; q < Math.min(nb, k + step); q++) { if (e[q] > mx) mx = e[q]; } env.push(mx); flr.push(fl[Math.min(nb - 1, k + (step >> 1))]); }
  return { env: env, floor: flr, dt: step * 0.01 };
}


/* ---------- Pipeline ---------- */
function applyEqBands(L, R, eq, sr) {
  eq.bands.forEach(function (b) { eqBandBiquads(b, sr).forEach(function (c) { applyBiquad(L, c); applyBiquad(R, c); }); });
}
function runPipeline(P) {
  var sr = W.sr, orig = W.orig;
  var keyA = JSON.stringify([P.tones, P.eq, P.nova]), keyB = keyA + JSON.stringify([P.nr, P.dess, P.tail]);
  var t0 = Date.now(), timing = {}, info = {};
  if (keyA !== W.keyA) {
    var aOn = P.tones.on || P.eq.on || (P.nova && P.nova.on), L, R;
    if (!aOn) { W.outA = { L: orig.L, R: orig.R, alias: true }; W.tones = []; W.novaStats = []; }
    else {
      L = copyArr(orig.L); R = copyArr(orig.R); W.novaStats = [];
      if (P.tones.on) {
        var tk = JSON.stringify([P.tones.thr, P.tones.fLo, P.tones.fHi]);
        if (tk !== W.tonesKey) { progress('Detectando tonos persistentes', 0.02); W.tones = detectTones(orig.L, orig.R, sr, P.tones.thr, P.tones.fLo, P.tones.fHi); W.tonesKey = tk; }
        var o = applyTones(L, R, sr, W.tones, P.tones.maxRed, sub(0.05, 0.15, 'Suprimiendo tonos')); L = o[0]; R = o[1];
      }
      if (P.eq.on) { progress('Ecualizando', 0.22); applyEqBands(L, R, P.eq, sr); }
      if (P.nova && P.nova.on) { W.novaStats = novaProcess(L, R, sr, P.nova, sub(0.25, 0.1, 'Neon Scalpel')); }
      W.outA = { L: L, R: R };
    }
    W.keyA = keyA; W.keyB = ''; timing.A = Date.now() - t0;
  }
  if (keyB !== W.keyB) {
    var bOn = P.nr.on || P.dess.on || P.tail.on, t1 = Date.now();
    if (!bOn) { W.outB = { L: W.outA.L, R: W.outA.R, alias: true }; }
    else { var sp = spectral(W.outA.L, W.outA.R, sr, P, sub(0.35, 0.4, 'Motor espectral')); W.outB = { L: sp.L, R: sp.R }; info.spectral = sp.stats; }
    W.keyB = keyB; timing.B = Date.now() - t1; progress('Espectro promedio', 0.76); W.ltasPre = ltas(W.outB.L, W.outB.R, sr);
  }
  var t2 = Date.now(), L2 = W.outB.L, R2 = W.outB.R;
  if (P.meq && P.meq.on) { progress('EQ de master', 0.78); L2 = copyArr(L2); R2 = copyArr(R2); applyEqBands(L2, R2, P.meq, sr); }
  if (P.comp.on) { var cc = compressor(L2, R2, sr, P.comp, sub(0.8, 0.06, 'Compresor')); L2 = cc.L; R2 = cc.R; info.comp = cc.stats; }
  var lim = { L: L2, R: R2, gainDb: 0, red: 0 };
  if (P.out.on) { progress('Nivel y limitador', 0.86); lim = normalizeAndLimit(L2, R2, sr, P.out, sub(0.86, 0.08, 'Nivel y limitador')); }
  W.final = { L: lim.L, R: lim.R };
  timing.C = Date.now() - t2;
  progress('Midiendo', 0.95);
  var meter = fullMeter(lim.L, lim.R, sr, P.out.ceil), hf = hfEnvelope(lim.L, lim.R, sr, 6500), lf = ltas(lim.L, lim.R, sr);
  return { meter: meter, hf: hf, tones: W.tones, timing: timing, info: info, nova: W.novaStats, ltasPre: W.ltasPre, ltas: lf, out: { gainDb: lim.gainDb, red: lim.red, iter: lim.iter, reached: lim.reached } };
}
