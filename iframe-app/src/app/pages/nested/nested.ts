import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IframeAutoResizeService } from '../../services/iframe-auto-resize.service';

/**
 * Nivel hijo del demo. Se carga en `/nested` y se sirve dentro del iframe que monta
 * el {@link OuterComponent}, demostrando que el mismo {@link IframeAutoResizeService}
 * funciona también cuando el padre no es el anfitrión HTML sino otro componente Angular.
 *
 * No conoce a su padre — simplemente emite `iframeHeight` y responde a `requestHeight`.
 */
@Component({
  selector: 'app-nested',
  imports: [CommonModule],
  templateUrl: './nested.html',
  styleUrl: './nested.css',
})
export class NestedComponent implements OnInit {
  private readonly autoResize = inject(IframeAutoResizeService);

  /** Origin del componente Angular padre. `'*'` solo en desarrollo. */
  private readonly PARENT_ORIGIN = '*';

  /** Bloques verdes dinámicos. Cada uno añade alto y debe propagarse al outer y al host. */
  blocks: number[] = [];

  ngOnInit(): void {
    this.autoResize.attach({ parentOrigin: this.PARENT_ORIGIN });
  }

  /** Añade un bloque para forzar un crecimiento incremental del alto. */
  addBlock(): void {
    this.blocks.push(this.blocks.length + 1);
  }

  /** Vacía la lista — la altura debe encoger en los dos saltos del protocolo. */
  clear(): void {
    this.blocks = [];
  }
}
