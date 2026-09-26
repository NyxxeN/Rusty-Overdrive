/* Rusty Overdrive Corrector · ui/60-actions.js
   Acciones: abrir archivo, procesar, monitores, exportar. */
var procTimer = null;
function markDirty() { A.dirty = true; $('bProc').classList.add('dirty'); saveParams(); if (UI.auto) scheduleProcess(700); }
function scheduleProcess(ms) { clearTimeout(procTimer); procTimer = setTimeout(processNow, ms); }
function setSignal(on) { var s = $('signLive'); s.textContent = on ? 'SEÑAL OK' : 'SIN SEÑAL'; s.classList.toggle('on', on); }

async function openFile(file) {
  try {
    setStatus('Leyendo ' + file.name + '…'); stopSrc(); P.playing = false; P.off = 0;
    var ab = await file.arrayBuffer(), sr = sniffWavRate(ab);
    if (actx) { try { actx.close(); } catch (e) {} actx = null; }
    try { actx = new AudioContext(sr ? { sampleRate: sr } : {}); } catch (e) { actx = new AudioContext(); }
    setStatus('Decodificando…');
    var buf = await actx.decodeAudioData(ab.slice(0));
    var n = buf.length, L = buf.getChannelData(0).slice(), R = buf.numberOfChannels > 1 ? buf.getChannelData(1).slice() : L.slice();
    A.orig = actx.createBuffer(2, n, buf.sampleRate); A.orig.copyToChannel(L, 0); A.orig.copyToChannel(R, 1);
    A.sr = buf.sampleRate; A.dur = n / A.sr; A.name = file.name.replace(/\.[^.]+$/, ''); A.proc = null; A.delta = null; A.meterP = null; A.hfP = null; A.ltasPre = null; A.ltasP = null; A.tones = []; A.nova = []; A.compStats = null; A.outInfo = null;
    UI.v0 = 0; UI.v1 = A.dur; UI.loop = null; UI.loopOn = false; $('chkLoop').checked = false; UI.mon = 'orig'; live.solo = -1; syncSeg();
    buildGraph();
    $('fileInfo').textContent = file.name + ' · ' + A.sr + ' Hz · ' + (buf.numberOfChannels > 1 ? 'estéreo' : 'mono (duplicado)') + ' · ' + fmtT(A.dur) + (sr ? '' : ' · decodificado por el navegador');
    setStatus('Midiendo el original…');
    var res = await ask({ type: 'load', sr: A.sr, L: L, R: R }, [L.buffer, R.buffer]);
    A.meterO = res.meter; A.hfO = res.hf; A.ltasO = res.ltas; endProgress(); setSignal(true);
    setStatus('Listo. Original: ' + f1(A.meterO.I) + ' LUFS · true peak ' + f1(A.meterO.tp) + ' dBTP');
    ['bPlay', 'bStop', 'bProc'].forEach(function (i) { $(i).disabled = false; });
    redrawAll(); updateMeters(); updateExport(); refreshAllCtl();
    if (UI.auto) scheduleProcess(50);
  } catch (e) { console.error(e); setStatus('No pude abrir el archivo: ' + e.message, true); endProgress(); }
}

async function processNow() {
  if (!A.orig) return; if (A.busy) { A.dirty = true; return; }
  A.busy = true; A.dirty = false; $('bProc').classList.remove('dirty'); $('bProc').disabled = true; var t0 = Date.now();
  try {
    var m = await ask({ type: 'process', params: clone(S) });
    var first = !A.proc;
    A.proc = actx.createBuffer(2, m.L.length, A.sr); A.proc.copyToChannel(m.L, 0); A.proc.copyToChannel(m.R, 1);
    A.meterP = m.meter; A.hfP = m.hf; A.tones = m.tones || []; A.outInfo = m.out; A.delta = null; A.nova = m.nova || []; A.ltasPre = m.ltasPre; A.ltasP = m.ltas; A.compStats = m.info && m.info.comp;
    endProgress();
    setStatus('Procesado en ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s · ' + f1(A.meterP.I) + ' LUFS · true peak ' + f1(A.meterP.tp) + ' dBTP');
    if (first && UI.mon === 'orig') { UI.mon = 'proc'; syncSeg(); }
    if (UI.mon === 'delta') await ensureDelta();
    refreshSource(); redrawAll(); updateMeters(); updateToneInfo(); updateNovaStat(); updateCompStat(); updateExport();
  } catch (e) { console.error(e); setStatus('Error al procesar: ' + e.message, true); endProgress(); }
  A.busy = false; $('bProc').disabled = false;
  if (A.dirty && UI.auto) scheduleProcess(100);
}
async function ensureDelta() {
  if (A.delta || !A.proc) return;
  setStatus('Calculando la diferencia…'); var m = await ask({ type: 'delta' });
  A.delta = actx.createBuffer(2, m.L.length, A.sr); A.delta.copyToChannel(m.L, 0); A.delta.copyToChannel(m.R, 1);
  var pk = 1e-12, i; for (i = 0; i < m.L.length; i += 3) { var v = Math.max(Math.abs(m.L[i]), Math.abs(m.R[i])); if (v > pk) pk = v; } A.deltaPeak = pk; endProgress();
  var pkDb = 20 * Math.log10(pk);
  if (pkDb < -80) setStatus('La diferencia es prácticamente nula (pico ' + f1(pkDb) + ' dBFS): con los ajustes actuales casi no se está cambiando nada.', true);
  else setStatus('Escuchás lo que se quita, con nivel igualado y ampliado automáticamente (pico original de la diferencia: ' + f1(pkDb) + ' dBFS).');
}
async function setMonitor(v) {
  if (!A.orig) return;
  if ((v === 'proc' || v === 'delta') && !A.proc) { setStatus('Primero tocá “Procesar”.', true); return; }
  if (v === 'delta') await ensureDelta();
  UI.mon = v; syncSeg(); refreshSource(); drawWave(); scheduleSpec(); syncLiveSeg();
  if (v === 'live') setLiveMode(UI.liveMode); else { live.solo = -1; updateLiveEQ(); syncLiveSeg(); }
}
function syncSeg() {
  Array.prototype.forEach.call($('segMon').children, function (b) { b.classList.toggle('on', b.dataset.v === UI.mon); });
  Array.prototype.forEach.call($('segCh').children, function (b) { b.classList.toggle('on', b.dataset.v === UI.ch); });
  $('lblDG').style.opacity = UI.mon === 'delta' ? 1 : .45;
}

/* ---------- Exportación ---------- */
async function decodeBytes(bytes, sr) { var oc = new OfflineAudioContext(2, 1, sr), b = await oc.decodeAudioData(bytes); var L = b.getChannelData(0).slice(), R = (b.numberOfChannels > 1 ? b.getChannelData(1) : b.getChannelData(0)).slice(); return { L: L, R: R }; }
async function doExport() {
  if (!A.orig) return; var btn = $('bExport'), out = $('expOut'); btn.disabled = true;
  try {
    if (!A.proc || A.dirty) { setStatus('Procesando antes de exportar…'); await processNow(); }
    var fmt = expState.fmt, sr = expState.sr === 'src' ? A.sr : +expState.sr, opt = { fmt: fmt, sr: sr, kbps: 320, ceil: S.out.ceil, dither: expState.dither, trimDb: 0 }, trim = 0, tries = 0, res, ver = null;
    for (;;) {
      opt.trimDb = trim; res = await ask({ type: 'export', opt: opt });
      if (fmt === 'mp3' && expState.verify) {
        setStatus('Verificando el MP3 decodificado…'); var dec = await decodeBytes(res.bytes.slice(0), sr);
        var mm = await ask({ type: 'measure', L: dec.L, R: dec.R, sr: sr, ceil: S.out.ceil }, [dec.L.buffer, dec.R.buffer]); ver = mm.meter;
        if (ver.tp > S.out.ceil + 0.05 && tries < 2) { trim -= (ver.tp - S.out.ceil) + 0.05; tries++; continue; }
      }
      break;
    }
    endProgress(); var ext = fmt === 'mp3' ? 'mp3' : 'wav', name = A.name + '_master.' + ext, blob = new Blob([res.bytes], { type: res.mime }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    out.innerHTML = '<b>' + name + '</b> · ' + (res.info.size / 1048576).toFixed(1) + ' MB · ' + res.info.sr + ' Hz · estéreo' + (fmt === 'mp3' ? ' · 320 kbps' : '') + (ver ? '<br>MP3 decodificado: ' + f1(ver.I) + ' LUFS · true peak <span class="' + tcls(ver.tp, S.out.ceil + 0.05) + '">' + f2(ver.tp) + ' dBTP</span>' + (tries ? ' (se bajó ' + f2(-trim) + ' dB para respetar el techo)' : '') : '');
    setStatus('Exportado: ' + name);
  } catch (e) { console.error(e); setStatus('Error al exportar: ' + e.message, true); out.textContent = 'Error: ' + e.message; endProgress(); }
  btn.disabled = false;
}
