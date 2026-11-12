const ADMINS = [
  'raul.flores@idconline.mx',
  'asilva@idconline.mx',
  'alex@idconline.mx',
  'jonatan.ramos@idconline.mx',
];

const FULL_ACCESS_USERS = [
  'racosta@idconline.mx',
  'gustavo.vidal@idconline.mx',
  'karen.gonzalez@idconline.mx',
];

const CONSULTORES = [
  'danae.garcia@idconline.mx',
  'anajazmin.cruz@idconline.mx',
  'carmen.mendoza@idconline.mx',
  'nancy.rodriguez@idconline.mx',
  'angeles.paniagua@idconline.mx',
  'jesus.coronado@idconline.mx',
  'josejuan.rios@idconline.mx',
  'ivega@idconline.mx',
  'eromero@idconline.mx',
  'fbrito@idconline.mx',
];

const BASE_TABS = [
  'consulta',
  'cambiar',
  'crear',
  'fusionar',
  'tipocontacto',
  'clientes',
  'insertar',
];

export const TAB_PERMISSIONS = {
  admin: [...BASE_TABS, 'descontar', 'historial'],
  full: [...BASE_TABS, 'descontar'],
  consultor: ['descontar', 'clientes'],
};

const CAPABILITIES = {
  admin: new Set([
    'verClientes',
    'editarCliente',
    'editarContadoresLlamadas',
    'eliminarCliente',
    'generarNip',
    'fusionarContactos',
    'insertarNip',
    'verHistorial',
    'descontarLlamadas',
    'verLlamadas',
    'notificarCliente',
  ]),
  full: new Set([
    'verClientes',
    'editarCliente',
    'editarContadoresLlamadas',
    'eliminarCliente',
    'generarNip',
    'fusionarContactos',
    'insertarNip',
    'descontarLlamadas',
    'verLlamadas',
    'notificarCliente',
  ]),
  consultor: new Set([
    'verClientes',
    'descontarLlamadas',
    'verLlamadas',
  ]),
};

const CONSULTORES_CON_CONTADORES = [
  'fbrito@idconline.mx',
];

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function getUserRole(email) {
  const e = normalizeEmail(email);
  if (!e) return null;
  if (ADMINS.includes(e)) return 'admin';
  if (FULL_ACCESS_USERS.includes(e)) return 'full';
  if (CONSULTORES.includes(e)) return 'consultor';
  return null;
}

export function can(role, capability, email) {
  if (
    capability === 'editarContadoresLlamadas' &&
    CONSULTORES_CON_CONTADORES.includes(normalizeEmail(email))
  ) {
    return true;
  }
  const caps = CAPABILITIES[role];
  return !!caps && caps.has(capability);
}

export function hasTab(role, tabId) {
  const tabs = TAB_PERMISSIONS[role];
  return !!tabs && tabs.includes(tabId);
}
