/* ============================================================
   splits-rotate.js
   Scroll-driven rotation for .split-section__inner elements.
   Vanilla port of the GSAP story-scroll reference:
     - Each inner pivots from its bottom-left corner
     - Starts at 30° when the section's top is at the bottom of the viewport
     - Rotates to 0° by the time the section's top reaches ~25% from the top

   Why JS instead of CSS animation-timeline: view() — that property is
   spec'd correctly but unreliable across browsers and contexts (the
   timeline doesn't always progress with scroll, especially when the
   element is inside a sticky-stack). A small rAF-throttled scroll
   listener that writes a CSS variable is both robust and cheap.
   ============================================================ */

(() => {
  'use strict';

  const ROLL_FROM = 30;        // degrees at entry start
  const ROLL_END_PROGRESS = 0.75; // when (in entry phase) rotation reaches 0

  const inners = Array.from(document.querySelectorAll('.split-section__inner'));
  if (inners.length === 0) return;

  // Respect reduced-motion: leave everything at 0deg and bail.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) {
    inners.forEach((el) => el.style.setProperty('--roll', '0deg'));
    return;
  }

  // Mobile fallback: the splits-stack collapses out of its sticky-pinned
  // carousel on narrow viewports, so rotation isn't appropriate there.
  // We skip the driver if the inner isn't laid out as 100vh tall.
  const skipNarrow = () => window.innerWidth < 769;

  let ticking = false;
  const update = () => {
    ticking = false;
    if (skipNarrow()) {
      inners.forEach((el) => el.style.setProperty('--roll', '0deg'));
      return;
    }
    const vh = window.innerHeight;
    for (const el of inners) {
      const rect = el.getBoundingClientRect();
      // Entry progress: 0 when top is at viewport bottom; 1 when top is at viewport top.
      const progress = 1 - rect.top / vh;
      let p = progress;
      if (p < 0) p = 0;
      else if (p > 1) p = 1;
      const ratio = p < ROLL_END_PROGRESS ? p / ROLL_END_PROGRESS : 1;
      const rotation = ROLL_FROM * (1 - ratio);
      el.style.setProperty('--roll', `${rotation.toFixed(2)}deg`);
    }
  };

  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  // Initial paint.
  update();

  // Live updates.
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      inners.forEach((el) => el.style.setProperty('--roll', '0deg'));
    } else {
      schedule();
    }
  });
})();
