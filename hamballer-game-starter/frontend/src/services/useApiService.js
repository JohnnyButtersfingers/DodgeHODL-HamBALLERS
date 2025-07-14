export function apiFetch(path, options = {}) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return fetch(`${apiUrl}${path}`, options);
}

export async function startRunApi(address, moves) {
  return apiFetch('/api/run/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerAddress: address, moveSelection: moves })
  });
}

export async function endRunApi(runId, decision) {
  return apiFetch('/api/run/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, hodlDecision: decision })
  });
}
