/* Rusty Overdrive Corrector · ui/40-eq-editor.js
   Editor de EQ con bolitas arrastrables sobre el gráfico.
     arrastrar        : frecuencia (horizontal) y ganancia (vertical)
     rueda            : Q (ancho de banda)
     doble clic       : encender/apagar la banda (en un lugar vacío, activa una banda libre ahí)
     clic derecho     : solo de banda (solo en el EQ de corrección; escuchás esa zona con "EQ en vivo")
   Hay dos instancias: EQED.eq (corrección, con escucha en vivo) y EQED.meq (master, con referencia del estilo). */
var EQED = { eq: null, meq: null };
function fmtHz(f) { return f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 1 : 2) + ' kHz' : Math.round(f) + ' Hz'; }
function createEQEditor(key, cfg) {
  var wrap = el('div', 'cv'), cv = el('canvas'); cv.dataset.h = cfg.h || 210; wrap.appendChild(cv); wrap.style.cursor = 'default';
  var tag = el('div', 'tag', cfg.tag || ''); wrap.appendChild(tag);
  var st = { sel: -1, hover: -1, drag: null, w: 300, h: 210 }, RANGE = 15, PAD = 12;
  var eqObj = function () { return S[key]; };
  function X(f) { return Math.log(f / 20) / Math.log(1000) * st.w; }
  function FX(x) { return 20 * Math.pow(1000, clamp(x, 0, st.w) / st.w); }
  function Yg(g) { return st.h / 2 - g / RANGE * (st.h / 2 - PAD); }
  function GY(y) { return (st.h / 2 - y) / (st.h / 2 - PAD) * RANGE; }
  function flat(b) { return b.type === 'hp' || b.type === 'lp' || b.type === 'notch'; }
  function qUsed(b) { return b.type === 'peak' || b.type === 'notch'; }
  function pos(b) { return { x: X(b.f), y: flat(b) ? Yg(0) : Yg(b.g) }; }
  function hit(mx, my) {
    var best = -1, bd = 14 * 14; eqObj().bands.forEach(function (b, i) { var p = pos(b), d = (p.x - mx) * (p.x - mx) + (p.y - my) * (p.y - my); if (d < bd) { bd = d; best = i; } }); return best;
  }
  function draw() {
    var o = fit(cv), g = o.g; st.w = o.w; st.h = o.h; g.fillStyle = '#04050a'; g.fillRect(0, 0, o.w, o.h);
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.fillStyle = 'rgba(255,255,255,.42)'; g.font = '10px sans-serif';
    [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].forEach(function (f) { var x = X(f); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, o.h); g.stroke(); g.fillText(f >= 1000 ? f / 1000 + 'k' : f, x + 2, o.h - 3); });
    [-12, -6, 0, 6, 12].forEach(function (db) { g.strokeStyle = db === 0 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(0, Yg(db)); g.lineTo(o.w, Yg(db)); g.stroke(); if (Yg(db) > 26) g.fillText((db > 0 ? '+' : '') + db, o.w - 22, Yg(db) - 2); });
    /* fondo: analizador en vivo (EQ de corrección) o referencia del estilo (EQ de master) */
    if (key === 'eq' && analyser && (P.playing || UI.mon === 'live')) {
      var bins = analyser.frequencyBinCount, data = new Float32Array(bins); analyser.getFloatFrequencyData(data); var hz = actx.sampleRate / analyser.fftSize;
      g.beginPath(); g.moveTo(0, o.h);
      for (var x = 0; x < o.w; x += 2) { var f0 = FX(x), f1 = FX(x + 2), b0 = Math.floor(f0 / hz), b1 = Math.max(b0, Math.floor(f1 / hz)), mx = -140; for (var b = b0; b <= b1 && b < bins; b++) if (data[b] > mx) mx = data[b]; g.lineTo(x, o.h - clamp((mx + 110) / 100, 0, 1) * (o.h - 8)); }
      g.lineTo(o.w, o.h); g.closePath(); g.fillStyle = 'rgba(255,122,26,.20)'; g.fill(); g.strokeStyle = 'rgba(255,122,26,.55)'; g.lineWidth = 1; g.stroke();
    }
    if (key === 'meq') {
      var sty = S.style, dPre = ltasDeviation(A.ltasPre, sty), dFin = ltasDeviation(A.ltasP, sty);
      var top = Yg(4), bot = Yg(-4); g.fillStyle = 'rgba(25,244,255,.07)'; g.fillRect(0, top, o.w, bot - top); g.strokeStyle = 'rgba(25,244,255,.35)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(0, top); g.lineTo(o.w, top); g.moveTo(0, bot); g.lineTo(o.w, bot); g.stroke(); g.setLineDash([]);
      function dev(d, col, lw) { if (!d) return; g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); d.fc.forEach(function (f, i) { var x = X(f), y = Yg(clamp(d.dev[i], -RANGE, RANGE)); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke(); }
      dev(dPre, 'rgba(200,208,225,.95)', 1.5); dev(dFin, COL.am, 1.5);
      if (!dPre) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText('Tocá “Procesar” para ver el espectro de tu mezcla contra la referencia del estilo', 40, 16); }
    }
    /* curva total del EQ */
    var e = eqObj(), bands = e.on ? e.bands : [], sr = A.sr || 48000;
    g.beginPath(); for (var x2 = 0; x2 <= o.w; x2 += 2) { var y = Yg(clamp(CM.eqResponseDb(bands, FX(x2), sr), -RANGE, RANGE)); if (x2) g.lineTo(x2, y); else g.moveTo(x2, y); }
    g.strokeStyle = e.on ? COL.cy : '#59617a'; g.lineWidth = 2.2; g.shadowColor = e.on ? COL.cy : 'transparent'; g.shadowBlur = e.on ? 8 : 0; g.stroke(); g.shadowBlur = 0;
    g.lineTo(o.w, Yg(0)); g.lineTo(0, Yg(0)); g.closePath(); g.fillStyle = e.on ? 'rgba(25,244,255,.10)' : 'rgba(255,255,255,.03)'; g.fill();
    /* bolitas */
    e.bands.forEach(function (b, i) {
      var p = pos(b), col = BAND_COL[i], active = e.on && b.on, isSel = i === st.sel || (st.drag && st.drag.i === i), solo = key === 'eq' && live.solo === i;
      g.beginPath(); g.arc(p.x, p.y, isSel ? 10 : 8, 0, 6.2832);
      if (active) { g.fillStyle = col; g.shadowColor = col; g.shadowBlur = isSel ? 16 : 9; g.fill(); g.shadowBlur = 0; g.lineWidth = 2; g.strokeStyle = '#05060a'; g.stroke(); }
      else { g.fillStyle = 'rgba(0,0,0,.6)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = col; g.globalAlpha = .55; g.stroke(); g.globalAlpha = 1; }
      if (solo) { g.beginPath(); g.arc(p.x, p.y, 14, 0, 6.2832); g.strokeStyle = COL.am; g.lineWidth = 2; g.stroke(); }
      g.fillStyle = active ? '#05060a' : col; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText(String(i + 1), p.x, p.y + 3); g.textAlign = 'left';
      if (isSel || i === st.hover) { var lab = fmtHz(b.f) + (flat(b) ? '' : '  ' + (b.g > 0 ? '+' : '') + b.g.toFixed(1) + ' dB') + (qUsed(b) ? '  Q ' + b.q.toFixed(2) : ''); g.font = '11px ui-monospace,Consolas,monospace'; var tw = g.measureText(lab).width + 12, lx = clamp(p.x - tw / 2, 2, o.w - tw - 2), ly = p.y > 34 ? p.y - 30 : p.y + 16; g.fillStyle = 'rgba(5,6,10,.88)'; g.fillRect(lx, ly, tw, 18); g.strokeStyle = col; g.lineWidth = 1; g.strokeRect(lx + .5, ly + .5, tw - 1, 18); g.fillStyle = '#fff'; g.fillText(lab, lx + 6, ly + 13); }
    });
  }
  function changed() { markDirty(); if (key === 'eq') updateLiveEQ(); refreshAllCtl(); draw(); }
  function local(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  cv.addEventListener('pointerdown', function (ev) {
    if (ev.button !== 0) return; var p = local(ev), i = hit(p.x, p.y); if (i < 0) { st.sel = -1; draw(); return; }
    var e = eqObj(), b = e.bands[i]; st.sel = i; if (!e.on) e.on = true; if (!b.on) b.on = true;
    if (key === 'eq' && UI.mon !== 'live' && A.orig) { setLiveMode(UI.liveMode === 'solo' ? 'result' : UI.liveMode); }     // mientras movés las bolitas escuchás el EQ en vivo
    st.drag = { i: i }; cv.setPointerCapture(ev.pointerId); highlightRow(); changed(); if (UI.liveMode === 'solo' && key === 'eq') { live.solo = i; updateLiveEQ(); } ev.preventDefault();
  });
  cv.addEventListener('pointermove', function (ev) {
    var p = local(ev);
    if (st.drag) {
      var b = eqObj().bands[st.drag.i], f = FX(p.x); b.f = Math.round(f > 2000 ? f / 50 : (f > 400 ? f / 10 : f)) * (f > 2000 ? 50 : (f > 400 ? 10 : 1)); b.f = clamp(b.f, 20, 20000);
      if (!flat(b)) b.g = Math.round(clamp(GY(p.y), -18, 18) * 10) / 10; changed(); return;
    }
    var h = hit(p.x, p.y); if (h !== st.hover) { st.hover = h; cv.style.cursor = h >= 0 ? 'grab' : 'default'; draw(); }
  });
  cv.addEventListener('pointerup', function () { st.drag = null; draw(); });
  cv.addEventListener('pointerleave', function () { if (!st.drag && st.hover >= 0) { st.hover = -1; draw(); } });
  cv.addEventListener('wheel', function (ev) {
    var p = local(ev), i = hit(p.x, p.y); if (i < 0) i = st.sel; if (i < 0) return; ev.preventDefault();
    var b = eqObj().bands[i]; if (!qUsed(b)) return; b.q = clamp(Math.round(b.q * Math.exp(-ev.deltaY * 0.0022) * 100) / 100, 0.3, 10); st.sel = i; changed();
  }, { passive: false });
  cv.addEventListener('dblclick', function (ev) {
    var p = local(ev), i = hit(p.x, p.y), e = eqObj();
    if (i >= 0) { e.bands[i].on = !e.bands[i].on; if (e.bands[i].on) e.on = true; }
    else { var free = -1; [2, 3, 4, 1, 5, 0].forEach(function (k) { if (free < 0 && !e.bands[k].on) free = k; }); if (free < 0) return; var b = e.bands[free]; b.on = true; b.f = Math.round(FX(p.x)); if (!flat(b)) b.g = Math.round(clamp(GY(p.y), -18, 18) * 10) / 10; e.on = true; st.sel = free; }
    highlightRow(); changed();
  });
  cv.addEventListener('contextmenu', function (ev) { var p = local(ev), i = hit(p.x, p.y); ev.preventDefault(); if (key === 'eq' && i >= 0) { eqObj().bands[i].on = true; eqObj().on = true; setSolo(i); } });
  function highlightRow() { var rows = wrap.parentNode ? wrap.parentNode.querySelectorAll('.eqrow') : []; Array.prototype.forEach.call(rows, function (r, i) { r.classList.toggle('sel', i === st.sel); }); }
  var api = { el: wrap, draw: draw, sel: function () { return st.sel; }, select: function (i) { st.sel = i; highlightRow(); draw(); } };
  EQED[key] = api; return api;
}
