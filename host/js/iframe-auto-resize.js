(function () {
  const ALLOWED_ORIGINS = ['http://localhost:4200', window.location.origin];
  const iframes = document.querySelectorAll('iframe[data-auto-resize]');
  if (!iframes.length) return;

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
