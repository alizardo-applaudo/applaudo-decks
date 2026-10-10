# Applaudo Decks

Sitio estático en **GitHub Pages** para presentaciones internas de Applaudo (HTML, sin build step).

**Índice en vivo:** [https://alizardo-applaudo.github.io/applaudo-decks/](https://alizardo-applaudo.github.io/applaudo-decks/) (publicado vía GitHub Actions → Pages)

## Decks publicados

| Deck | URL |
|------|-----|
| Volaris PoC Flex | [/volaris-poc-flex/](https://alizardo-applaudo.github.io/applaudo-decks/volaris-poc-flex/) |
| Plantilla | [/template/](https://alizardo-applaudo.github.io/applaudo-decks/template/) |

## Cómo agregar un deck nuevo (para diseño, sin código complicado)

1. **Copia la carpeta** `template/` y renómbrala con un nombre corto en minúsculas y guiones, por ejemplo `mi-proyecto-2026/`.
2. **Abre** `mi-proyecto-2026/index.html` en Cursor o cualquier editor de texto.
3. **Edita solo el contenido** dentro de cada bloque `<section class="slide">…</section>`:
   - Portada: usa `slide slide-dark` (fondo oscuro con gradiente rojo).
   - Slides de contenido: usa `slide` (fondo claro).
   - Texto del pie: elementos con clase `foot`.
4. **Para duplicar una diapositiva:** copia un bloque `<section class="slide">` completo y pégalo antes del cierre de `</div>` del deck. No hace falta tocar JavaScript: el contador y los puntos se actualizan solos.
5. **Añade el enlace** en la página principal: abre `index.html` en la raíz y copia un `<li>` de la lista, cambiando título, descripción y `href="tu-carpeta/"`.
6. **Sube los cambios** a la rama `main` (o pide a alguien de tech que haga merge). GitHub Actions publica el sitio en unos minutos.

### Atajos de teclado (durante la presentación)

- **→** o **Page Down**: siguiente slide  
- **←** o **Page Up**: slide anterior  
- **Home** / **End**: primera / última slide  
- También puedes usar la **pill** inferior (flechas, puntos y contador `1 / N`).

### Estilos compartidos

Los decks cargan:

- `assets/css/applaudo-deck.css` — tokens y componentes Applaudo (Avenir en stack, rojo `#ff4040`, linen `#f7f7f7`, radios 32px / pill 999px, nav flotante).
- `assets/js/applaudo-deck.js` — navegación y logo SVG.

Clases útiles: `.card`, `.tbl`, `.hero-band`, `.callout`, `.eyebrow`, `.tag`, `.grid-2`.

### Diagrama “AI Design Process”

Si necesitas el mismo diagrama interactivo que en el deck de Fernando, copia la slide con clase `dos-slide` del deck Volaris y el `<iframe id="dosFrame" src="../assets/design-os-workflow.html">`.

## Desarrollo local

Abre cualquier `index.html` con un servidor estático (para que el iframe del diagrama cargue bien):

```bash
python3 -m http.server 8080
```

Luego visita `http://localhost:8080/volaris-poc-flex/`.

## Deploy

El workflow `.github/workflows/pages.yml` publica el contenido de la raíz del repo en cada push a `main`.

Si es la primera vez en el repo, en GitHub ve a **Settings → Pages** y confirma que la fuente sea **GitHub Actions** (no “Deploy from branch”).

---

Applaudo Studios · Diseño
