/* magnetic.js — cursor-pull on any [data-magnetic] element. The element
   drifts a fraction of the pointer's offset from its own center while the
   cursor is over it, then springs back on leave with the house easing.
   Transform-only (GPU), one rAF in flight at most. Skipped for reduced
   motion and coarse pointers, where a magnetic pull means nothing. */
(() => {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const STRENGTH = 0.32; // fraction of the center offset the element follows
  const MAX = 14;        // px cap so the pull stays tasteful, not rubbery
  const SPRING = 'transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)';

  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    let frame = 0;
    let raw = { x: 0, y: 0 };

    const apply = () => {
      frame = 0;
      el.style.transform = `translate3d(${raw.x.toFixed(2)}px, ${raw.y.toFixed(2)}px, 0)`;
    };

    el.addEventListener('pointerenter', () => {
      // Follow instantly while hovering so the pull feels attached.
      el.style.transition = 'transform 0.12s linear';
    });

    el.addEventListener(
      'pointermove',
      (e) => {
        const r = el.getBoundingClientRect();
        let dx = (e.clientX - (r.left + r.width / 2)) * STRENGTH;
        let dy = (e.clientY - (r.top + r.height / 2)) * STRENGTH;
        dx = Math.max(-MAX, Math.min(MAX, dx));
        dy = Math.max(-MAX, Math.min(MAX, dy));
        raw = { x: dx, y: dy };
        if (!frame) frame = requestAnimationFrame(apply);
      },
      { passive: true }
    );

    el.addEventListener('pointerleave', () => {
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
      el.style.transition = SPRING;
      el.style.transform = '';
    });
  });
})();
