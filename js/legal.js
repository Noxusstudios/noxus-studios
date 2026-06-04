/* ============================================================
   NOXUS — legal.js
   Turns the shared legal-document layout (privacy / terms / cookies)
   into a "dossier": a two-column grid with a sticky scroll-spy section
   index, ghosted section numbers, a reading-progress bar, and hero meta.

   Progressive enhancement — if this never runs, the page is still a clean,
   fully readable single-column document. Runs as an immediate IIFE (it's a
   deferred script, so the DOM is parsed) and MUST be ordered before
   animations.js so the .reveal classes it adds get observed.
   ============================================================ */

(function () {
  'use strict';

  var inner = document.querySelector('.privacy-body__inner');
  if (!inner) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LABELS = {
    en: { read: 'min read', sections: 'sections', toc: 'On this page' },
    fr: { read: 'min de lecture', sections: 'sections', toc: 'Sommaire' }
  };
  function lang() {
    try { return (window.NoxusI18n && window.NoxusI18n.get()) || 'en'; }
    catch (e) { return 'en'; }
  }
  function t(key) { return (LABELS[lang()] || LABELS.en)[key]; }

  /* ---- Collect the sections, strip "N · " from headings into a ghost
          number, tag for reveal, give each a stable id + scroll target. ---- */
  var sections = Array.prototype.slice.call(inner.querySelectorAll('.privacy-section'));

  function stripHeadings() {
    sections.forEach(function (sec, i) {
      var title = sec.querySelector('.privacy-section__title');
      if (!title) return;
      var raw = title.textContent.trim();
      var m = raw.match(/^(\d+)\s*[·.\-—]\s*(.+)$/);
      var n = m ? m[1] : String(i + 1);
      if (m) title.textContent = m[2];
      sec.dataset.num = ('0' + n).slice(-2);
      sec.dataset.title = title.textContent.trim();
    });
  }

  sections.forEach(function (sec, i) {
    sec.id = sec.id || 'legal-s-' + (i + 1);
    sec.classList.add('reveal', 'reveal--rise');
    sec.style.setProperty('--i', i);
  });
  stripHeadings();

  /* ---- Restructure into the grid: move everything into a content column,
          prepend the index rail. Zero HTML edits needed per page. ---- */
  var content = document.createElement('div');
  content.className = 'legal-content';
  while (inner.firstChild) content.appendChild(inner.firstChild);

  var index = document.createElement('nav');
  index.className = 'legal-index';
  index.setAttribute('aria-label', t('toc'));

  var indexInner = document.createElement('div');
  indexInner.className = 'legal-index__inner';
  index.appendChild(indexInner);

  inner.appendChild(index);
  inner.appendChild(content);
  inner.classList.add('legal-grid');

  /* ---- Build the index links ---- */
  var links = [];
  function buildIndex() {
    indexInner.innerHTML = '';
    var heading = document.createElement('span');
    heading.className = 'legal-index__heading';
    heading.textContent = t('toc');
    indexInner.appendChild(heading);

    links = sections.map(function (sec) {
      var a = document.createElement('a');
      a.className = 'legal-index__item';
      a.href = '#' + sec.id;
      a.innerHTML =
        '<span class="legal-index__num">' + sec.dataset.num + '</span>' +
        '<span class="legal-index__label"></span>';
      a.querySelector('.legal-index__label').textContent = sec.dataset.title;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        sec.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
        if (history.replaceState) history.replaceState(null, '', '#' + sec.id);
      });
      indexInner.appendChild(a);
      return a;
    });
  }
  buildIndex();

  function setActive(id) {
    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  /* ---- Scroll-spy: highlight the section crossing the upper third ---- */
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setActive(e.target.id);
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }
  if (sections[0]) setActive(sections[0].id);

  /* ---- Reading-progress bar (GPU-only transform) ---- */
  var bar = document.createElement('div');
  bar.className = 'legal-progress';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = '<span class="legal-progress__fill"></span>';
  document.body.appendChild(bar);
  var fill = bar.querySelector('.legal-progress__fill');

  var ticking = false;
  function updateProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
    fill.style.transform = 'scaleX(' + p + ')';
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  updateProgress();

  /* ---- Hero: ghost word + meta chips ---- */
  var hero = document.querySelector('.privacy-hero__inner');
  var heroTitle = document.querySelector('.privacy-hero__title');
  if (hero && heroTitle) {
    var ghost = document.createElement('span');
    ghost.className = 'privacy-hero__ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.textContent = (heroTitle.textContent.trim().split(/\s+/)[0] || '').toUpperCase();
    document.querySelector('.privacy-hero').appendChild(ghost);

    var words = (content.textContent.match(/\S+/g) || []).length;
    var mins = Math.max(1, Math.round(words / 200));

    var meta = document.createElement('div');
    meta.className = 'privacy-hero__meta';
    meta.innerHTML =
      '<span class="privacy-hero__chip"><strong class="js-read-n">' + mins + '</strong> ' +
        '<span class="js-read-l">' + t('read') + '</span></span>' +
      '<span class="privacy-hero__chip"><strong>' + sections.length + '</strong> ' +
        '<span class="js-sections-l">' + t('sections') + '</span></span>';
    hero.appendChild(meta);

    var refreshMeta = function () {
      var rl = meta.querySelector('.js-read-l');
      var sl = meta.querySelector('.js-sections-l');
      if (rl) rl.textContent = t('read');
      if (sl) sl.textContent = t('sections');
    };
    document.addEventListener('noxus:lang-changed', refreshMeta);
  }

  /* ---- Re-apply on language switch: i18n rewrites the full "N · Title"
          heading text and the ghost word, so re-strip + rebuild labels. ---- */
  document.addEventListener('noxus:lang-changed', function () {
    stripHeadings();
    buildIndex();
    index.setAttribute('aria-label', t('toc'));
    if (heroTitle) {
      var g = document.querySelector('.privacy-hero__ghost');
      if (g) g.textContent = (heroTitle.textContent.trim().split(/\s+/)[0] || '').toUpperCase();
    }
    // restore active state highlight
    var activeId = null;
    var docTop = document.documentElement.scrollTop;
    sections.forEach(function (s) {
      if (s.offsetTop - 160 <= docTop) activeId = s.id;
    });
    setActive(activeId || (sections[0] && sections[0].id));
  });
})();
