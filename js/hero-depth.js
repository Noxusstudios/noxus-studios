/* hero-depth.js — pseudo-3D depth particle field for the hero.
   Dependency-free. Projects ~84 points in perspective, drifts them
   toward the viewer, and parallaxes the whole field + the SMIL path
   layer toward the pointer for dimensionality. Pauses when offscreen
   or the tab is hidden; renders a single static frame for users who
   prefer reduced motion. Scoped to pages that include .hero-depth
   (services only for now). */
(() => {
  const canvas = document.querySelector('.hero-depth');
  if (!canvas) return;

  const host = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const paths = host.querySelector('.hero-paths');
  const ORANGE = '232, 84, 10';
  const COUNT = 110;
  const rand = (a, b) => a + Math.random() * (b - a);

  const pts = [];
  for (let i = 0; i < COUNT; i++) {
    pts.push({ x: rand(-1, 1), y: rand(-1, 1), z: Math.random(), r: rand(0.8, 3.0), sp: rand(0.018, 0.07) });
  }

  let w = 0, h = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let px = 0, py = 0, tx = 0, ty = 0; // pointer target + smoothed parallax

  const resize = () => {
    const rect = host.getBoundingClientRect();
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const spreadX = w * 0.64, spreadY = h * 0.6;
    for (const p of pts) {
      const scale = 1 / (p.z * 2.4 + 0.34);
      const sx = w * 0.5 + tx * 30 * scale + p.x * spreadX * scale;
      const sy = h * 0.46 + ty * 20 * scale + p.y * spreadY * scale;
      const sr = Math.max(0.3, p.r * scale);
      const a = Math.min(0.95, scale * 0.62);
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ORANGE}, ${a.toFixed(3)})`;
      ctx.fill();
    }
  };

  let raf = 0, running = false;
  const tick = () => {
    tx += (px - tx) * 0.05;
    ty += (py - ty) * 0.05;
    for (const p of pts) {
      p.z -= p.sp * 0.016;
      if (p.z <= 0) { p.z = 1; p.x = rand(-1, 1); p.y = rand(-1, 1); }
    }
    draw();
    if (paths) paths.style.transform = `translate3d(${(-tx * 16).toFixed(2)}px, ${(-ty * 11).toFixed(2)}px, 0)`;
    raf = requestAnimationFrame(tick);
  };

  const start = () => { if (!running) { running = true; raf = requestAnimationFrame(tick); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  window.addEventListener('pointermove', (e) => {
    const rect = host.getBoundingClientRect();
    px = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    py = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }, { passive: true });

  window.addEventListener('resize', resize);
  resize();

  if (reduce) { draw(); return; }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => (en.isIntersecting ? start() : stop()));
    }, { threshold: 0 });
    io.observe(host);
  } else {
    start();
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
})();
