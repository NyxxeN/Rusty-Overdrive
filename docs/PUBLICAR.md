# Publicar en GitHub

> **Estado:** el repositorio ya está publicado en <https://github.com/NyxxeN/Rusty-Overdrive>. Esta guía queda como referencia para quien haga un *fork* o quiera publicar su propia copia.

Perfil de destino: <https://github.com/NyxxeN>. El repositorio ya trae el manual (`docs/MANUAL.md`), el pedido de colaboración (README y CONTRIBUTING) y las plantillas de *issues* y *pull requests*.

Este repositorio está listo para subirse. Los comandos son los habituales de Git; nada de esto se ejecutó por vos.

## 1. Crear el repositorio

En [github.com/new](https://github.com/new): nombre sugerido `Rusty-Overdrive`, público, **sin** README ni licencia (ya vienen en la carpeta).

Sugerencia de descripción: *"Corrector y masterizador de audio local en el navegador: EQ con bolitas, EQ dinámico, LUFS, limitador true-peak y exportación MP3/WAV."*
Temas (*topics*): `audio`, `mastering`, `web-audio`, `dsp`, `lufs`, `equalizer`, `dynamic-eq`, `true-peak`, `javascript`, `espanol`.

## 2. Subirlo

```bash
cd Rusty-Overdrive
git init -b main
git add .
git commit -m "Primera versión de Rusty Overdrive Corrector"
git remote add origin https://github.com/NyxxeN/Rusty-Overdrive.git
git push -u origin main
```

## 3. Publicar la página (GitHub Pages)

*Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / carpeta `/docs`.* En un minuto la herramienta queda disponible en `https://nyxxen.github.io/Rusty-Overdrive/` (el archivo `docs/index.html` es una copia de `dist/`).

## 4. Antes de anunciarlo, revisá

- **Licencia:** el proyecto usa MIT (archivo `LICENSE`). Si preferís otra, cambiala ahora. El codificador MP3 de `vendor/` es LGPL-3.0 y mantiene su propia licencia (ver `THIRD_PARTY_NOTICES.md`).
- **README:** cambiá el nombre del autor o agregá enlaces (tu web, tu música) donde quieras.
- **Capturas:** las de `docs/img/` se hicieron con un audio sintético; podés reemplazarlas por otras.
- **Issues y plantillas:** en *Settings → General → Features* activá *Issues* y, si querés, *Discussions* para conversar sobre oído y preajustes.
- **Release:** en *Releases → Draft a new release* adjuntá `dist/rusty-overdrive-corrector.html` para que la descarguen directo.

## 5. Encontrar especialistas

Un buen texto para invitar: contá qué hace, qué **no** verificaste (el oído), y pedí específicamente oyentes de cada género para calibrar los estilos de master (ver `docs/ESTILOS.md`, sección "Cómo mejorar estos números").
