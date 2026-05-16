/* ============================================================
   NOXUS — animations.js
   Scroll reveal + stat counters (per spec §4)
   ============================================================ */

(function () {
  'use strict';

  /* ---- Scroll reveal ----
     threshold: 0.01 so any sliver of intersection fires the reveal — avoids
     "stuck hidden" cards when users scroll past quickly. Plus a 2.5s safety
     net that force-reveals anything still pending so content can never get
     stuck invisible (e.g. anchor-jump landings, deep-link to mid-page).
  */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px -5% 0px' });
    revealEls.forEach((el) => revealObs.observe(el));

    setTimeout(() => {
      document.querySelectorAll('.reveal:not(.visible)').forEach((el) => {
        el.classList.add('visible');
      });
    }, 2500);
  }

  /* ---- Stat counter (easeOut cubic) ---- */
  function countUp(el) {
    const target   = parseFloat(el.dataset.target);
    const suffix   = el.dataset.suffix || '';
    const duration = 1400;
    const start    = performance.now();
    const ease     = (t) => 1 - Math.pow(1 - t, 3);

    function frame(now) {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.floor(target * ease(p)) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  const statEls = document.querySelectorAll('[data-target]');
  if (statEls.length) {
    const statObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.dataset.counted) {
          entry.target.dataset.counted = '1';
          countUp(entry.target);
        }
      });
    }, { threshold: 0.5 });
    statEls.forEach((el) => statObs.observe(el));
  }

  /* ---- Mobile split-section reveal ----
     Desktop uses CSS scroll-timeline (animation-timeline: view()).
     Mobile drops position:sticky so the timeline can't drive entry —
     use IntersectionObserver to fade each panel up individually. */
  if (window.matchMedia('(max-width: 768px)').matches) {
    const splitSections = document.querySelectorAll('.split-section');
    if (splitSections.length) {
      const splitObs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            splitObs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });
      splitSections.forEach((s) => splitObs.observe(s));
    }
  }
})();
