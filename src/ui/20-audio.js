/* Rusty Overdrive Corrector · ui/20-audio.js
   Grafo de audio (Web Audio), transporte, canales mono/estéreo y EQ en vivo con BiquadFilterNode. */
var actx = null, monGain, split, merge, chG, volG, analyser, P = { playing: false, src: null, t0: 0, off: 0 };
var live = { nodes: [], solo: -1 };   // 6 bandas × 2 nodos
var liveDry, liveInv;                 // camino directo (+1) y camino del EQ invertido (−1): su suma = original − EQ(original)
function sniffWavRate(ab) { try { var dv = new DataView(ab); if (dv.getUint32(0, false) === 0x52494646 && dv.getUint32(8, false) === 0x57415645) return dv.getUint32(24, true); } catch (e) {} return 0; }
function buildGraph() {
  function g() { return actx.createGain(); }
  monGain = g(); split = actx.createChannelSplitter(2); merge = actx.createChannelMerger(2);
  chG = { a: g(), b: g(), c: g(), d: g() };
  split.connect(chG.a, 0); split.connect(chG.b, 1); split.connect(chG.c, 0); split.connect(chG.d, 1);
  chG.a.connect(merge, 0, 0); chG.b.connect(merge, 0, 0); chG.c.connect(merge, 0, 1); chG.d.connect(merge, 0, 1);
  volG = g(); analyser = actx.createAnalyser(); analyser.fftSize = 16384; analyser.smoothingTimeConstant = 0.82; analyser.minDecibels = -120; analyser.maxDecibels = 0;
  merge.connect(volG); volG.connect(analyser); analyser.connect(actx.destination);
  live.nodes = []; for (var i = 0; i < 12; i++) { var n = actx.createBiquadFilter(); n.type = 'peaking'; n.gain.value = 0; live.nodes.push(n); if (i) live.nodes[i - 1].connect(n); }
  liveDry = g(); liveInv = g(); liveInv.gain.value = -1;
  routeLive(); updateLiveEQ(); applyCh(); applyVol(); applyMonGain();
}
function routeLive() {
  if (!actx) return;
  [monGain, live.nodes[11], liveDry, liveInv].forEach(function (n) { try { n.disconnect(); } catch (e) {} });
  if (UI.mon !== 'live') { monGain.connect(split); return; }
  monGain.connect(live.nodes[0]);
  if (UI.liveMode === 'delta') { live.nodes[11].connect(liveInv); liveInv.connect(split); monGain.connect(liveDry); liveDry.connect(split); }   // original − EQ(original)
  else live.nodes[11].connect(split);
}
/* Modos de la escucha en vivo: 'result' (original con EQ), 'delta' (solo lo que quita el EQ), 'solo' (solo la zona de una banda) */
function setLiveMode(m, bandIdx) {
  if (!A.orig) return; UI.liveMode = m;
  if (m === 'solo') { var i = bandIdx != null ? bandIdx : (EQED.eq ? EQED.eq.sel() : -1); if (i < 0) i = S.eq.bands.findIndex(function (b) { return b.on; }); if (i < 0) { UI.liveMode = 'result'; setStatus('Primero tocá o activá una bolita para escuchar su zona.', true); } else { live.solo = i; S.eq.bands[i].on = true; } }
  else live.solo = -1;
  if (UI.mon !== 'live') { UI.mon = 'live'; syncSeg(); drawWave(); scheduleSpec(); }
  updateLiveEQ(); routeLive(); applyMonGain(); syncLiveSeg(); if (EQED.eq) EQED.eq.draw(); refreshAllCtl();
  var msg = { result: 'EQ en vivo: escuchás el original con el EQ de corrección aplicado, sin procesar.', delta: 'Escuchás SOLO lo que quita (o agrega) el EQ, en vivo y sin procesar. Bajá una campana con Q alto y barrela por la frecuencia: cuando oís justo el sonido molesto, la encontraste.', solo: 'Escuchás solo la zona de la banda ' + (live.solo + 1) + ' (filtro pasa-banda), sin procesar.' }[UI.liveMode];
  setStatus(msg);
}
function syncLiveSeg() { var seg = $('liveSeg'); if (seg) Array.prototype.forEach.call(seg.children, function (b) { b.classList.toggle('on', UI.mon === 'live' && b.dataset.m === UI.liveMode); }); $('lblDG').style.opacity = (UI.mon === 'delta' || (UI.mon === 'live' && UI.liveMode === 'delta')) ? 1 : .45; }
/* Web Audio: hp/lp usan Q en dB; los shelves ignoran Q (equivale a Butterworth, igual que el procesado offline) */
function updateLiveEQ() {
  if (!actx) return; var t = actx.currentTime, on = S.eq.on;
  function set(n, type, f, g, q) { if (n.type !== type) n.type = type; n.frequency.setTargetAtTime(clamp(f, 10, actx.sampleRate * 0.45), t, 0.008); n.gain.setTargetAtTime(g, t, 0.008); n.Q.setTargetAtTime(q, t, 0.008); }
  function bypass(n) { set(n, 'peaking', 1000, 0, 1); }
  for (var i = 0; i < 6; i++) {
    var b = S.eq.bands[i], n1 = live.nodes[2 * i], n2 = live.nodes[2 * i + 1];
    if (live.solo >= 0) { if (i === live.solo) { set(n1, 'bandpass', b.f, 0, Math.max(b.q, 0.7)); bypass(n2); } else { bypass(n1); bypass(n2); } continue; }
    if (!on || !b.on) { bypass(n1); bypass(n2); continue; }
    if (b.type === 'hp' || b.type === 'lp') { var qdb = 20 * Math.log10(0.7071); set(n1, b.type === 'hp' ? 'highpass' : 'lowpass', b.f, 0, qdb); if (b.slope === 24) set(n2, b.type === 'hp' ? 'highpass' : 'lowpass', b.f, 0, qdb); else bypass(n2); }
    else if (b.type === 'lowshelf' || b.type === 'highshelf') { set(n1, b.type, b.f, b.g, 1); bypass(n2); }
    else if (b.type === 'notch') { set(n1, 'notch', b.f, 0, b.q); bypass(n2); }
    else { set(n1, 'peaking', b.f, b.g, b.q); bypass(n2); }
  }
}
function setSolo(i) { if (live.solo === i) setLiveMode('result'); else setLiveMode('solo', i); }
function applyCh() {
  if (!chG) return; var m = { st: [1, 0, 0, 1], mono: [.5, .5, .5, .5], L: [1, 0, 1, 0], R: [0, 1, 0, 1] }[UI.ch];
  ['a', 'b', 'c', 'd'].forEach(function (k, i) { chG[k].gain.value = m[i]; });
}
function applyVol() { if (volG) volG.gain.value = Math.pow($('vol').value / 100, 2); }
function curBuf() { return (UI.mon === 'proc' && A.proc) ? A.proc : (UI.mon === 'delta' && A.delta) ? A.delta : A.orig; }
function monLevel() {
  if (UI.mon === 'proc' && A.meterP && A.meterO && UI.match) return lin(clamp(A.meterO.I - A.meterP.I, -18, 18));
  if (UI.mon === 'live' && UI.liveMode === 'delta') return lin(12 + UI.deltaGain);   // ayuda de +12 dB: lo que quita un EQ suele ser mucho más suave que la música
  if (UI.mon === 'delta') return lin(clamp(-14 - 20 * Math.log10(A.deltaPeak + 1e-12), -20, 70) + UI.deltaGain);   // el pico de la diferencia se lleva a −14 dBFS; el control ajusta desde ahí
  return 1;
}
function applyMonGain() { if (monGain) monGain.gain.setTargetAtTime(monLevel(), actx.currentTime, 0.015); }
function stopSrc() { var s = P.src; P.src = null; if (s) { s.onended = null; try { s.stop(); } catch (e) {} try { s.disconnect(); } catch (e) {} } }
function startAt(off) {
  stopSrc(); var b = curBuf(); if (!b) return;
  var s = actx.createBufferSource(); s.buffer = b; s.connect(monGain);
  if (UI.loopOn && UI.loop && UI.loop[1] - UI.loop[0] > 0.05) { s.loop = true; s.loopStart = UI.loop[0]; s.loopEnd = UI.loop[1]; }
  s.start(0, clamp(off, 0, A.dur - 0.001)); P.src = s; P.t0 = actx.currentTime; P.off = off; P.playing = true;
  s.onended = function () { if (P.src === s) { P.src = null; P.playing = false; P.off = A.dur; updBtns(); } };
  updBtns();
}
function pos() {
  if (!P.playing) return P.off;
  var t = P.off + (actx.currentTime - P.t0);
  if (UI.loopOn && UI.loop && UI.loop[1] - UI.loop[0] > 0.05 && t > UI.loop[1]) t = UI.loop[0] + ((t - UI.loop[0]) % (UI.loop[1] - UI.loop[0]));
  return Math.min(t, A.dur);
}
function togglePlay() {
  if (!A.orig) return; actx.resume();
  if (P.playing) { P.off = pos(); stopSrc(); P.playing = false; } else { if (P.off >= A.dur - 0.05) P.off = 0; startAt(P.off); }
  updBtns();
}
function stopAll() { if (!A.orig) return; stopSrc(); P.playing = false; P.off = UI.loopOn && UI.loop ? UI.loop[0] : 0; updBtns(); }
function seek(t) { t = clamp(t, 0, A.dur); if (P.playing) startAt(t); else P.off = t; }
function refreshSource() { var was = P.playing, p = pos(); routeLive(); if (was) startAt(p); applyMonGain(); }
function updBtns() { $('bPlay').textContent = P.playing ? '❚❚ Pausa' : '▶ Play'; }
