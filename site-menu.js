(() => {
  const toggle = document.querySelector('.site-menu-toggle');
  const menu = document.querySelector('#site-menu');
  if (!toggle || !menu) return;
  const links = [...menu.querySelectorAll('a')];
  const close = (restoreFocus = false) => {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'メニューを開く');
    if (restoreFocus) toggle.focus({preventScroll:true});
  };
  const position = () => {
    const box = toggle.getBoundingClientRect();
    menu.style.left = `${Math.max(12, Math.min(box.left, window.innerWidth - menu.offsetWidth - 12))}px`;
    menu.style.top = `${box.bottom + 8}px`;
  };
  const open = () => {
    menu.hidden = false;
    position();
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'メニューを閉じる');
    links[0].focus({preventScroll:true});
  };
  toggle.addEventListener('click', () => menu.hidden ? open() : close(true));
  toggle.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); open(); }
  });
  menu.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    close();
    target.focus({preventScroll:true});
    window.scrollTo({top:Math.max(0,target.getBoundingClientRect().top + window.scrollY - 20),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    // Preserve normal section URLs, including on local file previews.
    try { history.replaceState(null, '', link.getAttribute('href')); } catch (_) {}
  });
  document.addEventListener('pointerdown', event => {
    if (!menu.hidden && !menu.contains(event.target) && !toggle.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) { event.preventDefault(); close(true); }
  });
  document.addEventListener('focusin', event => {
    if (!menu.hidden && !menu.contains(event.target) && !toggle.contains(event.target)) close();
  });
  window.addEventListener('resize', () => { if (!menu.hidden) position(); }, {passive:true});
  window.addEventListener('scroll', () => { if (!menu.hidden) close(); }, {passive:true});
})();
