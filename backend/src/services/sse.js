const userClients = new Map();
const allClients = new Set();

function sendSSE(res, event, data) {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {}
}

export function addClient(userId, res) {
  if (!userClients.has(userId)) userClients.set(userId, new Set());
  userClients.get(userId).add(res);
  allClients.add(res);
}

export function removeClient(userId, res) {
  userClients.get(userId)?.delete(res);
  if (userClients.get(userId)?.size === 0) userClients.delete(userId);
  allClients.delete(res);
}

export function sendToUser(userId, event, data) {
  userClients.get(userId)?.forEach(res => sendSSE(res, event, data));
}

export function broadcast(event, data) {
  allClients.forEach(res => sendSSE(res, event, data));
}

export function getConnectedCount() {
  return allClients.size;
}
