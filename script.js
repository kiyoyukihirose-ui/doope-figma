(() => {
  const scaleShell = document.querySelector('[data-scale-shell]');
  const scaleCanvas = document.querySelector('[data-scale-canvas]');
  if (scaleShell && scaleCanvas) {
    const designWidth = 1080;
    const designHeight = 16212.08984375;
    let lastWidth = 0;

    const scalePage = () => {
      const width = scaleShell.clientWidth;
      if (!width || width === lastWidth) return;
      lastWidth = width;
      const scale = width / designWidth;
      scaleCanvas.style.transform = `scale(${scale})`;
      scaleShell.style.height = `${designHeight * scale}px`;
      scaleCanvas.classList.add('is-scaled');
    };

    scalePage();
    window.addEventListener('resize', scalePage, { passive: true });
    window.addEventListener('orientationchange', scalePage, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(scalePage).observe(scaleShell);
  }

  const carousel = document.querySelector('[data-carousel]');
  if (carousel) {
    const track = carousel.querySelector('[data-carousel-track]');
    const dots = [...carousel.querySelectorAll('[data-carousel-dot]')];
    let index = 0;
    let startX = 0;
    let startY = 0;
    let drag = 0;
    let dragging = false;

    const render = () => {
      track.style.setProperty('--carousel-index', index);
      track.style.setProperty('--carousel-drag', `${drag}px`);
      dots.forEach((dot, dotIndex) => {
        const active = dotIndex === index;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', String(active));
      });
    };

    const finishDrag = (event) => {
      if (!dragging) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) > 48) index = Math.max(0, Math.min(2, index + (delta < 0 ? 1 : -1)));
      dragging = false;
      drag = 0;
      carousel.classList.remove('is-dragging');
      render();
    };

    carousel.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button')) return;
      startX = event.clientX;
      startY = event.clientY;
      drag = 0;
      dragging = true;
      carousel.classList.add('is-dragging');
      carousel.setPointerCapture(event.pointerId);
    });
    carousel.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) return;
      const scale = carousel.getBoundingClientRect().width / carousel.offsetWidth;
      drag = deltaX / scale;
      render();
    });
    carousel.addEventListener('pointerup', finishDrag);
    carousel.addEventListener('pointercancel', finishDrag);
    dots.forEach((dot, dotIndex) => dot.addEventListener('click', () => {
      index = dotIndex;
      drag = 0;
      render();
    }));
    render();
  }

  const form = document.querySelector('[data-contact-form]');
  if (form) form.addEventListener('submit', (event) => {
    event.preventDefault();
    form.querySelector('[data-form-status]').textContent = '入力内容を確認しました。';
  });
})();
