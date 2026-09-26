#!/usr/bin/env node
/* Arma dist/rusty-overdrive-corrector.html (un solo archivo autocontenido) a partir de src/ y vendor/.
   Copia también el resultado a docs/index.html para publicarlo con GitHub Pages. Uso: node build.js */
'use strict';
const fs = require('fs'), path = require('path');
const r = p => fs.readFileSync(path.join(__dirname, p), 'utf8');
const list = d => fs.readdirSync(path.join(__dirname, d)).filter(f => f.endsWith('.js')).sort().map(f => d + '/' + f);
const dsp = list('src/dsp'), common = r(dsp[0]);                  // 00-common.js: lo usan la interfaz y el Worker
const parts = {
  '/*__CSS__*/': r('src/style/theme.css'), '/*__COMMON__*/': common, '/*__DSP__*/': dsp.slice(1).map(r).join('\n'),
  '/*__LAME__*/': r('vendor/lame.min.js'), '/*__UI__*/': "(function () {\n'use strict';\n" + list('src/ui').map(r).join('\n') + '\n})();'
};
let html = r('src/index.template.html');
for (const [k, v] of Object.entries(parts)) { if (/<\/script/i.test(v)) throw new Error('contiene </script en ' + k); html = html.split(k).join(v); }
const out = path.join(__dirname, 'dist', 'rusty-overdrive-corrector.html');
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, html);
fs.mkdirSync(path.join(__dirname, 'docs'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'docs', 'index.html'), html);
console.log('ok', path.relative(process.cwd(), out), Math.round(html.length / 1024) + ' KB');
