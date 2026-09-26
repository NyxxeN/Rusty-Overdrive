/* Rusty Overdrive Corrector · ui/10-worker-client.js
   Cliente del Worker: el motor de audio vive en un Web Worker creado desde un Blob (todo en un solo HTML). */
var wsrc = $('common-src').textContent + '\n' + $('lame-src').textContent + '\n' + $('dsp-src').textContent;
var worker = new Worker(URL.createObjectURL(new Blob([wsrc], { type: 'text/javascript' })));
var pending = {}, reqId = 0;
worker.onmessage = function (e) {
  var m = e.data;
  if (m.type === 'progress') { setProgress(m.label, m.frac); return; }
  var cb = pending[m.id]; if (cb) { delete pending[m.id]; cb(m); }
};
worker.onerror = function (e) { setStatus('Error en el motor: ' + e.message, true); };
function ask(msg, transfer) {
  return new Promise(function (res, rej) {
    var id = ++reqId; msg.id = id;
    pending[id] = function (m) { if (m.type === 'error') rej(new Error(m.message)); else res(m); };
    worker.postMessage(msg, transfer || []);
  });
}
function setStatus(t, bad) { var s = $('status'); s.textContent = t; s.style.color = bad ? 'var(--bad)' : '#9fb0cf'; }
function setProgress(label, f) { $('progress').firstElementChild.style.width = (f * 100).toFixed(0) + '%'; if (label) setStatus(label + '…'); }
function endProgress() { $('progress').firstElementChild.style.width = '0'; }
