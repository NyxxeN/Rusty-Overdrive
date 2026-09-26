# Avisos de terceros

## lamejs / LAME (codificador MP3)

- Archivo: `vendor/lame.min.js`, copia **sin modificar** de la versión `1.2.1` del paquete npm [`lamejs`](https://github.com/zhuker/lamejs) (port a JavaScript del codificador [LAME](https://lame.sourceforge.io/)).
- Licencia: **LGPL-3.0** (ver `vendor/LICENSE-lame.txt` y el paquete original).
- Cómo se usa: `node build.js` inserta ese archivo, sin cambios, en un bloque claramente delimitado del HTML final (`<script id="lame-src" type="text/plain">`), que la aplicación carga dentro de su Web Worker.
- **Cómo reemplazarlo** (requisito práctico de la LGPL): sustituí `vendor/lame.min.js` por otra versión compatible y ejecutá `node build.js`.
- Si modificás lamejs/LAME, las modificaciones deben publicarse bajo LGPL.

> Esto es una descripción de buena fe, no asesoramiento legal. Si vas a distribuir comercialmente, revisá las obligaciones de la LGPL.

## Sin otras dependencias

El resto del código (FFT, filtros, medidor BS.1770, limitador, remuestreo, EQ dinámico, interfaz) está escrito en este repositorio y no usa librerías externas.
