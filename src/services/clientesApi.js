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

export async function verificarNip(nip) {
  const res = await fetch(`${BASE_URL}/nips?nip=${encodeURIComponent(nip)}`, {
    headers: getHeaders(),
  });
  if (res.status === 404) return { exists: false, data: [] };
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getErrorMessage(res.status, data));
  return { exists: true, data: data.data || [] };
}

export async function cambiarNip(nipActual, nuevoNip, opts = {}) {
  const body = { nip: String(nipActual), nuevoNip: String(nuevoNip) };
  if (opts.actualizarLlamadas) body.actualizarLlamadas = true;
  const res = await fetch(`${BASE_URL}/nips`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getErrorMessage(res.status, data));
  return data;
}

export async function contarLlamadas(nip, limite = 500) {
  const params = new URLSearchParams({ nip });
  if (limite) params.append('limite', String(limite));
  const res = await fetch(`${BASE_URL}/llamadas?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (res.status === 404) return { count: 0, data: [], notFound: true, tabla: null };
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || data?.message || getErrorMessage(res.status, data));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  const count = typeof data.count === 'number' ? data.count : (data.data?.length ?? 0);
  return { count, data: data.data || [], tabla: data.tabla ?? null, notFound: false };
}

export async function descontarLlamadas({ nip, tema, consultor, numConsultas }) {
  const res = await fetch(`${BASE_URL}/llamadas/descontar`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      nip: String(nip),
      tema: String(tema),
      consultor: String(consultor),
      numConsultas: Number(numConsultas),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throwApiError(res, data);
  return data;
}

export async function notificarCambioNip({ email, nombre, nipAnterior, nipNuevo }) {
  const res = await fetch(`${BASE_URL}/notificaciones/cambio-nip`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      email,
      nombre,
      nipAnterior: String(nipAnterior),
      nipNuevo: String(nipNuevo),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throwApiError(res, data);
  return data;
}

function throwApiError(res, data) {
  const msg = data?.error || data?.message || getErrorMessage(res.status, data);
  const err = new Error(msg);
  err.status = res.status;
  err.data = data;
  throw err;
}

export async function buscarExterno({ nip, dateStarted, numsus }) {
  const res = await fetch(`${BASE_URL}/clientes/buscar-externo`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ nip: String(nip), dateStarted, numsus }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throwApiError(res, data);
  return data;
}

export async function insertarClienteExterno({ nip, dateStarted, numsus }) {
  const res = await fetch(`${BASE_URL}/clientes/insertar`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ nip: String(nip), dateStarted, numsus }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throwApiError(res, data);
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
