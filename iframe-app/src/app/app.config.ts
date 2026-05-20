import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash routing: hace que /#/nested funcione en cualquier static host sin
    // necesidad de SPA fallback (GitHub Pages, python http.server, S3 a pelo…).
    provideRouter(routes, withHashLocation()),
  ],
};
