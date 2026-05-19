/**
 * Resuelve el src de los iframes marcados con data-iframe-src-port según el host
 * donde se sirve esta página. Necesario para plataformas que mapean cada puerto
 * a un subdominio distinto (StackBlitz, GitHub Codespaces, etc.) donde no se
 * puede hardcodear http://localhost:4200/.
 *
 * En local (localhost / 127.0.0.1) simplemente intercambia el puerto.
 */
(function () {
  function urlForPort(port) {
    const { protocol, hostname, host } = window.location;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:${port}/`;
    }

    // StackBlitz / CodeSandbox / WebContainer: "<port>--<rest>"
    const sb = host.match(/^(\d+)(--.+)$/);
    if (sb) return `${protocol}//${port}${sb[2]}/`;

    // GitHub Codespaces: "<name>-<port>.app.github.dev"
    const cs = host.match(/^(.+)-(\d+)(\.app\.github\.dev)$/);
    if (cs) return `${protocol}//${cs[1]}-${port}${cs[3]}/`;

    // Gitpod: "<port>-<id>.gitpod.io"
    const gp = host.match(/^(\d+)(-.+\.gitpod\.io)$/);
    if (gp) return `${protocol}//${port}${gp[2]}/`;

    console.warn('[iframe-src-resolver] host no reconocido:', host, '— no se resuelve el src.');
    return '';
  }

  document.querySelectorAll('iframe[data-iframe-src-port]').forEach((iframe) => {
    const port = iframe.getAttribute('data-iframe-src-port');
    const url = urlForPort(port);
    if (url) iframe.src = url;
  });
})();
