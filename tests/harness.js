/* Carga los módulos DSP (src/dsp/*.js) igual que el Worker: concatenados en un mismo ámbito. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'vendor', 'lame.min.js'), 'utf8'));   // define lamejs
const dir = path.join(root, 'src', 'dsp');
const code = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const NAMES = ['fft', 'hannPeriodic', 'biquadCoefs', 'eqBandBiquads', 'eqResponseDb', 'biquadMagDb', 'fullMeter', 'measureLoudness', 'measureTP', 'limiter', 'normalizeAndLimit', 'compressor', 'spectral',
  'detectTones', 'applyTones', 'resample', 'hfEnvelope', 'runPipeline', 'doExport', 'encodeWav', 'encodeMp3', 'makeInt', 'applyBiquad', 'novaProcess', 'ltas', 'applyEqBands', 'kFilterCoefs'];
const fake = { postMessage() {} };
const dsp = new Function('self', 'lamejs', code + '\nreturn {W:function(){return W;},' + NAMES.join(',') + '};')(fake, globalThis.lamejs);
module.exports = { dsp };
