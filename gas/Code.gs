// Doope order/email integration — TEST ONLY until production settings are agreed.
const ORDER_HEADERS = ['受付ID（システム用）', '照合情報（システム用）', '注文番号', '注文日時', 'ステータス', 'お名前', 'メールアドレス', '電話番号', 'ご注文者住所', 'お届け先', '50ml 数量', '100ml 数量', '商品小計', '送料（テスト）', '合計金額', '注文メモ', 'メール送信結果'];

function setupTest() {
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty('TEST_EMAIL')) {
    const email = Session.getEffectiveUser().getEmail();
    if (!email) throw new Error('スクリプトプロパティに TEST_EMAIL を設定してください。');
    properties.setProperty('TEST_EMAIL', email);
  }
  if (!properties.getProperty('SHEET_ID')) {
    const book = SpreadsheetApp.create('Doope テスト注文');
    book.getSheets()[0].setName('Orders');
    properties.setProperty('SHEET_ID', book.getId());
  }
  const sheet = SpreadsheetApp.openById(properties.getProperty('SHEET_ID')).getSheetByName('Orders');
  if (!sheet.getLastRow()) sheet.appendRow(ORDER_HEADERS);
  sheet.setFrozenRows(1);
  if (!properties.getProperty('ALLOWED_ORIGINS')) {
    properties.setProperty('ALLOWED_ORIGINS', 'http://127.0.0.1:4173,https://kiyoyukihirose-ui.github.io');
  }
  // Request MailApp permission, without sending an email.
  console.log('準備完了。残りの送信枠: ' + MailApp.getRemainingDailyQuota());
}

function doGet() {
  return ContentService.createTextOutput('Doope test order endpoint. No email is sent by opening this URL.');
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  const properties = PropertiesService.getScriptProperties();
  const origin = params.origin || '';
  const nonce = params.nonce || '';
  const allowed = (properties.getProperty('ALLOWED_ORIGINS') || '').split(',').map(value => value.trim());
  if (!allowed.includes(origin) || !/^[a-f0-9]{48}$/.test(nonce)) {
    return HtmlService.createHtmlOutput('Invalid request.');
  }
  let result;
  try {
    if (!params.payload || params.payload.length > 12000) throw new Error('注文データを確認してください。');
    const order = validateOrder_(JSON.parse(params.payload), properties);
    result = saveAndSend_(order, properties);
  } catch (error) {
    // Only explicitly constructed validation errors are safe for the client.
    result = {ok:false, message:error.userMessage || '処理を完了できませんでした。同じ内容で再試行するか、管理者に確認してください。'};
  }
  const data = JSON.stringify({type:'doope-order-result', nonce:nonce, result:result}).replace(/</g,'\\u003c');
  if (params.format === 'json') return ContentService.createTextOutput(data).setMimeType(ContentService.MimeType.JSON);
  const target = JSON.stringify(origin).replace(/</g,'\\u003c');
  // No customer data in this response. The random per-attempt nonce binds the reply.
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>window.top.postMessage(' + data + ',' + target + ');</script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function reject_(message) { const error = new Error(message); error.userMessage = message; throw error; }
function text_(value, max, required) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) reject_('入力内容を確認してください。');
  value = value.trim();
  if (required && !value) reject_('必須項目を入力してください。');
  return value;
}
function address_(raw) {
  if (!raw || typeof raw !== 'object') reject_('住所を入力してください。');
  const postal = text_(raw.postal, 12, true).normalize('NFKC').replace(/[-ー－\s]/g,'');
  if (!/^\d{7}$/.test(postal)) reject_('郵便番号を確認してください。');
  return {postal:postal, prefecture:text_(raw.prefecture,8,true), city:text_(raw.city,120,true), street:text_(raw.street,160,true), building:text_(raw.building,160,true)};
}
function validateOrder_(raw, properties) {
  if (!raw || raw.testMode !== true) reject_('現在はテスト注文のみ受け付けています。');
  if (!/^[a-f0-9-]{36}$/.test(raw.requestId || '')) reject_('注文識別子が不正です。');
  const email = text_(raw.email,254,true).toLowerCase();
  const testEmail = (properties.getProperty('TEST_EMAIL') || '').trim().toLowerCase();
  if (!testEmail || email !== testEmail || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)) reject_('テスト用に登録したメールアドレスを入力してください。');
  const half = raw.half, full = raw.full;
  if (![half,full].every(value => Number.isInteger(value) && value >= 0 && value <= 10) || half + full === 0) reject_('商品の数量を確認してください。');
  const order = {requestId:raw.requestId, name:text_(raw.name,121,true), email:email, phone:text_(raw.phone,25,false), billing:address_(raw.billing), shipping:address_(raw.shipping), shippingName:text_(raw.shippingName,121,true), half:half, full:full, note:text_(raw.note,1000,false)};
  // Ignore client prices; calculate from the server-side catalogue.
  order.subtotal = half * 7800 + full * 16800;
  order.shippingFee = 0; // Test amount only. Not a production free-shipping policy.
  order.total = order.subtotal;
  return order;
}

function saveAndSend_(order, properties) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) reject_('処理中です。少し待ってから同じ内容で再試行してください。');
  try {
    const sheetId = properties.getProperty('SHEET_ID');
    if (!sheetId) reject_('GASの setupTest を先に実行してください。');
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('Orders');
    const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(order)).map(byte => ('0' + (byte & 255).toString(16)).slice(-2)).join('');
    const rows = sheet.getDataRange().getValues();
    const previous = rows.findIndex((row,index) => index > 0 && row[0] === order.requestId);
    if (previous >= 0) {
      const row = rows[previous];
      if (row[1] !== hash) reject_('送信済みの注文内容が変更されています。管理者に確認してください。');
      if ((row[16] || row[4]) === 'SENT') return {ok:true, testMode:true, orderId:row[2], emailSent:true};
      // MailApp delivery and sheet writes cannot be atomic. Never resend an ambiguous attempt automatically.
      reject_('このテスト注文は記録済みですが、送信結果の確認が必要です。管理シートをご確認ください。');
    }
    const day = Utilities.formatDate(new Date(),'Asia/Tokyo','yyyy-MM-dd');
    const today = rows.slice(1).filter(row => {
      const date = row[3];
      return (date instanceof Date ? Utilities.formatDate(date,'Asia/Tokyo','yyyy-MM-dd') : String(date).slice(0,10)) === day;
    }).length;
    if (today >= 10) reject_('テスト送信は1日10回までです。');
    if (MailApp.getRemainingDailyQuota() < 1) reject_('メール送信枠が不足しています。時間をおいて再試行してください。');
    const orderId = 'TEST-' + Utilities.getUuid();
    const stamp = Utilities.formatDate(new Date(),'Asia/Tokyo',"yyyy-MM-dd HH:mm:ss");
    const safe = value => typeof value === 'string' && /^[=+@\-\t\r]/.test(value) ? "'" + value : value;
    sheet.appendRow([order.requestId,hash,orderId,stamp,'入金確認待ち',order.name,order.email,order.phone,addressText_(order.billing),order.shippingName + '\n' + addressText_(order.shipping),order.half,order.full,order.subtotal,0,order.total,order.note,'SENDING'].map(safe));
    SpreadsheetApp.flush();
    const rowIndex = sheet.getLastRow();
    try {
      MailApp.sendEmail({to:order.email, subject:'【テスト・振込不要】Doope ご注文ありがとうございます', body:emailBody_(order,orderId), name:'Doope（テスト）'});
      sheet.getRange(rowIndex,17).setValue('SENT');
      SpreadsheetApp.flush();
    } catch (_) {
      sheet.getRange(rowIndex,17).setValue('CHECK_REQUIRED');
      reject_('注文は記録されましたが、メール送信結果の確認が必要です。管理シートをご確認ください。');
    }
    return {ok:true, testMode:true, orderId:orderId, emailSent:true};
  } finally { lock.releaseLock(); }
}

function addressText_(address) { return '〒' + address.postal + '\n' + address.prefecture + address.city + address.street + '\n' + address.building; }
function emailBody_(order, orderId) {
  const yen = value => '¥' + value.toLocaleString('ja-JP');
  const items = [];
  if (order.half) items.push('Doope マンゴー 50ml × ' + order.half + '　' + yen(order.half * 7800));
  if (order.full) items.push('Doope マンゴー 100ml × ' + order.full + '　' + yen(order.full * 16800));
  // Replace this thank-you text here once the final wording is supplied.
  return ['【動作確認用メールです。実際の注文ではありません。お振込みは不要です。】','',order.name + ' 様','',
    'このたびはDoopeをお選びいただき、ありがとうございます。',
    '毎日のひとときに、マンゴーの甘さを楽しんでいただけましたら幸いです。',
    '以下の内容でご注文を承りました。','',
    '【注文番号】',orderId,'','【ご注文内容】',...items,'商品小計：' + yen(order.subtotal),
    '送料：¥0（テスト用の仮設定）','合計：' + yen(order.total) + '（テスト金額）','',
    '【お届け先】',order.shippingName,addressText_(order.shipping),'',
    '【お支払い方法】','銀行振込','振込先：テスト中のため未設定。お振込みはしないでください。','',
    'ご不明な点がございましたら、このメールにご返信ください。','Doope'].join('\n');
}
