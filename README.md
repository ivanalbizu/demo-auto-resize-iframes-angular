# Demo auto-resize — HTML anfitrión + Angular en iframe

Demo extremo a extremo del protocolo `iframeHeight` / `requestHeight` entre una página HTML estática y una app Angular embebida en un `<iframe>`.

La guía canónica de diseño, protocolo y anti-patrones está en [CLAUDE.md](CLAUDE.md).

## Estructura

```
.
├── CLAUDE.md            # guía canónica (diseño, protocolo, anti-patrones, checklist)
├── host/                # anfitrión: index.html + iframe-auto-resize.js
├── iframe-app/          # app Angular (21) que vive dentro del iframe
│   └── src/app/
│       ├── services/iframe-auto-resize.service.ts            # lado "iframe": reporta altura al padre
│       ├── directives/iframe-auto-resize-host.directive.ts   # lado "padre": escucha + IO sobre un <iframe>
│       └── pages/
│           ├── outer/    # ruta '/'        — embebida en el host HTML, y a su vez padre del nested
│           └── nested/   # ruta '/nested'  — Angular dentro de Angular dentro del HTML host
└── package.json         # scripts dev/host/app (concurrently + http-server)
```

## Arranque rápido

```bash
# primera vez:
cd iframe-app && npm install && cd ..
npm install

# todo a la vez (host :8080 + ng serve :4200):
npm run dev
```

Abrir **http://localhost:8080** (no `:4200` directo — la demo no tiene sentido fuera del iframe).

Para la verificación manual de los escenarios (carga, toggle, lista dinámica, tab oculto, etc.) ver sección 7 de [CLAUDE.md](CLAUDE.md).

## Tres niveles de iframe

La demo cubre los tres papeles del protocolo a la vez:

```
Host HTML (:8080)
  └── <iframe src="http://localhost:4200/">     ← OuterComponent
         └── <iframe src="/nested">              ← NestedComponent
```

| Nivel              | Rol respecto al padre        | Rol respecto al hijo                   |
|--------------------|------------------------------|----------------------------------------|
| `host/index.html`  | —                            | listener + `IntersectionObserver` JS   |
| `OuterComponent`   | `IframeAutoResizeService`    | `appAutoResizeHost` directiva Angular  |
| `NestedComponent`  | `IframeAutoResizeService`    | —                                      |

La directiva [appAutoResizeHost](iframe-app/src/app/directives/iframe-auto-resize-host.directive.ts) es la versión Angular del JS de `host/js/`. El mismo protocolo (`iframeHeight` / `requestHeight`) funciona en ambos saltos sin tocar el servicio.

## TODOs pendientes

- [ ] **Migrar el template a control-flow nuevo de Angular** (`@if` / `@for` en `outer.html` y `nested.html`). Funciona con `*ngIf` / `*ngFor` + `CommonModule`, pero en Angular 21 lo idiomático es el control-flow nuevo y permite quitar el import de `CommonModule`.
- [ ] **Verificar la checklist de la sección 7** en el navegador (carga inicial, toggle, lista dinámica, reset, redimensionar ventana, tab oculto, scroll nativo, anti-ruido por `lastSent`). Comprobar también el escenario nuevo: pulsar "Mostrar iframe anidado" y luego "Añadir bloque" dentro del iframe interior — la altura debe propagarse en dos saltos.
- [ ] **Sincronizar la sección 5 de [CLAUDE.md](CLAUDE.md) con los nombres de Angular 21**. La guía referencia `app.component.ts` / `AppComponent`, pero el scaffolding real de la CLI 21 genera `app.ts` / clase `App` (ahora un shell con `<router-outlet>`). El contenido demo vive en `pages/outer/` y `pages/nested/`.
- [ ] **Producción**: cambiar `PARENT_ORIGIN = '*'` en [outer.ts](iframe-app/src/app/pages/outer/outer.ts) y [nested.ts](iframe-app/src/app/pages/nested/nested.ts) por el origin real, y actualizar `ALLOWED_ORIGINS` en [host/js/iframe-auto-resize.js](host/js/iframe-auto-resize.js) y el binding `[appAutoResizeHost]` en `outer.html` con las listas reales de orígenes permitidos.
