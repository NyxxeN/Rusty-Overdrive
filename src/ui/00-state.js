/* Rusty Overdrive Corrector · ui/00-state.js
   Helpers, parámetros por defecto, estilos de master, curvas de referencia y estado global. */
var $ = function (id) { return document.getElementById(id); };
var CM = new Function($('common-src').textContent + '\nreturn {fft:fft,hannPeriodic:hannPeriodic,eqResponseDb:eqResponseDb,biquadCoefs:biquadCoefs,biquadMagDb:biquadMagDb,eqBandBiquads:eqBandBiquads};')();
function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function lin(db) { return Math.pow(10, db / 20); }
function fmtT(t) { t = Math.max(0, t); var m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); }
function f1(v) { return isFinite(v) ? v.toFixed(1) : '—'; }
function f2(v) { return isFinite(v) ? v.toFixed(2) : '—'; }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
var COL = { cy: '#19f4ff', mg: '#ff2d95', or: '#ff7a1a', am: '#ffc400', ok: '#b6ff3b', vio: '#a78bfa' };
var BAND_COL = ['#ff2d95', '#ff7a1a', '#ffc400', '#b6ff3b', '#19f4ff', '#a78bfa'];

/* ---------- Parámetros por defecto ---------- */
function eqDefault(freqs) {
  var t = ['hp', 'lowshelf', 'peak', 'peak', 'peak', 'highshelf'];
  return { on: false, bands: t.map(function (ty, i) { return { on: false, type: ty, f: freqs[i], g: 0, q: (ty === 'peak' ? 1 : 0.71), slope: 12 }; }) };
}
function novaBand(f, type) { return { on: false, type: type || 'peak', f: f, q: 1.2, g: 0, thr: -30, ratio: 3, att: 10, rel: 120, mode: 'comp', maxDyn: 6 }; }
var DEF = {
  tones: { on: false, thr: 5, maxRed: 9, fLo: 3000, fHi: 20000 },
  eq: eqDefault([30, 120, 400, 3500, 8000, 14000]),
  nova: { on: false, bands: [novaBand(250), novaBand(2500), novaBand(6500), novaBand(10000, 'highshelf')] },
  nr: { on: false, over: 1.0, maxRed: 4, rel: 120, lo: 3000, hi: 9000 },
  dess: { on: false, f1: 5000, f2: 14000, over: 2, ratio: 3, maxRed: 8 },
  tail: { on: false, maxRed: 8, f: 6500 },
  meq: eqDefault([25, 100, 300, 3000, 8000, 12000]),
  comp: { on: false, thr: -18, ratio: 2, att: 30, rel: 200, knee: 6, makeup: 0, mix: 100, hpf: 90 },
  out: { on: true, mode: 'lufs', target: -14, gain: 0, ceil: -1, look: 1.5, rel: 80 },
  style: 'platform'
};
var S = clone(DEF);
var STORE_KEY = 'roc.params.v1';
try {
  var sv = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  if (sv) Object.keys(DEF).forEach(function (k) { if (sv[k] !== undefined) S[k] = (typeof DEF[k] === 'object') ? Object.assign(clone(DEF[k]), sv[k]) : sv[k]; });
} catch (e) {}
function saveParams() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} }

/* ---------- Estilos de master ----------
   Objetivo de loudness y techo: mediana medida en 314.876 temas (Freshly Baked Studios, 2026) y guías de
   masterización por género (LuvLang, Mastering The Mix). Techo: −2 dBTP si se entrega más fuerte que −14 LUFS
   (recomendación de Spotify), −1 dBTP en el resto. Los movimientos de EQ son pequeños (≤ 1,5 dB, Q ancho),
   siguiendo el criterio de que el EQ de master no debe hacer correcciones grandes (Mastering The Mix / MasteringBox).
   "ref" = desvíos orientativos (dB, por banda de 1/3 de octava) respecto de una pendiente base. */
function B(type, f, g, q, slope) { return { on: true, type: type, f: f, g: g || 0, q: q || 0.71, slope: slope || 12 }; }
var STYLES = {
  platform: { name: 'Estándar plataformas (neutro)', short: 'Neutro', target: -14, ceil: -1,
    median: null, range: '−15 a −13 LUFS',
    desc: 'Punto de partida neutro para cualquier música: limpia el subgrave y entrega a <b>−14 LUFS / −1 dBTP</b>, el nivel al que Spotify y YouTube no cambian el volumen. No toca el color.',
    meq: [B('hp', 25)], comp: null, ref: [] },
  edm: { name: 'EDM / Electrónica', short: 'EDM', target: -9, ceil: -2, median: '−8,7 LUFS (Dance/EDM, 18.514 temas)', range: '−8 a −10 LUFS',
    desc: 'Subgrave potente y controlado, agudos nítidos, compresión y limitación fuertes. Recorte de subgrave a 25 Hz, realce suave de graves y aire, leve limpieza de 300 Hz.',
    meq: [B('hp', 25), B('lowshelf', 60, 1.5), B('peak', 300, -1.5, 0.8), null, null, B('highshelf', 10000, 1)],
    comp: { thr: -22, ratio: 2, att: 20, rel: 120, knee: 6, makeup: 0, mix: 100, hpf: 90 },
    ref: [[40, 3], [100, 3], [200, 0], [10000, 1]] },
  rock: { name: 'Rock', short: 'Rock', target: -10, ceil: -2, median: '−9,2 LUFS (Rock, 13.966 temas)', range: '−9 a −12 LUFS',
    desc: 'Cuerpo en graves y medios bajos sin barro, guitarras y voz con presencia. Compresión moderada que conserva el golpe.',
    meq: [B('hp', 30), null, B('peak', 250, -1, 0.8), B('peak', 3000, 1, 0.8), null, B('highshelf', 12000, 0.5)],
    comp: { thr: -22, ratio: 1.8, att: 30, rel: 160, knee: 6, makeup: 0, mix: 100, hpf: 90 },
    ref: [[250, -1], [1000, 0], [3000, 1], [6000, 0]] },
  metal: { name: 'Heavy metal', short: 'Metal', target: -10, ceil: -2, median: '−8,4 LUFS (Metal, 6.666 temas)', range: '−9 a −12 LUFS',
    desc: 'Barro de 300 Hz bajo control, presencia de 3–4 kHz y control del siseo de las guitarras (7 kHz). Recorte de graves a 30 Hz. Compresión firme.',
    meq: [B('hp', 30), null, B('peak', 300, -1.5, 0.8), B('peak', 3500, 1, 0.8), B('peak', 7000, -1.5, 1.2), null],
    comp: { thr: -20, ratio: 2, att: 25, rel: 140, knee: 6, makeup: 0, mix: 100, hpf: 90 },
    ref: [[300, -1], [3000, 1], [8000, -1.5], [16000, -2]] },
  pop: { name: 'Pop', short: 'Pop', target: -10, ceil: -2, median: '−9,5 LUFS (Pop, 46.316 temas)', range: '−9 a −12 LUFS',
    desc: 'Voz clara y brillo pulido (aire por encima de 10 kHz), graves ordenados. Compresión moderada.',
    meq: [B('hp', 25), null, B('peak', 250, -1, 0.8), B('peak', 3000, 0.5, 0.8), null, B('highshelf', 10000, 1.5)],
    comp: { thr: -22, ratio: 1.8, att: 30, rel: 150, knee: 6, makeup: 0, mix: 100, hpf: 90 },
    ref: [[100, 0], [10000, 1], [16000, 1]] },
  clasica: { name: 'Clásica / orquestal', short: 'Clásica', target: -20, ceil: -1, median: '−12,9 LUFS (Instrumental/Score, 8.816 temas)', range: '−18 a −24 LUFS',
    desc: 'Transparencia: sin compresión y con EQ mínimo (solo recorte de subgrave a 20 Hz). Se conserva el rango dinámico; el límite solo protege los picos.',
    meq: [B('hp', 20)], comp: null, ref: [[400, 1], [3000, 0], [8000, -2], [16000, -4]] },
  jazz: { name: 'Jazz', short: 'Jazz', target: -15, ceil: -1, median: '−12,8 LUFS (Jazz, 2.933 temas)', range: '−14 a −18 LUFS',
    desc: 'Calidez en graves y medios bajos, metales sin aspereza, dinámica respetada: sin compresión.',
    meq: [B('hp', 25), B('lowshelf', 200, 1, 0.71)], comp: null, ref: [[100, 1], [300, 1.5], [1000, 0], [8000, -1.5], [16000, -3]] },
  folk: { name: 'Folk / acústico', short: 'Folk', target: -13, ceil: -2, median: '−9,6 LUFS (Country/Folk, 10.779 temas)', range: '−12 a −14 LUFS (criterio propio: material acústico dinámico)',
    desc: 'Cuerpo natural de guitarras y voz, un poco de aire, compresión muy ligera. La mediana comercial es más alta, pero el material acústico gana con más dinámica.',
    meq: [B('hp', 30), null, B('peak', 300, -1, 0.8), null, null, B('highshelf', 12000, 1)],
    comp: { thr: -26, ratio: 1.5, att: 40, rel: 200, knee: 8, makeup: 0, mix: 100, hpf: 90 },
    ref: [[150, 0.5], [400, 1], [2000, 0], [10000, -1.5], [16000, -3]] }
};
/* Referencia tonal orientativa (energía por banda de 1/3 de octava, relativa a 1 kHz):
   pendiente base de 1,5 dB/oct (equivale a la pendiente de 4,5 dB/oct de los analizadores modernos, con la
   pendiente de 3 dB/oct del ruido rosa como línea plana) + recorte de subgrave + desvíos del estilo. */
function refCurveDb(fc, styleId) {
  var g = -1.5 * Math.log2(fc / 1000);
  if (fc < 40) g -= 6 * Math.log2(40 / fc);
  var pts = (STYLES[styleId] || STYLES.platform).ref;
  if (pts.length) {
    var v; if (fc <= pts[0][0]) v = pts[0][1]; else if (fc >= pts[pts.length - 1][0]) v = pts[pts.length - 1][1];
    else for (var i = 1; i < pts.length; i++) if (fc <= pts[i][0]) { var t = Math.log(fc / pts[i - 1][0]) / Math.log(pts[i][0] / pts[i - 1][0]); v = pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1]); break; }
    g += v;
  }
  return g;
}
/* desviación de un LTAS respecto de la referencia, alineada en 125 Hz – 6,3 kHz */
function ltasDeviation(lt, styleId) {
  if (!lt) return null; var d = lt.db.map(function (v, i) { return v - refCurveDb(lt.fc[i], styleId); }), s = 0, c = 0;
  lt.fc.forEach(function (f, i) { if (f >= 125 && f <= 6300) { s += d[i]; c++; } }); var off = c ? s / c : 0;
  return { fc: lt.fc, dev: d.map(function (v) { return v - off; }) };
}

/* ---------- Estado de la sesión ---------- */
var A = { name: '', sr: 0, dur: 0, orig: null, proc: null, delta: null, deltaPeak: 1, meterO: null, meterP: null, hfO: null, hfP: null, ltasO: null, ltasPre: null, ltasP: null, tones: [], nova: [], compStats: null, busy: false, dirty: false, outInfo: null };
var UI = { mon: 'orig', liveMode: 'result', ch: 'st', match: true, deltaGain: 0, v0: 0, v1: 1, loop: null, loopOn: false, scale: 'log', spec: 55, auto: false, tab: 'fix' };

/* ---------- Preajustes ---------- */
function applyStyle(id) {
  var st = STYLES[id]; if (!st) return; S.style = id;
  var bands = clone(DEF.meq.bands); for (var i = 0; i < 6; i++) { if (st.meq[i]) bands[i] = clone(st.meq[i]); else bands[i].on = false; }
  S.meq = { on: true, bands: bands };
  S.comp = Object.assign(clone(DEF.comp), st.comp || {}, { on: !!st.comp });
  S.out = Object.assign(clone(DEF.out), { on: true, mode: 'lufs', target: st.target, ceil: st.ceil });
}
function applyClean(kind) {
  S.tones = clone(DEF.tones); S.eq = clone(DEF.eq); S.nova = clone(DEF.nova); S.nr = clone(DEF.nr); S.dess = clone(DEF.dess); S.tail = clone(DEF.tail);
  var aggr = kind === 'aggr';
  S.tones.on = true; S.tones.thr = aggr ? 5 : 6.5; S.tones.maxRed = aggr ? 9 : 6;
  S.eq.on = true; S.eq.bands[5] = { on: true, type: 'highshelf', f: 14000, g: aggr ? -6 : -3, q: 0.71, slope: 12 };
  S.nr.on = true; S.nr.over = aggr ? 1.0 : 0.8; S.nr.maxRed = aggr ? 4 : 3;
  S.tail.on = true; S.tail.maxRed = aggr ? 12 : 6;
}
function applyPreset(k) {
  if (k === 'clean-aggr') applyClean('aggr'); else if (k === 'clean-soft') applyClean('soft');
  else if (k === 'clear') { S = clone(DEF); S.out.on = false; }
  else if (STYLES[k]) applyStyle(k);
  saveParams(); buildTab(UI.tab); markDirty(); $('preset').value = '';
}
