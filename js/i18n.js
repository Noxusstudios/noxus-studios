/* ============================================================
   NOXUS — i18n.js
   Reads window.NOXUS_I18N dict + applies translations.
   Persists lang choice to localStorage.
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'noxus-lang';
  const DEFAULT_LANG = 'en';
  const T = window.NOXUS_I18N;
  if (!T) return;

  const root = document.documentElement;

  function getLang() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && T[saved]) return saved;
    } catch (e) {}
    return DEFAULT_LANG;
  }

  function applyLang(lang) {
    const dict = T[lang] || T[DEFAULT_LANG];
    root.setAttribute('lang', lang);

    // Text content
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      const val = dict[key];
      if (val === undefined) return;
      if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });

    // Attribute translations
    // syntax: data-i18n-attr="placeholder=key.one;aria-label=key.two"
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      const spec = el.getAttribute('data-i18n-attr');
      spec.split(';').forEach(function (pair) {
        const parts = pair.split('=');
        if (parts.length !== 2) return;
        const attr = parts[0].trim();
        const key  = parts[1].trim();
        const val  = dict[key];
        if (val !== undefined) el.setAttribute(attr, val);
      });
    });

    // <title>
    const titleEl = document.querySelector('title[data-i18n]');
    if (titleEl) {
      const key = titleEl.getAttribute('data-i18n');
      if (dict[key]) document.title = dict[key];
    }

    // <meta name="description">
    const metaDesc = document.querySelector('meta[name="description"][data-i18n]');
    if (metaDesc) {
      const key = metaDesc.getAttribute('data-i18n');
      if (dict[key]) metaDesc.setAttribute('content', dict[key]);
    }

    // Update toggle visual state
    document.querySelectorAll('.lang-toggle__opt').forEach(function (opt) {
      opt.classList.toggle('is-active', opt.dataset.lang === lang);
    });

    // Notify listeners (e.g. title-reveal.js needs to re-wrap titles after
    // i18n rewrites their innerHTML).
    document.dispatchEvent(new CustomEvent('noxus:lang-changed', { detail: { lang: lang } }));

    // Update theme-toggle aria-label (it's translated too)
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      const isDark = root.classList.contains('dark');
      const k = isDark ? 'common.theme.toLight' : 'common.theme.toDark';
      if (dict[k]) themeBtn.setAttribute('aria-label', dict[k]);
    }
  }

  function setLang(lang) {
    if (!T[lang]) return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    applyLang(lang);
  }

  function init() {
    applyLang(getLang());

    const btn = document.getElementById('lang-toggle');
    if (!btn) return;

    btn.addEventListener('click', function (e) {
      const opt = e.target.closest('.lang-toggle__opt');
      const current = getLang();
      let target;
      if (opt && opt.dataset.lang) {
        target = opt.dataset.lang;
      } else {
        target = current === 'en' ? 'fr' : 'en';
      }
      if (target !== current) setLang(target);
    });
  }

  // Expose for external callers (e.g. theme-toggle wants to re-apply aria after theme change)
  window.NoxusI18n = {
    apply: function () { applyLang(getLang()); },
    get:   getLang,
    set:   setLang,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
