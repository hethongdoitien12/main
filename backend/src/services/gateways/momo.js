/**
 * MoMo Payment Gateway v2
 * Sandbox: https://test-payment.momo.vn
 * Docs: https://developers.momo.vn/v3/docs/payment/api/payment-method/atm
 *
 * ENV:
 *   MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY
 *   MOMO_ENDPOINT  (default: sandbox)
 *   BACKEND_URL    (URL public để MoMo gọi IPN)
 */
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const PARTNER_CODE = process.env.MOMO_PARTNER_CODE || 'MOMO_TEST';
const ACCESS_KEY   = process.env.MOMO_ACCESS_KEY   || 'F8BBA842ECF85';
const SECRET_KEY   = process.env.MOMO_SECRET_KEY   || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
const ENDPOINT     = process.env.MOMO_ENDPOINT     || 'https://test-payment.momo.vn';
const BACKEND_URL  = process.env.BACKEND_URL       || 'http://localhost:3001';

function postJSON(endpoint, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u    = new URL(endpoint);
    const lib  = u.protocol === 'https:' ? https : http;
    const req  = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('MoMo parse error: ' + raw)); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sign(raw) {
  return crypto.createHmac('sha256', SECRET_KEY).update(raw).digest('hex');
}

export async function createPayment(depositId, amount, orderInfo = 'Nạp MT vào ví') {
  const requestId   = `REQ_${depositId}_${Date.now()}`;
  const orderId     = depositId;
  const redirectUrl = `${BACKEND_URL.replace(/\/api$/, '')}/payment/result`;
  const ipnUrl      = `${BACKEND_URL}/api/wallet/momo/ipn`;
  const requestType = 'payWithMethod';
  const extraData   = '';

  const rawSig = [
    `accessKey=${ACCESS_KEY}`, `amount=${amount}`, `extraData=${extraData}`,
    `ipnUrl=${ipnUrl}`, `orderId=${orderId}`, `orderInfo=${orderInfo}`,
    `partnerCode=${PARTNER_CODE}`, `redirectUrl=${redirectUrl}`,
    `requestId=${requestId}`, `requestType=${requestType}`,
  ].join('&');

  const result = await postJSON(ENDPOINT, '/v2/gateway/api/create', {
    partnerCode: PARTNER_CODE, accessKey: ACCESS_KEY, requestId,
    amount, orderId, orderInfo, redirectUrl, ipnUrl,
    extraData, requestType, signature: sign(rawSig), lang: 'vi',
  });

  if (result.resultCode !== 0) {
    throw new Error(`MoMo lỗi [${result.resultCode}]: ${result.message}`);
  }
  return { payUrl: result.payUrl, deeplink: result.deeplink, qrCodeUrl: result.qrCodeUrl, requestId };
}

export function verifyIPN(body) {
  const { accessKey, amount, extraData, message, orderId, orderInfo,
          orderType, partnerCode, payType, requestId, responseTime,
          resultCode, transId, signature: receivedSig } = body;
  const raw = [
    `accessKey=${accessKey}`, `amount=${amount}`, `extraData=${extraData}`,
    `message=${message}`, `orderId=${orderId}`, `orderInfo=${orderInfo}`,
    `orderType=${orderType}`, `partnerCode=${partnerCode}`, `payType=${payType}`,
    `requestId=${requestId}`, `responseTime=${responseTime}`,
    `resultCode=${resultCode}`, `transId=${transId}`,
  ].join('&');
  const expected = sign(raw);
  try {
    return crypto.timingSafeEqual(Buffer.from(receivedSig || '', 'utf8'), Buffer.from(expected, 'utf8'));
  } catch { return false; }
}

export async function queryTransaction(orderId) {
  const requestId = `QUERY_${orderId}_${Date.now()}`;
  const raw = `accessKey=${ACCESS_KEY}&orderId=${orderId}&partnerCode=${PARTNER_CODE}&requestId=${requestId}`;
  return postJSON(ENDPOINT, '/v2/gateway/api/query', {
    partnerCode: PARTNER_CODE, requestId, orderId, signature: sign(raw), lang: 'vi',
  });
}
