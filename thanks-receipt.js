(() => {
  let receipt;
  try { receipt = JSON.parse(sessionStorage.getItem('doopeTestReceipt') || 'null'); } catch (_) { return; }
  if (!receipt || receipt.emailSent !== true || !/^TEST-[a-f0-9-]{36}$/.test(receipt.orderId || '') || Date.now() - receipt.time > 3600000) return;
  document.querySelector('.thanks-preview').textContent = 'テスト送信完了：実際の注文ではありません。お振込みは不要です。';
  const id = document.createElement('p'); id.className = 'fine'; id.style.overflowWrap = 'anywhere';
  id.textContent = 'テスト注文番号：' + receipt.orderId;
  document.querySelector('.thanks-hero').append(id);
})();
