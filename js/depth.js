/* depth.js — cursor-follow spotlight for elements marked .svc-catalog__row.
   Sets --mx / --my (the pointer position within the row, as a %) which a
   CSS radial-gradient ::after reads. Pure transform-free; one delegated
   listener. Scoped to services (only page with .svc-catalog). */
(() => {
  const rows = document.querySelectorAll('.svc-catalog__row');
  if (!rows.length) return;

  const onMove = (e) => {
    const row = e.currentTarget;
    const rect = row.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 100;
    const my = ((e.clientY - rect.top) / rect.height) * 100;
    row.style.setProperty('--mx', mx.toFixed(1) + '%');
    row.style.setProperty('--my', my.toFixed(1) + '%');
  };

  rows.forEach((row) => {
    row.addEventListener('pointermove', onMove, { passive: true });
  });
})();
