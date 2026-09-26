/* Rusty Overdrive Corrector · ui/30-draw.js
   Dibujo de onda, piso agudo, espectrograma, analizador y medidor de loudness; ratón sobre las vistas. */
function fit(cv) {
  var w = Math.max(200, Math.floor(cv.parentNode.getBoundingClientRect().width)), h = +cv.dataset.h, d = window.devicePixelRatio || 1;
  cv.style.height = h + 'px'; if (cv.width !== Math.floor(w * d) || cv.height !== Math.floor(h * d)) { cv.width = Math.floor(w * d); cv.height = Math.floor(h * d); }
  var g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return { w: w, h: h, d: d, g: g };
}
function t2x(t, w) { return (t - UI.v0) / (UI.v1 - UI.v0) * w; }
function drawRuler(o) {
  var g = o.g, span = UI.v1 - UI.v0, steps = [.1, .2, .5, 1, 2, 5, 10, 15, 30, 60, 120], st = steps[steps.length - 1];
  for (var i = 0; i < steps.length; i++) if (span / steps[i] < 12) { st = steps[i]; break; }
  g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '10px sans-serif'; g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
  for (var t = Math.ceil(UI.v0 / st) * st; t < UI.v1; t += st) { var x = Math.round(t2x(t, o.w)) + .5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, o.h); g.stroke(); g.fillText(fmtT(t), x + 3, o.h - 4); }
}
var MON_NAME = { orig: 'Original', proc: 'Procesado', delta: 'Lo que se quita (nivel igualado, ampliado)', live: 'EQ en vivo (original + EQ de corrección)' };
function drawWave() {
  var cv = $('wave'), o = fit(cv), g = o.g; g.fillStyle = '#04050a'; g.fillRect(0, 0, o.w, o.h);
  var buf = curBuf(); if (!buf) { g.fillStyle = '#5a647c'; g.font = '14px sans-serif'; g.fillText('Abrí un archivo de audio para empezar', 16, o.h / 2); return; }
  var sr = A.sr, spp = (UI.v1 - UI.v0) * sr / o.w, laneH = (o.h - 14) / 2, scale = UI.mon === 'delta' ? 0.9 / A.deltaPeak : 1;
  drawRuler(o);
  for (var c = 0; c < 2; c++) {
    var d = buf.getChannelData(c), mid = 7 + laneH * (c + .5), n = d.length;
    g.fillStyle = c === 0 ? COL.cy : COL.mg;
    for (var x = 0; x < o.w; x++) {
      var s0 = Math.floor(UI.v0 * sr + x * spp), s1 = Math.min(n, Math.floor(UI.v0 * sr + (x + 1) * spp) + 1); if (s0 >= n) break; if (s1 <= s0) s1 = s0 + 1;
      var st = Math.max(1, Math.floor((s1 - s0) / 48)), mn = 1, mx = -1;
      for (var i = s0; i < s1; i += st) { var v = d[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
      mn = clamp(mn * scale, -1, 1); mx = clamp(mx * scale, -1, 1);
      g.fillRect(x, mid - mx * laneH * .48, 1, Math.max(1, (mx - mn) * laneH * .48));
    }
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, mid, o.w, 1);
  }
  var mt = UI.mon === 'proc' ? A.meterP : A.meterO;
  if (mt && mt.overs && (UI.mon === 'proc' || UI.mon === 'orig')) { g.fillStyle = '#ff3d3d'; mt.overs.forEach(function (t) { if (t >= UI.v0 && t <= UI.v1) g.fillRect(t2x(t, o.w) - 1, 0, 3, 7); }); }
  $('tagWave').textContent = (UI.mon === 'live' ? { result: 'EQ en vivo · original con EQ', delta: 'EQ en vivo · solo lo que quita el EQ', solo: 'EQ en vivo · solo la banda' }[UI.liveMode] : MON_NAME[UI.mon]) + (mt && mt.overs && mt.overs.length && (UI.mon === 'proc' || UI.mon === 'orig') ? ' · ▮ rojo = pico sobre el techo (' + mt.overs.length + ')' : '');
}
function drawHF() {
  var o = fit($('hf')), g = o.g; g.fillStyle = '#04050a'; g.fillRect(0, 0, o.w, o.h); drawRuler(o);
  function line(h, col, lw, key) {
    if (!h) return; var a = h[key]; g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); var first = true;
    for (var i = 0; i < a.length; i++) { var t = i * h.dt; if (t < UI.v0 - h.dt) continue; if (t > UI.v1 + h.dt) break; var x = t2x(t, o.w), y = o.h - clamp((a[i] + 100) / 80, 0, 1) * (o.h - 6) - 3; if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y); }
    g.stroke();
  }
  line(A.hfO, 'rgba(160,170,190,.28)', 1, 'env'); line(A.hfO, 'rgba(190,198,215,.85)', 1.6, 'floor');
  line(A.hfP, 'rgba(25,244,255,.30)', 1, 'env'); line(A.hfP, COL.cy, 1.8, 'floor');
  g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '10px sans-serif'; [-80, -60, -40].forEach(function (db) { var y = o.h - (db + 100) / 80 * (o.h - 6) - 3; g.fillText(db + ' dB', o.w - 40, y - 2); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, y, o.w, 1); g.fillStyle = 'rgba(255,255,255,.35)'; });
}
var LUT = (function () { var st = [[0, 2, 1, 10], [.2, 43, 11, 87], [.42, 130, 18, 108], [.62, 220, 40, 110], [.8, 255, 106, 26], [.93, 255, 210, 63], [1, 255, 246, 208]], l = new Uint8Array(256 * 3); for (var i = 0; i < 256; i++) { var t = i / 255, k = 1; while (k < st.length - 1 && t > st[k][0]) k++; var a = st[k - 1], b = st[k], u = (t - a[0]) / (b[0] - a[0]); for (var c = 0; c < 3; c++) l[i * 3 + c] = a[c + 1] + u * (b[c + 1] - a[c + 1]); } return l; })();
var specTimer = null; function scheduleSpec() { clearTimeout(specTimer); specTimer = setTimeout(drawSpec, 90); }
function specFreqMap(o) { var nyq = A.sr / 2, fMax = Math.min(nyq, 22000), fMin = 30; return { fMin: fMin, fMax: fMax, y2f: function (y) { var u = 1 - y / o.h; return UI.scale === 'log' ? fMin * Math.pow(fMax / fMin, u) : fMax * u; }, f2y: function (f) { var u = UI.scale === 'log' ? Math.log(f / fMin) / Math.log(fMax / fMin) : f / fMax; return (1 - u) * o.h; } }; }
function drawSpec() {
  var cv = $('spec'), o = fit(cv), g = o.g, buf = curBuf(); g.fillStyle = '#000'; g.fillRect(0, 0, o.w, o.h); if (!buf) return;
  var N = 2048, hw = CM.hannPeriodic(N), sr = A.sr, W = Math.floor(o.w * o.d), Hh = Math.floor(o.h * o.d), img = g.createImageData(W, Hh), fm = specFreqMap({ h: Hh });
  var Ld = buf.getChannelData(0), Rd = buf.getChannelData(1), re = new Float64Array(N), im = new Float64Array(N), n = Ld.length, binHz = sr / N;
  var hi = -25 - (UI.spec / 100) * 30, lo = hi - 65, rowBin0 = new Float32Array(Hh), rowBin1 = new Float32Array(Hh);
  for (var y = 0; y < Hh; y++) { rowBin0[y] = fm.y2f(y + 1) / binHz; rowBin1[y] = fm.y2f(y) / binHz; }
  var mag = new Float32Array(N / 2 + 1);
  for (var x = 0; x < W; x++) {
    var ctr = Math.floor((UI.v0 + (x + .5) / W * (UI.v1 - UI.v0)) * sr), s0 = ctr - N / 2;
    for (var i = 0; i < N; i++) { var idx = s0 + i; re[i] = (idx >= 0 && idx < n) ? 0.5 * (Ld[idx] + Rd[idx]) * hw[i] : 0; im[i] = 0; }
    CM.fft(re, im, false);
    for (var k = 0; k <= N / 2; k++) mag[k] = 10 * Math.log10((re[k] * re[k] + im[k] * im[k]) / ((N / 2) * (N / 2)) + 1e-14);
    for (var yy = 0; yy < Hh; yy++) {
      var b0 = Math.max(0, Math.floor(rowBin0[yy])), b1 = Math.min(N / 2, Math.max(b0, Math.ceil(rowBin1[yy]))), mx = -200; for (var kk = b0; kk <= b1; kk++) if (mag[kk] > mx) mx = mag[kk];
      var u = clamp((mx - lo) / (hi - lo), 0, 1), ci = Math.floor(u * 255) * 3, p = (yy * W + x) * 4; img.data[p] = LUT[ci]; img.data[p + 1] = LUT[ci + 1]; img.data[p + 2] = LUT[ci + 2]; img.data[p + 3] = 255;
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.putImageData(img, 0, 0); g.setTransform(o.d, 0, 0, o.d, 0, 0);
  g.font = '10px sans-serif'; g.fillStyle = 'rgba(255,255,255,.8)'; g.strokeStyle = 'rgba(255,255,255,.12)';
  [100, 500, 1000, 2000, 5000, 8000, 10000, 15000, 20000].forEach(function (f) { if (f > fm.fMax) return; var yy = fm.f2y(f); if (yy < 36) return; g.beginPath(); g.moveTo(0, yy); g.lineTo(o.w, yy); g.stroke(); g.fillText(f >= 1000 ? (f / 1000) + 'k' : f, 4, yy - 2); });
  $('tagSpec').textContent = 'Espectrograma · ' + ({ orig: 'Original', proc: 'Procesado', delta: 'Lo que se quita', live: 'Original' }[UI.mon]);
}
var peakHold = null;
function drawAna() {
  var cv = $('ana'), o = fit(cv), g = o.g; g.fillStyle = '#04050a'; g.fillRect(0, 0, o.w, o.h);
  var fMin = 20, fMax = 22000, X = function (f) { return Math.log(f / fMin) / Math.log(fMax / fMin) * o.w; }, Y = function (db) { return o.h - clamp((db + 110) / 100, 0, 1) * (o.h - 14) - 2; };
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.fillStyle = 'rgba(255,255,255,.4)'; g.font = '10px sans-serif';
  [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].forEach(function (f) { var x = X(f); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, o.h); g.stroke(); g.fillText(f >= 1000 ? (f / 1000) + 'k' : f, x + 2, o.h - 3); });
  [-90, -70, -50, -30].forEach(function (db) { var y = Y(db); g.beginPath(); g.moveTo(0, y); g.lineTo(o.w, y); g.stroke(); g.fillText(db, 2, y - 2); });
  if (!analyser) return;
  var bins = analyser.frequencyBinCount, data = new Float32Array(bins); analyser.getFloatFrequencyData(data); var hz = actx.sampleRate / analyser.fftSize;
  if (!peakHold || peakHold.length !== bins) peakHold = new Float32Array(bins).fill(-120);
  g.beginPath(); g.moveTo(0, o.h);
  for (var x = 0; x < o.w; x += 1) { var f0 = fMin * Math.pow(fMax / fMin, x / o.w), f1_ = fMin * Math.pow(fMax / fMin, (x + 1) / o.w), b0 = Math.floor(f0 / hz), b1 = Math.max(b0, Math.floor(f1_ / hz)), mx = -140; for (var b = b0; b <= b1 && b < bins; b++) if (data[b] > mx) mx = data[b]; g.lineTo(x, Y(mx)); }
  g.lineTo(o.w, o.h); g.closePath(); var gr = g.createLinearGradient(0, 0, 0, o.h); gr.addColorStop(0, 'rgba(25,244,255,.75)'); gr.addColorStop(1, 'rgba(25,244,255,.05)'); g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(255,45,149,.75)'; g.beginPath();
  for (var b2 = 1; b2 < bins; b2++) peakHold[b2] = Math.max(data[b2], peakHold[b2] - 0.35);
  var first = true; for (var x2 = 0; x2 < o.w; x2 += 2) { var ff0 = fMin * Math.pow(fMax / fMin, x2 / o.w), bb0 = Math.floor(ff0 / hz), mm = peakHold[Math.min(bins - 1, bb0)]; if (first) { g.moveTo(x2, Y(mm)); first = false; } else g.lineTo(x2, Y(mm)); } g.stroke();
}
function drawLoud() {
  var cv = $('loudcv'); if (!cv) return; var o = fit(cv), g = o.g; g.fillStyle = '#04050a'; g.fillRect(0, 0, o.w, o.h);
  var series = [[A.meterO && A.meterO.series, 'rgba(190,198,215,.9)'], [A.meterP && A.meterP.series, COL.cy]], all = [];
  series.forEach(function (s) { if (s[0]) all = all.concat(s[0].filter(function (v) { return v > -60; })); });
  var lo = all.length ? Math.floor(Math.min.apply(null, all) / 3) * 3 - 3 : -30, hi = all.length ? Math.ceil(Math.max.apply(null, all) / 3) * 3 + 3 : -6;
  hi = Math.max(hi, S.out.target + 3); lo = Math.min(lo, S.out.target - 8); var Y = function (v) { return o.h - (v - lo) / (hi - lo) * (o.h - 8) - 4; };
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.fillStyle = 'rgba(255,255,255,.4)'; g.font = '10px sans-serif';
  for (var v = Math.ceil(lo / 3) * 3; v <= hi; v += 3) { g.beginPath(); g.moveTo(0, Y(v)); g.lineTo(o.w, Y(v)); g.stroke(); g.fillText(v, 2, Y(v) - 2); }
  g.setLineDash([5, 4]); g.strokeStyle = COL.am; g.beginPath(); g.moveTo(0, Y(S.out.target)); g.lineTo(o.w, Y(S.out.target)); g.stroke(); g.setLineDash([]);
  series.forEach(function (s) { if (!s[0] || !A.dur) return; g.strokeStyle = s[1]; g.lineWidth = 1.6; g.beginPath(); var first = true; s[0].forEach(function (val, i) { if (val < -70) return; var x = (i + 1.5) / A.dur * o.w, y = Y(val); if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y); }); g.stroke(); });
}
function redrawAll() { drawWave(); drawHF(); drawSpec(); drawLoud(); if (EQED.eq) EQED.eq.draw(); if (EQED.meq) EQED.meq.draw(); }

/* ---------- Ratón sobre las vistas ---------- */
function xToT(e, node) { var r = node.getBoundingClientRect(); return UI.v0 + clamp((e.clientX - r.left) / r.width, 0, 1) * (UI.v1 - UI.v0); }
var scrub = null, loopDrag = null, lastSeek = 0;
['cvWave', 'cvHF', 'cvSpec'].forEach(function (id) {
  var node = $(id);
  node.addEventListener('mousedown', function (e) { if (!A.orig || e.button !== 0 || e.target.closest('select,input')) return; var t = xToT(e, node); if (e.shiftKey) { loopDrag = { a: t, node: node }; } else { scrub = node; seek(t); } e.preventDefault(); });
  node.addEventListener('wheel', function (e) {
    if (!A.orig) return; e.preventDefault(); var span = UI.v1 - UI.v0;
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { var d = (e.deltaX || e.deltaY) / 500 * span; setView(UI.v0 + d, UI.v1 + d); }
    else { var t = xToT(e, node), k = e.deltaY < 0 ? 0.8 : 1.25, ns = clamp(span * k, 0.5, A.dur), r = (t - UI.v0) / span; setView(t - r * ns, t + (1 - r) * ns); }
  }, { passive: false });
  node.addEventListener('dblclick', function (e) { if (A.orig && !e.target.closest('select,input')) setView(0, A.dur); });
});
window.addEventListener('mousemove', function (e) {
  if (scrub) { var t = xToT(e, scrub), now = Date.now(); if (P.playing) { if (now - lastSeek > 90) { lastSeek = now; seek(t); } } else seek(t); }
  else if (loopDrag) { var t2 = xToT(e, loopDrag.node); UI.loop = [Math.min(loopDrag.a, t2), Math.max(loopDrag.a, t2)]; UI.loopOn = true; $('chkLoop').checked = true; }
});
window.addEventListener('mouseup', function (e) { if (scrub && P.playing) seek(xToT(e, scrub)); if (loopDrag && UI.loop && UI.loop[1] - UI.loop[0] > 0.05 && P.playing) startAt(pos()); scrub = null; loopDrag = null; });
function setView(a, b) { var span = clamp(b - a, 0.5, A.dur); a = clamp(a, 0, A.dur - span); UI.v0 = a; UI.v1 = a + span; drawWave(); drawHF(); scheduleSpec(); }

/* ---------- Bucle de animación ---------- */
function frame() {
  if (A.orig) {
    var p = pos(); $('time').textContent = fmtT(p) + ' / ' + fmtT(A.dur);
    ['cvWave', 'cvHF', 'cvSpec'].forEach(function (id) { var node = $(id), ph = node.querySelector('.ph'), r = node.clientWidth; if (p >= UI.v0 && p <= UI.v1) { ph.style.display = 'block'; ph.style.left = ((p - UI.v0) / (UI.v1 - UI.v0) * r) + 'px'; } else ph.style.display = 'none'; });
    var lp = $('cvWave').querySelector('.lp'); if (UI.loop && UI.loopOn) { var r2 = $('cvWave').clientWidth, x0 = (UI.loop[0] - UI.v0) / (UI.v1 - UI.v0) * r2, x1 = (UI.loop[1] - UI.v0) / (UI.v1 - UI.v0) * r2; lp.style.display = 'block'; lp.style.left = x0 + 'px'; lp.style.width = Math.max(1, x1 - x0) + 'px'; } else lp.style.display = 'none';
  }
  drawAna(); if (EQED.eq && UI.tab === 'fix' && (P.playing || UI.mon === 'live')) EQED.eq.draw(); requestAnimationFrame(frame);
}

/* ---------- Horizonte de la cabecera (SVG generado) ---------- */
function buildSkyline() {
  var svg = $('skyline'), W = 1600, H = 96, seed = 11; function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  var out = '<defs><linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff2d95" stop-opacity="0"/><stop offset="1" stop-color="#ff2d95" stop-opacity=".22"/></linearGradient></defs><rect width="' + W + '" height="' + H + '" fill="url(#fog)"/>';
  var x = 0; while (x < W) {
    var w = 26 + rnd() * 50, h = 22 + rnd() * 58, col = rnd() < .5 ? '#171d33' : '#12172a'; out += '<rect x="' + x.toFixed(0) + '" y="' + (H - h).toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) + '" fill="' + col + '"/>';
    if (rnd() < .25) out += '<rect x="' + (x + w / 2 - 1).toFixed(0) + '" y="' + (H - h - 12).toFixed(0) + '" width="2" height="12" fill="' + col + '"/><circle cx="' + (x + w / 2).toFixed(0) + '" cy="' + (H - h - 13).toFixed(0) + '" r="1.6" fill="#ff3d5a"/>';
    for (var wy = H - h + 5; wy < H - 8; wy += 7) for (var wx = x + 4; wx < x + w - 4; wx += 6) { var r = rnd(); if (r < .16) out += '<rect x="' + wx.toFixed(0) + '" y="' + wy.toFixed(0) + '" width="2.4" height="3" fill="' + (r < .07 ? '#ffc400' : (r < .12 ? '#19f4ff' : '#ff2d95')) + '" opacity=".9"/>'; }
    x += w + rnd() * 6;
  }
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.innerHTML = out;
}
