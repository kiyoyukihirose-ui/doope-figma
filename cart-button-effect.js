(() => {
  const button = document.querySelector('.buy-cart-button');
  if (!button) return;
  let touchTimer;
  const origin = event => {
    const rect = button.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    button.style.setProperty('--fill-x', x * 100 + '%');
    button.style.setProperty('--fill-y', y * 100 + '%');
    const radius = Math.hypot(Math.max(x,1-x) * button.clientWidth, Math.max(y,1-y) * button.clientHeight);
    button.style.setProperty('--fill-size', Math.ceil(radius * 2 + 16) + 'px');
  };
  button.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    origin(event); button.classList.add('is-position-active');
  });
  button.addEventListener('pointerleave', event => {
    if (event.pointerType === 'touch') return;
    origin(event); button.classList.remove('is-position-active');
  });
  button.addEventListener('pointerdown', event => {
    origin(event);
    if (event.pointerType !== 'touch') return;
    clearTimeout(touchTimer);
    button.classList.add('is-position-active');
    touchTimer = setTimeout(() => button.classList.remove('is-position-active'), 650);
  });
  button.addEventListener('pointercancel', () => { clearTimeout(touchTimer); button.classList.remove('is-position-active'); });
  button.addEventListener('focus', () => {
    if (button.matches(':focus-visible')) {
      button.style.setProperty('--fill-x','50%'); button.style.setProperty('--fill-y','50%');
      button.style.setProperty('--fill-size', Math.ceil(Math.hypot(button.clientWidth,button.clientHeight) + 16) + 'px');
    }
  });
  window.addEventListener('pageshow', () => button.classList.remove('is-position-active'));
})();
