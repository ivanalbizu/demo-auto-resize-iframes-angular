# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado actual del repositorio

Este repo está **sin scaffoldear**. Solo contiene:

- [CLAUDE.md](CLAUDE.md) — esta guía (es la fuente canónica del diseño y el protocolo).
- [.ignore-origin/](.ignore-origin/) — material de referencia de la integración original
  (con `https://ivanalbizu.eu` como origin permitido y una demo vanilla en HTML).
  **No es la demo activa**; sirve como punto de comparación para el diseño descrito aquí.

Las carpetas `host/` y `iframe-app/` que la guía describe **aún no existen**. La sección 5 de este
fichero es el plan de scaffolding: cuando el usuario pida montar la demo, seguir los pasos 5.1–5.9
literalmente (los snippets ahí dentro son canónicos).

## Comandos habituales

Una vez scaffoldada la demo (sección 5):

```bash
# Arrancar app Angular en :4200
cd iframe-app && npm start

# Servir anfitrión estático en :8080
npx http-server host -p 8080 -c-1

# Ambos a la vez, desde la raíz (si se creó el package.json del paso 5.9)
npm run dev

# Build de producción de la app Angular
cd iframe-app && npm run build

# Tests unitarios de la app Angular
cd iframe-app && npm test
```

Abrir siempre **http://localhost:8080** (el anfitrión), no `:4200` directo — la demo no tiene
sentido fuera del iframe.

## Qué leer antes de tocar nada

- **Sección 2 (Arquitectura)** y **Sección 8 (Protocolo)**: definen los dos únicos mensajes
  (`iframeHeight`, `requestHeight`) y quién los emite. Cualquier cambio al protocolo debe
  actualizarse en ambos lados a la vez (servicio Angular + JS del anfitrión).
- **Sección 9 (Anti-patrones)**: lista vinculante. Especialmente: no capturar `wheel`/`touchmove`,
  no poner `overflow:hidden` en `html`/`body`, no usar `'*'` como `parentOrigin` en producción.
- **Sección 7 (Escenarios)**: checklist de verificación manual. Si se modifica el servicio o el
  JS del anfitrión, hay que volver a pasar la lista en el navegador (no hay tests automatizados
  para los escenarios de iframe).

---

# Guía — demo de auto-resize: HTML anfitrión + componente Angular en iframe

> Punto de partida para montar un proyecto Angular pequeño que demuestre, de extremo a extremo, el
> protocolo de auto-resize entre una página HTML anfitrión y una app Angular embebida en un `<iframe>`.
> Pensado como base mínima reproducible para validar el diseño antes de aplicarlo en cualquier
> integración real.

---

## 1. Objetivo

Tener una demo con tres actores reales y aislados, que cubre todos los escenarios típicos:

1. **Anfitrión** — página HTML estática con un `<iframe>` y un script que ajusta su altura.
2. **App Angular** — componente que vive **dentro** del iframe y comunica su altura al padre.
3. **Protocolo** — `postMessage` con dos tipos: `iframeHeight` (iframe → padre) y `requestHeight`
   (padre → iframe).

Lo que debe quedar demostrado:

- [x] El iframe crece al alto real del contenido al cargar.
- [x] El iframe crece/encoge cuando el contenido cambia (toggles, listas dinámicas, fuentes async…).
- [x] El iframe se sincroniza al redimensionar la ventana del navegador.
- [x] Funciona cuando el iframe está dentro de un contenedor inicialmente oculto (tab, accordion).
- [x] El navegador scrollea de forma nativa — sin "capturar" wheel/touch ni reenviar scroll.

---

## 2. Arquitectura

```
┌───────────────────────────────────────────────────────────────┐
│  ANFITRIÓN  (http://localhost:8080)  — HTML estático           │
│                                                                │
│   <iframe data-auto-resize src="http://localhost:4200" …>      │
│                                                                │
│   iframe-auto-resize.js                                        │
│     - addEventListener('message', …)  ─── recibe iframeHeight  │
│     - IntersectionObserver           ─── manda requestHeight   │
│                                                                │
└───────────────┬─────────────────────────────────▲──────────────┘
                │   {type:'requestHeight'}        │   {type:'iframeHeight', height:N}
                ▼                                 │
┌───────────────────────────────────────────────────────────────┐
│  IFRAME — APP ANGULAR  (http://localhost:4200)                 │
│                                                                │
│   IframeAutoResizeService                                      │
│     - ResizeObserver(target)         ─── detecta cambios       │
│     - listener 'resize'              ─── detecta redim. ventana│
│     - listener 'message'             ─── responde requestHeight│
│     - postMessage({type:'iframeHeight', height})               │
│                                                                │
│   AppComponent                                                 │
│     - inyecta el servicio, llama attach() en ngOnInit          │
│     - contenido demo: toggles, listas, etc.                    │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. Requisitos

- **Node.js** 20+ (LTS).
- **Angular CLI** reciente (`npm i -g @angular/cli`). La demo usa standalone components (default desde
  Angular 19.1.6).
- Cualquier servidor estático para el anfitrión (`npx http-server`, `npx serve`, etc.).

---

## 4. Estructura sugerida

```
auto-resize-demo/
├── README.md                       (este fichero o uno derivado)
├── package.json                    (scripts root para arrancar ambos)
├── host/                           ← Anfitrión (HTML estático)
│   ├── index.html
│   └── js/
│       └── iframe-auto-resize.js
└── iframe-app/                     ← App Angular
    ├── angular.json
    ├── package.json
    └── src/
        └── app/
            ├── app.component.ts
            ├── app.component.html
            ├── app.component.css
            └── services/
                └── iframe-auto-resize.service.ts
```

---

## 5. Setup paso a paso

### 5.1. Crear estructura

```bash
mkdir auto-resize-demo && cd auto-resize-demo
mkdir -p host/js
```

### 5.2. Crear la app Angular

```bash
ng new iframe-app --routing=false --style=css --standalone --skip-git
cd iframe-app
ng generate service services/iframe-auto-resize --skip-tests
cd ..
```

### 5.3. `host/index.html`

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Demo auto-resize — anfitrión</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1, h2 { margin: 1.5rem 0 0.5rem; }
    .filler { padding: 2rem; background: #f5f5f5; border-radius: 8px; margin: 1rem 0; }
    iframe { border: 2px solid #ddd; border-radius: 8px; background: #fff; }
    button { padding: 0.5rem 1rem; cursor: pointer; }
    .tab-controls { display: flex; gap: 0.5rem; margin: 1rem 0; }
    .tab-pane { display: none; }
    .tab-pane.active { display: block; }
  </style>
</head>
<body>
  <h1>Anfitrión — página HTML estática</h1>
  <p>Esta página incrusta una app Angular en un iframe y aplica auto-resize.</p>

  <div class="filler">Contenido de relleno antes del iframe (para tener algo que scrollear).</div>

  <h2>Escenario A — iframe visible desde el inicio</h2>
  <iframe
    data-auto-resize
    src="http://localhost:4200/"
    width="100%"
    height="200"
    scrolling="no"
    loading="lazy"
    style="overflow:hidden; display:block;"
    title="App Angular embebida"
  ></iframe>

  <h2>Escenario B — iframe dentro de un tab inicialmente oculto</h2>
  <div class="tab-controls">
    <button onclick="document.getElementById('tabB').classList.toggle('active')">
      Toggle tab oculto
    </button>
  </div>
  <div id="tabB" class="tab-pane">
    <iframe
      data-auto-resize
      src="http://localhost:4200/"
      width="100%"
      height="200"
      scrolling="no"
      loading="lazy"
      style="overflow:hidden; display:block;"
      title="App Angular embebida en tab oculto"
    ></iframe>
  </div>

  <div class="filler">Contenido de relleno después.</div>

  <script src="./js/iframe-auto-resize.js"></script>
</body>
</html>
```

### 5.4. `host/js/iframe-auto-resize.js`

```js
(function () {
  const ALLOWED_ORIGINS = ['http://localhost:4200', window.location.origin];
  const iframes = document.querySelectorAll('iframe[data-auto-resize]');
  if (!iframes.length) return;

  // Escucha mensajes de altura desde los iframes
  window.addEventListener('message', (e) => {
    if (!ALLOWED_ORIGINS.includes(e.origin)) return;
    if (e.data?.type !== 'iframeHeight' || typeof e.data.height !== 'number') return;

    iframes.forEach((iframe) => {
      if (iframe.contentWindow === e.source) {
        iframe.style.height = `${e.data.height}px`;
      }
    });
  });

  // Cuando un iframe entra en viewport (tab, accordion, scroll, lazy load…), pedir la altura
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.target.contentWindow) {
        entry.target.contentWindow.postMessage({ type: 'requestHeight' }, '*');
      }
    });
  });
  iframes.forEach((iframe) => observer.observe(iframe));
})();
```

### 5.5. `iframe-app/src/app/services/iframe-auto-resize.service.ts`

```ts
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';

interface AutoResizeOptions {
  /** Origin real del padre en producción. Solo usar '*' en desarrollo. */
  parentOrigin: string;
  /** Elemento cuyo scrollHeight define la altura emitida. Por defecto, document.body. */
  target?: HTMLElement;
}

@Injectable({ providedIn: 'root' })
export class IframeAutoResizeService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document  = inject(DOCUMENT);

  private resizeObserver?: ResizeObserver;
  private target?: HTMLElement;
  private parentOrigin = '';
  private lastSent = -1;

  private readonly onMessage = (e: MessageEvent) => {
    if (e.data?.type === 'requestHeight') this.sendHeight();
  };
  private readonly onWindowResize = () => this.sendHeight();

  attach(opts: AutoResizeOptions): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (typeof window === 'undefined' || window.parent === window) return; // no embebido

    this.parentOrigin = opts.parentOrigin;
    this.target = opts.target ?? this.document.body;

    this.resizeObserver = new ResizeObserver(() => this.sendHeight());
    this.resizeObserver.observe(this.target);

    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('message', this.onMessage);

    this.sendHeight();   // envío inicial, sin depender de 'load'
  }

  private sendHeight(): void {
    if (!this.target) return;
    const height = this.target.scrollHeight;
    if (height === this.lastSent) return;   // evita reposts iguales
    this.lastSent = height;
    window.parent.postMessage({ type: 'iframeHeight', height }, this.parentOrigin);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onWindowResize);
      window.removeEventListener('message', this.onMessage);
    }
  }
}
```

### 5.6. `iframe-app/src/app/app.component.ts`

```ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IframeAutoResizeService } from './services/iframe-auto-resize.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  private readonly autoResize = inject(IframeAutoResizeService);

  // En localhost, '*' está bien. En producción, el origin real del anfitrión.
  private readonly PARENT_ORIGIN = '*';

  showExtra = false;
  items: string[] = [];

  ngOnInit(): void {
    this.autoResize.attach({ parentOrigin: this.PARENT_ORIGIN });
  }

  toggleExtra(): void { this.showExtra = !this.showExtra; }
  addItem(): void    { this.items.push(`Item ${this.items.length + 1}`); }
  reset(): void      { this.items = []; this.showExtra = false; }
}
```

### 5.7. `iframe-app/src/app/app.component.html`

```html
<section class="card">
  <h2>App Angular embebida</h2>
  <p>El servicio observa el body con <code>ResizeObserver</code> y envía la altura al padre.</p>

  <div class="actions">
    <button (click)="toggleExtra()">{{ showExtra ? 'Ocultar' : 'Mostrar' }} contenido extra</button>
    <button (click)="addItem()">Añadir item</button>
    <button (click)="reset()">Reset</button>
  </div>

  <div *ngIf="showExtra" class="extra">
    <p>Bloque adicional que aparece dinámicamente. El iframe debe crecer para acomodarlo.</p>
    <p>Línea 2 del bloque extra.</p>
    <p>Línea 3 del bloque extra.</p>
  </div>

  <ul *ngIf="items.length">
    <li *ngFor="let item of items">{{ item }}</li>
  </ul>
</section>
```

### 5.8. `iframe-app/src/app/app.component.css`

```css
:host { display: block; }
.card { padding: 1.25rem; font-family: system-ui, sans-serif; line-height: 1.5; }
.actions { display: flex; gap: 0.5rem; margin: 0.75rem 0; flex-wrap: wrap; }
button { padding: 0.5rem 0.9rem; cursor: pointer; }
.extra { background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 1rem; margin: 0.75rem 0; }
ul { margin: 0.75rem 0; padding-left: 1.25rem; }
```

### 5.9. (Opcional) `package.json` root con scripts

En `auto-resize-demo/package.json`:

```json
{
  "name": "auto-resize-demo",
  "private": true,
  "scripts": {
    "host":   "npx http-server host -p 8080 -c-1",
    "app":    "cd iframe-app && npm start",
    "dev":    "npx concurrently \"npm:host\" \"npm:app\""
  },
  "devDependencies": {
    "concurrently": "^9.0.0",
    "http-server": "^14.0.0"
  }
}
```

```bash
npm install
```

---

## 6. Ejecución

Con los scripts del paso 5.9:

```bash
npm run dev
```

O en dos terminales por separado:

```bash
# Terminal 1
cd iframe-app && npm start            # http://localhost:4200

# Terminal 2
npx http-server host -p 8080 -c-1     # http://localhost:8080
```

Abrir **http://localhost:8080**.

---

## 7. Escenarios a verificar

Lista de comprobación. En cada uno, abrir DevTools y dejar este listener en la pestaña anfitrión para
ver mensajes en directo:

```js
window.addEventListener('message', (e) => console.log(e.origin, e.data));
```

- [ ] **Carga inicial:** al cargar la página, llega `{ type: 'iframeHeight', height: <n> }` y el
      `<iframe>` ajusta `style.height` al alto real.
- [ ] **Toggle de contenido:** pulsar "Mostrar contenido extra" → llega un nuevo `iframeHeight` con un
      valor mayor → el iframe crece.
- [ ] **Lista dinámica:** pulsar "Añadir item" varias veces → cada vez se recibe `iframeHeight` con
      altura creciente.
- [ ] **Reset:** pulsar "Reset" → el iframe encoge al alto base.
- [ ] **Redimensionar ventana:** cambiar el ancho del navegador → llega `iframeHeight` (si el
      contenido reflueye y cambia de alto).
- [ ] **Tab oculto:** pulsar "Toggle tab oculto" → al hacerse visible, el `IntersectionObserver` del
      anfitrión manda `requestHeight` y el iframe responde con su altura real (no 0).
- [ ] **Scroll nativo:** pasar el ratón por encima del iframe y hacer scroll con la rueda → la página
      anfitrión scrollea con normalidad. No hay `preventDefault` ni captura de scroll.
- [ ] **Sin ruido:** entre cambios, no se reciben mensajes duplicados con la misma altura (el
      `lastSent` del servicio filtra repeticiones).

---

## 8. Protocolo de mensajes (canónico)

| Mensaje | Dirección | Descripción |
|---------|-----------|-------------|
| `{ type: 'iframeHeight', height: <number> }` | Iframe → Anfitrión | El iframe comunica su altura actual |
| `{ type: 'requestHeight' }` | Anfitrión → Iframe | El anfitrión pide al iframe que reenvíe su altura (al hacerse visible, etc.) |

### Atributos del `<iframe>`

```html
<iframe
  data-auto-resize          <!-- marcador para el script del anfitrión -->
  src="..."
  width="100%"
  height="200"               <!-- placeholder inicial, evita salto de layout; el JS lo sobrescribe -->
  scrolling="no"             <!-- el iframe no tendrá scroll propio -->
  loading="lazy"             <!-- no cargar hasta acercarse al viewport / tab oculto -->
  style="overflow:hidden; display:block;"
  title="..."
></iframe>
```

---

## 9. Qué NO hacer (anti-patrones a evitar)

- ❌ **Capturar `wheel` / `touchmove` con `preventDefault()` y reenviar scroll** vía `postMessage`.
  Rompe el scroll nativo, accesibilidad e inercia. Si la altura está bien sincronizada, **no hace
  falta scrollear "dentro" del iframe**.
- ❌ **Poner `overflow: hidden` en `html`/`body`** dentro del iframe. Tampa el problema, no lo resuelve.
- ❌ **Pegar un `<script>` con el emisor dentro de un template Angular** (`*.component.html`):
  Angular elimina los `<script>` por sanitización. Va como código del framework (servicio / componente)
  o en `index.html`.
- ❌ **Emitir altura solo en eventos puntuales** (selecciones, etc.). `ResizeObserver` cubre todos los
  casos sin cablear evento por evento.
- ❌ **Usar `PARENT_ORIGIN = '*'`** en producción. Solo en desarrollo.
- ❌ **Confiar en que `data-auto-resize` "activa" algo por sí solo**: es solo un selector. El
  comportamiento lo aporta el JS del anfitrión.

---

## 10. Extensiones opcionales

Cosas que se pueden añadir a la demo para validar casos más exigentes:

- **Imágenes y fuentes async**: añadir una `<img>` con `loading="lazy"` o una fuente web dentro de la
  app Angular. Verificar que al terminar de cargar, el `ResizeObserver` dispara y la altura se actualiza.
- **Varios iframes en la misma página**: añadir un segundo `<iframe data-auto-resize>` a la misma app
  o a una segunda. El listener del anfitrión ya los gestiona en paralelo gracias a
  `iframe.contentWindow === e.source`.
- **Iframe anidado** (3 niveles): meter dentro de la app Angular un sub-iframe que también use el
  mismo protocolo. La app Angular hace de **iframe** hacia arriba y de **padre** hacia abajo —
  el mismo servicio / mismo listener en ambas interfaces.
- **Umbral anti-bucle**: cambiar la comparación `height === this.lastSent` por
  `Math.abs(height - this.lastSent) < 2` para tolerar diferencias subpíxel.
- **Throttle**: envolver `sendHeight` en `requestAnimationFrame` si se ven cambios de altura muy
  frecuentes (no debería hacer falta con `ResizeObserver`, que ya colapsa cambios por frame).

---

## 11. Patrón para producción

Cuando esta demo funcione, llevarlo a producción es mover el código tal cual:

- **Anfitrión real**: pegar `iframe-auto-resize.js` (o equivalente) y dejar el listener `message` +
  `IntersectionObserver` en el bundle de la PDP / página correspondiente. Cambiar `ALLOWED_ORIGINS`
  por la lista real.
- **App Angular real**: incluir `IframeAutoResizeService`, llamar `attach()` en `AppComponent`
  (o página raíz embebible), poner `parentOrigin` con el dominio real del anfitrión.
- **Eliminar** cualquier código previo de scroll-forwarding, `overflow:hidden` en `html`/`body`, o
  emisión "event-driven" de altura. El `ResizeObserver` los reemplaza a todos.
