/* Rusty Overdrive Corrector · ui/50-panels.js
   Panel lateral: controles generados desde el estado, pestañas, medidor y simulador de plataformas. */
var REFRESH = [];
function fmtVal(v, unit, step) { var d = step >= 1 ? 0 : (step >= 0.1 ? 1 : 2); if (unit === 'Hz' && v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 1 : 2) + ' kHz'; return v.toFixed(d) + (unit ? ' ' + unit : ''); }
function ctl(parent, obj, c) {
  var row = el('div', 'ctl'), lab = el('label', '', c.label), inp = el('input'), out = el('output');
  inp.type = 'range'; if (c.title) row.title = c.title;
  if (c.log) { inp.min = 0; inp.max = 1000; inp.step = 1; } else { inp.min = c.min; inp.max = c.max; inp.step = c.step; }
  function toPos(v) { return c.log ? Math.round(Math.log(v / c.min) / Math.log(c.max / c.min) * 1000) : v; }
  function toVal(p) { if (!c.log) return +p; var v = c.min * Math.exp(p / 1000 * Math.log(c.max / c.min)), u = v > 2000 ? 50 : (v > 400 ? 10 : 1); return c.step >= 1 ? Math.round(v / u) * u : v; }
  function refresh() { inp.value = toPos(obj[c.k]); out.textContent = fmtVal(obj[c.k], c.unit, c.step); }
  inp.addEventListener('input', function () { obj[c.k] = toVal(inp.value); out.textContent = fmtVal(obj[c.k], c.unit, c.step); markDirty(); });
  row.appendChild(lab); row.appendChild(inp); row.appendChild(out); parent.appendChild(row); REFRESH.push(refresh); refresh(); return row;
}
function sw(obj, key, onchange) { var s = el('label', 'sw'), i = el('input'), b = el('i'); i.type = 'checkbox'; s.appendChild(i); s.appendChild(b); function r() { i.checked = !!obj[key]; } i.addEventListener('change', function () { obj[key] = i.checked; onchange && onchange(i.checked); markDirty(); }); i.addEventListener('click', function (e) { e.stopPropagation(); }); REFRESH.push(r); r(); return s; }
function card(title, help, obj, ctrls, extra) {
  var c = el('div', 'card'), h = el('h3', '', '<span>' + title + '</span>'), body = el('div', 'body');
  function sync() { c.classList.toggle('off', !obj.on); } var s = sw(obj, 'on', sync);
  h.appendChild(s); h.addEventListener('click', function (e) { if (e.target.closest('.sw')) return; body.classList.toggle('hidden'); });
  if (help) body.appendChild(el('p', 'help', help)); ctrls.forEach(function (x) { ctl(body, obj, x); }); if (extra) extra(body); REFRESH.push(sync); sync(); c.appendChild(h); c.appendChild(body); return c;
}
var TYPES = [['hp', 'Pasa-altos'], ['lowshelf', 'Shelf grave'], ['peak', 'Campana'], ['highshelf', 'Shelf agudo'], ['lp', 'Pasa-bajos'], ['notch', 'Notch']];
function eqCard(key, title, help, extra) {
  var c = el('div', 'card'), h = el('h3', '', '<span>' + title + '</span>'), body = el('div', 'body');
  /* Cualquier cambio en el EQ de corrección (sliders, tipo, encendido, bolitas) pasa solo a la escucha en vivo: así se oye sin procesar */
  function goLive() { if (key === 'eq' && A.orig && UI.mon !== 'live') setLiveMode(UI.liveMode === 'solo' ? 'result' : UI.liveMode); }
  h.appendChild(sw(S[key], 'on', function (v) { c.classList.toggle('off', !v); if (key === 'eq') { goLive(); updateLiveEQ(); } if (EQED[key]) EQED[key].draw(); })); REFRESH.push(function () { c.classList.toggle('off', !S[key].on); });
  h.addEventListener('click', function (e) { if (e.target.closest('.sw')) return; body.classList.toggle('hidden'); });
  body.appendChild(el('p', 'help', help));
  if (key === 'eq') {
    var seg = el('div', 'seg'); seg.id = 'liveSeg'; seg.style.margin = '0 0 8px';
    [['result', 'Con EQ', 'Escuchás el original con el EQ aplicado (en vivo, sin procesar)'], ['delta', 'Solo lo que quita', 'Escuchás la diferencia original − EQ en vivo, sin procesar: ideal para encontrar la frecuencia molesta'], ['solo', 'Solo la banda', 'Escuchás únicamente la zona de la bolita seleccionada']].forEach(function (m) { var b = el('button', '', m[0] === 'delta' ? m[1] : m[1]); b.dataset.m = m[0]; b.title = m[2]; b.addEventListener('click', function (e) { e.stopPropagation(); setLiveMode(m[0]); }); seg.appendChild(b); });
    body.appendChild(seg); REFRESH.push(syncLiveSeg);
  }
  var ed = createEQEditor(key, { h: 210, tag: key === 'eq' ? 'Bolitas: arrastrar · rueda = Q · doble clic = on/off · clic der. = solo' : 'Gris = tu mezcla vs referencia · ámbar = resultado · zona cian = ±4 dB' });
  body.appendChild(ed.el); if (extra) extra(body);
  S[key].bands.forEach(function (b, i) {
    var row = el('div', 'eqrow'), dot = el('div', 'dot'); dot.style.color = BAND_COL[i]; dot.style.background = BAND_COL[i];
    var oi = el('input'), on = el('label', 'sw'), ob = el('i'); oi.type = 'checkbox'; on.appendChild(oi); on.appendChild(ob);
    oi.addEventListener('change', function () { b.on = oi.checked; if (b.on) S[key].on = true; markDirty(); if (key === 'eq') { goLive(); updateLiveEQ(); } ed.draw(); }); REFRESH.push(function () { oi.checked = b.on; });
    var sel = el('select'); TYPES.forEach(function (t) { var o = el('option', '', t[1]); o.value = t[0]; sel.appendChild(o); });
    var slopeSel = el('select'); [12, 24].forEach(function (s) { var o = el('option', '', s + ' dB/oct'); o.value = s; slopeSel.appendChild(o); });
    var soloBtn = null; if (key === 'eq') { soloBtn = el('button', 'solo', 'Escuchar'); soloBtn.title = 'Escuchás solo esa zona (filtro pasa-banda) para encontrar la frecuencia molesta'; soloBtn.addEventListener('click', function () { b.on = true; S.eq.on = true; setSolo(i); }); }
    var top = el('div', 'top'); top.appendChild(on); top.appendChild(sel); top.appendChild(slopeSel); if (soloBtn) top.appendChild(soloBtn);
    var sub = el('div', 'sub'), minis = [];
    function mini(label, k, min, max, step, unit, log) { var m = el('div', 'mini'), sp = el('span', '', label + ' <b></b>'), inp = el('input'); inp.type = 'range'; if (log) { inp.min = 0; inp.max = 1000; } else { inp.min = min; inp.max = max; inp.step = step; }
      function r() { inp.value = log ? Math.round(Math.log(b[k] / min) / Math.log(max / min) * 1000) : b[k]; sp.lastChild.textContent = fmtVal(b[k], unit, step); }
      inp.addEventListener('input', function () { var v = log ? min * Math.exp(inp.value / 1000 * Math.log(max / min)) : +inp.value; if (log) v = v > 2000 ? Math.round(v / 50) * 50 : (v > 400 ? Math.round(v / 10) * 10 : Math.round(v)); b[k] = v; sp.lastChild.textContent = fmtVal(v, unit, step); if (!S[key].on && b.on) S[key].on = true; markDirty(); if (key === 'eq') { goLive(); updateLiveEQ(); } ed.draw(); });
      REFRESH.push(r); r(); m.appendChild(sp); m.appendChild(inp); minis.push([k, m]); return m; }
    sub.appendChild(mini('Frec', 'f', 20, 20000, 1, 'Hz', true)); sub.appendChild(mini('Gan', 'g', -18, 18, 0.1, 'dB')); sub.appendChild(mini('Q', 'q', 0.3, 10, 0.05, ''));
    function vis() { sel.value = b.type; slopeSel.value = b.slope; var isF = b.type === 'hp' || b.type === 'lp', isSh = b.type === 'lowshelf' || b.type === 'highshelf'; slopeSel.style.display = isF ? '' : 'none'; minis.forEach(function (x) { x[1].style.visibility = ((x[0] === 'g' && (isF || b.type === 'notch')) || (x[0] === 'q' && (isF || isSh))) ? 'hidden' : 'visible'; }); if (soloBtn) soloBtn.classList.toggle('on', live.solo === i); }
    sel.addEventListener('change', function () { b.type = sel.value; vis(); markDirty(); if (key === 'eq') { goLive(); updateLiveEQ(); } ed.draw(); }); slopeSel.addEventListener('change', function () { b.slope = +slopeSel.value; markDirty(); if (key === 'eq') { goLive(); updateLiveEQ(); } });
    REFRESH.push(vis); row.appendChild(dot); row.appendChild(top); row.appendChild(sub); row.addEventListener('mousedown', function () { ed.select(i); }); body.appendChild(row);
  });
  REFRESH.push(function () { ed.draw(); });
  c.appendChild(h); c.appendChild(body); return c;
}
var NOVA_MODES = [['comp', 'Bajar al pasar el umbral'], ['exp', 'Bajar cuando cae bajo el umbral'], ['up', 'Subir al pasar el umbral']];
var NOVA_TYPES = [['peak', 'Campana'], ['lowshelf', 'Shelf grave'], ['highshelf', 'Shelf agudo']];
function novaCard() {
  var c = el('div', 'card'), h = el('h3', '', '<span>Neon Scalpel · EQ dinámico</span>'), body = el('div', 'body');
  function sync() { c.classList.toggle('off', !S.nova.on); } h.appendChild(sw(S.nova, 'on', sync)); REFRESH.push(sync);
  h.addEventListener('click', function (e) { if (e.target.closest('.sw')) return; body.classList.toggle('hidden'); });
  body.appendChild(el('p', 'help', 'Cuatro bandas que actúan solo cuando hace falta: cada una mide su zona y sube o baja según el umbral (como un compresor por frecuencia). Ideal para sibilancia, resonancias que aparecen a veces o brillo que “rasga”.'));
  S.nova.bands.forEach(function (b, i) {
    var d = el('details', 'nband'), sm = el('summary'), inner = el('div', 'nb'); if (i === 0) d.open = true;
    var dot = el('span', '', '●'); dot.style.color = BAND_COL[i]; sm.appendChild(dot); var ttl = el('span', '', ''); sm.appendChild(ttl); var sws = sw(b, 'on', function () { markDirty(); }); sws.style.marginLeft = 'auto'; sm.appendChild(sws);
    function title() { ttl.textContent = 'Banda ' + (i + 1) + ' · ' + fmtHz(b.f) + ' · ' + { comp: 'baja al pasar', exp: 'baja al caer', up: 'sube al pasar' }[b.mode]; } REFRESH.push(title); title();
    var r1 = el('div', 'nrow'), ts = el('select'), ms = el('select'); NOVA_TYPES.forEach(function (t) { var o = el('option', '', t[1]); o.value = t[0]; ts.appendChild(o); }); NOVA_MODES.forEach(function (m) { var o = el('option', '', m[1]); o.value = m[0]; ms.appendChild(o); });
    ts.addEventListener('change', function () { b.type = ts.value; markDirty(); }); ms.addEventListener('change', function () { b.mode = ms.value; title(); markDirty(); }); REFRESH.push(function () { ts.value = b.type; ms.value = b.mode; }); r1.appendChild(ts); r1.appendChild(ms); inner.appendChild(r1);
    [{ k: 'f', label: 'Frecuencia', min: 40, max: 16000, step: 1, unit: 'Hz', log: true }, { k: 'q', label: 'Q', min: 0.3, max: 8, step: 0.05, unit: '' }, { k: 'g', label: 'Ganancia estática', min: -12, max: 12, step: 0.5, unit: 'dB' },
      { k: 'thr', label: 'Umbral', min: -60, max: 0, step: 1, unit: 'dB' }, { k: 'ratio', label: 'Ratio', min: 1.2, max: 10, step: 0.1, unit: ':1' }, { k: 'maxDyn', label: 'Cambio dinámico máx.', min: 1, max: 18, step: 0.5, unit: 'dB' },
      { k: 'att', label: 'Ataque', min: 0.5, max: 100, step: 0.5, unit: 'ms' }, { k: 'rel', label: 'Liberación', min: 10, max: 800, step: 5, unit: 'ms' }].forEach(function (cc) { ctl(inner, b, cc); });
    d.appendChild(sm); d.appendChild(inner); body.appendChild(d);
  });
  var stat = el('div', 'stat'); stat.id = 'novaStat'; body.appendChild(stat); c.appendChild(h); c.appendChild(body); return c;
}
function styleCard() {
  var c = el('div', 'card'); c.innerHTML = '<h3><span>Master por estilo</span></h3><div class="body"><p class="help">Punto de partida para <b>masterizar</b> (no para escuchar): EQ de master suave, compresión y nivel de entrega. Después podés ajustar todo lo de abajo.</p><div class="ctl" style="grid-template-columns:80px 1fr 90px"><label>Estilo</label><select id="styleSel"></select><button id="styleApply">Aplicar</button></div><div class="styledesc" id="styleDesc"></div></div>';
  var sel = c.querySelector('#styleSel'); Object.keys(STYLES).forEach(function (k) { var o = el('option', '', STYLES[k].name); o.value = k; sel.appendChild(o); });
  function desc() { var st = STYLES[sel.value]; c.querySelector('#styleDesc').innerHTML = st.desc + '<br><span class="note">Objetivo: <b>' + st.target + ' LUFS</b> · techo <b>' + st.ceil + ' dBTP</b> · rango recomendado: ' + st.range + (st.median ? ' · mediana comercial medida: ' + st.median : '') + '</span>'; }
  sel.addEventListener('change', desc); c.querySelector('#styleApply').addEventListener('click', function () { applyPreset(sel.value); }); REFRESH.push(function () { sel.value = S.style; desc(); }); return c;
}
function buildTab(t) {
  UI.tab = t; EQED.eq = null; EQED.meq = null; var body = $('tabBody'); body.innerHTML = ''; REFRESH.length = 0;
  Array.prototype.forEach.call($('tabs').children, function (b) { b.classList.toggle('on', b.dataset.t === t); });
  if (t === 'fix') {
    var tonesInfo;
    body.appendChild(card('1 · Tonos persistentes (peine)', 'Detecta picos tonales estrechos que se repiten en todo el tema (típicos de la generación por IA o de conversiones de frecuencia de muestreo, sobre todo entre 8 y 18 kHz) y los baja de forma quirúrgica.', S.tones, [
      { k: 'thr', label: 'Sensibilidad', min: 3, max: 12, step: .5, unit: 'dB', title: 'Cuánto debe sobresalir un pico del entorno para tratarlo (menos = más sensible)' },
      { k: 'maxRed', label: 'Reducción máx.', min: 2, max: 15, step: .5, unit: 'dB' },
      { k: 'fLo', label: 'Desde', min: 1000, max: 20000, step: 100, unit: 'Hz', log: true }, { k: 'fHi', label: 'Hasta', min: 1000, max: 22000, step: 100, unit: 'Hz', log: true }],
      function (b) { tonesInfo = el('div', 'stat'); tonesInfo.id = 'toneInfo'; b.appendChild(tonesInfo); }));
    body.appendChild(eqCard('eq', '2 · EQ de corrección (6 bandas)', '<b>Todo esto suena en vivo, sin procesar.</b> Elegí qué escuchar: <b>Con EQ</b> (el resultado), <b>Solo lo que quita</b> (la diferencia: bajá una campana con Q alto y barrela hasta oír justo el sonido molesto) o <b>Solo la banda</b> (esa zona aislada). Cuando estés conforme, tocá <b>Procesar</b>. Los otros módulos (ruido, de-esser, colas, Neon Scalpel) sí necesitan procesar.'));
    body.appendChild(novaCard());
    body.appendChild(card('3 · Ruido de fondo (estática)', 'Reducción espectral de ruido estacionario. El perfil se aprende de los momentos más bajos del propio tema.', S.nr, [
      { k: 'over', label: 'Intensidad', min: .5, max: 2, step: .05, unit: '×' }, { k: 'maxRed', label: 'Reducción máx.', min: 2, max: 12, step: .5, unit: 'dB' },
      { k: 'rel', label: 'Liberación', min: 40, max: 400, step: 10, unit: 'ms' }, { k: 'lo', label: 'Desde', min: 1000, max: 8000, step: 100, unit: 'Hz', log: true }, { k: 'hi', label: 'Hasta', min: 4000, max: 16000, step: 100, unit: 'Hz', log: true }]));
    body.appendChild(card('4 · De-esser / EQ dinámico de banda ancha', 'Baja una banda solo cuando se pasa de su nivel habitual (sibilancia, platillos que “rasgan”). Para algo más fino usá Neon Scalpel.', S.dess, [
      { k: 'f1', label: 'Desde', min: 2000, max: 12000, step: 100, unit: 'Hz', log: true }, { k: 'f2', label: 'Hasta', min: 4000, max: 20000, step: 100, unit: 'Hz', log: true },
      { k: 'over', label: 'Umbral (sobre lo habitual)', min: 0, max: 8, step: .5, unit: 'dB' }, { k: 'ratio', label: 'Ratio', min: 1.5, max: 10, step: .5, unit: ':1' }, { k: 'maxRed', label: 'Reducción máx.', min: 2, max: 15, step: .5, unit: 'dB' }]));
    body.appendChild(card('5 · Colas agudas', 'Acorta la cola de hi-hats y platillos entre golpes cuando el piso agudo sube (mirá el gráfico “Piso agudo”).', S.tail, [
      { k: 'maxRed', label: 'Reducción máx.', min: 2, max: 16, step: .5, unit: 'dB' }, { k: 'f', label: 'Desde', min: 3000, max: 12000, step: 100, unit: 'Hz', log: true }]));
    updateToneInfo(); updateNovaStat();
  } else if (t === 'master') {
    body.appendChild(styleCard());
    body.appendChild(eqCard('meq', 'EQ de master (6 bandas)', 'Movimientos pequeños y con Q ancho (idealmente hasta ~3 dB). La línea gris muestra el espectro de tu mezcla frente a la <b>referencia orientativa</b> del estilo (pendiente de 4,5 dB/oct de los analizadores modernos con desvíos por género); la cian, el resultado. Si la gris se sale del corredor, ahí hay algo para corregir. Es una guía, no una regla.'));
    body.appendChild(card('Compresor de bus (pegamento)', 'Compresión suave sobre toda la mezcla. El umbral es absoluto (dBFS): mirá la reducción media y buscá 1–3 dB.', S.comp, [
      { k: 'thr', label: 'Umbral', min: -40, max: 0, step: .5, unit: 'dB' }, { k: 'ratio', label: 'Ratio', min: 1.1, max: 8, step: .1, unit: ':1' }, { k: 'att', label: 'Ataque', min: 1, max: 100, step: 1, unit: 'ms' },
      { k: 'rel', label: 'Liberación', min: 20, max: 800, step: 10, unit: 'ms' }, { k: 'knee', label: 'Rodilla', min: 0, max: 18, step: 1, unit: 'dB' }, { k: 'makeup', label: 'Ganancia', min: -6, max: 12, step: .5, unit: 'dB' },
      { k: 'mix', label: 'Mezcla', min: 0, max: 100, step: 5, unit: '%', title: '100% = serie · menos = compresión paralela' }, { k: 'hpf', label: 'Filtro detector', min: 20, max: 300, step: 5, unit: 'Hz', title: 'Evita que el bajo mueva el compresor' }],
      function (b) { var s = el('div', 'stat'); s.id = 'compStat'; b.appendChild(s); }));
    var oc = card('Nivel de salida y limitador true-peak', 'Ajusta el volumen final y limita los picos (incluidos los picos entre muestras) para que las plataformas no distorsionen al recodificar.', S.out, [
      { k: 'ceil', label: 'Techo (true peak)', min: -3, max: -0.1, step: .1, unit: 'dBTP' }, { k: 'look', label: 'Lookahead', min: .5, max: 5, step: .1, unit: 'ms' }, { k: 'rel', label: 'Liberación', min: 10, max: 300, step: 5, unit: 'ms' }]);
    var modeRow = el('div', 'ctl'); modeRow.innerHTML = '<label>Modo</label>'; var ms = el('select'); [['lufs', 'Normalizar a LUFS objetivo'], ['manual', 'Ganancia manual + limitar'], ['limit', 'Solo limitar (sin ganancia)']].forEach(function (m) { var o = el('option', '', m[1]); o.value = m[0]; ms.appendChild(o); });
    ms.addEventListener('change', function () { S.out.mode = ms.value; setModeVis(); markDirty(); }); REFRESH.push(function () { ms.value = S.out.mode; }); modeRow.appendChild(ms); modeRow.appendChild(el('span')); oc.querySelector('.body').insertBefore(modeRow, oc.querySelector('.ctl'));
    var tg = ctl(oc.querySelector('.body'), S.out, { k: 'target', label: 'Objetivo', min: -24, max: -6, step: .5, unit: 'LUFS' }), gn = ctl(oc.querySelector('.body'), S.out, { k: 'gain', label: 'Ganancia', min: -12, max: 24, step: .5, unit: 'dB' });
    var firstCtl = oc.querySelectorAll('.ctl')[1]; oc.querySelector('.body').insertBefore(tg, firstCtl); oc.querySelector('.body').insertBefore(gn, firstCtl);
    function setModeVis() { tg.style.display = S.out.mode === 'lufs' ? '' : 'none'; gn.style.display = S.out.mode === 'manual' ? '' : 'none'; } REFRESH.push(setModeVis);
    body.appendChild(oc);
    var mc = el('div', 'card'); mc.innerHTML = '<h3><span>Medidor</span></h3><div class="body"><table class="m" id="meterTbl"></table><div class="chips" id="overChips"></div><p class="help" style="margin-top:8px">Loudness a corto plazo (gris = original, cian = procesado, ámbar = objetivo)</p><div class="cv" style="cursor:default"><canvas id="loudcv" data-h="100"></canvas></div><h4 style="margin:10px 0 4px;font:700 12px var(--font-head);letter-spacing:.1em;text-transform:uppercase;color:var(--dim)">Simulador de plataformas</h4><table class="m" id="platTbl"></table><p class="note" id="platNote"></p></div>'; body.appendChild(mc); updateMeters(); updateCompStat();
  } else if (t === 'exp') {
    var ec = el('div', 'card'); ec.innerHTML = '<h3><span>Exportar</span></h3><div class="body">' +
      '<div class="ctl"><label>Formato</label><select id="expFmt"><option value="mp3">MP3 320 kbps (RouteNote)</option><option value="wav24">WAV 24 bit</option><option value="wav16">WAV 16 bit</option></select><span></span></div>' +
      '<div class="ctl"><label>Frecuencia</label><select id="expSr"><option value="44100">44,1 kHz (RouteNote)</option><option value="48000">48 kHz</option><option value="src">Igual al original</option></select><span></span></div>' +
      '<div class="ctl"><label>Dither</label><label class="chk"><input type="checkbox" id="expDither" checked>TPDF (para 16 bit / MP3)</label><span></span></div>' +
      '<div class="ctl"><label>Verificar</label><label class="chk"><input type="checkbox" id="expVerify" checked>Decodificar el MP3 y medir el pico</label><span></span></div>' +
      '<p class="help">RouteNote pide estéreo, MP3 320 kbps o FLAC, 16 bit y 44,1 kHz. Si el MP3 decodificado supera el techo, se baja unas décimas y se codifica de nuevo (hasta 2 veces).</p>' +
      '<button id="bExport" class="primary" style="width:100%">Exportar y descargar</button><div id="expOut" class="note" style="margin-top:8px"></div></div>'; body.appendChild(ec);
    $('expFmt').value = expState.fmt; $('expSr').value = expState.sr; $('expDither').checked = expState.dither; $('expVerify').checked = expState.verify;
    ['expFmt', 'expSr', 'expDither', 'expVerify'].forEach(function (i) { $(i).addEventListener('change', function () { expState = { fmt: $('expFmt').value, sr: $('expSr').value, dither: $('expDither').checked, verify: $('expVerify').checked }; }); });
    $('bExport').addEventListener('click', doExport); updateExport();
  } else {
    var hc = el('div', 'card'); hc.innerHTML = '<h3><span>Cómo se usa</span></h3><div class="body"><p class="help"><b>1.</b> Abrí el audio. <b>2.</b> En <b>Corregir</b>, activá lo que necesites y tocá <b>Procesar</b> (o marcá <b>Auto</b>). <b>3.</b> Alterná <b>Original / Procesado / Lo que se quita</b> mientras escuchás: con <b>Igualar volumen</b> la comparación es justa. <b>4.</b> En <b>Master</b> elegí un estilo, ajustá y controlá LUFS y techo. <b>5.</b> <b>Exportar</b>.</p>' +
      '<p class="help"><b>EQ con bolitas:</b> arrastrá = frecuencia y ganancia · rueda = Q · doble clic = on/off (en un lugar vacío crea una banda) · clic derecho = escuchar solo esa zona. Con <b>EQ en vivo</b> lo oís al instante, incluso <b>solo lo que quita</b>, sin procesar.</p>' +
      '<p class="help"><b>Ratón:</b> clic o arrastre en la onda = mover la reproducción · rueda = zoom · Shift+rueda = desplazar · doble clic = ver todo · Shift+arrastre = región de bucle.</p>' +
      '<p class="help"><b>Teclas:</b> Espacio play/pausa · 1/2/3/4 original/procesado/lo que se quita/EQ en vivo · M mono/estéreo · L bucle · ← → ±5 s (Shift ±1 s) · Inicio.</p>' +
      '<p class="help">Todo se procesa en tu computadora; el audio no sale del navegador. La calidad de los efectos se mide con números pero no se puede “escuchar” desde el código: el oído decide. Los preajustes por estilo son puntos de partida orientativos, no reglas.</p></div>'; body.appendChild(hc);
  }
  refreshAllCtl();
}
function refreshAllCtl() { REFRESH.forEach(function (f) { f(); }); drawLoud(); }
var expState = { fmt: 'mp3', sr: '44100', dither: true, verify: true };
function updateToneInfo() {
  var e = $('toneInfo'); if (!e) return;
  if (!S.tones.on) { e.textContent = ''; return; }
  if (!A.proc || !A.tones.length) { e.textContent = A.proc ? 'No se detectaron picos tonales con esta sensibilidad.' : 'Tocá Procesar para detectar los picos.'; return; }
  var top = A.tones.slice().sort(function (a, b) { return b.prom - a.prom; }).slice(0, 6).map(function (p) { return (p.f / 1000).toFixed(2) + ' kHz (+' + p.prom.toFixed(1) + ')'; }).join(', ');
  e.innerHTML = '<b>' + A.tones.length + '</b> picos tratados. Más marcados: ' + top;
}
function updateNovaStat() {
  var e = $('novaStat'); if (!e) return; if (!S.nova.on || !A.nova || !A.nova.length) { e.textContent = ''; return; }
  e.innerHTML = A.nova.map(function (n) { return fmtHz(n.f) + ': cambio dinámico medio ' + f1(n.meanDb) + ' dB, máx. ' + f1(n.maxDb) + ' dB, activo ' + n.activePct.toFixed(0) + '% del tiempo'; }).join('<br>');
}
function updateCompStat() {
  var e = $('compStat'); if (!e) return; var c = A.compStats; if (!S.comp.on || !c) { e.textContent = ''; return; }
  e.innerHTML = 'Reducción de ganancia: media <b>' + f1(c.meanDb) + ' dB</b> · máx. ' + f1(c.maxDb) + ' dB · activo ' + c.activePct.toFixed(0) + '% del tiempo';
}
function tcls(v, lim) { return v > lim ? 'bad' : 'good'; }
function updateMeters() {
  var t = $('meterTbl'); if (!t) { drawLoud(); return; }
  var O = A.meterO, Pm = A.meterP, ceil = S.out.ceil;
  function row(l, a, b, fmt) { return '<tr><td>' + l + '</td><td>' + (a == null ? '—' : fmt(a)) + '</td><td>' + (b == null ? '—' : fmt(b)) + '</td></tr>'; }
  t.innerHTML = '<tr><th></th><th>Original</th><th>Procesado</th></tr>' +
    row('LUFS integrado', O && O.I, Pm && Pm.I, f1) + row('LUFS corto máx.', O && O.S, Pm && Pm.S, f1) + row('LUFS momentáneo máx.', O && O.M, Pm && Pm.M, f1) + row('Rango (LRA)', O && O.LRA, Pm && Pm.LRA, function (v) { return f1(v) + ' LU'; }) +
    row('True peak (dBTP)', O && O.tp, Pm && Pm.tp, function (v) { return '<span class="' + tcls(v, ceil + 0.05) + '">' + f2(v) + '</span>'; }) + row('Pico de muestra (dBFS)', O && O.samplePeak, Pm && Pm.samplePeak, f2) +
    row('PLR (TP − LUFS)', O && O.PLR, Pm && Pm.PLR, f1) + row('Picos sobre el techo', O && O.overs.length, Pm && Pm.overs.length, function (v) { return v + (v >= 400 ? '+' : ''); });
  var chips = $('overChips'); chips.innerHTML = ''; var src = (Pm || O); if (src && src.overs && src.overs.length) { chips.appendChild(el('span', 'note', 'Ir a un pico: ')); src.overs.slice(0, 14).forEach(function (tm) { var b = el('button', '', fmtT(tm)); b.addEventListener('click', function () { var s = UI.v1 - UI.v0; setView(tm - s / 2, tm + s / 2); seek(Math.max(0, tm - 1)); }); chips.appendChild(b); }); }
  var M = Pm || O, pt = $('platTbl'); if (!M) { pt.innerHTML = ''; } else {
    function plat(name, tgt, up) { var d = tgt - M.I; if (d > 0) d = up ? Math.min(d, Math.max(0, -1 - M.tp)) : 0; var res = M.I + d, warn = M.tp + d > -1 + 0.05; return '<tr><td>' + name + '</td><td>' + tgt + ' LUFS</td><td class="' + (Math.abs(d) < .25 ? 'good' : 'warn') + '">' + (d >= 0 ? '+' : '') + f1(d) + ' dB</td><td>' + f1(res) + '</td><td class="' + (warn ? 'bad' : 'good') + '">' + (warn ? 'pico alto' : 'ok') + '</td></tr>'; }
    pt.innerHTML = '<tr><th></th><th>Objetivo</th><th>Cambio</th><th>Queda</th><th>Picos</th></tr>' + plat('Spotify', -14, true) + plat('YouTube', -14, false) + plat('Apple Music', -16, true);
    $('platNote').textContent = 'Sobre el ' + (Pm ? 'procesado' : 'original') + '. Estimación con las reglas publicadas (Spotify sube y baja; YouTube solo baja; Apple mayormente baja). Spotify recomienda techo de −2 dBTP si el master pasa de −14 LUFS. Las plataformas pueden cambiar sus reglas.';
  }
  if (A.outInfo && A.outInfo.gainDb != null && S.out.on) { var ne = $('platNote'); if (ne) ne.textContent += ' · Ganancia aplicada: ' + f1(A.outInfo.gainDb) + ' dB (limitador: reducción máx. ' + f1(A.outInfo.red) + ' dB)' + (A.outInfo.reached === false ? ' · No se alcanzó el objetivo con ese techo.' : '') + '.'; }
  drawLoud();
}
function updateExport() { var b = $('bExport'); if (b) b.disabled = !A.orig; }
