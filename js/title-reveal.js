/* ============================================================
   title-reveal.js
   Editorial mask-clip reveal for every major title on the site.

   Each targeted title gets its text content wrapped in a mask + inner
   span. On reveal (either page load for hero titles, or scroll-into-view
   for section headings), the inner span slides up from below 110% to 0
   with a smooth ease. Multi-line titles (e.g. .fade-headline with three
   .fh-* spans, .split-headline with two .split-* spans) animate each
   line independently with a staggered delay.

   i18n compatibility: i18n.js dispatches `noxus:lang-changed` after
   re-applying translations; we re-wrap on that event since the innerHTML
   we wrapped gets clobbered by the translation pass.
   ============================================================ */

(function () {
  'use strict';

  // Titles to animate. Hero-level titles fire on load; section-level
  // titles fire on scroll-into-view.
  const HERO_SELECTORS = [
    '.hero-title',
    '.services-hero__title',
    '.work-hero__title',
    '.about-hero__title',
    '.contact-hero__title',
  ];
  const SECTION_SELECTORS = [
    '.fade-headline',
    '.split-headline',
    '.process-heading',
    '.disciplines__heading',
    '.bento-heading',
    '.svc-tiers__heading',
    '.svc-design__heading',
    '.svc-retainers__heading',
    '.svc-tech__heading',
    '.svc-caps__heading',
    '.svc-cta__heading',
  ];
  const ALL_SELECTORS = HERO_SELECTORS.concat(SECTION_SELECTORS).join(',');

  const obs = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-revealed');
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -5% 0px' },
  );

  function wrap(el) {
    // Collect element children that look like "lines" — direct child spans
    // (skip BR and text nodes). Multi-line titles wrap each line; single-
    // text titles wrap the whole innerHTML.
    const lineChildren = Array.from(el.children).filter(function (c) {
      return c.nodeType === 1 && c.tagName !== 'BR';
    });

    if (lineChildren.length >= 2) {
      lineChildren.forEach(function (child, i) {
        const html = child.innerHTML;
        child.innerHTML =
          '<span class="anim-title__inner" style="--t-i:' + i + '">' + html + '</span>';
      });
      el.classList.add('anim-title', 'anim-title--lines');
    } else {
      const html = el.innerHTML;
      el.innerHTML =
        '<span class="anim-title__mask"><span class="anim-title__inner">' + html + '</span></span>';
      el.classList.add('anim-title', 'anim-title--single');
    }
    el.dataset.titleAnim = '1';
  }

  function setup() {
    document.querySelectorAll(ALL_SELECTORS).forEach(function (el) {
      if (el.dataset.titleAnim === '1') return;
      wrap(el);

      const isHero = HERO_SELECTORS.some(function (sel) {
        return el.matches(sel);
      });

      if (isHero) {
        // Trigger on next frame so the initial styles are applied first
        // (avoids a flash of already-revealed content).
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            el.classList.add('is-revealed');
          });
        });
      } else {
        obs.observe(el);
      }
    });
  }

  // Re-wrap after i18n has re-set innerHTML on data-i18n elements.
  document.addEventListener('noxus:lang-changed', function () {
    // Clear flag + classes; restore wrapping with the fresh translated text.
    document.querySelectorAll('[data-title-anim="1"]').forEach(function (el) {
      el.dataset.titleAnim = '';
      el.classList.remove('anim-title', 'anim-title--lines', 'anim-title--single', 'is-revealed');
      obs.unobserve(el);
    });
    // i18n applies synchronously, but DOM may not be settled — defer one frame.
    requestAnimationFrame(setup);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
