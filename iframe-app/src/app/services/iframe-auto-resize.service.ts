import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';

interface AutoResizeOptions {
  /** Origin real del padre en producción. Solo usar '*' en desarrollo. */
  parentOrigin: string;
  /** Elemento cuyo scrollHeight define la altura emitida. Por defecto, document.body. */
  target?: HTMLElement;
}

/**
 * Lado "iframe" del protocolo auto-resize. Llamar `attach()` desde el `ngOnInit`
 * del componente raíz (o de cualquier ruta que se sirva dentro de un iframe).
 *
 * Mensajes que emite y escucha el servicio:
 * - emite `{ type: 'iframeHeight', height }` cuando cambia el alto del target.
 * - escucha `{ type: 'requestHeight' }` y reenvía la altura actual.
 *
 * No hace nada si el componente no está embebido (`window.parent === window`) o
 * si se ejecuta fuera del navegador (SSR/prerender).
 */
@Injectable({ providedIn: 'root' })
export class IframeAutoResizeService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  private resizeObserver?: ResizeObserver;
  private target?: HTMLElement;
  private parentOrigin = '';
  private lastSent = -1;

  private readonly onMessage = (e: MessageEvent) => {
    if (e.data?.type === 'requestHeight') this.sendHeight();
  };
  private readonly onWindowResize = () => this.sendHeight();

  /**
   * Engancha el `ResizeObserver` y los listeners necesarios para sincronizar la altura
   * con el padre. Idempotente en el sentido de que el primer envío se hace de inmediato,
   * sin esperar al evento `load`.
   *
   * @param opts.parentOrigin Origin esperado del padre. Usar el valor real en producción;
   *                          `'*'` solo en desarrollo local.
   * @param opts.target       Elemento cuyo `scrollHeight` se reporta. Por defecto `document.body`.
   */
  attach(opts: AutoResizeOptions): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (typeof window === 'undefined' || window.parent === window) return;

    this.parentOrigin = opts.parentOrigin;
    this.target = opts.target ?? this.document.body;

    this.resizeObserver = new ResizeObserver(() => this.sendHeight());
    this.resizeObserver.observe(this.target);

    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('message', this.onMessage);

    this.sendHeight();
  }

  private sendHeight(): void {
    if (!this.target) return;
    const height = this.target.scrollHeight;
    if (height === this.lastSent) return;
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
