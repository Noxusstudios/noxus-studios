/* depth.js — page-wide "alive" interactions for services.
   1) Cursor-follow spotlight: any element with class in SPOTLIGHT_SELECTORS
      gets --mx / --my (pointer position as %) which a CSS ::after radial
      gradient reads. Makes rows/cells react under the cursor.
   2) Magnetic buttons: .svc-ledger__cta pulls slightly toward the pointer,
      then springs back on leave. Skipped for reduced-motion / touch.
   One delegated pointer listener per element. Scoped to services. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  /* ---- 1. Cursor spotlight ---------------------------------------- */
  const SPOTLIGHT_SELECTORS = [
    '.svc-catalog__row',
    '.svc-cap',
    '.svc-ledger__row',
    '.svc-addon-step',
  ];
  const spotlightEls = document.querySelectorAll(SPOTLIGHT_SELECTORS.join(','));
  const onSpot = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
  };
  spotlightEls.forEach((el) => el.addEventListener('pointermove', onSpot, { passive: true }));

  /* ---- 2. Magnetic primary CTAs ----------------------------------- */
  if (reduce || coarse) return;
  const mags = document.querySelectorAll('.svc-ledger__cta');
  const STR = 0.28; // pull strength
  mags.forEach((btn) => {
    let raf = 0;
    const move = (e) => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * STR;
      const dy = (e.clientY - (r.top + r.height / 2)) * STR;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        btn.style.transform = `translate(${dx.toFixed(1)}px, ${(dy - 2).toFixed(1)}px)`;
      });
    };
    const reset = () => {
      cancelAnimationFrame(raf);
      btn.style.transform = '';
    };
    btn.addEventListener('pointermove', move, { passive: true });
    btn.addEventListener('pointerleave', reset, { passive: true });
  });

  /* ---- 3. Parallax-tilt on the add-on tiles ----------------------- */
  const tiles = document.querySelectorAll('.svc-addon-step');
  tiles.forEach((tile) => {
    const restY = tile.classList.contains('is-featured') ? -10 : 0;
    let raf = 0;
    const move = (e) => {
      const r = tile.getBoundingClientRect();
      const rx = -((e.clientY - r.top) / r.height - 0.5) * 13;  // tilt up/down
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 16;   // tilt left/right
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        tile.style.transform =
          `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(${restY - 6}px)`;
      });
    };
    const reset = () => { cancelAnimationFrame(raf); tile.style.transform = ''; };
    tile.addEventListener('pointermove', move, { passive: true });
    tile.addEventListener('pointerleave', reset, { passive: true });
  });
})();
