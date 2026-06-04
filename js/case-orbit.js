/* ============================================================
   NOXUS — case-orbit.js
   Folds the case-study screenshot into a holographic CYLINDER: the
   image is sliced into vertical panels arranged around an invisible
   drum, and the whole drum auto-spins 360° around its vertical axis,
   so any point on the "folded screen" traces a full circle.

   Pure CSS 3D transforms (compositor-only). Pauses off-screen, on
   tab-hide, and on hover. Reduced-motion / no-JS: the flat fallback
   screenshot is left as-is (this script never runs / bails early).
   ============================================================ */

(function () {
  'use strict';

  var orbit = document.getElementById('case-orbit');
  if (!orbit) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var img = orbit.querySelector('.case-feature__shot');
  var sphere = orbit.closest('.case-feature__sphere');
  var visual = orbit.closest('.case-feature__visual');
  var floor = visual ? visual.querySelector('.case-feature__floor') : null;
  if (!img || !sphere) return;

  /* ---- Geometry: wrap the full screenshot once around the drum ---- */
  var mobile = window.innerWidth < 600;
  var SEG = mobile ? 16 : 24;     // panel count (smoothness of the curve)
  var H = mobile ? 240 : 384;     // drum height in px
  var OPACITY = 0.9;              // translucent = holographic (see the far side)

  var ratio = (parseFloat(img.getAttribute('width')) || 1600) /
              (parseFloat(img.getAttribute('height')) || 1000);
  var fullW = H * ratio;          // unrolled screenshot width
  var segW = fullW / SEG;         // panel width
  var stepDeg = 360 / SEG;        // angle between panels
  var radius = (segW / 2) / Math.tan(Math.PI / SEG); // panels sit flush

  var src = img.currentSrc || img.src;

  var cyl = document.createElement('div');
  cyl.className = 'case-feature__cyl';
  for (var i = 0; i < SEG; i++) {
    var seg = document.createElement('div');
    seg.className = 'case-feature__seg';
    seg.style.width = segW + 'px';
    seg.style.height = H + 'px';
    seg.style.marginLeft = (-segW / 2) + 'px';
    seg.style.marginTop = (-H / 2) + 'px';
    seg.style.backgroundImage = 'url("' + src + '")';
    seg.style.backgroundSize = fullW + 'px ' + H + 'px';
    seg.style.backgroundPosition = (-(i * segW)) + 'px 0';
    seg.style.opacity = OPACITY;
    seg.style.transform = 'rotateY(' + (i * stepDeg) + 'deg) translateZ(' + radius + 'px)';
    cyl.appendChild(seg);
  }

  orbit.appendChild(cyl);
  // Keep the fallback (and its alt-bearing img) accessible, just visually gone.
  var fallback = orbit.querySelector('.case-feature__face');
  if (fallback) fallback.classList.add('is-sr');
  sphere.classList.add('is-cyl');
  orbit.classList.add('is-cyl');
  if (visual) visual.classList.add('is-cyl');

  /* ---- Pause control ---- */
  var animated = [orbit, sphere, floor].filter(Boolean);
  var inView = true, visible = true, hovering = false;
  function apply() {
    var state = (inView && visible && !hovering) ? 'running' : 'paused';
    animated.forEach(function (el) { el.style.animationPlayState = state; });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { inView = e[0].isIntersecting; apply(); },
      { threshold: 0.05 }).observe(sphere);
  }
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden; apply();
  });
  sphere.addEventListener('pointerenter', function () { hovering = true; apply(); });
  sphere.addEventListener('pointerleave', function () { hovering = false; apply(); });
  apply();
})();
