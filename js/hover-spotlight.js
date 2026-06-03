/* hover-spotlight.js — sets --mx / --my (cursor position as a %) on any
   element carrying [data-spotlight], so a CSS radial ::after can follow
   the pointer. Reusable site-wide. Skipped for reduced-motion and coarse
   pointers (where a cursor wash means nothing). One passive listener each. */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.querySelectorAll('[data-spotlight]').forEach((el) => {
    el.addEventListener(
      'pointermove',
      (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
      },
      { passive: true }
    );
  });
})();
