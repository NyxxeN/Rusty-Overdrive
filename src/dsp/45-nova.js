/* Rusty Overdrive Corrector · dsp/45-nova.js (el nivel detectado es una estimación del pico de la banda, ±1 dB)
   Neon Scalpel: EQ dinámico por bandas (inspirado en el concepto de EQ dinámico, como el de TDR Nova; implementación propia, sin afiliación).
   Cada banda tiene un detector (pasa-banda en su frecuencia) y un filtro (campana o shelf) cuya
   ganancia = ganancia estática + ganancia dinámica, calculada a partir del nivel detectado.
     modo 'comp': baja la banda cuando el nivel supera el umbral (de-esser, resonancias que aparecen a veces)
     modo 'exp' : baja la banda cuando el nivel cae bajo el umbral (limpia ruido entre golpes)
     modo 'up'  : sube la banda cuando el nivel supera el umbral (realce dinámico)
   Detección estéreo enlazada sobre la suma (L+R)/2. Los coeficientes se actualizan cada NOVA_BLOCK muestras. */
var NOVA_BLOCK = 16;
function novaGainDb(B, levelDb) {
  var over = levelDb - B.thr, g = 0;
  if (B.mode === 'exp') { var under = B.thr - levelDb; if (under > 0) g = -Math.min(B.maxDyn, under * (B.ratio - 1)); }
  else if (B.mode === 'up') { if (over > 0) g = Math.min(B.maxDyn, over * (1 - 1 / B.ratio)); }
  else { if (over > 0) g = -Math.min(B.maxDyn, over * (1 - 1 / B.ratio)); }
  return g;
}
function novaProcess(L, R, sr, N, prog) {
  var n = L.length, stats = [], bands = N.bands.filter(function (b) { return b.on; });
  bands.forEach(function (B, bi) {
    var bp = biquadCoefs('bandpass', B.f, 0, Math.max(B.q, 0.3), sr), z1 = 0, z2 = 0, env = 0;
    var aA = Math.exp(-1 / (sr * B.att / 1000)), aR = Math.exp(-1 / (sr * B.rel / 1000));
    var isShelf = B.type === 'lowshelf' || B.type === 'highshelf', qEq = isShelf ? 0.7071 : B.q;
    var l1 = 0, l2 = 0, r1 = 0, r2 = 0, sum = 0, cnt = 0, mx = 0, gPrev = 1e9, c = null;
    for (var i = 0; i < n; i += NOVA_BLOCK) {
      var end = Math.min(n, i + NOVA_BLOCK), j;
      for (j = i; j < end; j++) {
        var m = 0.5 * (L[j] + R[j]), y = bp.b0 * m + z1; z1 = bp.b1 * m - bp.a1 * y + z2; z2 = bp.b2 * m - bp.a2 * y;
        var a = y < 0 ? -y : y; env = a > env ? aA * env + (1 - aA) * a : aR * env + (1 - aR) * a;
      }
      var lev = 20 * Math.log10(env * 1.1 + 1e-9), gd = novaGainDb(B, lev);
      if (Math.abs(gd) > 0.3) { sum += Math.abs(gd); cnt++; if (Math.abs(gd) > mx) mx = Math.abs(gd); }
      var gt = B.g + gd;
      if (Math.abs(gt - gPrev) > 0.02) { c = biquadCoefs(B.type, B.f, gt, qEq, sr); gPrev = gt; }
      if (Math.abs(gt) < 0.01 && !c) continue;
      var b0 = c.b0, b1 = c.b1, b2 = c.b2, a1 = c.a1, a2 = c.a2;
      for (j = i; j < end; j++) {
        var xl = L[j], yl = b0 * xl + l1; l1 = b1 * xl - a1 * yl + l2; l2 = b2 * xl - a2 * yl; L[j] = yl;
        var xr = R[j], yr = b0 * xr + r1; r1 = b1 * xr - a1 * yr + r2; r2 = b2 * xr - a2 * yr; R[j] = yr;
      }
      if (prog && ((i / NOVA_BLOCK) & 0x3FFFF) === 0) prog((bi + i / n) / bands.length);
    }
    stats.push({ f: B.f, meanDb: cnt ? sum / cnt : 0, maxDb: mx, activePct: 100 * cnt * NOVA_BLOCK / n });
  });
  return stats;
}
