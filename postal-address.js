(() => {
  const form = document.querySelector('#checkout-form');
  if (!form) return;
  const normalize = value => value.normalize('NFKC').replace(/[\sー−－-]/g, '');
  [['postal','prefecture','city','street'], ['shippingPostal','shippingPrefecture','shippingCity','shippingStreet']].forEach(names => {
    const [postal, prefecture, city, street] = names.map(name => form.elements[name]);
    const row = postal.closest('.field-row');
    const status = document.createElement('p');
    status.className = 'fine postal-status';
    status.id = names[0] + '-status';
    status.setAttribute('role','status');
    status.textContent = '7桁の郵便番号で住所を自動入力します。';
    postal.setAttribute('aria-describedby', status.id);
    const choices = document.createElement('select');
    choices.setAttribute('aria-label','該当する町名を選択');
    choices.hidden = true;
    row.after(status, choices);
    let timer, controller, revision = 0, results = [], snapshot;
    const fields = [prefecture, city, street];
    const apply = result => {
      if (fields.some((field, index) => field.value !== snapshot[index])) {
        status.textContent = '入力中の住所を保持しました。郵便番号と住所をご確認ください。';
        choices.hidden = true;
        return;
      }
      prefecture.value = result.address1;
      city.value = result.address2;
      street.value = result.address3;
      postal.value = normalize(postal.value).replace(/^(\d{3})(\d{4})$/, '$1-$2');
      fields.forEach(field => field.dispatchEvent(new Event('change', {bubbles:true})));
      choices.hidden = true;
      status.textContent = '住所を入力しました。続けて番地・建物名をご入力ください。';
    };
    choices.addEventListener('change', () => {
      if (choices.value !== '') apply(results[Number(choices.value)]);
    });
    postal.addEventListener('input', () => {
      clearTimeout(timer); controller?.abort();
      const current = ++revision;
      choices.hidden = true;
      status.textContent = '7桁の郵便番号で住所を自動入力します。';
      const code = normalize(postal.value);
      if (!/^\d{7}$/.test(code)) return;
      snapshot = fields.map(field => field.value);
      timer = setTimeout(async () => {
        const requestController = new AbortController();
        controller = requestController;
        const timeout = setTimeout(() => requestController.abort(), 8000);
        status.textContent = '住所を検索しています…';
        try {
          const response = await fetch('https://zipcloud.ibsnet.co.jp/api/search?zipcode=' + code, {signal:requestController.signal, credentials:'omit', referrerPolicy:'no-referrer'});
          if (!response.ok) throw new Error('lookup failed');
          const data = await response.json();
          if (current !== revision) return;
          if (data.status !== 200) throw new Error('lookup failed');
          results = (data.results || []).filter(result => result.zipcode === code && ['address1','address2','address3'].every(key => typeof result[key] === 'string'));
          if (!results.length) { status.textContent = '住所が見つかりません。郵便番号をご確認いただくか、住所を直接入力してください。'; return; }
          if (results.length === 1) { apply(results[0]); return; }
          choices.replaceChildren(new Option('町名を選択してください',''));
          results.forEach((result,index) => choices.add(new Option(result.address1 + result.address2 + result.address3, String(index))));
          choices.hidden = false;
          status.textContent = '複数の住所が見つかりました。町名を選択してください。';
        } catch (_) {
          if (current === revision) status.textContent = '住所を取得できませんでした。住所を直接入力するか、郵便番号を再入力してください。';
        } finally { clearTimeout(timeout); }
      }, 350);
    });
  });
})();
