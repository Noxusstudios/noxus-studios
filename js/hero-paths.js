(() => {
  const host = document.querySelector('.hero-paths');
  if (!host) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const PATH_COUNT = 36;
  const VIEWBOX = '0 0 696 316';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const buildD = (i, position) => {
    const x1 = -(380 - i * 5 * position);
    const y1 = -(189 + i * 6);
    const x2 = -(312 - i * 5 * position);
    const y2 = 216 - i * 6;
    const x3 = 152 - i * 5 * position;
    const y3 = 343 - i * 6;
    const x4 = 616 - i * 5 * position;
    const y4 = 470 - i * 6;
    const x5 = 684 - i * 5 * position;
    const y5 = 875 - i * 6;
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
      path.setAttribute('d', buildD(i, position));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', (0.5 + i * 0.03).toFixed(2));
      svg.appendChild(path);
      created.push({ path, i });
    }
    return { svg, created };
  };

  const layers = [buildLayer(1), buildLayer(-1)];
  layers.forEach(({ svg }) => host.appendChild(svg));

  // Now that paths are in the document, measure each path's actual length
  // and attach SMIL <animate> children for stroke-dashoffset + opacity pulse.
  layers.forEach(({ created }) => {
    created.forEach(({ path, i }) => {
      const len = path.getTotalLength() || 1000;
      const baseAlpha = 0.10 + i * 0.013;          // ~0.10 → ~0.56 across 36 paths

      path.setAttribute('stroke-dasharray', len);
      path.setAttribute('stroke-dashoffset', len);
      path.setAttribute('opacity', baseAlpha.toFixed(3));

      if (reduceMotion) return;

      const drawDur   = 8 + Math.random() * 7;     // 8–15s draw cycle
      const drawDelay = Math.random() * drawDur;
      const pulseDur  = 5 + Math.random() * 5;     // 5–10s pulse cycle
      const pulseDelay = Math.random() * pulseDur;

      // Slide the dash through the path: from invisible → fully drawn → slid past.
      animate(path, 'stroke-dashoffset', len, -len, drawDur, drawDelay);

      // Breathing opacity pulse around the base alpha.
      const lo = (baseAlpha * 0.25).toFixed(3);
      const hi = (baseAlpha * 1.20).toFixed(3);
      animateValues(path, 'opacity', `${lo};${hi};${lo}`, pulseDur, pulseDelay);
    });
  });
})();
