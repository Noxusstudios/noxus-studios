/* ============================================================
   NOXUS — nav.js
   Mobile menu + nav theme switching (per spec §4)
   ============================================================ */

(function () {
  'use strict';

  const nav      = document.querySelector('#site-nav');
  const overlay  = document.querySelector('#nav-overlay');
  const closeBtn = document.querySelector('#nav-close');

  /* ---- Mobile overlay close ----
     Open is handled by .nav-pill in mobile mode (see below); the overlay is
     a legacy fallback path that only the close button + backdrop click
     dismiss. */
  if (closeBtn && overlay) {
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      document.documentElement.style.overflow = '';
    });
  }
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        document.documentElement.style.overflow = '';
      }
    });
  }

  /* ---- Nav theme switching ----
     Scroll-based: detect whichever [data-theme] block is sitting directly
     under the nav and match its theme. More reliable than IO thresholds
     because it has no "dead zone" during section transitions. */
  if (!nav) return;
  const themedAreas = document.querySelectorAll('[data-theme]');

  /* ---- Nav pill ----
     On mobile (≤768px): hamburger icon, click expands, auto-collapses after
     5s, mouse-leave, or click-outside. On desktop (≥769px): always expanded,
     no collapse behavior — CSS forces it open regardless of .is-collapsed
     class, but we also skip the JS collapse handlers to avoid pointless work
     and stray state changes. */
  const pill = document.querySelector('#nav-pill');
  const isDesktop = () => window.matchMedia('(min-width: 769px)').matches;

  // 5s on touch is enough breathing room to scan menu items and tap one.
  const COLLAPSE_DELAY_MS = 5000;
  let collapseTimer = null;

  function clearCollapseTimer() {
    if (collapseTimer) {
      clearTimeout(collapseTimer);
      collapseTimer = null;
    }
  }
  function scheduleCollapse() {
    if (isDesktop()) return; // never auto-collapse on desktop
    clearCollapseTimer();
    collapseTimer = setTimeout(() => {
      if (pill) pill.classList.add('is-collapsed');
      collapseTimer = null;
    }, COLLAPSE_DELAY_MS);
  }

  if (pill) {
    // On desktop on load, strip the initial .is-collapsed class so the pill
    // isn't visually collapsed if CSS animations are mid-transition.
    if (isDesktop()) pill.classList.remove('is-collapsed');

    pill.addEventListener('click', (e) => {
      if (isDesktop()) return; // links handle their own clicks
      const isCollapsed = pill.classList.contains('is-collapsed');
      if (isCollapsed) {
        e.preventDefault();
        pill.classList.remove('is-collapsed');
        if (!window.matchMedia('(hover: hover)').matches || !pill.matches(':hover')) {
          scheduleCollapse();
        }
        return;
      }
    });

    pill.addEventListener('mouseenter', () => {
      if (isDesktop()) return;
      if (!pill.classList.contains('is-collapsed')) clearCollapseTimer();
    });
    pill.addEventListener('mouseleave', () => {
      if (isDesktop()) return;
      if (!pill.classList.contains('is-collapsed')) scheduleCollapse();
    });

    // iOS Safari fires :active unreliably on <a>, so script the pressed
    // state ourselves. Active on all viewports — desktop click feedback
    // benefits from this too.
    pill.querySelectorAll('.nav-pill-link').forEach((link) => {
      link.addEventListener('touchstart', () => {
        link.classList.add('is-pressed');
      }, { passive: true });
      const releasePressed = () => {
        setTimeout(() => link.classList.remove('is-pressed'), 280);
      };
      link.addEventListener('touchend', releasePressed, { passive: true });
      link.addEventListener('touchcancel', releasePressed, { passive: true });
    });

    // Click anywhere outside the expanded pill → collapse immediately.
    // Mobile only — desktop pill is permanently open so this would be a no-op
    // anyway, but skipping the listener saves needless work on every click.
    document.addEventListener('click', (e) => {
      if (isDesktop()) return;
      if (!pill.classList.contains('is-collapsed') && !pill.contains(e.target)) {
        clearCollapseTimer();
        pill.classList.add('is-collapsed');
      }
    });

    // Viewport changes (DevTools, rotation): re-sync the collapse state so
    // a user who resizes from mobile-collapsed → desktop sees the open pill,
    // and vice versa.
    window.addEventListener('resize', () => {
      if (isDesktop()) {
        clearCollapseTimer();
        pill.classList.remove('is-collapsed');
      }
    }, { passive: true });
  }

  let ticking = false;

  function pickThemeAtNav() {
    if (!themedAreas.length) return;
    // Sample point: a few px below the nav's bottom edge.
    const checkY = nav.getBoundingClientRect().bottom + 4;
    for (const el of themedAreas) {
      const rect = el.getBoundingClientRect();
      if (rect.top <= checkY && rect.bottom >= checkY) {
        nav.classList.toggle('on-dark', el.dataset.theme === 'dark');
        return;
      }
    }
  }

  function checkScrollState() {
    // The pill has its own collapse animation; the legacy `is-scrolled`
    // opacity fade would fight it on index.html. Skip when pill is present.
    if (pill) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 80);
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        pickThemeAtNav();
        checkScrollState();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  pickThemeAtNav();      // initial theme on load
  checkScrollState();    // initial scrolled state on load
})();
