/* ============================================================
   Noxus stack constellation — SVG-based network with data-flow pulses.

   What this does:
   - For each .svc-tech__link-group <line>, inject an animated <circle>
     that travels from one endpoint to the other on a loop (SMIL).
     Pulses are staggered so the graph feels alive, not synchronized.
   - On hover of any .svc-tech__node, highlight its direct working pairs
     and dim everything else. Mouseleave restores the neutral state.

   No dependencies. Pure DOM + SMIL.
   ============================================================ */

(function () {
  function init() {
    const root = document.querySelector('.svc-tech__svg');
    if (!root) return;

    const groups = root.querySelectorAll('.svc-tech__link-group');
    if (!groups.length) return;

    // ----- Pulse injection -----
    groups.forEach((g, i) => {
      const line = g.querySelector('line');
      if (!line) return;

      const x1 = +line.getAttribute('x1');
      const y1 = +line.getAttribute('y1');
      const x2 = +line.getAttribute('x2');
      const y2 = +line.getAttribute('y2');

      const SVG_NS = 'http://www.w3.org/2000/svg';
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('class', 'svc-tech__pulse');
      c.setAttribute('r', '3.2');
      c.setAttribute('cx', x1);
      c.setAttribute('cy', y1);

      // Slight per-line variation so pulses don't sync up
      const dur = (3.4 + (i % 4) * 0.35) + 's';
      const begin = (i * 0.18) + 's';

      const makeAnim = (attr, from, to) => {
        const a = document.createElementNS(SVG_NS, 'animate');
        a.setAttribute('attributeName', attr);
        a.setAttribute('from', from);
        a.setAttribute('to', to);
        a.setAttribute('dur', dur);
        a.setAttribute('begin', begin);
        a.setAttribute('repeatCount', 'indefinite');
        a.setAttribute('calcMode', 'spline');
        a.setAttribute('keySplines', '0.45 0.05 0.55 0.95');
        return a;
      };

      c.appendChild(makeAnim('cx', x1, x2));
      c.appendChild(makeAnim('cy', y1, y2));

      // Fade in/out so the dot doesn't pop at endpoints
      const ao = document.createElementNS(SVG_NS, 'animate');
      ao.setAttribute('attributeName', 'opacity');
      ao.setAttribute('values', '0;0.85;0.85;0');
      ao.setAttribute('keyTimes', '0;0.12;0.88;1');
      ao.setAttribute('dur', dur);
      ao.setAttribute('begin', begin);
      ao.setAttribute('repeatCount', 'indefinite');
      c.appendChild(ao);

      g.appendChild(c);
    });

    // ----- Hover interactions on nodes -----
    const nodes = root.querySelectorAll('.svc-tech__node');

    const reset = () => {
      nodes.forEach(n => n.classList.remove('is-active', 'is-dimmed'));
      groups.forEach(g => {
        g.classList.remove('is-active', 'is-dimmed');
        const line = g.querySelector('line');
        if (line) line.classList.remove('is-active', 'is-dimmed');
      });
    };

    const focus = (id) => {
      const linked = new Set([id]);
      groups.forEach(g => {
        const line = g.querySelector('line');
        const hit = g.dataset.a === id || g.dataset.b === id;
        if (hit) {
          g.classList.add('is-active');
          g.classList.remove('is-dimmed');
          if (line) {
            line.classList.add('is-active');
            line.classList.remove('is-dimmed');
          }
          linked.add(g.dataset.a);
          linked.add(g.dataset.b);
        } else {
          g.classList.add('is-dimmed');
          g.classList.remove('is-active');
          if (line) {
            line.classList.add('is-dimmed');
            line.classList.remove('is-active');
          }
        }
      });
      nodes.forEach(n => {
        if (linked.has(n.dataset.id)) {
          n.classList.add('is-active');
          n.classList.remove('is-dimmed');
        } else {
          n.classList.add('is-dimmed');
          n.classList.remove('is-active');
        }
      });
    };

    nodes.forEach(node => {
      const id = node.dataset.id;
      node.addEventListener('mouseenter', () => focus(id));
      node.addEventListener('mouseleave', reset);
      // Touch: tap to focus, tap outside to reset
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        if (node.classList.contains('is-active') && !node.classList.contains('is-dimmed')) {
          // already active — if user taps again, reset
          // (only meaningful on touch; mouseleave handles hover)
          const linked = new Set();
          groups.forEach(g => {
            if (g.classList.contains('is-active')) {
              linked.add(g.dataset.a);
              linked.add(g.dataset.b);
            }
          });
          if (linked.has(id) && linked.size > 1) {
            // currently focused on this — reset
            // (heuristic; tap again to clear)
            reset();
            return;
          }
        }
        focus(id);
      });
    });

    // Tap outside any node on the SVG to reset
    root.addEventListener('click', (e) => {
      if (!e.target.closest('.svc-tech__node')) reset();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
