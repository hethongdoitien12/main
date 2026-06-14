/**
 * ZaloPay Payment Gateway v2
 * Sandbox: https://sb-openapi.zalopay.vn
 * Docs: https://docs.zalopay.vn/v2/start/
 *
 * ENV:
 *   ZALOPAY_APP_ID, ZALOPAY_KEY1, ZALOPAY_KEY2
 *   ZALOPAY_ENDPOINT  (default: sandbox)
 *   BACKEND_URL
 */
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import querystring from 'querystring';
import { URL } from 'url';

const APP_ID    = parseInt(process.env.ZALOPAY_APP_ID  || '2553');
const KEY1      = process.env.ZALOPAY_KEY1             || 'PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL';
const KEY2      = process.env.ZALOPAY_KEY2             || 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz';
const ENDPOINT  = process.env.ZALOPAY_ENDPOINT         || 'https://sb-openapi.zalopay.vn';
const BACKEND_URL = process.env.BACKEND_URL            || 'http://localhost:3001';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = querystring.stringify(body);
    const u    = new URL(ENDPOINT);
    const lib  = u.protocol === 'https:' ? https : http;
    const req  = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('ZaloPay parse error: ' + raw)); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

export async function createPayment(depositId, amount, description = 'Nạp XU vào ví') {
  const now      = new Date();
  const yymmdd   = now.toISOString().slice(2, 10).replace(/-/g, '');
  const shortId  = depositId.replace(/-/g, '').slice(0, 12).toUpperCase();
  const appTransId = `${yymmdd}_${shortId}`;
  const appTime  = Date.now();
  const embedData = JSON.stringify({ deposit_id: depositId });
  const items    = JSON.stringify([{ itemid: 'xu_topup', itemname: 'Nạp XU', itemprice: amount, itemquantity: 1 }]);
  const appUser  = `deposit_${depositId.slice(0, 8)}`;

  const mac = hmac(KEY1, `${APP_ID}|${appTransId}|${appUser}|${amount}|${appTime}|${embedData}|${items}`);

  const result = await post('/v2/create', {
    app_id: APP_ID, app_trans_id: appTransId, app_user: appUser,
    app_time: appTime, amount, item: items, description, embed_data: embedData,
    bank_code: '', callback_url: `${BACKEND_URL}/api/wallet/zalopay/ipn`, mac,
  });

  if (result.return_code !== 1) {
    throw new Error(`ZaloPay lỗi [${result.return_code}]: ${result.return_message}`);
  }
  return { orderUrl: result.order_url, orderToken: result.order_token, zpTransToken: result.zp_trans_token, appTransId };
}

export function verifyIPN(data, mac) {
  const expected = hmac(KEY2, data);
  let valid = false;
  try { valid = crypto.timingSafeEqual(Buffer.from(mac || '', 'utf8'), Buffer.from(expected, 'utf8')); } catch {}
  let payload = null;
  if (valid) { try { payload = JSON.parse(data); } catch {} }
  return { valid, payload };
}

export async function queryTransaction(appTransId) {
  const mac = hmac(KEY1, `${APP_ID}|${appTransId}|${KEY1}`);
  return post('/v2/query', { app_id: APP_ID, app_trans_id: appTransId, mac });
}
