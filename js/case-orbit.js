/* ============================================================
   NOXUS — case-orbit.js
   Pause control for the holographic orbiting screen on the work page.
   The 360° spin is pure CSS (compositor-only), but a perpetual
   animation needn't run when nobody's watching: pause it off-screen,
   on tab-hide, and on hover (so the viewer can stop it to read).
   Reduced-motion users get the CSS-frozen static card — bail early.
   ============================================================ */

(function () {
  'use strict';

  var orbit = document.getElementById('case-orbit');
  if (!orbit) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var sphere = orbit.closest('.case-feature__sphere');
  var floor = document.querySelector('.case-feature__floor');
  var animated = [orbit, sphere, floor].filter(Boolean);

  var inView = true;
  var visible = true;
  var hovering = false;

  function apply() {
    var state = (inView && visible && !hovering) ? 'running' : 'paused';
    animated.forEach(function (el) { el.style.animationPlayState = state; });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      apply();
    }, { threshold: 0.05 });
    io.observe(sphere || orbit);
  }

  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    apply();
  });

  var hoverTarget = sphere || orbit;
  hoverTarget.addEventListener('pointerenter', function () { hovering = true; apply(); });
  hoverTarget.addEventListener('pointerleave', function () { hovering = false; apply(); });

  apply();
})();
