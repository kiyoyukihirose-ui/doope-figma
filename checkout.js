(() => {
  const form = document.querySelector('#checkout-form');
  if (!form) return;
  const prefectures = '北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県'.split(' ');
  document.querySelectorAll('[data-prefectures]').forEach(select => prefectures.forEach(name => select.add(new Option(name, name))));
  const shipping = document.querySelector('#shipping-fields');
  const syncShipping = () => {
    const active = form.elements.differentShipping.checked;
    shipping.hidden = shipping.disabled = !active;
    form.elements.differentShipping.setAttribute('aria-expanded', String(active));
  };
  form.elements.differentShipping.addEventListener('change', syncShipping);
  syncShipping();
  const money = amount => '¥' + amount.toLocaleString('ja-JP');
  let count = 0;
  const renderOrder = () => {
    let cart = {};
    try { cart = JSON.parse(sessionStorage.getItem('doopeCart') || '{}') || {}; } catch (_) {}
    const list = document.querySelector('[data-order-items]');
    list.replaceChildren();
    let total = 0; count = 0;
    [{key:'half',size:'50ml',price:7800},{key:'full',size:'100ml',price:16800}].forEach(product => {
      const quantity = Math.min(10, Math.max(0, Math.floor(Number(cart[product.key]) || 0)));
      if (!quantity) return;
      count += quantity; total += product.price * quantity;
      const row = document.createElement('article'); row.className = 'order-item';
      const mark = document.createElement('div'); mark.className = 'order-item__mark'; mark.textContent = product.size;
      const info = document.createElement('div'); info.className = 'order-item__info';
      const title = document.createElement('h3'); title.textContent = 'Doope';
      const size = document.createElement('p'); size.textContent = 'MANGO CANDY / ' + product.size;
      const qty = document.createElement('p'); qty.textContent = money(product.price) + ' × ' + quantity;
      const amount = document.createElement('strong'); amount.textContent = money(product.price * quantity);
      info.append(title,size,qty); row.append(mark,info,amount); list.append(row);
    });
    document.querySelector('[data-subtotal]').textContent = money(total);
    document.querySelector('[data-total]').textContent = money(total);
    document.querySelector('[data-empty]').hidden = count > 0;
    document.querySelector('[data-content]').hidden = count === 0;
  };
  renderOrder(); window.addEventListener('pageshow', renderOrder);
  const review = document.querySelector('[data-review]');
  const toggleReview = active => {
    form.hidden = active; review.hidden = !active;
    document.querySelector(active ? '[data-input-step]' : '[data-review-step]').removeAttribute('aria-current');
    document.querySelector(active ? '[data-review-step]' : '[data-input-step]').setAttribute('aria-current', 'step');
  };
  form.addEventListener('submit', event => {
    event.preventDefault(); renderOrder();
    if (!count || !form.reportValidity()) return;
    const value = name => form.elements[name].value.trim();
    const name = value('familyName') + ' ' + value('givenName');
    const billing = ['〒' + value('postal'), value('prefecture') + value('city'), value('street'), value('building')];
    const address = form.elements.differentShipping.checked ? [value('shippingName'), '〒' + value('shippingPostal'), value('shippingPrefecture') + value('shippingCity'), value('shippingStreet'), value('shippingBuilding')] : [name, ...billing];
    document.querySelector('[data-customer]').textContent = [name,value('email'),value('phone')].filter(Boolean).join('\n');
    document.querySelector('[data-billing]').textContent = billing.filter(Boolean).join('\n');
    document.querySelector('[data-address]').textContent = address.filter(Boolean).join('\n');
    document.querySelector('[data-note]').textContent = value('note');
    document.querySelector('[data-note-wrap]').hidden = !value('note');
    toggleReview(true); document.querySelector('#review-title').focus();
    review.scrollIntoView({block:'start',behavior:'instant'});
  });
  document.querySelector('[data-edit]').addEventListener('click', () => { toggleReview(false); form.elements.familyName.focus(); });
})();
