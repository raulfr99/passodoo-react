const BASE_URL = process.env.REACT_APP_NIPS_URL;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.REACT_APP_NIPS_KEY,
  };
}

function getErrorMessage(status, data) {
  if (status === 401) return 'API key inválida. Contacta al administrador.';
  if (status === 400) return data?.error || 'Datos inválidos.';
  if (status === 403) return data?.error || 'Operación no permitida.';
  if (status === 404) return 'Cliente no encontrado.';
  if (status === 503) return 'Error de conexión a base de datos. Intenta de nuevo.';
  return data?.error || `Error ${status}`;
}

export async function buscarClientes(filtros = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) params.append(k, v);
  });
  const qs = params.toString();
  const res = await fetch(`${BASE_URL}/clientes${qs ? '?' + qs : ''}`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(getErrorMessage(res.status, data));
  return data;
}

export async function actualizarCliente(llaveUnica, campos) {
  const res = await fetch(`${BASE_URL}/clientes`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ llaveUnica, campos }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(getErrorMessage(res.status, data));
  return data;
}

export async function eliminarCliente(llaveUnica) {
  const res = await fetch(`${BASE_URL}/clientes`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ llaveUnica, confirmar: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(getErrorMessage(res.status, data));
  return data;
}

export async function obtenerLlamadas(nip, limite = 100) {
  const params = new URLSearchParams({ nip });
  if (limite !== 100) params.append('limite', limite);
  const res = await fetch(`${BASE_URL}/llamadas?${params.toString()}`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(getErrorMessage(res.status, data));
  return data;
}
