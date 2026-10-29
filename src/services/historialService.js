const NIPS_URL = process.env.REACT_APP_NIPS_URL || '';
const HISTORIAL_URL = `${NIPS_URL}/historial`;

export const ENTORNO = NIPS_URL.includes('/prod') ? 'PROD' : 'DEV';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.REACT_APP_HISTORIAL_KEY,
  };
}

function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function registrarAccion({ accion, modulo, resultado, detalle }) {
  try {
    const user = getCurrentUser();
    if (!user?.email) return;
    await fetch(HISTORIAL_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        email: user.email,
        accion,
        modulo,
        resultado,
        detalle: detalle && typeof detalle === 'object' ? detalle : {},
        entorno: ENTORNO,
      }),
    });
  } catch (err) {
    console.error('[historial] registrarAccion falló:', err);
  }
}

export async function consultarHistorial({ modulo, email, limite = 50, lastKey } = {}) {
  const params = new URLSearchParams();
  if (modulo) params.append('modulo', modulo);
  if (email) params.append('email', email);
  if (limite) params.append('limite', String(limite));
  if (lastKey) {
    const v = typeof lastKey === 'string' ? lastKey : JSON.stringify(lastKey);
    params.append('lastKey', v);
  }
  const qs = params.toString();
  const res = await fetch(`${HISTORIAL_URL}${qs ? '?' + qs : ''}`, {
    headers: getHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || (res.status === 401 ? 'API key inválida.' : `Error ${res.status}`);
    throw new Error(msg);
  }
  return data;
}
