/* hero-shader.js — GPU flowing contour-line field for the hero.
   Raw WebGL fragment shader (no library). Animated, domain-warped fbm
   rendered as thin orange topographic lines that flow and parallax with
   the pointer — the deepest hero layer, beneath the SMIL paths and the
   depth particles. On-brand (etched lines, not banned blobs/mesh).
   Guards: bails to the CSS background if WebGL is unavailable; renders a
   single static frame for reduced-motion; pauses offscreen / tab-hidden.
   Scoped to pages with .hero-shader (services only). */
(() => {
  const canvas = document.querySelector('.hero-shader');
  if (!canvas) return;
  const host = canvas.parentElement;

  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl) { canvas.remove(); return; } // graceful fallback to CSS bg

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const VERT = `
    attribute vec2 p;
    void main() { gl_Position = vec4(p, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_mouse;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i), b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    float fbm(vec2 p){
      float v = 0.0, amp = 0.5;
      for (int i = 0; i < 5; i++){ v += amp * noise(p); p *= 2.02; amp *= 0.5; }
      return v;
    }

    void main(){
      vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
      p += u_mouse * 0.10;                       // pointer parallax
      float t = u_time * 0.03;
      // Flowing diagonal streaks (bottom-left -> top-right) that echo the
      // hero's SMIL paths, warped by fbm so they breathe. Not closed loops.
      float warp = fbm(p * 1.15 + vec2(t, -t * 0.6));
      float band = (p.x * 1.4 - p.y * 0.95) + warp * 1.7;
      float lines = abs(fract(band * 4.0) - 0.5);
      float ink = smoothstep(0.04, 0.0, lines);
      // Concentrate the field in the lower-right where the SMIL paths sweep
      // through; fade out toward the headline so it stays clean.
      float vign = smoothstep(1.5, 0.1, length(p - vec2(0.55, -0.35)));
      float a = ink * vign * 0.42;
      gl_FragColor = vec4(vec3(0.91, 0.33, 0.04) * a, a);  // premultiplied orange
    }
  `;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { canvas.remove(); return null; }
    return s;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied alpha

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // cap for fill-rate
  let mx = 0, my = 0, tmx = 0, tmy = 0;

  const resize = () => {
    const rect = host.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const render = (timeMs) => {
    tmx += (mx - tmx) * 0.04;
    tmy += (my - tmy) * 0.04;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, timeMs * 0.001);
    gl.uniform2f(uMouse, tmx, tmy);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // Drive u_time off an accumulated clock that only advances while the
  // loop is running. Using the raw rAF timestamp would make the pattern
  // jump every time the hero pauses offscreen and resumes on scroll-up,
  // because the timestamp leaps forward by the whole paused duration.
  let raf = 0, running = false, last = 0, clock = 0;
  const loop = (ts) => {
    if (!last) last = ts;        // first frame after (re)start: no delta
    clock += ts - last;
    last = ts;
    render(clock);
    raf = requestAnimationFrame(loop);
  };
  const start = () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(loop); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  window.addEventListener('pointermove', (e) => {
    const rect = host.getBoundingClientRect();
    mx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    my = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }, { passive: true });

  window.addEventListener('resize', resize);
  resize();

  if (reduce) { render(0); return; }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0 }).observe(host);
  } else {
    start();
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
})();
