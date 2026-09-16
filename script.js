(() => {
  let refreshScaledPage = () => {};
  const scaleShell = document.querySelector('[data-scale-shell]');
  const scaleCanvas = document.querySelector('[data-scale-canvas]');
  if (scaleShell && scaleCanvas) {
    const designWidth = Number(scaleShell.dataset.designWidth) || 1080;
    let lastWidth = 0;

    const scalePage = (force = false) => {
      const width = scaleShell.clientWidth;
      if (!width || (!force && width === lastWidth)) return;
      lastWidth = width;
      const scale = width / designWidth;
      const designHeight = Number(scaleShell.dataset.designHeight) || 16212.08984375;
      scaleCanvas.style.transform = `scale(${scale})`;
      scaleShell.style.height = `${designHeight * scale}px`;
      scaleCanvas.classList.add('is-scaled');
    };

    refreshScaledPage = () => scalePage(true);
    scalePage();
    window.addEventListener('resize', scalePage, { passive: true });
    window.addEventListener('orientationchange', scalePage, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(scalePage).observe(scaleShell);
  }

  const buyAccordion = document.querySelector('[data-buy-accordion]');
  if (buyAccordion && scaleShell && scaleCanvas) {
    const buyMain = document.querySelector('.buy-main');
    const buyHowto = document.querySelector('.buy-howto');
    const buyFooter = document.querySelector('.buy-footer');

    const layoutBuyPage = () => {
      const howtoTop = Math.ceil(buyAccordion.offsetTop + buyAccordion.offsetHeight + 105);
      const mainHeight = howtoTop + buyHowto.offsetHeight;
      const footerTop = 174 + mainHeight;
      const designHeight = footerTop + buyFooter.offsetHeight;

      buyHowto.style.top = `${howtoTop}px`;
      buyMain.style.height = `${mainHeight}px`;
      buyFooter.style.top = `${footerTop}px`;
      scaleCanvas.style.height = `${designHeight}px`;
      scaleShell.dataset.designHeight = String(designHeight);
      refreshScaledPage();
    };

    const scheduleBuyLayout = () => window.setTimeout(layoutBuyPage, 0);

    buyAccordion.querySelectorAll('details').forEach((item) => {
      item.addEventListener('toggle', scheduleBuyLayout);
      item.querySelector('summary').addEventListener('click', scheduleBuyLayout);
    });
    requestAnimationFrame(layoutBuyPage);
    if (document.fonts?.ready) document.fonts.ready.then(layoutBuyPage);
    if ('ResizeObserver' in window) new ResizeObserver(layoutBuyPage).observe(buyAccordion);
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
      if (Math.abs(delta) > 48) index = Math.max(0, Math.min(dots.length - 1, index + (delta < 0 ? 1 : -1)));
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

  const buyForm = document.querySelector('[data-buy-form]');
  if (buyForm) buyForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const half = Number(buyForm.elements.quantity_half.value);
    const full = Number(buyForm.elements.quantity_full.value);
    const status = buyForm.querySelector('[data-buy-status]');
    if (half + full === 0) {
      status.textContent = '数量を選択してください。';
      return;
    }
    sessionStorage.setItem('doopeCart', JSON.stringify({ half, full }));
    status.textContent = 'カートに追加しました。';
  });
})();
