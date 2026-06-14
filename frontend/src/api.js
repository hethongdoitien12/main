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
    login: (b) => req('POST', '/auth/login', b),
  },
  wallet: {
    get: (t) => req('GET', '/wallet', null, t),
    deposit: (b, t) => req('POST', '/wallet/deposit', b, t),
    withdraw: (b, t) => req('POST', '/wallet/withdraw', b, t),
    spend: (b, t) => req('POST', '/wallet/spend', b, t),
    tip: (b, t) => req('POST', '/wallet/tip', b, t),
    history: (params, t) => req('GET', `/wallet/history?${new URLSearchParams(params)}`, null, t),
    deposits: (t) => req('GET', '/wallet/deposits', null, t),
    withdrawals: (t) => req('GET', '/wallet/withdrawals', null, t),
    platformStats: (t) => req('GET', '/wallet/platform-stats', null, t),
  },
  quests: {
    list: (t) => req('GET', '/quests', null, t),
    claim: (id, t) => req('POST', `/quests/${id}/claim`, {}, t),
  }
};

export default api;
