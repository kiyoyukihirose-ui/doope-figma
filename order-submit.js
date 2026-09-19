(() => {
  const form = document.querySelector('#checkout-form');
  const button = document.querySelector('[data-place-order]');
  if (!form || !button) return;
  const config = window.DOOPE_ORDER_CONFIG || {};
  const endpoint = config.endpoint || '';
  const validEndpoint = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint);
  const status = document.querySelector('[data-order-status]');
  if (!validEndpoint || config.testMode !== true) return;
  button.disabled = false;
  button.textContent = 'テスト注文・確認メールを送信';
  status.textContent = 'テスト用です。登録済みのテストアドレスにのみ送信します。お振込みは不要です。';
  document.querySelector('[data-shipping-fee]').textContent = '¥0（テスト用）';
  document.querySelector('[data-total-label]').textContent = 'テスト合計';
  document.querySelector('[data-shipping-note]').textContent = '送料はテスト用の仮設定です。実際の注文・請求は発生しません。';
  const notice = document.createElement('p');
  notice.className = 'pending';
  notice.textContent = 'テスト注文：登録済みのテストメールアドレスでお試しください。';
  form.before(notice);
  let busy = false;
  const value = name => form.elements[name].value.trim();
  const address = prefix => ({
    postal:value(prefix ? 'shippingPostal' : 'postal'), prefecture:value(prefix ? 'shippingPrefecture' : 'prefecture'),
    city:value(prefix ? 'shippingCity' : 'city'), street:value(prefix ? 'shippingStreet' : 'street'), building:value(prefix ? 'shippingBuilding' : 'building')
  });
  const send = async (payload, nonce) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(),45000);
    try {
      const response = await fetch(endpoint, {
        method:'POST', credentials:'omit', redirect:'follow', signal:controller.signal,
        body:new URLSearchParams({payload:JSON.stringify(payload),origin:location.origin,nonce,format:'json'})
      });
      if (!response.ok) throw new Error('送信結果を確認できませんでした。同じ内容で再試行してください。');
      const data = await response.json();
      if (data.type !== 'doope-order-result' || data.nonce !== nonce) throw new Error('送信結果が一致しません。同じ内容で再試行してください。');
      return data.result;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('通信結果を確認できませんでした。注文が記録済みの場合があります。同じ内容で再試行してください。');
      throw error;
    } finally { clearTimeout(timer); }
  };
  button.addEventListener('click', async () => {
    if (busy) return;
    if (!form.checkValidity()) { status.textContent = '入力内容を変更して、必須項目をご確認ください。'; return; }
    busy = true; button.disabled = true;
    const edit = document.querySelector('[data-edit]'); edit.disabled = true;
    status.textContent = 'テスト注文を記録し、確認メールを送信しています…';
    try {
      const cart = JSON.parse(sessionStorage.getItem('doopeCart') || '{}');
      const name = value('familyName') + ' ' + value('givenName');
      const payload = {testMode:true,name,email:value('email'),phone:value('phone'),billing:address(false),
        shipping:address(form.elements.differentShipping.checked), shippingName:form.elements.differentShipping.checked ? value('shippingName') : name,
        half:Number(cart.half || 0),full:Number(cart.full || 0),note:value('note')};
      const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)));
      const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
      const key = 'doopeTestRequest:' + fingerprint;
      payload.requestId = sessionStorage.getItem(key) || crypto.randomUUID();
      sessionStorage.setItem(key,payload.requestId);
      const nonce = Array.from(crypto.getRandomValues(new Uint8Array(24)), byte => byte.toString(16).padStart(2,'0')).join('');
      const result = await send(payload,nonce);
      if (!result || result.ok !== true || result.emailSent !== true || result.testMode !== true || !/^TEST-[a-f0-9-]{36}$/.test(result.orderId || '')) {
        throw new Error(result && typeof result.message === 'string' ? result.message : '送信結果を確認できませんでした。同じ内容で再試行してください。');
      }
      sessionStorage.setItem('doopeTestReceipt',JSON.stringify({orderId:result.orderId,time:Date.now(),emailSent:true}));
      sessionStorage.removeItem('doopeCart');
      location.assign('thanks.html');
    } catch (error) {
      status.textContent = error.message || '送信できませんでした。時間をおいて再試行してください。';
      busy = false; button.disabled = false; edit.disabled = false;
    }
  });
})();
