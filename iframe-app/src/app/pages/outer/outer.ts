import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { IframeAutoResizeService } from '../../services/iframe-auto-resize.service';
import { IframeAutoResizeHostDirective } from '../../directives/iframe-auto-resize-host.directive';

/**
 * Nivel intermedio del demo. Vive dentro del `<iframe>` del anfitrión HTML y, a su
 * vez, embebe otro `<iframe>` que carga el {@link NestedComponent}.
 *
 * Tiene dos papeles simultáneos:
 * - Como **hijo**: usa {@link IframeAutoResizeService} para reportar su altura al host HTML.
 * - Como **padre**: aplica {@link IframeAutoResizeHostDirective} sobre el iframe interior
 *   para recibir las alturas del NestedComponent y redimensionarlo.
 *
 * El protocolo es el mismo en ambos saltos; solo cambia la perspectiva.
 */
@Component({
  selector: 'app-outer',
  imports: [CommonModule, IframeAutoResizeHostDirective],
  templateUrl: './outer.html',
  styleUrl: './outer.css',
})
export class OuterComponent implements OnInit {
  private readonly autoResize = inject(IframeAutoResizeService);
  private readonly platformId = inject(PLATFORM_ID);

  /** Origin del anfitrión HTML al que enviamos `iframeHeight`. `'*'` solo en desarrollo. */
  private readonly PARENT_ORIGIN = '*';

  /** Si el bloque amarillo extra es visible. Al togglearlo, el body cambia de alto. */
  showExtra = false;

  /** Si el iframe anidado está montado. Se monta bajo demanda para probar el escenario "tab oculto". */
  showNested = false;

  /** Lista dinámica que crece con cada click. Cada item dispara `ResizeObserver`. */
  items: string[] = [];

  /**
   * Origins permitidos para los mensajes del iframe anidado. Como el nested vive en
   * la misma app Angular, su origin coincide con el del documento actual.
   */
  readonly nestedAllowedOrigins: string[] = isPlatformBrowser(this.platformId)
    ? [window.location.origin]
    : [];

  ngOnInit(): void {
    this.autoResize.attach({ parentOrigin: this.PARENT_ORIGIN });
  }

  /** Muestra/oculta el bloque amarillo extra. */
  toggleExtra(): void {
    this.showExtra = !this.showExtra;
  }

  /** Monta o desmonta el iframe anidado (`NestedComponent`). */
  toggleNested(): void {
    this.showNested = !this.showNested;
  }

  /** Añade un item a la lista para forzar un cambio incremental de altura. */
  addItem(): void {
    this.items.push(`Item ${this.items.length + 1}`);
  }

  /** Devuelve el componente a su estado base — la altura debe encoger. */
  reset(): void {
    this.items = [];
    this.showExtra = false;
    this.showNested = false;
  }
}
