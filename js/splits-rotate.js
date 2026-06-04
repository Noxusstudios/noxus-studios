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
  // Presentation hysteresis: the content cascade fires when a panel has
  // (mostly) settled upright in front of the viewer, and resets once the
  // panel has rolled well back out — so scrolling up/down replays it.
  const PRESENT_ON = 0.66;
  const PRESENT_OFF = 0.42;

  const inners = Array.from(document.querySelectorAll('.split-section__inner'));
  if (inners.length === 0) return;

  // Signal that the choreography driver is live, so the hidden initial state
  // only applies when JS can actually reveal it (no-JS users see content).
  document.documentElement.classList.add('splits-ready');

  // Pair each inner with its sticky section + watermark host once
  // (avoids per-frame closest()/querySelector()).
  const pairs = inners.map((el) => {
    const section = el.closest('.split-section');
    return { inner: el, section, right: section ? section.querySelector('.split-right') : null };
  });

  // Watermark parallax: the ghost 01/02/03 numeral glides vertically as its
  // panel travels into the pinned position, lagging the content for depth.
  const WM_FROM = 54;   // px below resting (panel entering from the bottom)
  const WM_TO = -42;    // px above resting (panel settled / pinned)

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
    for (const { inner, section, right } of pairs) {
      const rect = inner.getBoundingClientRect();
      // Entry progress: 0 when top is at viewport bottom; 1 when top is at viewport top.
      const progress = 1 - rect.top / vh;
      let p = progress;
      if (p < 0) p = 0;
      else if (p > 1) p = 1;
      const ratio = p < ROLL_END_PROGRESS ? p / ROLL_END_PROGRESS : 1;
      const rotation = ROLL_FROM * (1 - ratio);
      inner.style.setProperty('--roll', `${rotation.toFixed(2)}deg`);

      // Drift the ghost watermark across the same entry progress.
      if (right) {
        const wm = WM_FROM + (WM_TO - WM_FROM) * p;
        right.style.setProperty('--wm', `${wm.toFixed(1)}px`);
      }

      // Drive the content cascade off the same scroll progress as the roll,
      // so it plays exactly when the panel arrives — not when it first
      // crosses the viewport edge while still hidden behind the prior panel.
      if (section) {
        if (p >= PRESENT_ON) section.classList.add('is-presented');
        else if (p < PRESENT_OFF) section.classList.remove('is-presented');
      }
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
  // Re-check after full load (late fonts/images shift layout; covers anchor
  // deep-links landing mid-stack) so no panel can stay stuck pre-presentation.
  window.addEventListener('load', schedule);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      inners.forEach((el) => el.style.setProperty('--roll', '0deg'));
    } else {
      schedule();
    }
  });
})();
