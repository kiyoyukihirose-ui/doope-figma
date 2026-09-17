(() => {
  // Draw a flowing liquid surface without bubbles. Animate only visible buttons.
  const liquidButtons = [...document.querySelectorAll('.buy-now-visual')].map((visual) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'buy-now-liquid';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.width = 1444;
    canvas.height = 280;
    visual.append(canvas);
    return { visual, canvas, context: canvas.getContext('2d'), visible: false, fill: 0, lastTime: 0 };
  });
  if (liquidButtons.length) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let liquidFrame = 0;
    const drawLiquid = (button, time) => {
      const ctx = button.context;
      if (!ctx) return;
      const width = button.canvas.width;
      const height = button.canvas.height;
      ctx.clearRect(0, 0, width, height);
      const link = button.visual.closest('.buy-now-hotspot');
      const hovered = window.matchMedia('(hover: hover)').matches && link.matches(':hover');
      const targetFill = hovered || link.matches(':focus-visible') ? 1 : 0;
      const delta = button.lastTime ? Math.min(64, time - button.lastTime) : 16;
      button.lastTime = time;
      button.fill = reducedMotion.matches ? targetFill : button.fill + (targetFill - button.fill) * (1 - Math.exp(-delta / 190));
      if (Math.abs(targetFill - button.fill) < .001) button.fill = targetFill;
      const phase = time / 1000 * Math.PI * 2 / 5.5;
      const wave = (level, amplitude, offset, color) => {
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 4) {
          const angle = x / width * Math.PI * 2 * 1.15 - phase + offset;
          const y = height * level + Math.sin(angle) * amplitude
            + Math.sin(angle * 2 + phase * .35) * amplitude * .18;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      };
      wave(.60 - .76 * button.fill, 24, 0, `rgba(255, 90, 20, ${.70 + .30 * button.fill})`);
    };
    const tickLiquid = (time) => {
      liquidFrame = 0;
      liquidButtons.forEach((button) => {
        if (button.visible) drawLiquid(button, time);
      });
      if (!document.hidden && !reducedMotion.matches && liquidButtons.some((button) => button.visible)) {
        liquidFrame = requestAnimationFrame(tickLiquid);
      }
    };
    const syncLiquid = () => {
      cancelAnimationFrame(liquidFrame);
      liquidFrame = 0;
      if (reducedMotion.matches) liquidButtons.forEach((button) => drawLiquid(button, 0));
      else if (!document.hidden && liquidButtons.some((button) => button.visible)) liquidFrame = requestAnimationFrame(tickLiquid);
    };
    liquidButtons.forEach((button) => {
      drawLiquid(button, 0);
      const link = button.visual.closest('.buy-now-hotspot');
      ['pointerenter', 'pointerleave', 'focus', 'blur'].forEach((eventName) => link.addEventListener(eventName, syncLiquid));
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const button = liquidButtons.find((item) => item.visual === entry.target);
          button.visible = entry.isIntersecting;
        });
        syncLiquid();
      });
      liquidButtons.forEach((button) => observer.observe(button.visual));
    } else {
      liquidButtons.forEach((button) => { button.visible = true; });
      syncLiquid();
    }
    reducedMotion.addEventListener('change', syncLiquid);
    document.addEventListener('visibilitychange', syncLiquid);
  }

  // Cover the viewport with a liquid sweep before following purchase links.
  const purchaseLinks = [...document.querySelectorAll('.buy-now-hotspot, header a[aria-label="DOOPEトップへ戻る"]')];
  if (purchaseLinks.length) {
    let transitionCanvas = null;
    let transitionFrame = 0;
    let transitionFallback = 0;
    let navigating = false;
    const resetTransition = () => {
      cancelAnimationFrame(transitionFrame);
      clearTimeout(transitionFallback);
      transitionCanvas?.remove();
      transitionCanvas = null;
      navigating = false;
      document.body.classList.remove('is-liquid-navigating');
    };
    window.addEventListener('pageshow', resetTransition);
    purchaseLinks.forEach((link) => link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      event.preventDefault();
      if (navigating) return;
      navigating = true;
      const fromLeft = !!link.closest('header');
      transitionCanvas = document.createElement('canvas');
      transitionCanvas.className = 'liquid-page-transition';
      transitionCanvas.setAttribute('aria-hidden', 'true');
      const ctx = transitionCanvas.getContext('2d');
      if (!ctx) { window.location.assign(link.href); return; }
      document.body.append(transitionCanvas);
      document.body.classList.add('is-liquid-navigating');
      let hasNavigated = false;
      const navigate = () => {
        if (hasNavigated) return;
        hasNavigated = true;
        clearTimeout(transitionFallback);
        try { sessionStorage.setItem('doopeLiquidArrival', JSON.stringify({ path: new URL(link.href).pathname, time: Date.now(), fromLeft })); } catch (_) {}
        window.location.assign(link.href);
      };
      let start;
      const duration = 300;
      const drawSweep = (now) => {
        if (start === undefined) start = now;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        if (transitionCanvas.width !== Math.round(width * ratio) || transitionCanvas.height !== Math.round(height * ratio)) {
          transitionCanvas.width = Math.round(width * ratio);
          transitionCanvas.height = Math.round(height * ratio);
        }
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const progress = Math.min(1, (now - start) / duration);
        const ease = progress * progress * (3 - 2 * progress);
        const originX = width * (fromLeft ? .06 : .94);
        const originY = height * .035;
        const radius = Math.hypot(Math.max(originX, width - originX), height - originY) / .91 * ease;
        ctx.fillStyle = '#ff5a14';
        ctx.beginPath();
        for (let i = 0; i <= 160; i++) {
          const angle = i / 160 * Math.PI * 2;
          const ripple = 1 + Math.sin(angle * 3 - progress * 5) * .065
            + Math.sin(angle * 5 + progress * 4) * .025;
          const x = originX + Math.cos(angle) * radius * ripple;
          const y = originY + Math.sin(angle) * radius * ripple;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        if (progress < 1) transitionFrame = requestAnimationFrame(drawSweep);
        else {
          ctx.fillRect(0, 0, width, height);
          navigate();
        }
      };
      // Preserve navigation if rendering is suspended by a background tab.
      transitionFallback = window.setTimeout(navigate, 1800);
      transitionFrame = requestAnimationFrame(drawSweep);
    }));
  }

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

  const cartHeader = document.querySelector('.buy-header__cart');
  const cartCount = () => {
    try {
      const state = JSON.parse(sessionStorage.getItem('doopeCart') || '{}');
      return ['half', 'full'].reduce((sum, key) => sum + Math.min(10, Math.max(0, Math.floor(Number(state?.[key]) || 0))), 0);
    } catch (_) { return 0; }
  };
  const syncCartBadges = () => {
    const count = cartCount();
    document.querySelectorAll('[data-cart-badge]').forEach((badge) => {
      badge.textContent = String(count);
      badge.hidden = count === 0;
      badge.closest('a')?.setAttribute('aria-label', 'カートを見る（' + count + '点）');
    });
  };
  let floatingCart = null;
  let floatingCartTimer = 0;
  const cartFlights = new Set();
  if (cartHeader) {
    syncCartBadges();
    window.addEventListener('pageshow', syncCartBadges);
    window.addEventListener('storage', syncCartBadges);
    window.addEventListener('pagehide', () => {
      clearTimeout(floatingCartTimer);
      floatingCart?.remove();
      floatingCart = null;
      cartFlights.forEach((flight) => flight.remove());
      cartFlights.clear();
    });
  }
  const flyToCart = (button) => {
    if (!cartHeader) return;
    let target = cartHeader;
    const headerRect = cartHeader.getBoundingClientRect();
    if (headerRect.top < 0 || headerRect.bottom > window.innerHeight) {
      if (!floatingCart) {
        floatingCart = document.createElement('a');
        floatingCart.href = cartHeader.href;
        floatingCart.className = 'cart-flight-target';
        const icon = document.createElement('img');
        icon.src = 'assets/lp-imgGroup2.svg';
        icon.alt = '';
        const badge = document.createElement('span');
        badge.className = 'buy-cart-badge';
        badge.setAttribute('data-cart-badge', '');
        floatingCart.append(icon, badge);
        document.body.append(floatingCart);
      }
      target = floatingCart;
    }
    clearTimeout(floatingCartTimer);
    syncCartBadges();
    const finish = () => {
      syncCartBadges();
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        target.animate([{ scale: '1' }, { scale: '1.18', offset: .45 }, { scale: '1' }], { duration: 300, easing: 'ease-out' });
      }
      clearTimeout(floatingCartTimer);
      floatingCartTimer = setTimeout(() => { floatingCart?.remove(); floatingCart = null; }, 1800);
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    const start = button.getBoundingClientRect();
    const end = target.getBoundingClientRect();
    const x0 = start.left + start.width / 2 - 24, y0 = start.top + start.height / 2 - 24;
    const x1 = end.left + end.width / 2 - 24, y1 = end.top + end.height / 2 - 24;
    const cx = Math.min(window.innerWidth - 48, Math.max(x0, x1) + 70);
    const cy = Math.max(0, y0 - 100);
    const flight = document.createElement('img');
    flight.className = 'cart-flight';
    flight.src = 'assets/buy-product-main.png';
    flight.alt = '';
    flight.setAttribute('aria-hidden', 'true');
    document.body.append(flight);
    cartFlights.add(flight);
    const frames = Array.from({ length: 25 }, (_, i) => {
      const t = i / 24, u = 1 - t;
      const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
      const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      return { transform: 'translate(' + x + 'px,' + y + 'px) scale(' + (1 - t * .65) + ')', opacity: t > .85 ? (1 - t) / .15 : 1, offset: t };
    });
    const animation = flight.animate(frames, { duration: 850, easing: 'cubic-bezier(.3,.05,.35,1)', fill: 'forwards' });
    animation.finished.then(() => { flight.remove(); cartFlights.delete(flight); finish(); }, () => { flight.remove(); cartFlights.delete(flight); });
  };

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
    let current = { half: 0, full: 0 };
    try {
      current = { ...current, ...JSON.parse(sessionStorage.getItem('doopeCart') || '{}') };
    } catch (_) {
      current = { half: 0, full: 0 };
    }
    const beforeCount = cartCount();
    sessionStorage.setItem('doopeCart', JSON.stringify({
      half: Math.min(10, Math.max(0, Number(current.half) || 0) + half),
      full: Math.min(10, Math.max(0, Number(current.full) || 0) + full)
    }));
    const added = cartCount() - beforeCount;
    if (added <= 0) { status.textContent = '各サイズの上限は10点です。'; return; }
    status.textContent = added + '点をカートに追加しました。';
    flyToCart(buyForm.querySelector('.buy-cart-button'));
  });

  const cart = document.querySelector('[data-cart]');
  if (cart) {
    const products = {
      half: { price: 7800 },
      full: { price: 16800 }
    };
    const rows = [...cart.querySelectorAll('[data-cart-item]')];
    const empty = cart.querySelector('[data-cart-empty]');
    const summary = cart.querySelector('[data-cart-summary]');
    const total = cart.querySelector('[data-cart-total]');
    const count = cart.querySelector('[data-cart-count]');
    const status = cart.querySelector('[data-cart-status]');
    let state = { half: 0, full: 0 };

    try {
      state = { ...state, ...JSON.parse(sessionStorage.getItem('doopeCart') || '{}') };
    } catch (_) {
      state = { half: 0, full: 0 };
    }

    const renderCart = () => {
      let itemCount = 0;
      let totalPrice = 0;

      rows.forEach((row) => {
        const key = row.dataset.cartItem;
        const quantity = Math.max(0, Number(state[key]) || 0);
        const select = row.querySelector('[data-cart-quantity]');
        const lineTotal = row.querySelector('[data-cart-line-total]');
        row.hidden = quantity === 0;
        select.value = String(Math.min(quantity, 10));
        lineTotal.textContent = `¥${(products[key].price * quantity).toLocaleString('ja-JP')}`;
        itemCount += quantity;
        totalPrice += products[key].price * quantity;
      });

      const hasItems = itemCount > 0;
      empty.hidden = hasItems;
      summary.hidden = !hasItems;
      count.textContent = `${itemCount}点`;
      total.textContent = `¥${totalPrice.toLocaleString('ja-JP')}`;
      sessionStorage.setItem('doopeCart', JSON.stringify(state));
    };

    rows.forEach((row) => {
      const key = row.dataset.cartItem;
      row.querySelector('[data-cart-quantity]').addEventListener('change', (event) => {
        state[key] = Number(event.target.value);
        status.textContent = 'カートを更新しました。';
        renderCart();
      });
      row.querySelector('[data-cart-remove]').addEventListener('click', () => {
        state[key] = 0;
        status.textContent = '商品を削除しました。';
        renderCart();
      });
    });

    cart.querySelector('[data-checkout]').addEventListener('click', () => {
      status.textContent = '購入手続きページは現在準備中です。';
    });

    renderCart();
  }

  // Prepare visible artwork under the cover, then reveal on a compositor layer.
  if (document.documentElement.classList.contains('liquid-arriving')) {
    const fromLeft = document.documentElement.dataset.liquidFrom === 'left';
    const cover = document.createElement('div');
    cover.className = 'liquid-page-transition';
    cover.setAttribute('aria-hidden', 'true');
    const shape = document.createElement('div');
    const width = window.innerWidth, height = window.innerHeight;
    const originX = width * (fromLeft ? .94 : .06), originY = height * .965;
    const radius = Math.hypot(Math.max(originX, width - originX), originY) / .91;
    const size = radius * 2.2;
    const points = [];
    for (let i = 0; i < 160; i++) {
      const angle = i / 160 * Math.PI * 2;
      const ripple = 1 + Math.sin(angle * 3) * .065 + Math.sin(angle * 5) * .025;
      points.push((50 + Math.cos(angle) * ripple / 2.2 * 100) + '% ' + (50 + Math.sin(angle) * ripple / 2.2 * 100) + '%');
    }
    Object.assign(shape.style, {
      position: 'absolute', width: size + 'px', height: size + 'px',
      left: (originX - size / 2) + 'px', top: (originY - size / 2) + 'px',
      background: '#ff5a14', clipPath: 'polygon(' + points.join(',') + ')',
      transformOrigin: 'center', willChange: 'transform'
    });
    cover.append(shape);
    document.body.append(cover);
    let animation;
    let disposed = false;
    const cleanup = () => {
      disposed = true;
      animation?.cancel();
      cover.remove();
      document.documentElement.classList.remove('liquid-arriving');
    };
    window.addEventListener('pagehide', cleanup, { once: true });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) cleanup();
    else {
      refreshScaledPage();
      const visibleImages = [...document.images].filter((img) => {
        const rect = img.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < height && rect.right > 0 && rect.left < width;
      });
      const artworkReady = Promise.allSettled(visibleImages.map((img) => img.decode()));
      const ready = Promise.allSettled([artworkReady, document.fonts.ready]);
      // Slow external resources cannot leave the page covered indefinitely.
      Promise.race([ready, new Promise((resolve) => setTimeout(resolve, 350))]).then(() => {
        if (disposed) return;
        refreshScaledPage();
        requestAnimationFrame(() => {
          if (disposed) return;
          document.documentElement.classList.remove('liquid-arriving');
          animation = shape.animate([{ transform: 'scale(1)' }, { transform: 'scale(0)' }], {
            duration: 300, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'
          });
          animation.finished.then(cleanup, cleanup);
          setTimeout(cleanup, 1200);
        });
      });
    }
  }
})();
