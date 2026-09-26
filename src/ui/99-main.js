/* Rusty Overdrive Corrector · ui/99-main.js
   Inicialización y eventos globales. */
function init() {
  buildSkyline();
  var so = $('styleOpts'); Object.keys(STYLES).forEach(function (k) { var o = el('option', '', STYLES[k].name); o.value = k; so.appendChild(o); });
  $('btnOpen').addEventListener('click', function () { $('file').click(); });
  $('file').addEventListener('change', function () { if (this.files[0]) openFile(this.files[0]); this.value = ''; });
  var dz = $('drop'); ['dragenter', 'dragover'].forEach(function (ev) { window.addEventListener(ev, function (e) { e.preventDefault(); dz.style.display = 'flex'; }); });
  ['dragleave', 'drop'].forEach(function (ev) { window.addEventListener(ev, function (e) { e.preventDefault(); if (ev === 'drop' || e.target === dz) dz.style.display = 'none'; }); });
  window.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) openFile(f); });
  $('bPlay').addEventListener('click', togglePlay); $('bStop').addEventListener('click', stopAll); $('bProc').addEventListener('click', processNow);
  $('segMon').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setMonitor(b.dataset.v); });
  $('segCh').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { UI.ch = b.dataset.v; syncSeg(); applyCh(); } });
  $('vol').addEventListener('input', applyVol);
  $('chkMatch').addEventListener('change', function () { UI.match = this.checked; applyMonGain(); });
  $('dgain').addEventListener('input', function () { UI.deltaGain = +this.value; $('lblDG').textContent = 'Δ ' + (this.value > 0 ? '+' : '') + this.value + ' dB'; applyMonGain(); });
  $('chkLoop').addEventListener('change', function () { UI.loopOn = this.checked; if (UI.loopOn && !UI.loop) UI.loop = [pos(), Math.min(A.dur, pos() + 4)]; if (P.playing) startAt(pos()); });
  $('chkAuto').addEventListener('change', function () { UI.auto = this.checked; if (UI.auto && A.dirty) scheduleProcess(100); });
  $('preset').addEventListener('change', function () { if (this.value) applyPreset(this.value); });
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) buildTab(b.dataset.t); });
  $('specScale').addEventListener('change', function () { UI.scale = this.value; drawSpec(); }); $('specC').addEventListener('input', function () { UI.spec = +this.value; scheduleSpec(); });
  window.addEventListener('resize', function () { redrawAll(); });
  window.addEventListener('keydown', function (e) {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== 'range' && document.activeElement.type !== 'checkbox') return;
    if (!A.orig) return; var k = e.key;
    if (k === ' ') { e.preventDefault(); togglePlay(); } else if (k === '1') setMonitor('orig'); else if (k === '2') setMonitor('proc'); else if (k === '3') setMonitor('delta'); else if (k === '4') setMonitor('live');
    else if (k === 'm' || k === 'M') { UI.ch = UI.ch === 'mono' ? 'st' : 'mono'; syncSeg(); applyCh(); } else if (k === 'l' || k === 'L') { $('chkLoop').click(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); seek(pos() - (e.shiftKey ? 1 : 5)); } else if (k === 'ArrowRight') { e.preventDefault(); seek(pos() + (e.shiftKey ? 1 : 5)); } else if (k === 'Home') { seek(0); }
  });
  buildTab('fix'); syncSeg(); redrawAll(); requestAnimationFrame(frame);
  window.__app = { get S() { return S; }, A: A, monLevel: monLevel, UI: UI, openFile: openFile, processNow: processNow, setMonitor: setMonitor, applyPreset: applyPreset, ask: ask, doExport: doExport, togglePlay: togglePlay, seek: seek, setView: setView, pos: pos, EQED: EQED, live: live, setLiveMode: setLiveMode, CM: CM, getAnalyser: function () { return analyser; } };
}
init();
