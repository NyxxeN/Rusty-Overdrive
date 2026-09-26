# Cómo contribuir

¡Gracias por sumarte! Este proyecto busca acercarse a una corrección de audio profesional y eficiente **entre muchas manos**: se necesita código, pero también oído, oficio y datos.

## Qué estamos pidiendo

**Pedido abierto de colaboración.** La herramienta calcula y mide, pero no puede oír. Buscamos especialmente: (1) oyentes con experiencia por género para validar los estilos de master; (2) ingenieros que revisen los algoritmos de reducción de ruido, de-esser y EQ dinámico; (3) desarrolladores para las mejoras del README (fase lineal, Mid/Side, `AudioWorklet`, FLAC, idioma). Usá las plantillas de *issues*: hay una para mejoras y dudas, otra para errores y otra para oído y preajustes.

## Formas de ayudar

- **Escuchar y reportar.** Si un módulo deja artefactos o un preajuste no funciona en tu género, abrí un *issue* con: qué hiciste, los parámetros (capturas o el JSON de `localStorage['roc.params.v1']`) y qué escuchaste. No hace falta adjuntar audio protegido: si podés, describí el material (género, fuente) o compartí una captura del espectrograma.
- **Calibrar los preajustes por estilo** con material real (ver [docs/ESTILOS.md](docs/ESTILOS.md)).
- **Código.** Ver el [manual](docs/MANUAL.md) y las ideas en el README y en la sección "Cómo agregar un módulo" de [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
- **Traducción.** La interfaz está en español; falta un sistema de idiomas (ES/EN) — buena primera contribución.

## Flujo de trabajo

```bash
node tests/run.js          # tiene que pasar todo
node build.js              # regenera dist/ y docs/index.html
```

1. Hacé un *fork* y una rama por cambio.
2. Si tocás el motor de audio, **agregá una prueba** en `tests/run.js` con una señal sintética de respuesta conocida, y explicá qué esperás y por qué.
3. Si tocás la interfaz, corré también la prueba de navegador (`tests/e2e/e2e.js`, ver README).
4. Reconstruí y **commiteá `dist/` y `docs/index.html`** (la CI comprueba que coincidan con `src/`).
5. Abrí el *pull request* explicando el cambio y, si afecta al sonido, cómo lo verificaste (números y oído).

## Criterios

- **Honestidad numérica:** nada de "suena mejor" sin una medición o una escucha descripta. Si algo no se pudo verificar, decilo.
- **Sin dependencias de ejecución** ni llamadas de red: el audio nunca sale del navegador.
- Código sin *build step* complejo: `build.js` solo concatena.
- Comentarios y textos de interfaz en español; README y issues bienvenidos en español o inglés.
- Cambios de EQ de master: movimientos pequeños y con Q ancho (ver docs/ESTILOS.md).

## Licencia

Al contribuir aceptás que tu código se publique bajo la licencia MIT del proyecto. El codificador MP3 de `vendor/` mantiene su licencia LGPL-3.0.

---

*English:* contributions of every kind are welcome (code, ears, data, translations). Run `node tests/run.js`, rebuild with `node build.js` and commit `dist/` and `docs/index.html`. Add a synthetic-signal test for any change to the audio engine and say how you verified sound-affecting changes.
