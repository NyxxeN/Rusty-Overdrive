# Arquitectura

Un solo HTML autocontenido. La **interfaz** corre en el hilo principal y el **motor de audio** en un Web Worker creado desde un `Blob` (por eso funciona abriendo el archivo con doble clic, sin servidor). `node build.js` concatena `src/` y `vendor/` en `dist/rusty-overdrive-corrector.html`.

```
hilo principal (src/ui)                         Worker (src/dsp + vendor/lame.min.js)
  Web Audio: reproducción, EQ en vivo             load     → guarda el original, mide, espectro promedio
  dibujo: onda, espectrograma, EQ, medidor        process  → pipeline por etapas con caché
  estado S (parámetros) ──── mensajes ─────────►  delta    → original − salida de la corrección
                                                  export   → remuestreo, dither, MP3/WAV
                                                  measure  → LUFS / true peak de un audio dado
```

## Pipeline (src/dsp/70-pipeline.js)

```
original ─► A: tonos ─► EQ de corrección ─► Neon Scalpel        (clave keyA)
         ─► B: ruido + de-esser + colas agudas (motor espectral) (clave keyB = keyA + parámetros)
         ─► C: EQ de master ─► compresor ─► normalización + limitador true-peak   (siempre se recalcula)
         ─► medición (LUFS, true peak, LTAS)
```

Las etapas A y B se cachean: si solo cambiás el master, solo se recalcula C (segundos). "Lo que se quita" es `g·original − procesado`, con `g` por mínimos cuadrados (nivel igualado): muestra todo lo que cambió la cadena, correcciones y master. Todas las etapas tienen latencia cero, así que las muestras están alineadas. La escucha se amplifica sola (pico a −14 dBFS).

## Módulos

| Archivo | Contenido |
|---|---|
| `00-common.js` | FFT radix-2, biquads RBJ, respuesta del EQ (lo comparten interfaz y Worker) |
| `10-util.js` | estado del Worker, progreso, percentiles móviles |
| `20-tones.js` | detección y supresión de picos tonales persistentes |
| `30-spectral.js` | ruido estacionario, de-esser dinámico y colas agudas (una sola pasada STFT) |
| `40-dynamics.js` | compresor de bus y limitador true-peak con normalización a LUFS |
| `45-nova.js` | Neon Scalpel: EQ dinámico |
| `50-loudness.js` | LUFS BS.1770-4, true peak, LRA, espectro promedio (LTAS) |
| `60-resample-export.js` | remuestreo racional, dither TPDF, WAV, MP3 |
| `70-pipeline.js` | orquestación por etapas |
| `99-worker-main.js` | protocolo de mensajes |

## Algoritmos

**Tonos persistentes.** Espectro promedio con ventana de 65.536 muestras (0,73 Hz de resolución a 48 kHz) → línea base con mediana móvil de ~590 Hz → picos que sobresalen más de un umbral (por defecto 5 dB). La supresión es un filtro de fase cero por STFT (ventana de 32.768) con muescas de ≈ ±4 Hz cuya profundidad es `min(prominencia − 1,5 dB, máximo)`. Estos picos periódicos son típicos de los artefactos de sobremuestreo por deconvolución en modelos generativos ([Fourier explanation of AI-music artifacts](https://arxiv.org/html/2506.19108v1)), pero el módulo no depende del origen del audio.

**Motor espectral** (N = 2048, hop = 512, Hann con reconstrucción exacta; error −150 dBFS con fuerza cero).
- *Ruido:* el perfil por bin es el percentil 10 (histograma) del nivel suavizado en frecuencia; ganancia tipo Wiener `sqrt(1 − k·N/P)` con apertura inmediata y cierre suave.
- *De-esser:* energía de la banda contra su mediana de 1,5 s + umbral; reducción `(exceso)·(1 − 1/ratio)` con tope.
- *Colas agudas:* piso entre golpes (percentil 10 sobre ~0,6 s) y expansor descendente con lookahead.

**Neon Scalpel.** Por banda: detector pasa-banda (0 dB de pico) sobre `(L+R)/2` → seguidor de envolvente con ataque/liberación → ganancia dinámica según el modo → filtro campana o shelf cuya ganancia total es `estática + dinámica`. Coeficientes actualizados cada 16 muestras. El nivel detectado estima el pico de la banda (±1 dB).

**Limitador.** Envolvente de *true peak* con sobremuestreo ×4 (FIR sinc-Kaiser de 24 taps por fase) → ganancia requerida → mínimo deslizante centrado → media móvil centrada (garantiza no superar la ganancia requerida en ninguna muestra) → liberación exponencial. La normalización a LUFS itera con estimación de pendiente (secante).

**Medidor.** Filtro K (shelf + pasa-altos del estándar), bloques de 400 ms con solape de 75 %, compuerta absoluta (−70 LUFS) y relativa (−10 LU). LRA con compuerta de −20 LU y percentiles 10–95 sobre ventanas de 3 s.

**Remuestreo.** Racional (`L/M` por MCD), sinc con ventana Kaiser (β = 9), 96 taps, corte al 95,5 % de Nyquist: plano hasta 20 kHz (−0,08 dB) y −90 dB por encima de Nyquist.

## Cómo agregar un módulo

1. Escribí la función en `src/dsp/` (respetá el prefijo numérico para el orden de carga).
2. Agregala a `runPipeline` y a la clave de caché (`keyA` o `keyB`).
3. Sumá sus parámetros a `DEF` en `src/ui/00-state.js`.
4. Creá su tarjeta en `src/ui/50-panels.js`.
5. Sumá pruebas a `tests/run.js` con una señal de respuesta conocida.
6. `node build.js && node tests/run.js` y commiteá también `dist/` y `docs/index.html` (la CI comprueba que coincidan).

## Decisiones de diseño

- **Procesamiento offline con caché** en vez de tiempo real: permite algoritmos no causales (lookahead, percentiles sobre ventanas largas, perfil de ruido aprendido del propio tema) y medir con exactitud. La contrapartida es que cada cambio pide *Procesar* (o *Auto*). El **EQ en vivo** es la excepción: usa `BiquadFilterNode` con los mismos coeficientes RBJ que el procesado offline (probado: −80 dB de error relativo). Tiene tres modos, todos sin procesar: *Con EQ* (original filtrado), *Solo lo que quita* (dos caminos que se suman en el analizador: original ×(+1) y salida del EQ ×(−1), o sea original − EQ(original), con +12 dB de ayuda) y *Solo la banda* (filtro pasa-banda en la frecuencia de la bolita). Los demás módulos (ruido, de-esser, colas, Neon Scalpel) son offline y requieren *Procesar*.
- **Shelves con Q fijo (Butterworth)** para que el filtro del navegador y el procesado offline coincidan exactamente.
- **Detección estéreo enlazada** en todo lo dinámico, para no mover la imagen.
