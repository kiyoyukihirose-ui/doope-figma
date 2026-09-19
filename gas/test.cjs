// Local tests use fakes only: no Google access and no real email.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = fs.readFileSync(__dirname + '/Code.gs','utf8');
function fixture({mailFails=false,quota=100}={}) {
  const rows = [['requestId','payloadHash','orderId','createdAt','status']];
  const sent = [];
  const props = {TEST_EMAIL:'tester@example.com',SHEET_ID:'test-sheet',ALLOWED_ORIGINS:'http://127.0.0.1:4173'};
  const properties = {getProperty:key=>props[key]};
  const sheet = {getDataRange:()=>({getValues:()=>rows}),appendRow:row=>rows.push(row),getLastRow:()=>rows.length,getRange:(r,c)=>({setValue:value=>{ rows[r-1][c-1]=value; }})};
  const context = vm.createContext({
    console,
    PropertiesService:{getScriptProperties:()=>properties},
    SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush:()=>{}},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
    MailApp:{getRemainingDailyQuota:()=>quota,sendEmail:mail=>{if(mailFails)throw Error('network');sent.push(mail);}},
    HtmlService:{XFrameOptionsMode:{ALLOWALL:'all'},createHtmlOutput:html=>({html,setXFrameOptionsMode(){return this;}})},
    ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text=>({text,setMimeType(type){this.type=type;return this;}})},
    Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,data)=>[...crypto.createHash('sha256').update(data).digest()],getUuid:()=>crypto.randomUUID(),formatDate:(_,zone,format)=>format==='yyyy-MM-dd'?'2026-09-18':'2026-09-18 12:00:00'}
  });
  vm.runInContext(source,context);
  const raw = () => ({requestId:crypto.randomUUID(),testMode:true,name:'テスト 太郎',email:'tester@example.com',phone:'',billing:{postal:'169-0073',prefecture:'東京都',city:'新宿区',street:'百人町1-2-3',building:'テスト101'},shipping:{postal:'5300001',prefecture:'大阪府',city:'大阪市北区',street:'梅田1-2-3',building:'テスト202'},shippingName:'配送テスト',half:2,full:1,note:''});
  return {context,rows,sent,raw,validate:raw=>context.validateOrder_(raw,properties),save:order=>context.saveAndSend_(order,properties)};
}
test('server computes price, sends thank-you text and test-only instructions',()=>{
  const f=fixture();const raw=f.raw();raw.total=1;
  const result=f.save(f.validate(raw));
  assert.equal(result.ok,true);assert.equal(f.rows[1][14],32400);assert.equal(f.sent.length,1);
  assert.match(f.sent[0].body,/ありがとうございます/);assert.match(f.sent[0].body,/お振込みは不要/);
  assert.equal(f.rows[1][16],'SENT');
});
test('same request never sends duplicate email',()=>{
  const f=fixture();const order=f.validate(f.raw());
  assert.equal(f.save(order).orderId,f.save(order).orderId);assert.equal(f.sent.length,1);assert.equal(f.rows.length,2);
});
test('same id with different payload is rejected',()=>{
  const f=fixture();const raw=f.raw();f.save(f.validate(raw));raw.half=3;
  assert.throws(()=>f.save(f.validate(raw)),/変更/);assert.equal(f.sent.length,1);
});
test('non-test recipients and live requests are rejected',()=>{
  const f=fixture();const raw=f.raw();raw.email='customer@example.com';assert.throws(()=>f.validate(raw),/テスト用/);
  raw.email='tester@example.com';raw.testMode=false;assert.throws(()=>f.validate(raw),/テスト注文/);
});
test('invalid quantities and required address fields are rejected',()=>{
  const f=fixture();for(const count of [-1,1.5,11,'1']) {const raw=f.raw();raw.half=count;assert.throws(()=>f.validate(raw),/数量/);}
  const raw=f.raw();raw.billing.building='';assert.throws(()=>f.validate(raw),/必須/);
});
test('daily quota failure does not save or send',()=>{
  const f=fixture({quota:0});assert.throws(()=>f.save(f.validate(f.raw())),/送信枠/);assert.equal(f.rows.length,1);assert.equal(f.sent.length,0);
});
test('ambiguous email attempt is recorded and not retried automatically',()=>{
  const f=fixture({mailFails:true});const order=f.validate(f.raw());
  assert.throws(()=>f.save(order),/確認が必要/);assert.equal(f.rows[1][16],'CHECK_REQUIRED');
  assert.throws(()=>f.save(order),/記録済み/);assert.equal(f.rows.length,2);
});
test('test cap limits spam and quota usage',()=>{
  const f=fixture();for(let i=0;i<10;i++)f.save(f.validate(f.raw()));
  assert.throws(()=>f.save(f.validate(f.raw())),/10回/);assert.equal(f.sent.length,10);
});
test('spreadsheet formula injection is neutralized',()=>{
  const f=fixture();const raw=f.raw();raw.name='=1+1';raw.note='@SUM(1,1)';f.save(f.validate(raw));
  assert.equal(f.rows[1][5],"'=1+1");assert.equal(f.rows[1][15],"'@SUM(1,1)");
});
test('invalid origin does not process orders',()=>{
  const f=fixture();f.context.doPost({parameter:{origin:'https://example.invalid',nonce:'a'.repeat(48),payload:JSON.stringify(f.raw())}});
  assert.equal(f.sent.length,0);assert.equal(f.rows.length,1);
});
test('valid response carries nonce and no customer details',()=>{
  const f=fixture();const response=f.context.doPost({parameter:{origin:'http://127.0.0.1:4173',nonce:'b'.repeat(48),payload:JSON.stringify(f.raw())}});
  assert.match(response.html,/postMessage/);assert.match(response.html,/"ok":true/);assert.ok(!response.html.includes('tester@example.com'));
});
test('JSON transport confirms result without exposing customer data',()=>{
  const f=fixture();const nonce='c'.repeat(48);
  const response=f.context.doPost({parameter:{origin:'http://127.0.0.1:4173',nonce,format:'json',payload:JSON.stringify(f.raw())}});
  const data=JSON.parse(response.text);
  assert.equal(response.type,'application/json');assert.equal(data.nonce,nonce);assert.equal(data.result.emailSent,true);
  assert.ok(!response.text.includes('tester@example.com'));
});

test('fulfillment status changes do not resend email',()=>{
 const f=fixture();const order=f.validate(f.raw());f.save(order);assert.equal(f.rows[1][4],'入金確認待ち');f.rows[1][4]='出荷済み';f.save(order);assert.equal(f.sent.length,1);assert.equal(f.rows[1][4],'出荷済み');
});
