/* Rusty Overdrive Corrector · dsp/99-worker-main.js
   Protocolo de mensajes entre la interfaz y el Worker. */
if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = function (e) {
    var m = e.data;
    try {
      if (m.type === 'load') {
        W = { sr: m.sr, orig: { L: m.L, R: m.R }, outA: null, outB: null, keyA: '', keyB: '', tonesKey: '', tones: [], final: null, meterOrig: null };
        progress('Midiendo el original', 0.1);
        var mo = fullMeter(m.L, m.R, m.sr, -1); W.meterOrig = mo;
        post({ type: 'loaded', id: m.id, meter: mo, hf: hfEnvelope(m.L, m.R, m.sr, 6500), ltas: ltas(m.L, m.R, m.sr) });
      } else if (m.type === 'process') {
        var res = runPipeline(m.params), a = copyArr(W.final.L), b = copyArr(W.final.R);
        post({ type: 'result', id: m.id, L: a, R: b, meter: res.meter, hf: res.hf, tones: res.tones, timing: res.timing, info: res.info, out: res.out, nova: res.nova, ltasPre: res.ltasPre, ltas: res.ltas }, [a.buffer, b.buffer]);
      } else if (m.type === 'delta') {
        /* Lo que se quita = g·original − procesado, con g por mínimos cuadrados: iguala el nivel y deja solo lo que la cadena cambió
           (correcciones + master). Todas las etapas tienen latencia cero, así que las muestras están alineadas. */
        if (!W.final) throw new Error('Primero procesá el audio.');
        var O = W.orig, F = W.final, n = O.L.length, dl = new Float32Array(n), dr = new Float32Array(n), num = 0, den = 0, i;
        for (i = 0; i < n; i++) { var o = 0.5 * (O.L[i] + O.R[i]), f = 0.5 * (F.L[i] + F.R[i]); num += o * f; den += o * o; }
        var g = den > 0 ? num / den : 1;
        for (i = 0; i < n; i++) { dl[i] = g * O.L[i] - F.L[i]; dr[i] = g * O.R[i] - F.R[i]; }
        post({ type: 'delta', id: m.id, L: dl, R: dr, gain: g }, [dl.buffer, dr.buffer]);
      } else if (m.type === 'export') {
        var ex = doExport(m.opt); post({ type: 'exported', id: m.id, bytes: ex.bytes, mime: ex.mime, info: ex.info }, [ex.bytes]);
      } else if (m.type === 'measure') {
        post({ type: 'measured', id: m.id, meter: fullMeter(m.L, m.R, m.sr, m.ceil == null ? -1 : m.ceil) });
      }
    } catch (err) { post({ type: 'error', id: m.id, message: String(err && err.stack || err) }); }
  };
}

