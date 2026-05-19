(function () {
  const ALLOWED_ORIGINS = ['https://ivanalbizu.eu', window.location.origin];
  const iframes = document.querySelectorAll('iframe[data-auto-resize]');
  if (!iframes.length) return;

  // Escuchar mensajes de altura de cualquier iframe con data-auto-resize
  window.addEventListener('message', (e) => {
    if (!ALLOWED_ORIGINS.includes(e.origin)) return;
    if (!e.data || e.data.type !== 'iframeHeight' || typeof e.data.height !== 'number') return;

    iframes.forEach((iframe) => {
      if (iframe.contentWindow === e.source) {
        iframe.style.height = `${e.data.height}px`;
      }
    });
  });

  // Cuando un iframe se hace visible (tab, accordion, scroll…), pedir su altura
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.contentWindow.postMessage({ type: 'requestHeight' }, '*');
      }
    });
  });

  iframes.forEach((iframe) => observer.observe(iframe));
})();
