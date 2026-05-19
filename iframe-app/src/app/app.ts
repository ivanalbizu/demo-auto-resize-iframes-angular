import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Shell de la app. No participa en el protocolo de auto-resize: solo monta el
 * `<router-outlet>` para que el router decida si servir el {@link OuterComponent}
 * (`/`) o el {@link NestedComponent} (`/nested`). Cada uno gestiona su propio enganche
 * al servicio de auto-resize en su `ngOnInit`.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styleUrl: './app.css',
})
export class App {}
