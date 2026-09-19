(() => {
  const pickers = [];
  document.querySelectorAll('.buy-variant select').forEach((select, index) => {
    const container = select.parentElement;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'quantity-trigger';
    trigger.setAttribute('aria-label', select.getAttribute('aria-label'));
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const list = document.createElement('div');
    list.id = 'quantity-list-' + index;
    list.className = 'quantity-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', select.getAttribute('aria-label'));
    list.hidden = true;
    trigger.setAttribute('aria-controls', list.id);
    const close = (restore = false) => {
      list.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      container.classList.remove('quantity-open');
      if (restore) trigger.focus();
    };
    const options = [...select.options].map(option => {
      const button = document.createElement('button');
      button.type = 'button'; button.tabIndex = -1;
      button.setAttribute('role', 'option');
      button.textContent = option.textContent;
      button.addEventListener('click', event => {
        event.preventDefault();
        select.value = option.value;
        select.dispatchEvent(new Event('change', {bubbles:true}));
        close(true);
      });
      list.append(button);
      return button;
    });
    const sync = () => {
      trigger.textContent = select.selectedOptions[0].textContent;
      options.forEach((button, i) => button.setAttribute('aria-selected', String(i === select.selectedIndex)));
    };
    const open = () => {
      pickers.forEach(picker => picker.close());
      list.hidden = false;
      container.classList.add('quantity-open');
      trigger.setAttribute('aria-expanded', 'true');
      options[select.selectedIndex].focus();
    };
    trigger.addEventListener('click', event => { event.preventDefault(); list.hidden ? open() : close(true); });
    trigger.addEventListener('keydown', event => {
      if (['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); open(); }
    });
    list.addEventListener('keydown', event => {
      const current = options.indexOf(document.activeElement);
      const next = {ArrowDown:Math.min(options.length - 1,current + 1),ArrowUp:Math.max(0,current - 1),Home:0,End:options.length - 1}[event.key];
      if (next !== undefined) { event.preventDefault(); options[next].focus(); }
      if (event.key === 'Escape') { event.preventDefault(); close(true); }
      if (event.key === 'Tab') close();
    });
    select.hidden = true;
    container.classList.add('quantity-picker');
    container.append(trigger,list);
    select.addEventListener('change', sync);
    window.addEventListener('pageshow', () => { sync(); close(); });
    pickers.push({container,close});
    sync();
  });
  document.addEventListener('pointerdown', event => pickers.forEach(picker => {
    if (!picker.container.contains(event.target)) picker.close();
  }));
})();
