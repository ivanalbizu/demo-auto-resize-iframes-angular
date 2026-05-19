(function () {
  const iframes = document.querySelectorAll('iframe[data-auto-resize]');
  if (!iframes.length) return;

  // Derivamos los origins permitidos del src ya resuelto de cada iframe (ver
  // iframe-src-resolver.js). Así soporta localhost y plataformas tipo StackBlitz /
  // Codespaces / Gitpod sin tener que mantener una lista hardcodeada.
  const ALLOWED_ORIGINS = [window.location.origin];
  iframes.forEach((iframe) => {
    try {
      const origin = new URL(iframe.src, window.location.href).origin;
      if (origin && !ALLOWED_ORIGINS.includes(origin)) ALLOWED_ORIGINS.push(origin);
    } catch {
      /* iframe sin src todavía — se ignora */
    }
  });

  window.addEventListener('message', (e) => {
    if (!ALLOWED_ORIGINS.includes(e.origin)) return;
    if (e.data?.type !== 'iframeHeight' || typeof e.data.height !== 'number') return;

    iframes.forEach((iframe) => {
      if (iframe.contentWindow === e.source) {
        iframe.style.height = `${e.data.height}px`;
      }
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.target.contentWindow) {
        entry.target.contentWindow.postMessage({ type: 'requestHeight' }, '*');
      }
    });
  });
  iframes.forEach((iframe) => observer.observe(iframe));
})();
