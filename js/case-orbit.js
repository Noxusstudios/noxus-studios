/* ============================================================
   NOXUS — case-orbit.js
   Renders the case-study screenshot as a slowly-rotating holographic
   GLOBE: a textured sphere (the screenshot wrapped on its surface)
   with a fresnel atmosphere halo, spinning like Earth.

   Self-contained raw WebGL — no library, one texture, two draw calls
   per frame. Lazy: the GL context + render loop only start when the
   section first scrolls into view, and pause off-screen, on tab-hide,
   and on hover. Reduced-motion or no-WebGL: the flat fallback
   screenshot is kept (script bails), so nothing is ever lost.
   ============================================================ */

(function () {
  'use strict';

  var orbit = document.getElementById('case-orbit');
  if (!orbit) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var img = orbit.querySelector('.case-feature__shot');
  var visual = orbit.closest('.case-feature__visual');
  if (!img || !visual) return;

  /* ---------- tiny column-major mat4 helpers ---------- */
  function ident() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }
  function mul(a, b) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
    }
    return o;
  }
  function persp(fovy, aspect, near, far) {
    var f = 1/Math.tan(fovy/2), nf = 1/(near-far);
    return [f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0];
  }
  function transZ(z) { var m = ident(); m[14] = z; return m; }
  function rotY(a) { var c=Math.cos(a), s=Math.sin(a), m=ident(); m[0]=c; m[2]=-s; m[8]=s; m[10]=c; return m; }
  function rotX(a) { var c=Math.cos(a), s=Math.sin(a), m=ident(); m[5]=c; m[6]=s; m[9]=-s; m[10]=c; return m; }
  function scale(s) { var m=ident(); m[0]=m[5]=m[10]=s; return m; }

  /* ---------- sphere geometry ---------- */
  function makeSphere(stacks, slices) {
    var pos = [], uv = [], idx = [];
    for (var i = 0; i <= stacks; i++) {
      var v = i / stacks, phi = v * Math.PI, sp = Math.sin(phi), cp = Math.cos(phi);
      for (var j = 0; j <= slices; j++) {
        var u = j / slices, th = u * 2 * Math.PI, st = Math.sin(th), ct = Math.cos(th);
        pos.push(sp*ct, cp, sp*st);
        uv.push(u, v);
      }
    }
    var row = slices + 1;
    for (i = 0; i < stacks; i++) for (var k = 0; k < slices; k++) {
      var a = i*row + k, b = a + row;
      idx.push(a, b, a+1, a+1, b, b+1);
    }
    return { pos: new Float32Array(pos), uv: new Float32Array(uv), idx: new Uint16Array(idx) };
  }

  var VERT =
    'attribute vec3 aPos; attribute vec2 aUV;' +
    'uniform mat4 uMVP; uniform mat4 uMV;' +
    'varying vec2 vUV; varying vec3 vN; varying vec3 vP;' +
    'void main(){ vUV=aUV; vN=mat3(uMV)*aPos; vec4 p=uMV*vec4(aPos,1.0); vP=p.xyz; gl_Position=uMVP*vec4(aPos,1.0); }';

  var FRAG =
    'precision mediump float;' +
    'uniform sampler2D uTex; uniform vec3 uRimA; uniform vec3 uRimB; uniform float uMode;' +
    'varying vec2 vUV; varying vec3 vN; varying vec3 vP;' +
    'void main(){' +
    '  vec3 N=normalize(vN); vec3 V=normalize(-vP);' +
    '  float ndv=max(dot(N,V),0.0);' +
    '  float fres=pow(1.0-ndv,3.0);' +
    '  if(uMode>0.5){' +            // atmosphere halo pass
    '    float a=pow(1.0-ndv,2.5)*1.15; gl_FragColor=vec4(mix(uRimA,uRimB,fres)*a,a); return;' +
    '  }' +
    '  vec3 tex=texture2D(uTex,vUV).rgb;' +
    '  float scan=0.94+0.06*sin(vUV.y*270.0);' +
    '  float form=mix(0.66,1.0,ndv);' +        // center-bright shading => reads as a sphere
    '  vec3 rim=mix(uRimA,uRimB,fres)*fres*1.3;' +
    '  vec3 col=tex*scan*form + rim;' +
    '  gl_FragColor=vec4(col,1.0);' +
    '}';

  /* ---------- GL bootstrap ---------- */
  var canvas, gl, prog, loc, buf, geo, tex, raf = 0, started = false, ready = false;
  var inView = false, visible = true, hovering = false;
  var FOV = 0.62, TILT = 0.32, FIT = 0.66;   // FIT = globe size vs the smaller box dimension
  var DIST = 5, angle = 0, lastT = 0;

  function compile(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }

  function initGL() {
    canvas = document.createElement('canvas');
    canvas.className = 'case-feature__globe';
    canvas.setAttribute('aria-hidden', 'true');
    var opts = { alpha: true, premultipliedAlpha: false, antialias: true, depth: true };
    gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) return false;

    var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;

    loc = {
      aPos: gl.getAttribLocation(prog, 'aPos'),
      aUV:  gl.getAttribLocation(prog, 'aUV'),
      uMVP: gl.getUniformLocation(prog, 'uMVP'),
      uMV:  gl.getUniformLocation(prog, 'uMV'),
      uTex: gl.getUniformLocation(prog, 'uTex'),
      uRimA: gl.getUniformLocation(prog, 'uRimA'),
      uRimB: gl.getUniformLocation(prog, 'uRimB'),
      uMode: gl.getUniformLocation(prog, 'uMode')
    };

    geo = makeSphere(window.innerWidth < 600 ? 40 : 56, window.innerWidth < 600 ? 48 : 72);
    buf = { pos: gl.createBuffer(), uv: gl.createBuffer(), idx: gl.createBuffer() };
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.pos); gl.bufferData(gl.ARRAY_BUFFER, geo.pos, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.uv);  gl.bufferData(gl.ARRAY_BUFFER, geo.uv,  gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);

    // Power-of-two copy of the screenshot so we can REPEAT + mipmap (seamless wrap).
    // Cover-fit (preserve aspect — no stretch) + blur so the page reads as an
    // abstract holographic surface, not a legible screenshot.
    var pot = document.createElement('canvas'); pot.width = 1024; pot.height = 512;
    var pctx = pot.getContext('2d');
    pctx.fillStyle = '#0c0c0e'; pctx.fillRect(0, 0, 1024, 512);
    pctx.filter = 'blur(7px)';
    var cov = Math.max(1024 / img.naturalWidth, 512 / img.naturalHeight);
    var dw = img.naturalWidth * cov, dh = img.naturalHeight * cov;
    pctx.drawImage(img, (1024 - dw) / 2, (512 - dh) / 2, dw, dh);
    pctx.filter = 'none';
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pot);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.clearColor(0, 0, 0, 0);
    visual.appendChild(canvas);
    resize();
    return true;
  }

  var aspect = 1;
  function resize() {
    var r = visual.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    aspect = canvas.width / canvas.height;
    // Distance so the globe fills FIT of the SMALLER box dimension (no clipping
    // on a portrait box, and smaller overall).
    var halfMin = Math.tan(FOV / 2) * Math.min(1, aspect);
    DIST = 1 / (halfMin * FIT);
  }

  function draw() {
    var proj = persp(FOV, aspect, 0.1, 100);
    var view = transZ(-DIST);
    var bob = Math.sin(angle * 0.9) * 0.03;
    var model = mul(rotX(TILT), rotY(angle));
    var mv = mul(view, mul(transZ(0), model));
    mv[13] += bob;
    var mvp = mul(proj, mv);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);
    gl.enableVertexAttribArray(loc.aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.pos); gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc.aUV);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf.uv); gl.vertexAttribPointer(loc.aUV, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.idx);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc.uTex, 0);
    gl.uniform3f(loc.uRimA, 0.91, 0.33, 0.04);   // orange
    gl.uniform3f(loc.uRimB, 0.36, 0.78, 0.88);   // cyan

    // Planet pass: opaque, depth on, cull back.
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.disable(gl.BLEND);
    gl.uniform1f(loc.uMode, 0.0);
    gl.uniformMatrix4fv(loc.uMVP, false, mvp);
    gl.uniformMatrix4fv(loc.uMV, false, mv);
    gl.drawElements(gl.TRIANGLES, geo.idx.length, gl.UNSIGNED_SHORT, 0);

    // Atmosphere pass: slightly larger sphere, additive halo, cull front.
    var modelA = mul(model, scale(1.14));
    var mvA = mul(view, modelA); mvA[13] += bob;
    var mvpA = mul(proj, mvA);
    gl.depthMask(false);
    gl.cullFace(gl.FRONT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.uniform1f(loc.uMode, 1.0);
    gl.uniformMatrix4fv(loc.uMVP, false, mvpA);
    gl.uniformMatrix4fv(loc.uMV, false, mvA);
    gl.drawElements(gl.TRIANGLES, geo.idx.length, gl.UNSIGNED_SHORT, 0);
  }

  function frame(t) {
    raf = 0;
    if (!lastT) lastT = t;
    var dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
    angle += dt * 0.34;               // ~18s per turn
    draw();
    if (running()) raf = requestAnimationFrame(frame);
  }

  function running() { return ready && inView && visible && !hovering; }
  function tick() {
    if (running() && !raf) { lastT = 0; raf = requestAnimationFrame(frame); }
    else if (!running() && raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function start() {
    if (started) return;
    if (!(img.complete && img.naturalWidth > 0)) {  // texture source not decoded yet
      img.addEventListener('load', start, { once: true });
      return;
    }
    started = true;
    if (!initGL()) { started = false; return; }   // no WebGL → keep flat fallback
    ready = true;
    var fb = orbit.querySelector('.case-feature__face');
    if (fb) fb.classList.add('is-sr');
    tick();
  }

  /* ---------- lifecycle ---------- */
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (e) {
    inView = e[0].isIntersecting;
    if (inView && !started) start();
    if (started) tick();
  }, { threshold: 0.05 }) : null;

  function boot() {
    if (io) io.observe(visual);
    else { inView = true; start(); }
  }
  if (img.complete) boot();
  else img.addEventListener('load', boot);
  // safety: if the lazy image never fires load, boot anyway shortly after.
  setTimeout(function () { if (!started && img.complete) boot(); }, 1500);

  document.addEventListener('visibilitychange', function () { visible = !document.hidden; tick(); });
  visual.addEventListener('pointerenter', function () { hovering = true; tick(); });
  visual.addEventListener('pointerleave', function () { hovering = false; tick(); });

  var rt;
  window.addEventListener('resize', function () {
    if (!ready) return;
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); if (!running()) draw(); }, 150);
  });
})();
