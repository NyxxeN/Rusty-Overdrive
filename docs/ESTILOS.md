# Estilos de master: de dónde salen los números

Los preajustes de **Master por estilo** son puntos de partida para *masterizar* (no para escuchar): fijan un EQ de master suave, una compresión razonable y el nivel de entrega. Combinan **datos medidos** con **criterio de masterización habitual**. No son reglas, y tu oído manda.

## La tabla

| Estilo | Objetivo | Techo | Rango recomendado | Mediana comercial medida | EQ de master | Compresor |
|---|---|---|---|---|---|---|
| **Estándar plataformas (neutro)** | -14 LUFS | -1 dBTP | −15 a −13 LUFS | — | pasa-altos 25 Hz | sin compresión |
| **EDM / Electrónica** | -9 LUFS | -2 dBTP | −8 a −10 LUFS | −8,7 LUFS (Dance/EDM, 18.514 temas) | pasa-altos 25 Hz, shelf grave 60 Hz +1.5 dB, campana 300 Hz -1.5 dB, shelf agudo 10000 Hz +1.0 dB | ratio 2:1, umbral -22 dB, ataque 20 ms, liberación 120 ms |
| **Rock** | -10 LUFS | -2 dBTP | −9 a −12 LUFS | −9,2 LUFS (Rock, 13.966 temas) | pasa-altos 30 Hz, campana 250 Hz -1.0 dB, campana 3000 Hz +1.0 dB, shelf agudo 12000 Hz +0.5 dB | ratio 1.8:1, umbral -22 dB, ataque 30 ms, liberación 160 ms |
| **Heavy metal** | -10 LUFS | -2 dBTP | −9 a −12 LUFS | −8,4 LUFS (Metal, 6.666 temas) | pasa-altos 30 Hz, campana 300 Hz -1.5 dB, campana 3500 Hz +1.0 dB, campana 7000 Hz -1.5 dB | ratio 2:1, umbral -20 dB, ataque 25 ms, liberación 140 ms |
| **Pop** | -10 LUFS | -2 dBTP | −9 a −12 LUFS | −9,5 LUFS (Pop, 46.316 temas) | pasa-altos 25 Hz, campana 250 Hz -1.0 dB, campana 3000 Hz +0.5 dB, shelf agudo 10000 Hz +1.5 dB | ratio 1.8:1, umbral -22 dB, ataque 30 ms, liberación 150 ms |
| **Clásica / orquestal** | -20 LUFS | -1 dBTP | −18 a −24 LUFS | −12,9 LUFS (Instrumental/Score, 8.816 temas) | pasa-altos 20 Hz | sin compresión |
| **Jazz** | -15 LUFS | -1 dBTP | −14 a −18 LUFS | −12,8 LUFS (Jazz, 2.933 temas) | pasa-altos 25 Hz, shelf grave 200 Hz +1.0 dB | sin compresión |
| **Folk / acústico** | -13 LUFS | -2 dBTP | −12 a −14 LUFS (criterio propio: material acústico dinámico) | −9,6 LUFS (Country/Folk, 10.779 temas) | pasa-altos 30 Hz, campana 300 Hz -1.0 dB, shelf agudo 12000 Hz +1.0 dB | ratio 1.5:1, umbral -26 dB, ataque 40 ms, liberación 200 ms |

*(Esta tabla se generó a partir del código: `src/ui/00-state.js`, objeto `STYLES`.)*

## Loudness (objetivo y rango)

- **Mediana comercial:** [Freshly Baked Studios, *Average LUFS by Genre*](https://freshlybakedstudios.com/blog/average-lufs-by-genre) — 314.876 temas medidos (2026): metal −8,4 · dance/EDM −8,7 · rock −9,2 · pop −9,5 · country/folk −9,6 · jazz −12,8 · instrumental/score −12,9 · ambient −14,1. Aviso del propio estudio: la medición es "aproximadamente un decibel conservadora". El 90,4 % de los temas supera −14 LUFS.
- **Rangos recomendados:** [LuvLang, *How loud should my master be?*](https://luvlang.studio/blog/how-loud-should-my-master-be) — EDM −8 a −10 · pop −9 a −12 · rock/metal −9 a −12 · jazz −14 a −18 · clásica/orquestal −18 a −24 · techo −1 dBTP. Para folk no hay guía específica: el rango del preajuste es criterio propio (material acústico dinámico).
- **Objetivo elegido:** dentro del rango recomendado, sin buscar el máximo. Las plataformas normalizan, así que un master más fuerte que −14 LUFS se **baja de volumen**; no se gana sonoridad, solo se pierde dinámica.

## Techo de true peak

[Spotify](https://support.spotify.com/us/artists/article/loudness-normalization/): −14 LUFS de referencia, techo de −1 dBTP y **−2 dBTP si el master pasa de −14 LUFS** para evitar distorsión al codificar. Por eso los estilos más fuertes usan −2 dBTP. YouTube solo baja lo que pasa de −14 LUFS y no sube lo que queda por debajo ([resumen de plataformas](https://www.forasoft.com/learn/audio-for-video/articles-audio/lufs-targets-per-platform-2026)). Un MP3 puede "pasarse" del techo al decodificarse (unas décimas de dB): la exportación lo mide y compensa.

## EQ de master

- **Principio:** movimientos pequeños y con Q ancho. [Mastering The Mix](https://www.masteringthemix.com/blogs/learn/the-nuances-of-mastering-different-genres): "ideal no más de 4 dB"; [MasteringBox](https://www.masteringbox.com/learn/mastering-eq-guide): realces de 1–2 dB, pasa-altos en 20–30 Hz, zona de aspereza en 3–8 kHz, "aire" con shelf desde 10 kHz. Los preajustes se mantienen en ±1,5 dB.
- **Por género** (orientación general de [Mastering The Mix](https://www.masteringthemix.com/blogs/learn/the-nuances-of-mastering-different-genres) y [Nail The Mix](https://www.nailthemix.com/eq-cheat-sheet)): electrónica con subgrave fuerte y agudos nítidos; rock con medios bajos limpios y presencia; metal con barro a 200–500 Hz controlado, presencia a 2–5 kHz y siseo de guitarras a 6–10 kHz; pop con voz clara y aire; clásica transparente y casi sin EQ; jazz con calidez en graves y medios bajos.

## Referencia tonal (la zona cian en el EQ de master)

Es una guía **orientativa**, no un estándar. Se construye así:

1. **Pendiente base** de −1,5 dB por octava en energía por banda de 1/3 de octava, equivalente a la pendiente de **4,5 dB/oct** que usan por defecto los analizadores modernos (con la de 3 dB/oct del ruido rosa como línea plana) — [*Spectrum Analyzer Slopes*](https://michael-filimowicz.medium.com/spectrum-analyzer-slopes-in-audio-mixing-d6df8892ea3). El propio artículo aclara que no existe una pendiente universal para un master terminado.
2. **Recorte de subgrave** por debajo de 40 Hz.
3. **Desvíos por estilo** (dB por banda, en `ref` de cada estilo): son criterio de masterización, **no datos medidos**. Por ejemplo, clásica y jazz descienden más por encima de 3–8 kHz ([sonible, *What is tonal balance?*](https://www.sonible.com/blog/tonal-balance/) describe el perfil típico de la clásica), y EDM suma subgrave.
4. La curva se **alinea** con tu espectro entre 125 Hz y 6,3 kHz (importa la forma, no el nivel absoluto) y se dibuja un corredor de ±4 dB.

Si tu espectro sale del corredor, hay algo que mirar; si es a propósito, ignoralo. Como dice sonible: no te dejes obsesionar por las curvas objetivo al punto de tapar la identidad de tu tema.

## Cómo mejorar estos números

Lo más valioso: **medir masters de referencia de cada género** (con permiso o material propio) y reemplazar los desvíos heurísticos por curvas medidas; y validar los preajustes con oyentes. Abrí un issue con tu propuesta y los datos.
