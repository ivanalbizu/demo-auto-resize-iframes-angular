#!/usr/bin/env bash
#
# Genera dos carpetas listas para subir a static hosts (Vercel, Netlify, ...):
#   dist-app/   → app Angular build de producción
#   dist-host/  → anfitrión HTML estático, con un config.js editable que apunta
#                 al URL donde se haya desplegado dist-app/
#
# Mantiene cross-origin entre anfitrión y app, que es el sentido del demo.
#
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1/3  Build Angular (iframe-app)"
( cd iframe-app && npm run build )

echo "==> 2/3  Stage dist-app/ desde iframe-app/dist/iframe-app/browser/"
rm -rf dist-app
cp -R iframe-app/dist/iframe-app/browser dist-app

echo "==> 3/3  Stage dist-host/ desde host/ + config.js + resolver"
rm -rf dist-host
cp -R host dist-host

# Reemplaza el src hardcoded por un marcador con el puerto, que el resolver
# convierte en URL absoluto leyendo window.APP_BASE_URL.
sed -i 's|src="http://localhost:4200/"|data-iframe-src-port="4200"|g' dist-host/index.html

# Inyecta config.js + resolver antes de iframe-auto-resize.js
sed -i 's|<script src="./js/iframe-auto-resize.js"></script>|<script src="./config.js"></script>\n  <script src="./js/iframe-src-resolver.js"></script>\n  <script src="./js/iframe-auto-resize.js"></script>|' dist-host/index.html

cat > dist-host/config.js <<'EOF'
// ============================================================================
// Editar esta línea con el URL ABSOLUTO donde has desplegado dist-app/.
// Ejemplos:
//   window.APP_BASE_URL = 'https://demo-app.vercel.app';
//   window.APP_BASE_URL = 'https://user.github.io/iframe-app';
//
// Sin trailing slash es OK. En dev (localhost) déjalo vacío: el resolver
// caerá al http://localhost:4200/ automáticamente.
// ============================================================================
window.APP_BASE_URL = '';
EOF

cat > dist-host/js/iframe-src-resolver.js <<'EOF'
(function () {
  function resolve(port) {
    if (window.APP_BASE_URL) return window.APP_BASE_URL.replace(/\/+$/, '') + '/';
    var loc = window.location;
    if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
      return loc.protocol + '//' + loc.hostname + ':' + port + '/';
    }
    console.warn('[iframe-src-resolver] window.APP_BASE_URL no definido y host no es localhost. Iframe sin src.');
    return '';
  }
  document.querySelectorAll('iframe[data-iframe-src-port]').forEach(function (iframe) {
    var url = resolve(iframe.getAttribute('data-iframe-src-port'));
    if (url) iframe.src = url;
  });
})();
EOF

# Reescribimos iframe-auto-resize.js para que derive ALLOWED_ORIGINS del src ya
# resuelto, en vez de tener una lista hardcodeada con localhost.
cat > dist-host/js/iframe-auto-resize.js <<'EOF'
(function () {
  var iframes = document.querySelectorAll('iframe[data-auto-resize]');
  if (!iframes.length) return;

  var ALLOWED_ORIGINS = [window.location.origin];
  iframes.forEach(function (iframe) {
    try {
      var origin = new URL(iframe.src, window.location.href).origin;
      if (origin && ALLOWED_ORIGINS.indexOf(origin) === -1) ALLOWED_ORIGINS.push(origin);
    } catch (e) { /* iframe sin src todavía */ }
  });

  window.addEventListener('message', function (e) {
    if (ALLOWED_ORIGINS.indexOf(e.origin) === -1) return;
    if (!e.data || e.data.type !== 'iframeHeight' || typeof e.data.height !== 'number') return;
    iframes.forEach(function (iframe) {
      if (iframe.contentWindow === e.source) iframe.style.height = e.data.height + 'px';
    });
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && entry.target.contentWindow) {
        entry.target.contentWindow.postMessage({ type: 'requestHeight' }, '*');
      }
    });
  });
  iframes.forEach(function (iframe) { observer.observe(iframe); });
})();
EOF

cat > dist-host/README-DEPLOY.txt <<'EOF'
Pasos de despliegue
===================

1. Subir dist-app/ a un static host (Vercel, Netlify, GitHub Pages, ...).
   Requisito: el host debe servir index.html como fallback para rutas
   desconocidas (SPA fallback) — Vercel y Netlify lo hacen por defecto;
   GitHub Pages no, pero da igual mientras no se navegue directamente a
   /nested fuera del iframe (el iframe lo monta dinámicamente).
   Anota el URL final, p.ej. https://demo-app.vercel.app

2. Editar config.js en este dist-host/ y poner:
       window.APP_BASE_URL = '<URL del paso 1>';

3. Subir dist-host/ a OTRO static host (subdominio o proyecto distinto)
   para conservar el carácter cross-origin del demo.

4. Abrir el URL del host. El iframe del Angular debe cargar y
   auto-redimensionarse en cuanto cambie su contenido.
EOF

echo
echo "==> OK"
echo "    dist-app/  → sube a un static host. Anota el URL."
echo "    dist-host/ → edita config.js con ese URL, sube a otro static host."
echo "    Ver dist-host/README-DEPLOY.txt para más detalle."
