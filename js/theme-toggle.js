(() => {
  const btn = document.getElementById('theme-toggle');
  const curtain = document.getElementById('theme-curtain');
  if (!btn || !curtain) return;

  const STORAGE_KEY = 'noxus-theme';
  const DURATION = 160;        // ms — must match CSS .theme-curtain transition
  const COVER_HOLD = 20;       // brief pause at full cover before retracting

  // Curtain colors — must match the page background for each theme.
  const COLORS = {
    light: '#F2EDE8',
    dark:  '#14100B',
  };

  const root = document.documentElement;
  let busy = false;

  const currentTheme = () => (root.classList.contains('dark') ? 'dark' : 'light');

  const updateA11y = () => {
    const isDark = currentTheme() === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    btn.setAttribute(
      'aria-label',
      isDark ? 'Switch to light mode' : 'Switch to dark mode'
    );
    // If i18n is loaded, let it overwrite the aria-label in the active language
    if (window.NoxusI18n && typeof window.NoxusI18n.apply === 'function') {
      window.NoxusI18n.apply();
    }
  };

  updateA11y();

  const toggle = () => {
    if (busy) return;
    busy = true;
    btn.disabled = true;

    const next = currentTheme() === 'light' ? 'dark' : 'light';
    curtain.style.background = COLORS[next];

    // Phase 1 — drop the curtain from the top.
    curtain.classList.add('is-animating');
    // force reflow so the transition picks up the starting state
    void curtain.offsetWidth;
    curtain.classList.add('is-falling');

    setTimeout(() => {
      // Phase 2 — swap the theme while the curtain fully covers the page.
      root.classList.toggle('dark', next === 'dark');
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
      updateA11y();

      setTimeout(() => {
        // Phase 3 — retract the curtain back up.
        curtain.classList.remove('is-falling');

        setTimeout(() => {
          curtain.classList.remove('is-animating');
          btn.disabled = false;
          busy = false;
        }, DURATION + 40);
      }, COVER_HOLD);
    }, DURATION);
  };

  btn.addEventListener('click', toggle);
})();
