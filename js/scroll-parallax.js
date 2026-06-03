/* scroll-parallax.js — subtle depth: decorative layers drift at a
   different rate than the content as the page scrolls. Transform-only,
   rAF-throttled, single passive scroll listener. Disabled entirely for
   reduced-motion. Scoped to services (selectors only exist there). */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // [selector, speed] — speed is the fraction of viewport travel applied.
  // Negative speed = the layer lags (recedes), reading as further back.
  // Note: never target elements that carry their own entrance transform
  // (e.g. .services-hero__title via title-reveal.js) — parallax would
  // overwrite it. Decorative, non-animated layers only.
  const SPECS = [
    ['.svc-catalog__num', -0.07],
    ['.svc-cap__num', -0.07],
    ['.svc-tiers__heading', -0.04],
    ['.svc-design__heading', -0.04],
  ];

  const items = [];
  SPECS.forEach(([sel, speed]) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.style.willChange = 'transform';
      items.push({ el, speed });
    });
  });
  if (!items.length) return;

  let ticking = false;
  const update = () => {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    for (const it of items) {
      const rect = it.el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) continue; // skip far offscreen
      const center = rect.top + rect.height / 2;
      const offset = (center - vh / 2) / vh; // -1 (top) .. 1 (bottom)
      const y = offset * it.speed * 100;
      it.el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    }
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
