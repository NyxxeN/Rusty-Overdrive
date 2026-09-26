#!/usr/bin/env node
/* Prueba de punta a punta en Chromium: abrir, procesar, arrastrar una bolita del EQ, escucha en vivo, estilo de master y exportación.
   Requisitos:  npm i -D playwright-core   y   CHROME_PATH=/ruta/a/chrome  node tests/e2e/e2e.js */
'use strict';
const { chromium } = require('playwright-core'); const path = require('path'), fs = require('fs'), cp = require('child_process');
const root = path.join(__dirname, '..', '..'), wav = path.join(require('os').tmpdir(), 'roc-synthetic.wav'); cp.execFileSync('node', [path.join(__dirname, 'make-audio.js'), wav]);
let fails = 0; const ok = (n, c, d) => { console.log((c ? '  ok    ' : '  FALLA ') + n + (d ? '  (' + d + ')' : '')); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true }), p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto('file://' + path.join(root, 'dist', 'rusty-overdrive-corrector.html'));
  ok('título', (await p.title()) === 'Rusty Overdrive Corrector');
  await p.setInputFiles('#file', wav); await p.waitForFunction(() => /Original: /.test(document.getElementById('status').textContent), null, { timeout: 60000 }); ok('abre y mide el archivo', true, await p.textContent('#status'));
  await p.selectOption('#preset', 'clean-aggr'); await p.click('#bProc'); await p.waitForFunction(() => /Procesado en|Error/.test(document.getElementById('status').textContent), null, { timeout: 120000 });
  ok('procesa con el preajuste agresivo', /Procesado en/.test(await p.textContent('#status')), await p.textContent('#status'));
  await p.click('#bPlay'); await p.waitForTimeout(700);
  const n = await p.evaluate(() => { const cv = window.__app.EQED.eq.el.querySelector('canvas'), r = cv.getBoundingClientRect(), b = window.__app.S.eq.bands[5]; return { x: r.left + Math.log(b.f / 20) / Math.log(1000) * r.width, y: r.top + r.height / 2 - b.g / 15 * (r.height / 2 - 12) }; });
  await p.mouse.move(n.x, n.y); await p.mouse.down(); await p.mouse.move(n.x - 80, n.y - 30, { steps: 8 });
  const st = await p.evaluate(() => ({ mon: window.__app.UI.mon, f: window.__app.S.eq.bands[5].f, g: window.__app.S.eq.bands[5].g, node: window.__app.live.nodes[10].gain.value })); await p.mouse.up();
  ok('arrastrar la bolita cambia frecuencia y ganancia', st.f < 14000 && st.g > -6, JSON.stringify(st)); ok('pasa solo a EQ en vivo', st.mon === 'live'); ok('el filtro del navegador sigue a la bolita', Math.abs(st.node - st.g) < 0.3);
  await p.click('[data-t=master]'); await p.selectOption('#styleSel', 'metal'); await p.click('#styleApply'); const s2 = await p.evaluate(() => ({ t: window.__app.S.out.target, c: window.__app.S.out.ceil, comp: window.__app.S.comp.on }));
  ok('aplicar estilo fija objetivo y techo', s2.t === -10 && s2.c === -2 && s2.comp, JSON.stringify(s2));
  await p.click('#bProc'); await p.waitForFunction(() => /Procesado en|Error/.test(document.getElementById('status').textContent) && !document.getElementById('bProc').disabled, null, { timeout: 120000 }); await p.waitForTimeout(400);
  const m = await p.evaluate(() => window.__app.A.meterP); ok('nivel de salida cerca del objetivo', Math.abs(m.I + 10) < 0.3, m.I.toFixed(2) + ' LUFS'); ok('true peak bajo el techo', m.tp <= -1.95, m.tp.toFixed(2) + ' dBTP');
  await p.evaluate(() => window.__app.setMonitor('delta')); await p.waitForFunction(() => window.__app.A.delta !== null, null, { timeout: 60000 });
  const dpk = await p.evaluate(() => 20 * Math.log10(window.__app.A.deltaPeak * window.__app.monLevel())); ok('«lo que se quita» se escucha (pico a −14 dBFS)', Math.abs(dpk + 14) < 0.5, dpk.toFixed(1) + ' dBFS');
  await p.evaluate(() => window.__app.setMonitor('orig'));
  await p.click('[data-t=exp]'); const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 200000 }), p.click('#bExport')]), file = path.join(require('os').tmpdir(), dl.suggestedFilename()); await dl.saveAs(file); const b = fs.readFileSync(file);
  ok('exporta un MP3 válido', b[0] === 0xFF && (b[1] & 0xE0) === 0xE0 && b.length > 100000, b.length + ' bytes');
  ok('sin errores de consola', errors.length === 0, errors.join(' | ')); await browser.close(); console.log(fails ? '\n' + fails + ' con fallas' : '\ntodo correcto'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
