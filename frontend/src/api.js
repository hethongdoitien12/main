const BASE = '/api';

const req = async (method, path, body, token) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const api = {
  auth: {
    register: (b) => req('POST', '/auth/register', b),
    login:    (b) => req('POST', '/auth/login', b),
  },
  wallet: {
    balance:        (t)    => req('GET',  '/wallet/balance', null, t),
    depositCreate:  (b, t) => req('POST', '/wallet/deposit/create', b, t),
    depositConfirm: (b, t) => req('POST', '/wallet/deposit/confirm', b, t),
    tip:            (b, t) => req('POST', '/wallet/tip', {
      receiver_id: b.receiverId,
      amount_xu:   b.amountXu,
      message:     b.message,
      ref_type:    b.refType,
      ref_id:      b.refId,
    }, t),
    bonus:          (b, t) => req('POST', '/wallet/bonus', b, t),
    transactions:   (p, t) => req('GET',  `/wallet/transactions?${new URLSearchParams(p || {})}`, null, t),
    platformStats:  (t)    => req('GET',  '/wallet/platform-stats', null, t),
    expiryInfo:     (t)    => req('GET',  '/wallet/expiry-info', null, t),
  },
  withdrawals: {
    create: (b, t)   => req('POST', '/withdrawals', b, t),
    mine:   (t)      => req('GET',  '/withdrawals/mine', null, t),
    queue:  (t)      => req('GET',  '/withdrawals/queue', null, t),
    approve:(id, t)  => req('POST', `/withdrawals/${id}/approve`, {}, t),
    reject: (id,b,t) => req('POST', `/withdrawals/${id}/reject`, b, t),
  },
  quests: {
    list:     (t)      => req('GET',  '/quests', null, t),
    progress: (id,b,t) => req('POST', `/quests/${id}/progress`, b, t),
    claim:    (id, t)  => req('POST', `/quests/${id}/claim`, {}, t),
    create:   (b, t)   => req('POST', '/quests', b, t),
  },
  notifications: {
    list:    (t)     => req('GET',    '/notifications', null, t),
    readOne: (id, t) => req('PATCH',  `/notifications/${id}/read`, {}, t),
    readAll: (t)     => req('PATCH',  '/notifications/read-all', {}, t),
    remove:  (id, t) => req('DELETE', `/notifications/${id}`, null, t),
  },
  events: {
    trigger: (b, t) => req('POST', '/events/trigger', b, t),
  },
  referral: {
    myCode: (t)       => req('GET',  '/referral/my-code', null, t),
    use:    (code, t) => req('POST', '/referral/use', { code }, t),
  },
  checkin: {
    status: (t) => req('GET',  '/checkin/status', null, t),
    doIt:   (t) => req('POST', '/checkin', {}, t),
  },
  admin: {
    checkinStats:   (t)    => req('GET',  '/admin/checkin/stats', null, t),
    stats:          (t)    => req('GET',  '/admin/stats', null, t),
    users:          (t)    => req('GET',  '/admin/users', null, t),
    adjustBalance:  (b, t) => req('POST', '/admin/adjust-balance', b, t),
    expiryBatches:  (p, t) => req('GET',  `/admin/expiry-batches?${new URLSearchParams(p||{})}`, null, t),
    runExpire:      (t)    => req('POST', '/admin/run-expire', {}, t),
    runCleanup:     (t)    => req('POST', '/admin/run-cleanup', {}, t),
  },
};

export default api;
