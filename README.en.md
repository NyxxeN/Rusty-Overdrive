# Rusty Overdrive Corrector

**An audio corrector and mastering tool that runs entirely in your browser.** Nothing to install, nothing uploaded: open one HTML file, load a WAV or MP3, clean it up, master it and export.

> The interface is in **Spanish**. Chrome can translate the page (right click → *Translate to…*). A proper ES/EN language switch is a great first contribution — see below.

Works with any material: a mix you want to polish and prepare for Spotify, a track with hiss or background noise, or a file that needs a last pass before you send it to a distributor.

> **📣 Contributors wanted.** We need **ears and craft** as much as code: mixing/mastering engineers, producers who can test the style presets on their genre, and audio/JavaScript developers. Use the issue templates (*Mejora o duda*, *Error o artefacto*, *Oído y preajustes*) and read `CONTRIBUTING.md`. The user manual (`docs/MANUAL.md`) is in Spanish.

## Features

- **Listening & analysis:** zoomable waveform, spectrogram, live analyzer, a high-frequency "floor" plot, seekable transport, loop region, **Stereo / Mono / L / R** monitoring, and **Original / Processed / What is removed** with **loudness-matched** A/B.
- **Correction:** 6-band **draggable-node EQ** (drag = frequency/gain, wheel = Q, double-click = on/off, right-click = solo the band) with a real-time **Live EQ** monitor; **Neon Scalpel**, a 4-band dynamic EQ (compress / expand / dynamic boost); persistent-tone suppression; stationary noise reduction; broadband de-esser; hi-hat/cymbal tail control.
- **Mastering:** **style presets** (EDM, rock, heavy metal, pop, classical, jazz, folk and a neutral streaming standard) with a reference tonal-balance corridor; bus compressor; **true-peak look-ahead limiter** with LUFS targeting; BS.1770-4 meter (integrated, short-term, momentary, LRA, true peak) and a **platform simulator** (Spotify / YouTube / Apple Music).
- **Export:** **MP3 320 kbps / 44.1 kHz / stereo**, WAV 16/24-bit. The MP3 is decoded again to measure the real true peak and re-encoded with a small trim if it overshoots the ceiling.

## Quick start

Open `dist/rusty-overdrive-corrector.html` (or `docs/index.html`) in Chrome, Edge or Firefox and drop an audio file on it.

## Build & test

No runtime dependencies. Node ≥ 18:

```bash
node build.js        # builds dist/rusty-overdrive-corrector.html and docs/index.html
node tests/run.js    # 26 DSP tests on synthetic signals, no private audio needed
```

Loudness is checked against pyloudnorm (< 0.05 LU), the dynamic EQ against its own formula, the parametric EQ against theory, the resampler against known tones. See `docs/ARQUITECTURA.md` (Spanish) for the algorithms.

## Honest limitations

Numbers do not replace ears: a module doing what it claims does not guarantee it sounds good on your material. Style presets are starting points built from published data (loudness medians by genre) plus common mastering practice (small, broad EQ moves); the tonal reference is indicative. Tested on Chromium.

## Contributing

We would love help from audio engineers and developers: language switch, linear-phase / Mid-Side EQ, AudioWorklet real-time dynamic EQ, FLAC export, noise-shaped dither, preset validation with real listeners. See `CONTRIBUTING.md`.

## Licenses

Code: MIT. MP3 encoder (`vendor/lame.min.js`, lamejs/LAME): **LGPL-3.0**, unmodified — see `THIRD_PARTY_NOTICES.md`.
