import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Directive,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';

/**
 * Lado "anfitrión" del protocolo `iframeHeight` / `requestHeight`, equivalente al script
 * `host/js/iframe-auto-resize.js` pero como directiva Angular. Se aplica a un `<iframe>`
 * dentro de un componente Angular para que se redimensione al alto que reporte la app
 * embebida.
 *
 * Uso:
 * ```html
 * <iframe [appAutoResizeHost]="['http://localhost:4200']" src="/nested"></iframe>
 * ```
 *
 * Comportamiento:
 * - Escucha mensajes `iframeHeight` del iframe y ajusta `style.height` del elemento.
 * - Cuando el iframe entra en viewport (tab oculto que se muestra, scroll, lazy load…)
 *   envía `requestHeight` para forzar una resincronización.
 * - Filtra mensajes por `event.origin` si se pasa lista de origins.
 */
@Directive({
  selector: 'iframe[appAutoResizeHost]',
  standalone: true,
})
export class IframeAutoResizeHostDirective implements AfterViewInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLIFrameElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Origins permitidos del iframe hijo. Acepta un string o una lista. Si está vacío
   * se acepta solo `window.location.origin` — útil cuando padre e hijo viven en el
   * mismo dominio (caso del NestedComponent dentro del OuterComponent).
   */
  @Input('appAutoResizeHost') allowedOrigins: string[] | string = [];

  private intersectionObserver?: IntersectionObserver;

  private readonly onMessage = (e: MessageEvent) => {
    const allowed = this.normalize();
    if (allowed.length && !allowed.includes(e.origin)) return;
    if (e.data?.type !== 'iframeHeight' || typeof e.data.height !== 'number') return;
    const iframe = this.el.nativeElement;
    if (iframe.contentWindow === e.source) {
      iframe.style.height = `${e.data.height}px`;
    }
  };

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    window.addEventListener('message', this.onMessage);

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const iframe = entry.target as HTMLIFrameElement;
          iframe.contentWindow?.postMessage({ type: 'requestHeight' }, '*');
        }
      });
    });
    this.intersectionObserver.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('message', this.onMessage);
    this.intersectionObserver?.disconnect();
  }

  private normalize(): string[] {
    const raw = this.allowedOrigins;
    if (Array.isArray(raw)) return raw.length ? raw : [window.location.origin];
    if (typeof raw === 'string' && raw.length) return [raw];
    return [window.location.origin];
  }
}
