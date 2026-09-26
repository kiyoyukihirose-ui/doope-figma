(() => {
  const hero = document.querySelector('.hero-slideshow');
  if (!hero) return;
  const slides = [...hero.querySelectorAll('img')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let timer;
  let cleanup;
  let visible = true;
  let ready = false;
  const stop = () => { clearTimeout(timer); };
  const schedule = () => {
    stop();
    if (!ready || reduced.matches || document.hidden || !visible) return;
    timer = setTimeout(advance, 5000);
  };
  const advance = () => {
    index = (index + 1) % 3;
    clearTimeout(cleanup);
    // The original woman photo stays behind these two overlays.
    // Keep the outgoing photo opaque until the next photo covers it.
    if (index === 0) {
      slides.forEach(slide => slide.classList.remove('is-visible'));
    } else {
      const next = slides[index - 1];
      slides.forEach(slide => slide.style.zIndex = slide === next ? '2' : '1');
      next.classList.add('is-visible');
      cleanup = setTimeout(() => {
        slides.forEach(slide => { if (slide !== next) slide.classList.remove('is-visible'); });
      }, 900);
    }
    schedule();
  };
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      schedule();
    }).observe(hero);
  }
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', schedule);
  Promise.all(slides.map(slide => slide.decode())).then(() => {
    ready = true;
    schedule();
  }).catch(() => { stop(); });
})();
