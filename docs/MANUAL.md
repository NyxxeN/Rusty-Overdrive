# Manual de usuario

Rusty Overdrive Corrector corrige y masteriza audio **dentro del navegador**. Este manual explica la pantalla, tres flujos de trabajo completos y cada módulo. Si algo no se entiende, abrí un *issue* (plantilla «Mejora o duda»): el manual también se mejora con vos.

## 1. Primeros pasos

1. Abrí `rusty-overdrive-corrector.html` con **Chrome, Edge o Firefox** (doble clic).
2. Tocá **Abrir audio…** o arrastrá un WAV, MP3 o FLAC sobre la ventana.
3. El indicador de la cabecera pasa de «SIN SEÑAL» a «SEÑAL OK» y la app mide el archivo (LUFS y true peak del original aparecen en la barra de estado).

Nada se sube a ningún servidor: el audio se procesa en tu computadora.

### La pantalla

| Zona | Para qué sirve |
|---|---|
| **Barra de transporte** (arriba) | Play/pausa, tiempo, monitor **Original / Procesado / Lo que se quita / EQ en vivo**, canales **Estéreo / Mono / L / R**, volumen, **Igualar volumen**, control de volumen de «lo que se quita», bucle |
| **Onda** | Clic o arrastre = mover la reproducción · rueda = zoom · Shift+rueda = desplazarte · doble clic = ver todo · Shift+arrastre = región de bucle. Marcas rojas = picos sobre el techo |
| **Piso agudo** | Nivel del brillo por encima de 6,5 kHz. La línea gruesa es el nivel *entre golpes*: cuando sube, se oye el siseo o los «grillos» |
| **Espectrograma** | Frecuencia en vertical (log o lineal), tiempo en horizontal. Cambia con el monitor elegido |
| **Analizador en vivo** | Espectro de lo que estás escuchando, con pico retenido en magenta |
| **Panel derecho** | Pestañas **Corregir**, **Master**, **Exportar** y **Ayuda**; abajo, **Procesar**, **Auto** y **Preajustes** |

### Monitores: qué escuchás en cada uno

| Monitor | Qué suena | ¿Hay que procesar? |
|---|---|---|
| **Original** | Tu archivo tal cual | No |
| **Procesado** | Todo el resultado (correcciones + master) | Sí |
| **Lo que se quita** | La diferencia entre original y procesado con el nivel igualado, amplificada sola para que se oiga | Sí |
| **EQ en vivo** | El original pasando por el **EQ de corrección**, en tiempo real | **No** |

**Igualar volumen** compensa la diferencia de LUFS entre Original y Procesado, para que no te engañe el «más fuerte suena mejor».

## 2. Flujo A: encontrar y quitar una frecuencia molesta (sin procesar)

Es el flujo para cuando algo suena áspero, resonante o silbante y querés saber **en qué frecuencia** está.

1. Abrí la pestaña **Corregir** y bajá hasta **EQ de corrección**. Poné la reproducción en bucle sobre un pasaje donde se note el problema (Shift+arrastre en la onda, casilla **Bucle**).
2. **Doble clic** en un lugar vacío del gráfico: se crea una bolita (banda de campana). Arrastrala: horizontal = frecuencia, vertical = ganancia. Con la **rueda** sobre la bolita cambiás la Q (más alta = más angosta).
3. Elegí **Solo lo que quita** (arriba del gráfico). Ahora escuchás únicamente lo que el EQ está sacando, en vivo. **Bajá la campana** (ganancia negativa, por ejemplo −6 dB, con Q alta) y **barrela** por el espectro: cuando lo que oís es justo el sonido molesto, encontraste la frecuencia. También podés usar **Solo la banda** (clic derecho sobre la bolita, o el botón *Escuchar* de esa banda) para oír esa zona aislada.
4. Cambiá a **Con EQ** para oír el resultado. Compará contra **Original** (tecla `1`) con el volumen igualado.
5. Ajustá la ganancia y la Q hasta que suene natural: una Q angosta y poca ganancia es más quirúrgico; una Q ancha suena más musical pero afecta más material.
6. Recién cuando estés conforme, tocá **Procesar** para que el cambio quede en el archivo (y para poder verlo en el resto de los monitores y en el medidor).

Notas:
- El EQ en vivo escucha **solo** el EQ de corrección aplicado al original; ruido, de-esser, colas agudas y Neon Scalpel se oyen después de **Procesar**.
- Cambiar el tipo de una banda (campana, shelf, pasa-altos…) desde la fila de abajo también se oye al instante.
- **Consejo:** si el problema aparece y desaparece (por ejemplo, una sibilancia), en vez de un EQ fijo usá **Neon Scalpel** (Flujo B).

## 3. Flujo B: limpiar siseo, estática y colas de platillos

1. Mirá el gráfico **Piso agudo**: si la línea gruesa sube y baja, el brillo entre golpes cambia; ahí está el problema.
2. Empezá por un preajuste: **Preajustes → Limpieza de agudos → Suave** (menos sensibilidad) o **Estándar agresivo**. Tocá **Procesar**.
3. Alterná **Original / Procesado / Lo que se quita**. Si en «Lo que se quita» oís música (golpes, voces), te pasaste; si oís solo siseo y estática, vas bien.
4. Ajustá módulo por módulo (ver sección 5). Marcá **Auto** si querés que procese solo al tocar controles (tarda unos segundos en cada cambio).
5. Si algo suena «burbujeante» o apagado, bajá la intensidad o la reducción máxima del módulo responsable.

## 4. Flujo C: preparar el archivo para Spotify (o cualquier plataforma) y exportar

1. Terminá primero las correcciones (Flujos A y B).
2. Abrí la pestaña **Master**. En **Master por estilo** elegí el género (o **Estándar plataformas (neutro)**) y tocá **Aplicar**. Se cargan un EQ de master suave, una compresión razonable y el LUFS y techo del estilo. Son **puntos de partida**: ajustalos.
3. En **EQ de master** movés las bolitas igual que en el de corrección. La línea gris es el espectro de tu mezcla comparado con la referencia orientativa del estilo; la ámbar, el resultado; la zona cian, ±4 dB de tolerancia. Movimientos pequeños (hasta ~3 dB) y con Q ancho.
4. **Compresor de bus:** después de procesar, mirá la línea «Reducción de ganancia»: buscá una reducción media de 1 a 3 dB. Si no comprime nada, bajá el umbral; si comprime mucho, subilo.
5. **Nivel de salida y limitador:** elegí **Normalizar a LUFS objetivo** y el **techo**. Spotify recomienda −2 dBTP si el master pasa de −14 LUFS y −1 dBTP en el resto.
6. Tocá **Procesar** y revisá el **Medidor**:
   - *LUFS integrado* cerca del objetivo; *true peak* no mayor al techo; *Picos sobre el techo* en 0.
   - El **Simulador de plataformas** te dice cuánto subirían o bajarían Spotify, YouTube y Apple Music tu master. Un master más fuerte que −14 LUFS se **baja de volumen** en Spotify: no ganás sonoridad, solo perdés dinámica.
7. Pestaña **Exportar**: para RouteNote elegí **MP3 320 kbps** y **44,1 kHz** (estéreo). Dejá activadas **Dither** y **Verificar**. La app codifica, decodifica el MP3 y mide el true peak real; si se pasó del techo, lo baja unas décimas y recodifica (hasta 2 veces).

> El MP3 puede terminar unas décimas de LUFS por debajo del objetivo si tuvo que bajar por el techo: es esperable en masters fuertes.

## 5. Referencia de módulos

### Corregir

| Módulo | Qué hace | Parámetros clave |
|---|---|---|
| **1 · Tonos persistentes** | Baja picos tonales estrechos que se repiten en todo el tema (peine de tonos típico de la generación por IA o de conversiones de frecuencia) | *Sensibilidad* (menos dB = detecta más), *Reducción máx.*, rango de frecuencias |
| **2 · EQ de corrección** | 6 bandas (pasa-altos, shelf grave, campanas, shelf agudo, pasa-bajos, notch), con bolitas y escucha en vivo | Frecuencia, ganancia, Q (solo campana y notch), pendiente 12/24 dB/oct (pasa-altos y pasa-bajos) |
| **Neon Scalpel** | EQ **dinámico** de 4 bandas: cada una mide su zona y actúa solo cuando hace falta | *Modo* (bajar al pasar el umbral / bajar cuando cae / subir al pasar), *Umbral*, *Ratio*, *Cambio dinámico máx.*, *Ataque*, *Liberación*, *Ganancia estática* |
| **3 · Ruido de fondo** | Reducción espectral de ruido estacionario; el perfil se aprende de los momentos más bajos del propio tema | *Intensidad*, *Reducción máx.*, *Liberación*, rango de frecuencias |
| **4 · De-esser / EQ dinámico de banda ancha** | Baja una banda solo cuando se pasa de su nivel habitual (sibilancia, platillos que «rasgan») | Rango, *Umbral* (dB sobre lo habitual), *Ratio*, *Reducción máx.* |
| **5 · Colas agudas** | Acorta la cola de hi-hats y platillos entre golpes cuando el piso agudo sube | *Reducción máx.*, frecuencia desde la que actúa |

**Neon Scalpel en una frase:** es un compresor por frecuencia. Ejemplo de de-esser fino: banda en 6,5 kHz, Q 1,5, modo «bajar al pasar el umbral», umbral −35 dB, ratio 3, cambio dinámico máx. 6 dB, ataque 2–5 ms, liberación 60–100 ms. El pie de la tarjeta muestra cuánto actuó cada banda.

### Master

| Módulo | Qué hace |
|---|---|
| **Master por estilo** | Carga un punto de partida (EDM, rock, heavy metal, pop, clásica, jazz, folk, estándar). Fuentes en [ESTILOS.md](ESTILOS.md) |
| **EQ de master** | Igual que el de corrección, con la referencia tonal orientativa del estilo. Se procesa al tocar *Procesar* |
| **Compresor de bus** | *Umbral* (absoluto, dBFS), *Ratio*, *Ataque*, *Liberación*, *Rodilla*, *Ganancia*, *Mezcla* (compresión paralela), *Filtro detector* (evita que el bajo mueva el compresor) |
| **Nivel de salida y limitador** | Modos: normalizar a LUFS, ganancia manual, o solo limitar. *Techo* en dBTP, *Lookahead* y *Liberación* del limitador |
| **Medidor** | LUFS integrado / corto plazo / momentáneo, rango (LRA), true peak, pico de muestra, PLR, gráfico de loudness y simulador de plataformas |

## 6. Atajos

`Espacio` play/pausa · `1` original · `2` procesado · `3` lo que se quita · `4` EQ en vivo · `M` mono/estéreo · `L` bucle · `←` `→` ±5 s (con Shift, ±1 s) · `Inicio` volver al comienzo.

## 7. Problemas frecuentes

| Situación | Qué hacer |
|---|---|
| «Lo que se quita» no suena | Tocá **Procesar** primero. Si la barra dice «la diferencia es prácticamente nula», con esos ajustes casi no se cambia nada. Con el control **Δ** podés subirlo aún más |
| Muevo el EQ y no oigo el cambio | Solo el **EQ de corrección** se oye en vivo y solo en el monitor **EQ en vivo** (el original pasando por el EQ). Desde la versión 0.1.1, cualquier cambio en ese EQ (bolitas, sliders, tipo, encendido) te lleva solo a ese monitor. El EQ de master y los demás módulos (ruido, de-esser, colas, Neon Scalpel) se oyen después de **Procesar** |
| Quiero oír lo que quita el EQ **sin procesar** | Pestaña Corregir → EQ de corrección → **Solo lo que quita** (ver Flujo A) |
| Procesar tarda | Un tema de 5 min tarda unos 20 s la primera vez; si solo cambiás el master, unos segundos (las etapas de corrección se guardan) |
| El resultado suena «burbujeante» o apagado | Bajá la *Intensidad* o la *Reducción máx.* del ruido, de-esser o colas agudas |
| El MP3 sale con menos LUFS que el objetivo | Se bajó unas décimas para respetar el techo tras la codificación (verificación automática) |
| Pico sobre el techo (marcas rojas) | Bajá el techo un poco o revisá que el modo de nivel no esté en «Ganancia manual» con demasiada ganancia |
| La página se traba con archivos muy largos | Cada copia estéreo de un tema de 5 min ocupa ≈ 116 MB y la app mantiene varias; cerrá otras pestañas o trabajá por partes |
| Quiero la interfaz en inglés | Chrome: clic derecho → *Traducir a…*. Un selector de idioma propio es una buena contribución |

## 8. Qué no hace (todavía)

- No reemplaza al oído: los números verifican los cálculos, no el sonido.
- El EQ es de fase mínima; no hay fase lineal ni procesamiento Mid/Side.
- Solo el EQ de corrección se escucha en vivo; el resto se procesa offline.
- No exporta FLAC.

¿Falta algo? Abrí un *issue*. Ver [CONTRIBUTING.md](../CONTRIBUTING.md).
