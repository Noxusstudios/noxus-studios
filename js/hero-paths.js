(() => {
  const host = document.querySelector('.hero-paths');
  if (!host) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const PATH_COUNT = 16;
  const VIEWBOX = '0 0 696 316';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Geometry was authored for 36 paths/layer. Scale the per-index offset so a
  // smaller PATH_COUNT still spans the same envelope (spread, not bunched).
  const SPREAD = 36 / PATH_COUNT;

  const buildD = (i, position) => {
    const g = i * SPREAD;
    const x1 = -(380 - g * 5 * position);
    const y1 = -(189 + g * 6);
    const x2 = -(312 - g * 5 * position);
    const y2 = 216 - g * 6;
    const x3 = 152 - g * 5 * position;
    const y3 = 343 - g * 6;
    const x4 = 616 - g * 5 * position;
    const y4 = 470 - g * 6;
    const x5 = 684 - g * 5 * position;
    const y5 = 875 - g * 6;
    return `M${x1} ${y1}C${x1} ${y1} ${x2} ${y2} ${x3} ${y3}C${x4} ${y4} ${x5} ${y5} ${x5} ${y5}`;
  };

  const animate = (path, attr, from, to, dur, delay) => {
    const a = document.createElementNS(SVG_NS, 'animate');
    a.setAttribute('attributeName', attr);
    a.setAttribute('from', from);
    a.setAttribute('to', to);
    a.setAttribute('dur', `${dur}s`);
    a.setAttribute('begin', `-${delay}s`);
    a.setAttribute('repeatCount', 'indefinite');
    a.setAttribute('fill', 'freeze');
    path.appendChild(a);
  };

  const animateValues = (path, attr, values, dur, delay) => {
    const a = document.createElementNS(SVG_NS, 'animate');
    a.setAttribute('attributeName', attr);
    a.setAttribute('values', values);
    a.setAttribute('dur', `${dur}s`);
    a.setAttribute('begin', `-${delay}s`);
    a.setAttribute('repeatCount', 'indefinite');
    a.setAttribute('calcMode', 'linear');
    path.appendChild(a);
  };

  const buildLayer = (position) => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', VIEWBOX);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const created = [];
    for (let i = 0; i < PATH_COUNT; i++) {
      const path = document.createElementNS(SVG_NS, 'path');
      const f = PATH_COUNT > 1 ? i / (PATH_COUNT - 1) : 0; // 0..1, count-independent
      path.setAttribute('d', buildD(i, position));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', (0.5 + f * 1.05).toFixed(2));
      svg.appendChild(path);
      created.push({ path, i });
    }
    return { svg, created };
  };

  const layers = [buildLayer(1), buildLayer(-1)];
  layers.forEach(({ svg }) => host.appendChild(svg));

  // Measure each path and set its STATIC drawn state: fully visible at base
  // alpha, no animation. The hero reads complete on first paint, and because
  // nothing animates yet the main thread stays idle through load.
  const items = [];
  layers.forEach(({ created }) => {
    created.forEach(({ path, i }) => {
      const len = path.getTotalLength() || 1000;
      const f = PATH_COUNT > 1 ? i / (PATH_COUNT - 1) : 0;
      const baseAlpha = 0.10 + f * 0.46; // ~0.10 → ~0.56, count-independent
      path.setAttribute('stroke-dasharray', len);
      path.setAttribute('stroke-dashoffset', 0);
      path.setAttribute('opacity', baseAlpha.toFixed(3));
      items.push({ path, len, baseAlpha });
    });
  });

  // Reduced motion: leave the lines drawn and still. Done.
  if (reduceMotion) return;

  // The stroke-dashoffset flow is a main-thread repaint every frame, so we
  // hold it back until the visitor actually engages (pointer / scroll / touch
  // / key). Until then the hero is drawn-but-static — fast first paint, no long
  // tasks, an idle thread for load audits — and the motion begins the instant
  // there's any interaction, then runs exactly as before.
  let started = false;
  const triggers = ['pointermove', 'pointerdown', 'scroll', 'wheel', 'touchstart', 'keydown'];

  const startMotion = () => {
    if (started) return;
    started = true;
    triggers.forEach((t) => window.removeEventListener(t, startMotion));

    for (const { path, len, baseAlpha } of items) {
      const drawDur = 8 + Math.random() * 7; // 8–15s draw cycle
      const drawDelay = Math.random() * drawDur;
      const pulseDur = 5 + Math.random() * 5; // 5–10s pulse cycle
      const pulseDelay = Math.random() * pulseDur;

      // begin is negative, so each path starts mid-flow — no blank-then-draw.
      animate(path, 'stroke-dashoffset', len, -len, drawDur, drawDelay);
      const lo = (baseAlpha * 0.25).toFixed(3);
      const hi = (baseAlpha * 1.2).toFixed(3);
      animateValues(path, 'opacity', `${lo};${hi};${lo}`, pulseDur, pulseDelay);
    }

    // Once running, pause the SMIL timeline when the hero is scrolled away or
    // the tab is backgrounded — pure repaint with nothing to show otherwise.
    if ('IntersectionObserver' in window) {
      const svgs = layers.map((l) => l.svg);
      let onScreen = true;
      const sync = () => {
        const run = onScreen && !document.hidden;
        svgs.forEach((s) => (run ? s.unpauseAnimations() : s.pauseAnimations()));
      };
      new IntersectionObserver(
        (entries) => {
          onScreen = entries.some((e) => e.isIntersecting);
          sync();
        },
        { threshold: 0 }
      ).observe(host);
      document.addEventListener('visibilitychange', sync);
    }
  };

  triggers.forEach((t) => window.addEventListener(t, startMotion, { passive: true }));
})();
